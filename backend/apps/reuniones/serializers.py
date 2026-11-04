from rest_framework import serializers
from .models import Reunion, ReunionParticipanteInterno, ParticipanteExterno
from apps.personal.models import Personal
from apps.proyectos.models import Proyecto

class ParticipanteExternoSerializer(serializers.ModelSerializer):
    empresa_representada = serializers.SerializerMethodField()

    class Meta:
        model = ParticipanteExterno
        fields = ['id', 'reunion', 'nombre', 'email', 'cargo', 'detalles', 'empresa_nombre', 'empresa_representada', 'asistio']

    def get_empresa_representada(self, obj):
        if obj.reunion and obj.reunion.proyecto and obj.reunion.proyecto.empresa:
            return obj.reunion.proyecto.empresa.nombre_comercial or obj.reunion.proyecto.empresa.razon_social
        return obj.empresa_nombre or ''

class ReunionParticipanteInternoSerializer(serializers.ModelSerializer):
    personal_nombre = serializers.SerializerMethodField()
    personal_email = serializers.SerializerMethodField()
    personal_cargo = serializers.SerializerMethodField()

    class Meta:
        model = ReunionParticipanteInterno
        fields = ['id', 'reunion', 'personal', 'asistio', 'personal_nombre', 'personal_email', 'personal_cargo']

    def get_personal_nombre(self, obj):
        return f"{obj.personal.nombre} {obj.personal.apellido}"

    def get_personal_email(self, obj):
        return obj.personal.email

    def get_personal_cargo(self, obj):
        return obj.personal.cargo

class ReunionSerializer(serializers.ModelSerializer):
    proyecto = serializers.PrimaryKeyRelatedField(
        queryset=Proyecto.objects.all(),
        required=False,
        allow_null=True
    )
    participantes_internos = ReunionParticipanteInternoSerializer(many=True, read_only=True)
    participantes_externos = ParticipanteExternoSerializer(many=True, read_only=True)
    proyecto_nombre = serializers.SerializerMethodField()
    fecha_hora_fin = serializers.DateTimeField(required=False, allow_null=True)

    participantes_internos_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    participantes_externos_datos = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Reunion
        fields = [
            'id', 'proyecto', 'proyecto_nombre', 'titulo', 'tipo_reunion',
            'descripcion', 'fecha_hora_inicio', 'fecha_hora_fin', 'ubicacion',
            'acta', 'resultado', 'compromisos', 'completada', 'fecha_completada',
            'created_at', 'updated_at', 'eliminado', 'fecha_eliminacion',
            'participantes_internos', 'participantes_externos',
            'participantes_internos_ids', 'participantes_externos_datos'
        ]

    def get_proyecto_nombre(self, obj):
        return obj.proyecto.nombre if obj.proyecto else None

    def validate(self, data):
        inicio = data.get('fecha_hora_inicio') or (self.instance.fecha_hora_inicio if self.instance else None)
        fin = data.get('fecha_hora_fin')
        if inicio and fin and inicio > fin:
            raise serializers.ValidationError({
                "fecha_hora_fin": "La fecha y hora de fin debe ser posterior a la fecha y hora de inicio."
            })
        return data

    def _deducir_empresa_nombre(self, reunion, ext):
        emp_nom = ext.get('empresa_nombre')
        if not emp_nom and reunion.proyecto and reunion.proyecto.empresa:
            emp_nom = reunion.proyecto.empresa.nombre_comercial or reunion.proyecto.empresa.razon_social
        return emp_nom or ''

    def create(self, validated_data):
        internos_ids = validated_data.pop('participantes_internos_ids', [])
        externos_datos = validated_data.pop('participantes_externos_datos', [])
        reunion = super().create(validated_data)

        for pid in internos_ids:
            try:
                personal = Personal.objects.get(id=pid)
                ReunionParticipanteInterno.objects.create(reunion=reunion, personal=personal)
            except Personal.DoesNotExist:
                continue

        for ext in externos_datos:
            empresa_nombre = self._deducir_empresa_nombre(reunion, ext)
            ParticipanteExterno.objects.create(
                reunion=reunion,
                nombre=ext.get('nombre', ''),
                email=ext.get('email', '') or None,
                cargo=ext.get('cargo', '') or None,
                detalles=ext.get('detalles', '') or None,
                empresa_nombre=empresa_nombre
            )

        return reunion

    def update(self, instance, validated_data):
        internos_ids = validated_data.pop('participantes_internos_ids', None)
        externos_datos = validated_data.pop('participantes_externos_datos', None)
        reunion = super().update(instance, validated_data)

        if internos_ids is not None:
            reunion.participantes_internos.all().delete()
            for pid in internos_ids:
                try:
                    personal = Personal.objects.get(id=pid)
                    ReunionParticipanteInterno.objects.create(reunion=reunion, personal=personal)
                except Personal.DoesNotExist:
                    continue

        if externos_datos is not None:
            reunion.participantes_externos.all().delete()
            for ext in externos_datos:
                empresa_nombre = self._deducir_empresa_nombre(reunion, ext)
                ParticipanteExterno.objects.create(
                    reunion=reunion,
                    nombre=ext.get('nombre', ''),
                    email=ext.get('email', '') or None,
                    cargo=ext.get('cargo', '') or None,
                    detalles=ext.get('detalles', '') or None,
                    empresa_nombre=empresa_nombre
                )

        return reunion

