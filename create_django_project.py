import os
import pathlib

BASE_DIR = pathlib.Path(r"C:\Users\usuario\.gemini\antigravity\scratch\gestor-proyectos\backend")

FILES = {
    "requirements.txt": """Django>=5.0,<6.0
djangorestframework>=3.15,<4.0
djangorestframework-simplejwt>=5.3,<6.0
django-filter>=24.0
django-cors-headers>=4.3
psycopg2-binary>=2.9
python-dotenv>=1.0
icalendar>=5.0
pillow>=10.0
""",
    ".env.example": """DEBUG=True
SECRET_KEY=your-secret-key-here
DB_ENGINE=django.db.backends.postgresql
DB_NAME=gestor
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
""",
    "manage.py": """#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
""",
    "config/__init__.py": "",
    "config/asgi.py": """import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_asgi_application()
""",
    "config/wsgi.py": """import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
""",
    "config/settings.py": """import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    
    'apps.core',
    'apps.empresas',
    'apps.personal',
    'apps.proyectos',
    'apps.tareas',
    'apps.reuniones',
    'apps.financiacion',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.CurrentUserMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', BASE_DIR / 'db.sqlite3'),
    }
}
if os.getenv('DB_ENGINE') == 'django.db.backends.postgresql':
    DATABASES['default'].update({
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    })

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

CORS_ALLOW_ALL_ORIGINS = True
""",
    "config/urls.py": """from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('api/core/', include('apps.core.urls')),
    path('api/empresas/', include('apps.empresas.urls')),
    path('api/personal/', include('apps.personal.urls')),
    path('api/proyectos/', include('apps.proyectos.urls')),
    path('api/tareas/', include('apps.tareas.urls')),
    path('api/reuniones/', include('apps.reuniones.urls')),
    path('api/financiacion/', include('apps.financiacion.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
""",
    "apps/__init__.py": "",
    "apps/core/__init__.py": "",
    "apps/core/apps.py": """from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Núcleo'

    def ready(self):
        import apps.core.signals
""",
    "apps/core/middleware.py": """import threading

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user if hasattr(request, 'user') else None
        response = self.get_response(request)
        return response
""",
    "apps/core/models.py": """import uuid
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
    tabla = models.CharField(max_length=100)
    registro_id = models.UUIDField()
    accion = models.CharField(max_length=20, choices=ACCIONES)
    campo = models.CharField(max_length=100, null=True, blank=True)
    valor_anterior = models.TextField(null=True, blank=True)
    valor_nuevo = models.TextField(null=True, blank=True)
    usuario_id = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    fecha = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'
        ordering = ['-fecha']

class Adjunto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_original = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='adjuntos/%Y/%m/')
    tipo_mime = models.CharField(max_length=100)
    tamanio = models.BigIntegerField()
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    subido_por = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Adjunto'
        verbose_name_plural = 'Adjuntos'
        ordering = ['-created_at']
""",
    "apps/core/signals.py": """from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.apps import apps
from apps.core.models import AuditLog
from apps.core.middleware import get_current_user

def get_personal_from_user(user):
    if not user or not user.is_authenticated:
        return None
    from apps.personal.models import Personal
    try:
        return user.personal
    except (Personal.DoesNotExist, AttributeError):
        return None

# Implement dynamic registration for tracked models if necessary
""",
    "apps/core/admin.py": """from django.contrib import admin
from .models import AuditLog, Adjunto

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('tabla', 'accion', 'campo', 'fecha')
    list_filter = ('accion', 'tabla', 'fecha')
    search_fields = ('tabla', 'campo')

@admin.register(Adjunto)
class AdjuntoAdmin(admin.ModelAdmin):
    list_display = ('nombre_original', 'tipo_mime', 'tamanio', 'created_at')
""",
    "apps/core/serializers.py": """from rest_framework import serializers
from .models import Adjunto, AuditLog

class AdjuntoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adjunto
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
""",
    "apps/core/views.py": """from rest_framework import viewsets
from .models import Adjunto, AuditLog
from .serializers import AdjuntoSerializer, AuditLogSerializer

class AdjuntoViewSet(viewsets.ModelViewSet):
    queryset = Adjunto.objects.all()
    serializer_class = AdjuntoSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
""",
    "apps/core/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdjuntoViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'adjuntos', AdjuntoViewSet)
router.register(r'audit', AuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/empresas/__init__.py": "",
    "apps/empresas/apps.py": """from django.apps import AppConfig

class EmpresasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.empresas'
    verbose_name = 'Empresas'
""",
    "apps/empresas/models.py": """import uuid
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
""",
    "apps/empresas/admin.py": """from django.contrib import admin
from .models import Empresa, ContactoEmpresa

class ContactoEmpresaInline(admin.TabularInline):
    model = ContactoEmpresa
    extra = 1

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre_comercial', 'cuit', 'email', 'telefono')
    search_fields = ('razon_social', 'nombre_comercial', 'cuit')
    inlines = [ContactoEmpresaInline]
""",
    "apps/empresas/serializers.py": """from rest_framework import serializers
from .models import Empresa, ContactoEmpresa

class ContactoEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactoEmpresa
        fields = '__all__'
        read_only_fields = ('empresa',)

class EmpresaSerializer(serializers.ModelSerializer):
    contactos = ContactoEmpresaSerializer(many=True)

    class Meta:
        model = Empresa
        fields = '__all__'

    def validate(self, data):
        contactos = self.initial_data.get('contactos', [])
        if not contactos:
            raise serializers.ValidationError({"contactos": "Debe proporcionar al menos un contacto."})
        return data

    def create(self, validated_data):
        contactos_data = self.initial_data.get('contactos', [])
        empresa = Empresa.objects.create(**validated_data)
        for c_data in contactos_data:
            ContactoEmpresa.objects.create(empresa=empresa, **c_data)
        return empresa

    def update(self, instance, validated_data):
        contactos_data = self.initial_data.get('contactos', [])
        if contactos_data:
            instance.contactos.all().delete()
            for c_data in contactos_data:
                ContactoEmpresa.objects.create(empresa=instance, **c_data)
        return super().update(instance, validated_data)
""",
    "apps/empresas/views.py": """from rest_framework import viewsets
from .models import Empresa, ContactoEmpresa
from .serializers import EmpresaSerializer, ContactoEmpresaSerializer

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filterset_fields = ('cuit', 'nombre_comercial')

class ContactoEmpresaViewSet(viewsets.ModelViewSet):
    queryset = ContactoEmpresa.objects.all()
    serializer_class = ContactoEmpresaSerializer
""",
    "apps/empresas/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet, ContactoEmpresaViewSet

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'contactos', ContactoEmpresaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/empresas/tests.py": "from django.test import TestCase\n",
    "apps/personal/__init__.py": "",
    "apps/personal/apps.py": """from django.apps import AppConfig

class PersonalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.personal'
    verbose_name = 'Personal'
""",
    "apps/personal/models.py": """import uuid
from django.db import models
from django.contrib.auth.models import User

class Personal(models.Model):
    ROLES = (
        ('RRHH', 'Recursos Humanos'),
        ('GERENTE', 'Gerente'),
        ('PROGRAMADOR', 'Programador'),
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
        return f"{self.nombre} {self.apellido}"
""",
    "apps/personal/admin.py": """from django.contrib import admin
from .models import Personal

@admin.register(Personal)
class PersonalAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'email', 'rol', 'activo')
    list_filter = ('rol', 'activo')
    search_fields = ('nombre', 'apellido', 'email')
""",
    "apps/personal/serializers.py": """from rest_framework import serializers
from .models import Personal

class PersonalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personal
        fields = '__all__'

class PersonalListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personal
        fields = ('id', 'nombre', 'apellido', 'email', 'rol', 'activo')
""",
    "apps/personal/views.py": """from rest_framework import viewsets
from .models import Personal
from .serializers import PersonalSerializer, PersonalListSerializer

class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PersonalListSerializer
        return PersonalSerializer
""",
    "apps/personal/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonalViewSet

router = DefaultRouter()
router.register(r'', PersonalViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/personal/authentication.py": """from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import Personal
import uuid

class TokenConfirmacionAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.query_params.get('token')
        if not token:
            return None
        try:
            val = uuid.UUID(token)
            personal = Personal.objects.get(token_confirmacion=val)
            return (personal, None)
        except (ValueError, Personal.DoesNotExist):
            raise AuthenticationFailed('Token inválido')
""",
    "apps/personal/permissions.py": """from rest_framework.permissions import BasePermission

class EsRRHH(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated: return False
        return hasattr(user, 'personal') and user.personal.rol == 'RRHH'

class EsGerente(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated: return False
        return hasattr(user, 'personal') and user.personal.rol == 'GERENTE'

class EsRRHHoGerente(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated: return False
        return hasattr(user, 'personal') and user.personal.rol in ['RRHH', 'GERENTE']

class EsProgramador(BasePermission):
    def has_permission(self, request, view):
        from .models import Personal
        if isinstance(request.user, Personal):
            return request.user.rol == 'PROGRAMADOR'
        user = request.user
        if not user or not user.is_authenticated: return False
        return hasattr(user, 'personal') and user.personal.rol == 'PROGRAMADOR'
""",
    "apps/personal/tests.py": "from django.test import TestCase\n",
    "apps/proyectos/__init__.py": "",
    "apps/proyectos/apps.py": """from django.apps import AppConfig

class ProyectosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.proyectos'
    verbose_name = 'Proyectos'
""",
    "apps/proyectos/models.py": """import uuid
from django.db import models

class Proyecto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, related_name='proyectos')
    tipo_servicio = models.JSONField(default=list) # List of CONSULTORIA/DESARROLLO/IMPLEMENTACION_CAPACITACION
    lider_proyecto = models.ForeignKey('personal.Personal', null=True, blank=True, on_delete=models.SET_NULL)
    fecha_inicio_estimada = models.DateField(null=True, blank=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    notas = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Proyecto'
        verbose_name_plural = 'Proyectos'

    def __str__(self):
        return self.nombre

class ProyectoEquipo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='equipo_asignaciones')
    personal = models.ForeignKey('personal.Personal', on_delete=models.CASCADE, related_name='proyectos_asignados')
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
""",
    "apps/proyectos/state_machine.py": """from django.core.exceptions import ValidationError

TRANSICIONES_VALIDAS = {
    'OPORTUNIDAD': ['TRABAJANDO', 'PAUSADO', 'CAIDO'],
    'TRABAJANDO': ['PAUSADO', 'CONCRETADO', 'CAIDO'],
    'PAUSADO': ['TRABAJANDO', 'CAIDO'],
    'CONCRETADO': [],
    'CAIDO': []
}

def validar_transicion(estado_actual, nuevo_estado):
    if not estado_actual:
        if nuevo_estado == 'OPORTUNIDAD':
            return True
        raise ValidationError("El proyecto debe iniciar en estado OPORTUNIDAD")
    if nuevo_estado not in TRANSICIONES_VALIDAS.get(estado_actual, []):
        raise ValidationError(f"Transición inválida de {estado_actual} a {nuevo_estado}")
    return True
""",
    "apps/proyectos/admin.py": """from django.contrib import admin
from .models import Proyecto, ProyectoEquipo, EstadoProyecto

class ProyectoEquipoInline(admin.TabularInline):
    model = ProyectoEquipo
    extra = 1

class EstadoProyectoInline(admin.TabularInline):
    model = EstadoProyecto
    extra = 0
    readonly_fields = ('estado', 'fecha_cambio', 'razon_cambio', 'cambiado_por')

@admin.register(Proyecto)
class ProyectoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'lider_proyecto', 'created_at')
    search_fields = ('nombre', 'empresa__nombre_comercial')
    inlines = [ProyectoEquipoInline, EstadoProyectoInline]
""",
    "apps/proyectos/serializers.py": """from rest_framework import serializers
from .models import Proyecto, ProyectoEquipo, EstadoProyecto

class EstadoProyectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoProyecto
        fields = '__all__'

class ProyectoEquipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProyectoEquipo
        fields = '__all__'

class ProyectoSerializer(serializers.ModelSerializer):
    estados = EstadoProyectoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Proyecto
        fields = '__all__'

class CambiarEstadoSerializer(serializers.Serializer):
    estado = serializers.CharField()
    razon_cambio = serializers.CharField()
""",
    "apps/proyectos/views.py": """from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Proyecto, EstadoProyecto, ProyectoEquipo
from .serializers import ProyectoSerializer, CambiarEstadoSerializer, ProyectoEquipoSerializer
from .state_machine import validar_transicion

class ProyectoViewSet(viewsets.ModelViewSet):
    queryset = Proyecto.objects.all()
    serializer_class = ProyectoSerializer

    def perform_create(self, serializer):
        proyecto = serializer.save()
        user = self.request.user
        personal = user.personal if hasattr(user, 'personal') else None
        EstadoProyecto.objects.create(
            proyecto=proyecto,
            estado='OPORTUNIDAD',
            razon_cambio='Creación inicial',
            cambiado_por=personal
        )

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        proyecto = self.get_object()
        serializer = CambiarEstadoSerializer(data=request.data)
        if serializer.is_valid():
            nuevo_estado = serializer.validated_data['estado']
            razon = serializer.validated_data['razon_cambio']
            
            estado_actual_obj = proyecto.estados.first()
            estado_actual = estado_actual_obj.estado if estado_actual_obj else None
            
            try:
                validar_transicion(estado_actual, nuevo_estado)
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            personal = user.personal if hasattr(user, 'personal') else None

            EstadoProyecto.objects.create(
                proyecto=proyecto,
                estado=nuevo_estado,
                razon_cambio=razon,
                cambiado_por=personal
            )
            return Response({'status': 'estado cambiado'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def asignar_equipo(self, request, pk=None):
        proyecto = self.get_object()
        serializer = ProyectoEquipoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(proyecto=proyecto)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
""",
    "apps/proyectos/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProyectoViewSet

router = DefaultRouter()
router.register(r'', ProyectoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/proyectos/tests.py": "from django.test import TestCase\n",
    "apps/tareas/__init__.py": "",
    "apps/tareas/apps.py": """from django.apps import AppConfig

class TareasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tareas'
    verbose_name = 'Tareas'
""",
    "apps/tareas/models.py": """import uuid
from django.db import models

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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='tareas')
    asignado_a = models.ForeignKey('personal.Personal', on_delete=models.CASCADE, related_name='tareas_asignadas')
    asignado_por = models.ForeignKey('personal.Personal', on_delete=models.SET_NULL, null=True, related_name='tareas_creadas')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_limite = models.DateField()
    fecha_leido = models.DateTimeField(null=True, blank=True)
    fecha_inicio_trabajo = models.DateTimeField(null=True, blank=True)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    notificado_email = models.BooleanField(default=False)
    notificado_icalendar = models.BooleanField(default=False)
    notas = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tarea'
        verbose_name_plural = 'Tareas'

    def __str__(self):
        return self.titulo
""",
    "apps/tareas/admin.py": """from django.contrib import admin
from .models import Tarea

@admin.register(Tarea)
class TareaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'proyecto', 'asignado_a', 'prioridad', 'estado', 'fecha_limite')
    list_filter = ('estado', 'prioridad', 'proyecto')
    search_fields = ('titulo', 'proyecto__nombre')
""",
    "apps/tareas/serializers.py": """from rest_framework import serializers
from .models import Tarea

class TareaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarea
        fields = '__all__'

class TareaConfirmacionSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(choices=['LEER', 'INICIAR', 'COMPLETAR'])
""",
    "apps/tareas/views.py": """from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Tarea
from .serializers import TareaSerializer, TareaConfirmacionSerializer
from apps.personal.authentication import TokenConfirmacionAuthentication

class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.all()
    serializer_class = TareaSerializer

class TareaConfirmacionView(viewsets.ViewSet):
    authentication_classes = [TokenConfirmacionAuthentication]
    
    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        try:
            tarea = Tarea.objects.get(pk=pk, asignado_a=request.user)
        except Tarea.DoesNotExist:
            return Response({'error': 'No encontrada'}, status=404)
            
        serializer = TareaConfirmacionSerializer(data=request.data)
        if serializer.is_valid():
            accion = serializer.validated_data['accion']
            now = timezone.now()
            if accion == 'LEER' and not tarea.fecha_leido:
                tarea.fecha_leido = now
            elif accion == 'INICIAR':
                if not tarea.fecha_leido: tarea.fecha_leido = now
                if not tarea.fecha_inicio_trabajo: tarea.fecha_inicio_trabajo = now
                tarea.estado = 'EN_PROGRESO'
            elif accion == 'COMPLETAR':
                tarea.fecha_completada = now
                tarea.estado = 'COMPLETADA'
            tarea.save()
            return Response({'status': 'ok'})
        return Response(serializer.errors, status=400)

class MisTareasView(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [TokenConfirmacionAuthentication]
    serializer_class = TareaSerializer
    
    def get_queryset(self):
        return Tarea.objects.filter(asignado_a=self.request.user)
""",
    "apps/tareas/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TareaViewSet, TareaConfirmacionView, MisTareasView

router = DefaultRouter()
router.register(r'crud', TareaViewSet)
router.register(r'confirmar', TareaConfirmacionView, basename='tarea-confirmacion')
router.register(r'mis-tareas', MisTareasView, basename='mis-tareas')

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/tareas/tests.py": "from django.test import TestCase\n",
    "apps/reuniones/__init__.py": "",
    "apps/reuniones/apps.py": """from django.apps import AppConfig

class ReunionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reuniones'
    verbose_name = 'Reuniones'
""",
    "apps/reuniones/models.py": """import uuid
from django.db import models

class Reunion(models.Model):
    TIPOS = (
        ('PRESENCIAL', 'Presencial'),
        ('VIRTUAL', 'Virtual'),
        ('TELEFONICA', 'Telefónica'),
        ('OTRA', 'Otra'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='reuniones')
    titulo = models.CharField(max_length=200)
    tipo_reunion = models.CharField(max_length=20, choices=TIPOS)
    descripcion = models.TextField(null=True, blank=True)
    fecha_hora_inicio = models.DateTimeField()
    fecha_hora_fin = models.DateTimeField()
    ubicacion = models.CharField(max_length=300, null=True, blank=True)
    acta = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
    empresa_nombre = models.CharField(max_length=200)
    asistio = models.BooleanField(null=True, default=None)

    class Meta:
        verbose_name = 'Participante Externo'
        verbose_name_plural = 'Participantes Externos'
""",
    "apps/reuniones/admin.py": """from django.contrib import admin
from .models import Reunion, ReunionParticipanteInterno, ParticipanteExterno

class InternosInline(admin.TabularInline):
    model = ReunionParticipanteInterno
    extra = 1

class ExternosInline(admin.TabularInline):
    model = ParticipanteExterno
    extra = 1

@admin.register(Reunion)
class ReunionAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'proyecto', 'tipo_reunion', 'fecha_hora_inicio')
    list_filter = ('tipo_reunion', 'proyecto')
    inlines = [InternosInline, ExternosInline]
""",
    "apps/reuniones/serializers.py": """from rest_framework import serializers
from .models import Reunion, ReunionParticipanteInterno, ParticipanteExterno

class ParticipanteExternoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipanteExterno
        fields = '__all__'

class ReunionParticipanteInternoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReunionParticipanteInterno
        fields = '__all__'

class ReunionSerializer(serializers.ModelSerializer):
    participantes_internos = ReunionParticipanteInternoSerializer(many=True, read_only=True)
    participantes_externos = ParticipanteExternoSerializer(many=True, read_only=True)

    class Meta:
        model = Reunion
        fields = '__all__'
""",
    "apps/reuniones/views.py": """from rest_framework import viewsets
from .models import Reunion
from .serializers import ReunionSerializer

class ReunionViewSet(viewsets.ModelViewSet):
    queryset = Reunion.objects.all()
    serializer_class = ReunionSerializer
""",
    "apps/reuniones/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReunionViewSet

router = DefaultRouter()
router.register(r'', ReunionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/reuniones/tests.py": "from django.test import TestCase\n",
    "apps/financiacion/__init__.py": "",
    "apps/financiacion/apps.py": """from django.apps import AppConfig

class FinanciacionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.financiacion'
    verbose_name = 'Financiación'
""",
    "apps/financiacion/models.py": """import uuid
from django.db import models

class Financiacion(models.Model):
    FORMAS_PAGO = (
        ('MES_ADELANTADO', 'Mes Adelantado'),
        ('MES_VENCIDO', 'Mes Vencido'),
        ('ANUAL_ADELANTADO', 'Anual Adelantado'),
        ('PLAN_CUOTAS', 'Plan en Cuotas'),
        ('ENTREGABLES', 'Por Entregables'),
        ('OTROS', 'Otros'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='financiaciones')
    monto_total = models.DecimalField(max_digits=15, decimal_places=2)
    moneda = models.CharField(max_length=3, default='ARS')
    forma_pago = models.CharField(max_length=30, choices=FORMAS_PAGO)
    cantidad_cuotas = models.PositiveIntegerField(null=True, blank=True)
    detalle_entregables = models.TextField(null=True, blank=True)
    detalle_otros = models.TextField(null=True, blank=True)
    fecha_acuerdo = models.DateField()
    notas = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Financiación'
        verbose_name_plural = 'Financiaciones'

    def __str__(self):
        return f"{self.proyecto.nombre} - {self.monto_total} {self.moneda}"

class CuotaPago(models.Model):
    ESTADOS = (
        ('PENDIENTE', 'Pendiente'),
        ('PAGADO', 'Pagado'),
        ('VENCIDO', 'Vencido'),
        ('ANULADO', 'Anulado'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    financiacion = models.ForeignKey(Financiacion, on_delete=models.CASCADE, related_name='cuotas')
    numero_cuota = models.PositiveIntegerField()
    monto = models.DecimalField(max_digits=15, decimal_places=2)
    moneda = models.CharField(max_length=3)
    fecha_vencimiento = models.DateField()
    fecha_pago = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    comprobante = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        verbose_name = 'Cuota de Pago'
        verbose_name_plural = 'Cuotas de Pago'
        ordering = ['numero_cuota']
""",
    "apps/financiacion/admin.py": """from django.contrib import admin
from .models import Financiacion, CuotaPago

class CuotaPagoInline(admin.TabularInline):
    model = CuotaPago
    extra = 0

@admin.register(Financiacion)
class FinanciacionAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'monto_total', 'moneda', 'forma_pago', 'fecha_acuerdo')
    inlines = [CuotaPagoInline]
""",
    "apps/financiacion/serializers.py": """from rest_framework import serializers
from .models import Financiacion, CuotaPago

class CuotaPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuotaPago
        fields = '__all__'

class FinanciacionSerializer(serializers.ModelSerializer):
    cuotas = CuotaPagoSerializer(many=True, read_only=True)

    class Meta:
        model = Financiacion
        fields = '__all__'
""",
    "apps/financiacion/views.py": """from rest_framework import viewsets
from .models import Financiacion, CuotaPago
from .serializers import FinanciacionSerializer, CuotaPagoSerializer

class FinanciacionViewSet(viewsets.ModelViewSet):
    queryset = Financiacion.objects.all()
    serializer_class = FinanciacionSerializer

class CuotaPagoViewSet(viewsets.ModelViewSet):
    queryset = CuotaPago.objects.all()
    serializer_class = CuotaPagoSerializer
""",
    "apps/financiacion/urls.py": """from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinanciacionViewSet, CuotaPagoViewSet

router = DefaultRouter()
router.register(r'financiacion', FinanciacionViewSet)
router.register(r'cuotas', CuotaPagoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""",
    "apps/financiacion/tests.py": "from django.test import TestCase\n",
}

for rel_path, content in FILES.items():
    file_path = BASE_DIR / rel_path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Project generated at {BASE_DIR}")
