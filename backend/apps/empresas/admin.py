from django.contrib import admin
from .models import Empresa, ContactoEmpresa

class ContactoEmpresaInline(admin.TabularInline):
    model = ContactoEmpresa
    extra = 1

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre_comercial', 'cuit', 'email', 'telefono')
    search_fields = ('razon_social', 'nombre_comercial', 'cuit')
    inlines = [ContactoEmpresaInline]
