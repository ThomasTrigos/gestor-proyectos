from rest_framework import serializers
from .models import Proyecto, ProyectoEquipo, EstadoProyecto, ProyectoDia0, ProyectoSnapshot
from apps.empresas.models import Empresa
from apps.personal.models import Personal
from django.utils import timezone


class EstadoProyectoSerializer(serializers.ModelSerializer):
    cambiado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = EstadoProyecto
        fields = ['id', 'proyecto', 'estado', 'fecha_cambio', 'razon_cambio', 'cambiado_por', 'cambiado_por_nombre']

    def get_cambiado_por_nombre(self, obj):
        if obj.cambiado_por:
            return f"{obj.cambiado_por.nombre} {obj.cambiado_por.apellido}"
        return "Sistema"

class ProyectoEquipoSerializer(serializers.ModelSerializer):
    personal_id = serializers.UUIDField(source='personal.id', read_only=True)
    personal_nombre = serializers.SerializerMethodField()
    personal_cargo = serializers.SerializerMethodField()
    personal_rol = serializers.SerializerMethodField()
    personal_email = serializers.SerializerMethodField()

    class Meta:
        model = ProyectoEquipo
        fields = [
            'id', 'proyecto', 'personal', 'personal_id', 'es_lider', 'fecha_asignacion', 'notificado_email',
            'personal_nombre', 'personal_cargo', 'personal_rol', 'personal_email'
        ]

    def get_personal_nombre(self, obj):
        return f"{obj.personal.nombre} {obj.personal.apellido}"

    def get_personal_cargo(self, obj):
        return obj.personal.cargo

    def get_personal_rol(self, obj):
        return obj.personal.rol

    def get_personal_email(self, obj):
        return obj.personal.email

class ProyectoSerializer(serializers.ModelSerializer):
    estados = EstadoProyectoSerializer(many=True, read_only=True)
    estado_actual = serializers.SerializerMethodField()
    empresa_id = serializers.SerializerMethodField()
    empresa_razon_social = serializers.SerializerMethodField()
    empresa_nombre_comercial = serializers.SerializerMethodField()
    lider_proyecto_nombre = serializers.SerializerMethodField()
    equipo_asignaciones = ProyectoEquipoSerializer(many=True, read_only=True)
    phs_actual = serializers.IntegerField(read_only=True)
    nivel_riesgo_actual = serializers.CharField(read_only=True)
    tiene_perfil_dia0 = serializers.SerializerMethodField()
    alerta_snapshot_pendiente = serializers.SerializerMethodField()
    
    # Campo opcional para asignar equipo al crear/editar
    equipo_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    notificar_equipo = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = Proyecto
        fields = [
            'id', 'nombre', 'descripcion', 'empresa', 'empresa_id', 'tipo_servicio', 'tipo_servicio_otro',
            'lider_proyecto', 'fecha_inicio_estimada', 'fecha_fin_estimada',
            'notas', 'created_at', 'updated_at',
            'estados', 'estado_actual',
            'empresa_razon_social', 'empresa_nombre_comercial',
            'lider_proyecto_nombre', 'equipo_asignaciones',
            'equipo_ids', 'notificar_equipo',
            'phs_actual', 'nivel_riesgo_actual', 'tiene_perfil_dia0', 'alerta_snapshot_pendiente'
        ]

    def get_tiene_perfil_dia0(self, obj):
        return hasattr(obj, 'perfil_dia0') and obj.perfil_dia0 is not None

    def get_alerta_snapshot_pendiente(self, obj):
        ultimo = obj.snapshots.first()
        hoy = timezone.now().date()
        if ultimo:
            dias = (hoy - ultimo.fecha_corte).days
            return {
                'requiere_snapshot': dias >= 7,
                'dias_desde_ultimo': dias,
                'ultimo_corte': str(ultimo.fecha_corte),
                'numero_corte': ultimo.numero_corte
            }
        else:
            dias = (hoy - obj.created_at.date()).days
            return {
                'requiere_snapshot': dias >= 7,
                'dias_desde_ultimo': dias,
                'ultimo_corte': None,
                'numero_corte': 0
            }

    def get_empresa_id(self, obj):
        return str(obj.empresa_id) if obj.empresa_id else None

    def get_estado_actual(self, obj):
        estado_obj = obj.estados.first()
        if estado_obj:
            return {
                'id': str(estado_obj.id),
                'estado': estado_obj.estado,
                'fecha_cambio': estado_obj.fecha_cambio,
                'razon_cambio': estado_obj.razon_cambio,
                'cambiado_por_nombre': f"{estado_obj.cambiado_por.nombre} {estado_obj.cambiado_por.apellido}" if estado_obj.cambiado_por else "Sistema"
            }
        return None

    def get_empresa_razon_social(self, obj):
        return obj.empresa.razon_social if obj.empresa else None

    def get_empresa_nombre_comercial(self, obj):
        return obj.empresa.nombre_comercial if obj.empresa else None

    def get_lider_proyecto_nombre(self, obj):
        if obj.lider_proyecto:
            return f"{obj.lider_proyecto.nombre} {obj.lider_proyecto.apellido}"
        return None

    def validate(self, data):
        fecha_inicio = data.get('fecha_inicio_estimada')
        fecha_fin = data.get('fecha_fin_estimada')
        
        if self.instance:
            if 'fecha_inicio_estimada' not in data:
                fecha_inicio = self.instance.fecha_inicio_estimada
            if 'fecha_fin_estimada' not in data:
                fecha_fin = self.instance.fecha_fin_estimada

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                "fecha_inicio_estimada": "La fecha de inicio estimada no puede ser posterior a la fecha de finalización estimada.",
                "fecha_fin_estimada": "La fecha de fin estimada debe ser posterior o igual a la fecha de inicio estimada."
            })
        return data

    def create(self, validated_data):
        equipo_ids = validated_data.pop('equipo_ids', [])
        notificar = validated_data.pop('notificar_equipo', False)
        proyecto = super().create(validated_data)
        
        for pid in equipo_ids:
            try:
                personal = Personal.objects.get(id=pid)
                pe, created = ProyectoEquipo.objects.get_or_create(proyecto=proyecto, personal=personal)
                if created and notificar:
                    from apps.core.services.email_service import enviar_email_equipo
                    try:
                        enviar_email_equipo(proyecto, personal)
                        pe.notificado_email = True
                        pe.save(update_fields=['notificado_email'])
                    except Exception:
                        pass
            except Personal.DoesNotExist:
                continue

        proyecto.asegurar_lider_en_equipo()
        return proyecto

    def update(self, instance, validated_data):
        equipo_ids = validated_data.pop('equipo_ids', None)
        notificar = validated_data.pop('notificar_equipo', False)
        proyecto = super().update(instance, validated_data)
        
        if equipo_ids is not None:
            # Eliminar miembros que no estén en la lista enviada, excepto si es el líder actual
            lider_id = proyecto.lider_proyecto_id
            miembros_a_eliminar = proyecto.equipo_asignaciones.exclude(personal_id__in=equipo_ids)
            if lider_id:
                miembros_a_eliminar = miembros_a_eliminar.exclude(personal_id=lider_id)
            miembros_a_eliminar.delete()

            for pid in equipo_ids:
                try:
                    personal = Personal.objects.get(id=pid)
                    pe, created = ProyectoEquipo.objects.get_or_create(proyecto=proyecto, personal=personal)
                    if created and notificar:
                        from apps.core.services.email_service import enviar_email_equipo
                        try:
                            enviar_email_equipo(proyecto, personal)
                            pe.notificado_email = True
                            pe.save(update_fields=['notificado_email'])
                        except Exception:
                            pass
                except Personal.DoesNotExist:
                    continue

        proyecto.asegurar_lider_en_equipo()
        return proyecto

class CambiarEstadoSerializer(serializers.Serializer):
    estado = serializers.CharField()
    razon_cambio = serializers.CharField()
    fecha_fin_estimada = serializers.DateField(required=False, allow_null=True)

class ProyectoDia0Serializer(serializers.ModelSerializer):
    class Meta:
        model = ProyectoDia0
        fields = [
            'id', 'proyecto', 'pm_experiencia_anios', 'modalidad_contratacion',
            'categoria_proyecto', 'presupuesto_base', 'duracion_estimada_dias',
            'esfuerzo_meses_persona', 'complejidad_tecnica', 'competencia_equipo_pct',
            'certeza_requerimientos', 'conocimiento_sponsor',
            'tolerancia_desviacion_tiempo_pct', 'tolerancia_desviacion_costo_pct',
            'certificaciones_pm', 'phs_inicial', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'proyecto', 'phs_inicial', 'created_at', 'updated_at']

class ProyectoSnapshotSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = ProyectoSnapshot
        fields = [
            'id', 'proyecto', 'numero_corte', 'fecha_corte',
            'pv', 'ev', 'ac', 'spi', 'cpi', 'csi', 'tasa_tareas_vencidas',
            'reuniones_planificadas', 'reuniones_reales', 'ratio_contacto',
            'canal_predominante', 'dias_retraso_total', 'dias_retraso_cliente',
            'rfc', 'indice_desviacion', 'cambios_alcance_periodo', 'rotacion_personal_clave',
            's_cliente', 's_equipo', 'delta_s',
            'n4_empoderamiento', 'n5_claridad_hitos', 'n6_participacion_cliente', 'n7_tension',
            'archivo_minuta', 'texto_minuta_analizado',
            'score_a_priori', 'indice_operativo', 'indice_nlp', 'phs', 'nivel_riesgo',
            'desglose_explicabilidad', 'accion_recomendada',
            'registrado_por', 'registrado_por_nombre', 'created_at'
        ]
        read_only_fields = [
            'id', 'proyecto', 'spi', 'cpi', 'csi', 'ratio_contacto', 'rfc', 'indice_desviacion',
            'score_a_priori', 'indice_operativo', 'indice_nlp', 'phs', 'nivel_riesgo',
            'desglose_explicabilidad', 'accion_recomendada', 'registrado_por',
            'registrado_por_nombre', 'created_at'
        ]

    def get_registrado_por_nombre(self, obj):
        if obj.registrado_por:
            return f"{obj.registrado_por.nombre} {obj.registrado_por.apellido}"
        return "Sistema"


