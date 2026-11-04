from django.contrib import admin
from .models import Financiacion, CuotaPago

class CuotaPagoInline(admin.TabularInline):
    model = CuotaPago
    extra = 0

@admin.register(Financiacion)
class FinanciacionAdmin(admin.ModelAdmin):
    list_display = ('proyecto', 'monto_total', 'moneda', 'forma_pago', 'fecha_acuerdo')
    inlines = [CuotaPagoInline]
