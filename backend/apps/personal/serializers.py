from rest_framework import serializers
from django.utils import timezone
from .models import Personal, Invitacion


class PersonalSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Personal
        fields = [
            'id', 'user', 'username', 'nombre', 'apellido', 'email',
            'telefono', 'cargo', 'rol', 'activo', 'fecha_ingreso',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate_rol(self, value):
        request = self.context.get('request')
        if not request:
            return value

        user = request.user
        if user.is_superuser:
            return value

        # Si se está actualizando un registro de personal existente
        if self.instance:
            # 1. Un usuario no puede alterar su propio rol (evita auto-escalada o auto-degradación)
            if hasattr(user, 'personal') and user.personal.id == self.instance.id:
                if self.instance.rol != value:
                    raise serializers.ValidationError("No está permitido modificar su propio rol de acceso.")

            # 2. Solo usuarios RRHH o Gerente pueden cambiar el rol de otro usuario
            user_rol = getattr(getattr(user, 'personal', None), 'rol', None)
            if user_rol not in ['RRHH', 'GERENTE'] and not user.is_staff:
                if self.instance.rol != value:
                    raise serializers.ValidationError("No cuenta con privilegios para modificar el rol de un usuario.")

        return value



class PersonalListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personal
        fields = ('id', 'nombre', 'apellido', 'email', 'cargo', 'rol', 'activo', 'created_at', 'updated_at')


class InvitacionSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.SerializerMethodField()
    aprobado_por_nombre = serializers.SerializerMethodField()
    esta_expirada = serializers.SerializerMethodField()
    horas_restantes = serializers.SerializerMethodField()

    class Meta:
        model = Invitacion
        fields = [
            'id', 'email', 'nombre', 'apellido', 'cargo', 'rol',
            'token', 'creado_por', 'creado_por_nombre',
            'fecha_expiracion', 'estado', 'aprobado_por', 'aprobado_por_nombre',
            'fecha_aprobacion', 'personal_creado', 'esta_expirada', 'horas_restantes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'token', 'creado_por', 'fecha_aprobacion', 'aprobado_por', 'personal_creado', 'created_at', 'updated_at']

    def get_creado_por_nombre(self, obj):
        if obj.creado_por:
            return f"{obj.creado_por.nombre} {obj.creado_por.apellido}".strip()
        return None

    def get_aprobado_por_nombre(self, obj):
        if obj.aprobado_por:
            return f"{obj.aprobado_por.nombre} {obj.aprobado_por.apellido}".strip()
        return None

    def get_esta_expirada(self, obj) -> bool:
        return obj.esta_expirada()

    def get_horas_restantes(self, obj) -> int:
        if obj.esta_expirada() or obj.estado in ['APROBADO', 'REVOCADA']:
            return 0
        diff = obj.fecha_expiracion - timezone.now()
        horas = int(diff.total_seconds() // 3600)
        return max(0, horas)

    def validate_email(self, value):
        email = value.lower().strip()
        if Personal.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe un miembro del personal registrado con este correo electrónico.")
        if Invitacion.objects.filter(email__iexact=email, estado='PENDIENTE').exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("Ya existe una invitación pendiente activa enviada a esta dirección de correo.")
        return email


from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class CompletarRegistroSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    password = serializers.CharField(required=True, min_length=8)
    password_confirm = serializers.CharField(required=True, min_length=8)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas ingresadas no coinciden."})
        try:
            validate_password(attrs['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs
