import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Personal(models.Model):
    ROLES = (
        ('RRHH', 'Recursos Humanos'),
        ('GERENTE', 'Gerente'),
        ('EMPLEADO', 'Empleado'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='personal')
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=50, null=True, blank=True)
    cargo = models.CharField(max_length=100)
    rol = models.CharField(max_length=20, choices=ROLES)
    token_confirmacion = models.UUIDField(default=uuid.uuid4, unique=True)
    activo = models.BooleanField(default=True)
    fecha_ingreso = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Personal'
        verbose_name_plural = 'Personal'

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.get_rol_display()})"


def obtener_vencimiento_default():
    return timezone.now() + timedelta(hours=48)


class Invitacion(models.Model):
    ESTADOS = (
        ('PENDIENTE', 'Pendiente de Registro'),
        ('REGISTRADO', 'Registrado (Esperando Aprobación RRHH)'),
        ('APROBADO', 'Aprobado y Activo'),
        ('EXPIRADA', 'Expirada'),
        ('REVOCADA', 'Revocada'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, default='Empleado')
    rol = models.CharField(max_length=20, choices=Personal.ROLES, default='EMPLEADO')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    creado_por = models.ForeignKey(Personal, null=True, blank=True, on_delete=models.SET_NULL, related_name='invitaciones_creadas')
    fecha_expiracion = models.DateTimeField(default=obtener_vencimiento_default)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    aprobado_por = models.ForeignKey(Personal, null=True, blank=True, on_delete=models.SET_NULL, related_name='invitaciones_aprobadas')
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    personal_creado = models.OneToOneField(Personal, null=True, blank=True, on_delete=models.SET_NULL, related_name='invitacion_origen')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Invitación'
        verbose_name_plural = 'Invitaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitación a {self.email} ({self.get_rol_display()}) - {self.get_estado_display()}"

    def esta_expirada(self) -> bool:
        if self.estado in ['APROBADO', 'REVOCADA']:
            return False
        if timezone.now() > self.fecha_expiracion:
            if self.estado != 'EXPIRADA':
                self.estado = 'EXPIRADA'
                self.save(update_fields=['estado'])
            return True
        return False
