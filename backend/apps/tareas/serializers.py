from rest_framework import serializers
from .models import Tarea, ColumnaKanban


class ColumnaKanbanSerializer(serializers.ModelSerializer):
    tareas_count = serializers.SerializerMethodField()

    class Meta:
        model = ColumnaKanban
        fields = ['id', 'proyecto', 'nombre', 'color', 'orden', 'estado_asociado', 'tareas_count', 'created_at']

    def get_tareas_count(self, obj):
        return obj.tareas.count()


class TareaSerializer(serializers.ModelSerializer):
    proyecto_id = serializers.UUIDField(source='proyecto.id', read_only=True)
    proyecto_nombre = serializers.SerializerMethodField()
    empresa_nombre = serializers.SerializerMethodField()
    asignado_a_nombre = serializers.SerializerMethodField()
    asignado_a_email = serializers.SerializerMethodField()
    columna_kanban_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = [
            'id', 'proyecto', 'proyecto_id', 'proyecto_nombre', 'empresa_nombre',
            'asignado_a', 'asignado_a_nombre', 'asignado_a_email',
            'asignado_por', 'titulo', 'descripcion', 'prioridad',
            'estado', 'estado_proyecto', 'columna_kanban', 'columna_kanban_nombre', 'orden_en_columna',
            'fecha_asignacion', 'fecha_inicio', 'fecha_limite', 'fecha_leido',
            'fecha_inicio_trabajo', 'fecha_completada', 'notificado_email',
            'notificado_icalendar', 'notas', 'created_at', 'updated_at'
        ]

    def validate(self, data):
        fecha_inicio = data.get('fecha_inicio')
        fecha_limite = data.get('fecha_limite')

        if not data.get('estado_proyecto') and data.get('proyecto'):
            proy = data['proyecto']
            est_obj = proy.estados.first()
            if est_obj:
                data['estado_proyecto'] = est_obj.estado

        if self.instance:
            if fecha_inicio is None and 'fecha_inicio' not in data:
                fecha_inicio = self.instance.fecha_inicio
            if fecha_limite is None and 'fecha_limite' not in data:
                fecha_limite = self.instance.fecha_limite

        if fecha_inicio and fecha_limite and fecha_inicio > fecha_limite:
            raise serializers.ValidationError({
                'fecha_inicio': 'La fecha de inicio no puede ser posterior a la fecha límite.'
            })
        return data

    def get_proyecto_nombre(self, obj):
        return obj.proyecto.nombre if obj.proyecto else None

    def get_empresa_nombre(self, obj):
        if obj.proyecto and obj.proyecto.empresa:
            return obj.proyecto.empresa.nombre_comercial or obj.proyecto.empresa.razon_social
        return None

    def get_asignado_a_nombre(self, obj):
        if obj.asignado_a:
            return f"{obj.asignado_a.nombre} {obj.asignado_a.apellido}".strip()
        return None

    def get_asignado_a_email(self, obj):
        return obj.asignado_a.email if obj.asignado_a else None

    def get_columna_kanban_nombre(self, obj):
        if obj.columna_kanban:
            return obj.columna_kanban.nombre
        mapping = {
            'PENDIENTE': 'Por hacer',
            'EN_PROGRESO': 'En Progreso',
            'COMPLETADA': 'Completada',
            'CANCELADA': 'Cancelada',
        }
        return mapping.get(obj.estado, 'Por hacer')


class TareaConfirmacionSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(choices=['LEER', 'INICIAR', 'COMPLETAR'])


class MoverTarjetaKanbanSerializer(serializers.Serializer):
    tarea_id = serializers.UUIDField(required=True)
    columna_destino_id = serializers.UUIDField(required=True)
    nuevo_orden = serializers.IntegerField(required=False, default=0)
