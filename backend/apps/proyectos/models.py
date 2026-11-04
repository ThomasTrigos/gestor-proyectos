import uuid
from django.db import models
from django.utils import timezone

class ModalidadContratacion(models.TextChoices):
    IN_HOUSE = 'IN_HOUSE', 'In-house (Desarrollo interno)'
    OUTSOURCED = 'OUTSOURCED', 'Outsourced (Contrato externo precio fijo)'
    MIXTO = 'MIXTO', 'Mixto (Equipo híbrido)'

class CategoriaProyecto(models.TextChoices):
    PRODUCTO_CORE = 'PRODUCTO_CORE', 'Producto Core'
    SOPORTE_INTERNO = 'SOPORTE_INTERNO', 'Soporte Interno'
    INNOVACION = 'INNOVACION', 'Innovación / I+D'
    TRANSVERSAL = 'TRANSVERSAL', 'Transversal / RRHH'
    OTRO = 'OTRO', 'Otro'

class NivelRiesgo(models.TextChoices):
    SALUDABLE = 'SALUDABLE', 'Saludable (> 70 pts)'
    LATENTE = 'LATENTE', 'Riesgo Latente (55 - 70 pts)'
    ACTIVO = 'ACTIVO', 'Riesgo Activo (35 - 54 pts)'
    INMINENTE = 'INMINENTE', 'Cancelación Inminente (< 35 pts)'

class Proyecto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, related_name='proyectos')
    tipo_servicio = models.JSONField(default=list) # List of CONSULTORIA/DESARROLLO/IMPLEMENTACION_CAPACITACION/OTRO
    tipo_servicio_otro = models.CharField(max_length=255, null=True, blank=True)
    lider_proyecto = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL, related_name='proyectos_liderados')
    fecha_inicio_estimada = models.DateField(null=True, blank=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    notas = models.TextField(null=True, blank=True)
    eliminado = models.BooleanField(default=False, db_index=True)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    eliminado_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL, related_name='proyectos_eliminados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Proyecto'
        verbose_name_plural = 'Proyectos'

    def __str__(self):
        return self.nombre

    def asegurar_lider_en_equipo(self):
        """
        Garantiza que si el proyecto tiene un lider_proyecto asignado,
        éste figure en ProyectoEquipo con es_lider=True, y que cualquier
        otro miembro previo deje de tener es_lider=True.
        """
        if self.lider_proyecto_id:
            # Desmarcar líderes anteriores si no son este líder
            self.equipo_asignaciones.exclude(personal_id=self.lider_proyecto_id).filter(es_lider=True).update(es_lider=False)
            pe, created = self.equipo_asignaciones.get_or_create(
                personal=self.lider_proyecto,
                defaults={'es_lider': True}
            )
            if not pe.es_lider:
                pe.es_lider = True
                pe.save(update_fields=['es_lider'])
        else:
            self.equipo_asignaciones.filter(es_lider=True).update(es_lider=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.asegurar_lider_en_equipo()

    @property
    def ultimo_snapshot(self):
        return self.snapshots.first()

    @property
    def phs_actual(self):
        snap = self.ultimo_snapshot
        if snap:
            return snap.phs
        if hasattr(self, 'perfil_dia0') and self.perfil_dia0:
            return self.perfil_dia0.phs_inicial
        return None

    @property
    def nivel_riesgo_actual(self):
        snap = self.ultimo_snapshot
        if snap:
            return snap.nivel_riesgo
        if hasattr(self, 'perfil_dia0') and self.perfil_dia0:
            p0 = self.perfil_dia0.phs_inicial
            if p0 > 70:
                return NivelRiesgo.SALUDABLE
            elif p0 >= 55:
                return NivelRiesgo.LATENTE
            elif p0 >= 35:
                return NivelRiesgo.ACTIVO
            else:
                return NivelRiesgo.INMINENTE
        return None


class ProyectoEquipo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='equipo_asignaciones')
    personal = models.ForeignKey('personal.Personal', on_delete=models.CASCADE, related_name='proyectos_asignados')
    es_lider = models.BooleanField(default=False)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    notificado_email = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Miembro del Equipo'
        verbose_name_plural = 'Equipo del Proyecto'
        unique_together = ('proyecto', 'personal')

class EstadoProyecto(models.Model):
    ESTADOS = (
        ('OPORTUNIDAD', 'Oportunidad'),
        ('TRABAJANDO', 'Trabajando'),
        ('PAUSADO', 'Pausado'),
        ('SEGUIMIENTO', 'Seguimiento'),
        ('CONCRETADO', 'Concretado'),
        ('CAIDO', 'Caído'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='estados')
    estado = models.CharField(max_length=20, choices=ESTADOS)
    fecha_cambio = models.DateTimeField(auto_now_add=True)
    razon_cambio = models.TextField()
    cambiado_por = models.ForeignKey('personal.Personal', null=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'Estado del Proyecto'
        verbose_name_plural = 'Historial de Estados'
        ordering = ['-fecha_cambio']

class ProyectoDia0(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.OneToOneField(Proyecto, on_delete=models.CASCADE, related_name='perfil_dia0')
    
    # Predictor #1
    pm_experiencia_anios = models.PositiveIntegerField(default=3)
    modalidad_contratacion = models.CharField(max_length=20, choices=ModalidadContratacion.choices, default=ModalidadContratacion.IN_HOUSE)
    categoria_proyecto = models.CharField(max_length=30, choices=CategoriaProyecto.choices, default=CategoriaProyecto.PRODUCTO_CORE)
    presupuesto_base = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    duracion_estimada_dias = models.PositiveIntegerField(default=90)
    esfuerzo_meses_persona = models.DecimalField(max_digits=8, decimal_places=2, default=3.0)
    
    # Escalas y Factores
    complejidad_tecnica = models.PositiveSmallIntegerField(default=3)      # 1 a 5
    competencia_equipo_pct = models.FloatField(default=75.0)                # 0 a 100%
    certeza_requerimientos = models.PositiveSmallIntegerField(default=3)    # 1 a 5
    conocimiento_sponsor = models.PositiveSmallIntegerField(default=2)      # 1 a 3
    
    # Target de éxito
    tolerancia_desviacion_tiempo_pct = models.FloatField(default=15.0)
    tolerancia_desviacion_costo_pct = models.FloatField(default=15.0)
    
    # Informativo (sin ponderación en modelo matemático)
    certificaciones_pm = models.JSONField(default=list, blank=True)
    
    # Score a priori
    phs_inicial = models.PositiveSmallIntegerField(default=89)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Perfil Día 0'
        verbose_name_plural = 'Perfiles Día 0'

    def __str__(self):
        return f"Día 0: {self.proyecto.nombre} (PHS: {self.phs_inicial})"

class ProyectoSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='snapshots')
    numero_corte = models.PositiveIntegerField()
    fecha_corte = models.DateField(default=timezone.localdate)
    
    # EVM (Earned Value Management)
    pv = models.FloatField(default=0.0, help_text="% planificado (0-100)")
    ev = models.FloatField(default=0.0, help_text="% completado real (0-100)")
    ac = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    spi = models.FloatField(default=1.0)
    cpi = models.FloatField(default=1.0)
    csi = models.FloatField(default=1.0)
    tasa_tareas_vencidas = models.FloatField(default=0.0)
    
    # Fricción y Stakeholders
    reuniones_planificadas = models.PositiveIntegerField(default=1)
    reuniones_reales = models.PositiveIntegerField(default=1)
    ratio_contacto = models.FloatField(default=1.0)
    canal_predominante = models.CharField(max_length=50, default='SINCRONICO_VIDEO')
    dias_retraso_total = models.IntegerField(default=0)
    dias_retraso_cliente = models.IntegerField(default=0)
    rfc = models.FloatField(default=0.0)
    indice_desviacion = models.FloatField(default=0.0)
    cambios_alcance_periodo = models.PositiveIntegerField(default=0)
    rotacion_personal_clave = models.PositiveIntegerField(default=0)
    
    # Señales NLP
    s_cliente = models.FloatField(default=0.0)  # -1.0 a +1.0
    s_equipo = models.FloatField(default=0.0)
    delta_s = models.FloatField(default=0.0)
    n4_empoderamiento = models.FloatField(default=0.7)  # 0.0 a 1.0
    n5_claridad_hitos = models.FloatField(default=0.7)
    n6_participacion_cliente = models.FloatField(default=0.5)
    n7_tension = models.FloatField(default=0.1)
    
    # Soporte de archivo externo de minuta (.txt, .pdf, .docx)
    archivo_minuta = models.FileField(upload_to='minutas_analisis/%Y/%m/', null=True, blank=True)
    texto_minuta_analizado = models.TextField(null=True, blank=True)
    
    # Resultados calculados consolidados
    score_a_priori = models.PositiveSmallIntegerField(default=89)
    indice_operativo = models.FloatField(default=0.85)
    indice_nlp = models.FloatField(default=0.80)
    phs = models.PositiveSmallIntegerField(default=85)  # 1 a 100
    nivel_riesgo = models.CharField(max_length=20, choices=NivelRiesgo.choices, default=NivelRiesgo.SALUDABLE)
    desglose_explicabilidad = models.JSONField(default=dict, blank=True)
    accion_recomendada = models.TextField(blank=True)
    
    registrado_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Snapshot de Proyecto'
        verbose_name_plural = 'Snapshots de Proyectos'
        ordering = ['-fecha_corte', '-numero_corte']
        unique_together = ('proyecto', 'numero_corte')

    def __str__(self):
        return f"Snapshot #{self.numero_corte} - {self.proyecto.nombre} ({self.fecha_corte}): {self.phs} pts"

