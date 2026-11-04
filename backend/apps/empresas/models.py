import uuid
from django.db import models

class Empresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    razon_social = models.CharField(max_length=200)
    nombre_comercial = models.CharField(max_length=200)
    cuit = models.CharField(max_length=20, unique=True)
    direccion = models.TextField()
    telefono = models.CharField(max_length=50)
    email = models.EmailField()
    sitio_web = models.URLField(null=True, blank=True)
    notas = models.TextField(null=True, blank=True)
    eliminado = models.BooleanField(default=False, db_index=True)
    fecha_eliminacion = models.DateTimeField(null=True, blank=True)
    eliminado_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL, related_name='empresas_eliminadas')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return self.nombre_comercial or self.razon_social

class ContactoEmpresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='contactos')
    nombre = models.CharField(max_length=150)
    cargo = models.CharField(max_length=100)
    telefono = models.CharField(max_length=50)
    email = models.EmailField()
    es_principal = models.BooleanField(default=False)
    notas = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = 'Contacto de Empresa'
        verbose_name_plural = 'Contactos de Empresas'

    def __str__(self):
        return f"{self.nombre} - {self.empresa.nombre_comercial}"
