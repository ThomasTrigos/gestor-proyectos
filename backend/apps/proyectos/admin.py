from django.contrib import admin
from .models import Proyecto, ProyectoEquipo, EstadoProyecto, ProyectoDia0, ProyectoSnapshot

class ProyectoEquipoInline(admin.TabularInline):
    model = ProyectoEquipo
    extra = 1

class EstadoProyectoInline(admin.TabularInline):
    model = EstadoProyecto
    extra = 0
    readonly_fields = ('estado', 'fecha_cambio', 'razon_cambio', 'cambiado_por')

@admin.register(Proyecto)
class ProyectoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'lider_proyecto', 'phs_actual', 'nivel_riesgo_actual', 'created_at')
    search_fields = ('nombre', 'empresa__nombre_comercial')
    inlines = [ProyectoEquipoInline, EstadoProyectoInline]

@admin.register(ProyectoDia0)
class ProyectoDia0Admin(admin.ModelAdmin):
    list_display = ('proyecto', 'pm_experiencia_anios', 'modalidad_contratacion', 'categoria_proyecto', 'phs_inicial', 'created_at')
    search_fields = ('proyecto__nombre',)

@admin.register(ProyectoSnapshot)
class ProyectoSnapshotAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'numero_corte', 'fecha_corte', 'phs', 'nivel_riesgo', 'spi', 'cpi', 'csi', 'rfc')
    list_filter = ('nivel_riesgo', 'fecha_corte')
    search_fields = ('proyecto__nombre',)

