from django.contrib import admin
from .models import AuditLog, Adjunto, Recordatorio, ConfiguracionEmail, ConfiguracionIA

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('tabla', 'accion', 'campo', 'fecha')
    list_filter = ('accion', 'tabla', 'fecha')
    search_fields = ('tabla', 'campo')

@admin.register(Adjunto)
class AdjuntoAdmin(admin.ModelAdmin):
    list_display = ('nombre_original', 'tipo_mime', 'tamanio', 'created_at')

@admin.register(Recordatorio)
class RecordatorioAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'usuario', 'fecha', 'hora', 'prioridad', 'completado')
    list_filter = ('prioridad', 'completado', 'fecha')
    search_fields = ('titulo', 'descripcion')

@admin.register(ConfiguracionEmail)
class ConfiguracionEmailAdmin(admin.ModelAdmin):
    list_display = ('proveedor', 'usuario', 'host', 'port', 'use_tls', 'use_ssl', 'activo', 'updated_at')
    list_filter = ('proveedor', 'activo', 'use_tls', 'use_ssl')
    search_fields = ('usuario', 'host', 'remitente_default')

@admin.register(ConfiguracionIA)
class ConfiguracionIAAdmin(admin.ModelAdmin):
    list_display = ('proveedor', 'nombre', 'modelo', 'es_predeterminado', 'activo', 'updated_at')
    list_filter = ('proveedor', 'es_predeterminado', 'activo')
    search_fields = ('nombre', 'modelo')
