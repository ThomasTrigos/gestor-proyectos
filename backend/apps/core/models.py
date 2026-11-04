import uuid
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class AuditLog(models.Model):
    ACCIONES = (
        ('CREAR', 'Crear'),
        ('MODIFICAR', 'Modificar'),
        ('ELIMINAR', 'Eliminar'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tabla = models.CharField(max_length=100, db_index=True)
    registro_id = models.UUIDField(db_index=True)
    accion = models.CharField(max_length=20, choices=ACCIONES, db_index=True)
    campo = models.CharField(max_length=100, null=True, blank=True)
    valor_anterior = models.TextField(null=True, blank=True)
    valor_nuevo = models.TextField(null=True, blank=True)
    usuario_id = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['tabla', '-fecha']),
            models.Index(fields=['registro_id', '-fecha']),
        ]


class Adjunto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_original = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='adjuntos/%Y/%m/', null=True, blank=True)
    enlace_externo = models.URLField(max_length=500, null=True, blank=True, help_text="Enlace externo a Google Drive, Dropbox, OneDrive, etc.")
    tipo_mime = models.CharField(max_length=100, default='application/octet-stream')
    tamanio = models.BigIntegerField(default=0)
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    subido_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Adjunto'
        verbose_name_plural = 'Adjuntos'
        ordering = ['-created_at']

class Recordatorio(models.Model):
    PRIORIDADES = (
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey('personal.Personal', on_delete=models.CASCADE, related_name='recordatorios', null=True, blank=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(null=True, blank=True)
    fecha = models.DateField()
    hora = models.TimeField(null=True, blank=True)
    enviar_email_futuro = models.BooleanField(default=False)
    email_destino = models.EmailField(null=True, blank=True)
    email_enviado = models.BooleanField(default=False)
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES, default='MEDIA')
    completado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Recordatorio'
        verbose_name_plural = 'Recordatorios'
        ordering = ['fecha', 'hora', '-created_at']

    def __str__(self):
        return f"{self.titulo} ({self.fecha})"


class ConfiguracionEmail(models.Model):
    PROVEEDORES = (
        ('GMAIL', 'Google Gmail'),
        ('OUTLOOK', 'Microsoft Outlook / Office 365'),
        ('SENDGRID', 'SendGrid'),
        ('BREVO', 'Brevo / Sendinblue'),
        ('MAILJET', 'Mailjet'),
        ('OTRO', 'Servidor SMTP Personalizado'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proveedor = models.CharField(max_length=50, choices=PROVEEDORES, default='GMAIL')
    host = models.CharField(max_length=255, default='smtp.gmail.com')
    port = models.IntegerField(default=587)
    usuario = models.CharField(max_length=255, help_text="Usuario o dirección de correo para autenticación SMTP")
    password_cifrado = models.TextField(help_text="Contraseña cifrada con algoritmo simétrico")
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    remitente_default = models.CharField(max_length=255, default='Gestor de Proyectos <noreply@gestorproyectos.com>')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Email'
        verbose_name_plural = 'Configuraciones de Email'
        ordering = ['-activo', '-updated_at']

    def __str__(self):
        return f"{self.get_proveedor_display()} ({self.usuario}) {'[ACTIVO]' if self.activo else ''}"

    def set_password(self, password_plano: str):
        from apps.core.services.encryption import cifrar_texto
        self.password_cifrado = cifrar_texto(password_plano)

    def get_password(self) -> str:
        from apps.core.services.encryption import descifrar_texto
        return descifrar_texto(self.password_cifrado)

    def save(self, *args, **kwargs):
        if self.activo:
            # Desactivar cualquier otra configuración activa para garantizar una sola activa
            ConfiguracionEmail.objects.exclude(id=self.id).update(activo=False)
        super().save(*args, **kwargs)


class ConfiguracionIA(models.Model):
    PROVEEDORES = (
        ('GEMINI', 'Google Gemini'),
        ('GROK', 'xAI Grok'),
        ('CLAUDE', 'Anthropic Claude'),
        ('OPENAI', 'OpenAI'),
    )

    MODELOS_DEFAULT = {
        'GEMINI': 'gemini-1.5-flash',
        'GROK': 'grok-2-latest',
        'CLAUDE': 'claude-3-5-sonnet-20241022',
        'OPENAI': 'gpt-4o-mini',
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proveedor = models.CharField(max_length=50, choices=PROVEEDORES)
    nombre = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=100, blank=True)
    api_key_cifrada = models.TextField(blank=True, help_text="API key cifrada con algoritmo simétrico")
    es_predeterminado = models.BooleanField(default=False, help_text="Indica si es el motor de IA preferido del sistema")
    activo = models.BooleanField(default=True)
    temperatura = models.FloatField(default=0.2)
    max_tokens = models.IntegerField(default=2048)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Inteligencia Artificial'
        verbose_name_plural = 'Configuraciones de Inteligencia Artificial'
        ordering = ['-es_predeterminado', 'proveedor']

    def __str__(self):
        return f"{self.get_proveedor_display()} - {self.modelo or 'Default'} {'[PREDETERMINADO]' if self.es_predeterminado else ''}"

    def set_api_key(self, api_key_plana: str):
        if api_key_plana:
            from apps.core.services.encryption import cifrar_texto
            self.api_key_cifrada = cifrar_texto(api_key_plana.strip())
        else:
            self.api_key_cifrada = ""

    def get_api_key(self) -> str:
        if not self.api_key_cifrada:
            return ""
        from apps.core.services.encryption import descifrar_texto
        return descifrar_texto(self.api_key_cifrada)

    @property
    def mascara_api_key(self) -> str:
        key = self.get_api_key()
        if not key:
            return ""
        if len(key) <= 8:
            return "••••••••"
        return f"{key[:4]}••••••••{key[-4:]}"

    @property
    def tiene_api_key(self) -> bool:
        return bool(self.api_key_cifrada)

    def save(self, *args, **kwargs):
        if not self.modelo:
            self.modelo = self.MODELOS_DEFAULT.get(self.proveedor, '')
        if not self.nombre:
            prov_dict = dict(self.PROVEEDORES)
            self.nombre = f"{prov_dict.get(self.proveedor, self.proveedor)} ({self.modelo})"
        if self.es_predeterminado:
            ConfiguracionIA.objects.exclude(id=self.id).update(es_predeterminado=False)
        super().save(*args, **kwargs)


