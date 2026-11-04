import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone


def obtener_expiracion_tarea_default():
    return timezone.now() + timedelta(days=30)


class ColumnaKanban(models.Model):
    COLORES = (
        ('slate', 'Gris Pizarra'),
        ('blue', 'Azul'),
        ('amber', 'Ámbar / Naranja'),
        ('emerald', 'Verde Esmeralda'),
        ('purple', 'Violeta'),
        ('rose', 'Rosa / Rojo'),
        ('cyan', 'Cian'),
        ('indigo', 'Índigo'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='columnas_kanban')
    nombre = models.CharField(max_length=100)
    color = models.CharField(max_length=30, choices=COLORES, default='slate')
    orden = models.PositiveIntegerField(default=0)
    estado_asociado = models.CharField(
        max_length=20,
        choices=(
            ('PENDIENTE', 'Pendiente'),
            ('EN_PROGRESO', 'En Progreso'),
            ('COMPLETADA', 'Completada'),
            ('CANCELADA', 'Cancelada'),
        ),
        null=True,
        blank=True,
        help_text="Estado de la tarea al que se mapea automáticamente al mover la tarjeta a esta columna"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Columna Kanban'
        verbose_name_plural = 'Columnas Kanban'
        ordering = ['orden', 'created_at']

    def __str__(self):
        return f"{self.nombre} ({self.proyecto.nombre})"


class Tarea(models.Model):
    PRIORIDADES = (
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente'),
    )
    ESTADOS = (
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    )
    ESTADOS_PROYECTO = (
        ('OPORTUNIDAD', 'Oportunidad (Inicial)'),
        ('TRABAJANDO', 'Trabajando (Ejecución)'),
        ('PAUSADO', 'Pausado'),
        ('SEGUIMIENTO', 'Seguimiento'),
        ('CONCRETADO', 'Concretado'),
        ('CAIDO', 'Caído'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='tareas')
    asignado_a = models.ForeignKey('personal.Personal', on_delete=models.CASCADE, related_name='tareas_asignadas')
    asignado_por = models.ForeignKey('personal.Personal', on_delete=models.SET_NULL, null=True, related_name='tareas_creadas')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    estado_proyecto = models.CharField(
        max_length=20,
        choices=ESTADOS_PROYECTO,
        default='TRABAJANDO',
        help_text="Etapa del proyecto asociada a la tarea"
    )
    columna_kanban = models.ForeignKey(ColumnaKanban, on_delete=models.SET_NULL, null=True, blank=True, related_name='tareas')
    orden_en_columna = models.PositiveIntegerField(default=0)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio = models.DateField(null=True, blank=True, help_text="Fecha planificada de inicio de la tarea (puede ser a futuro)")
    fecha_limite = models.DateField()
    fecha_leido = models.DateTimeField(null=True, blank=True)
    fecha_inicio_trabajo = models.DateTimeField(null=True, blank=True)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    notificado_email = models.BooleanField(default=False)
    notificado_icalendar = models.BooleanField(default=False)
    token_confirmacion = models.UUIDField(default=uuid.uuid4, null=True, blank=True, db_index=True)
    fecha_expiracion_token = models.DateTimeField(default=obtener_expiracion_tarea_default, null=True, blank=True)
    notas = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tarea'
        verbose_name_plural = 'Tareas'
        ordering = ['orden_en_columna', '-created_at']

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.estado_proyecto and self.proyecto:
            est = self.proyecto.estados.first()
            self.estado_proyecto = est.estado if est else 'TRABAJANDO'
        super().save(*args, **kwargs)
