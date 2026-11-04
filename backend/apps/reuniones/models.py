import uuid
from django.db import models

class ResultadoReunion(models.TextChoices):
    EXCELENTE = 'EXCELENTE', 'Muy Fructífera / Resolutiva (🟢)'
    BUENA = 'BUENA', 'Constructiva / Estándar (🔵)'
    FRICCION = 'FRICCION', 'Con Fricción / Dudas (🟡)'
    CRITICA = 'CRITICA', 'Tensa / En Conflicto (🔴)'

class Reunion(models.Model):
    TIPOS = (
        ('PRESENCIAL', 'Presencial'),
        ('VIRTUAL', 'Virtual'),
        ('TELEFONICA', 'Telefónica'),
        ('OTRA', 'Otra'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.SET_NULL, null=True, blank=True, related_name='reuniones')
    titulo = models.CharField(max_length=200)
    tipo_reunion = models.CharField(max_length=20, choices=TIPOS)
    descripcion = models.TextField(null=True, blank=True)
    fecha_hora_inicio = models.DateTimeField()
    fecha_hora_fin = models.DateTimeField(null=True, blank=True)
    ubicacion = models.CharField(max_length=300, null=True, blank=True)
    acta = models.TextField(null=True, blank=True)
    resultado = models.CharField(
        max_length=20,
        choices=ResultadoReunion.choices,
        null=True,
        blank=True,
        help_text="Evaluación de cómo fue la reunión (manual o sugerida)"
    )
    compromisos = models.TextField(null=True, blank=True, help_text="Compromisos y acuerdos clave")
    completada = models.BooleanField(default=False)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    eliminado = models.BooleanField(default=False, db_index=True)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    eliminado_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL, related_name='reuniones_eliminadas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Reunión'
        verbose_name_plural = 'Reuniones'

    def __str__(self):
        return self.titulo

class ReunionParticipanteInterno(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reunion = models.ForeignKey(Reunion, on_delete=models.CASCADE, related_name='participantes_internos')
    personal = models.ForeignKey('personal.Personal', on_delete=models.CASCADE)
    asistio = models.BooleanField(null=True, default=None)

    class Meta:
        unique_together = ('reunion', 'personal')
        verbose_name = 'Participante Interno'
        verbose_name_plural = 'Participantes Internos'

class ParticipanteExterno(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reunion = models.ForeignKey(Reunion, on_delete=models.CASCADE, related_name='participantes_externos')
    nombre = models.CharField(max_length=150)
    email = models.EmailField(null=True, blank=True)
    cargo = models.CharField(max_length=100, null=True, blank=True)
    detalles = models.TextField(null=True, blank=True)
    empresa_nombre = models.CharField(max_length=200, null=True, blank=True)
    asistio = models.BooleanField(null=True, default=None)

    class Meta:
        verbose_name = 'Participante Externo'
        verbose_name_plural = 'Participantes Externos'
