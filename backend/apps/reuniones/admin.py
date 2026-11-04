from django.contrib import admin
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
