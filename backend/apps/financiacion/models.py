import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Financiacion(models.Model):
    TIPOS_TRABAJO = (
        ('CONSULTORIA', 'Consultoría'),
        ('DESARROLLO', 'Desarrollo'),
        ('IMPLEMENTACION_CAPACITACION', 'Implementación + Capacitación'),
        ('OTRO', 'Otro'),
    )
    FORMAS_PAGO = (
        ('MES_ADELANTADO', 'Mes Adelantado'),
        ('MES_VENCIDO', 'Mes Vencido'),
        ('ANUAL_ADELANTADO', 'Anual Adelantado'),
        ('PLAN_CUOTAS', 'Plan en Cuotas'),
        ('ENTREGABLES', 'Por Entregables'),
        ('OTROS', 'Otros'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, related_name='financiaciones', null=True, blank=True)
    proyecto = models.ForeignKey('proyectos.Proyecto', on_delete=models.CASCADE, related_name='financiaciones')
    tipo_trabajo = models.CharField(max_length=50, choices=TIPOS_TRABAJO, default='DESARROLLO')
    tipo_trabajo_otro = models.CharField(max_length=200, null=True, blank=True)
    monto_total = models.DecimalField(max_digits=15, decimal_places=2)
    monto_usd = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cotizacion_usd = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    moneda = models.CharField(max_length=3, default='ARS')
    forma_pago = models.CharField(max_length=150, default='PLAN_CUOTAS')
    cantidad_cuotas = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text="Cantidad máxima permitida: 120 cuotas"
    )
    detalle_entregables = models.TextField(null=True, blank=True)
    detalle_otros = models.TextField(null=True, blank=True)
    fecha_acuerdo = models.DateField()
    notas = models.TextField(null=True, blank=True)
    
    # Notificaciones y avisos
    aviso_email_empresa = models.BooleanField(default=False)
    recordatorio_verificar_cobro = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Financiación'
        verbose_name_plural = 'Financiaciones'

    def save(self, *args, **kwargs):
        if not self.empresa and self.proyecto and hasattr(self.proyecto, 'empresa'):
            self.empresa = self.proyecto.empresa
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.proyecto.nombre} - {self.monto_total} {self.moneda}"

class CuotaPago(models.Model):
    TIPOS_PAGO = (
        ('CUOTA', 'Cuota'),
        ('ENTREGABLE', 'Entregable'),
    )
    MODALIDADES = (
        ('ADELANTADO', 'Por Adelantado'),
        ('VENCIDO', 'Por Vencido'),
    )
    ESTADOS = (
        ('EN_ESPERA', 'En espera'),
        ('PAGADO', 'Pagado'),
        ('VERIFICANDOSE', 'Verificándose'),
        ('IMPAGO', 'Impago'),
        ('PENDIENTE', 'Pendiente'),
        ('VENCIDO', 'Vencido'),
        ('ANULADO', 'Anulado'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    financiacion = models.ForeignKey(Financiacion, on_delete=models.CASCADE, related_name='cuotas')
    tipo_pago = models.CharField(max_length=20, choices=TIPOS_PAGO, default='CUOTA')
    numero_cuota = models.PositiveIntegerField(null=True, blank=True)
    entregable = models.CharField(max_length=200, null=True, blank=True)
    detalle = models.TextField(null=True, blank=True)
    monto = models.DecimalField(max_digits=15, decimal_places=2)
    monto_pagado = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    moneda = models.CharField(max_length=3, default='ARS')
    fecha_pago = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    fecha_aviso = models.DateField(null=True, blank=True)
    modalidad = models.CharField(max_length=20, choices=MODALIDADES, default='VENCIDO')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='EN_ESPERA')
    comprobante = models.CharField(max_length=200, null=True, blank=True)
    
    # Pagos en dólares (USD)
    pago_en_dolares = models.BooleanField(default=False)
    monto_usd = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cotizacion_usd = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)

    class Meta:
        verbose_name = 'Pago / Cuota de Financiación'
        verbose_name_plural = 'Pagos / Cuotas de Financiación'
        ordering = ['numero_cuota', 'fecha_pago', 'fecha_vencimiento']

    def save(self, *args, **kwargs):
        if self.modalidad == 'ADELANTADO':
            self.estado = 'PAGADO'
        if not self.fecha_vencimiento and self.fecha_pago:
            self.fecha_vencimiento = self.fecha_pago
        elif not self.fecha_pago and self.fecha_vencimiento:
            self.fecha_pago = self.fecha_vencimiento
        super().save(*args, **kwargs)

    def __str__(self):
        desc = f"Cuota #{self.numero_cuota}" if self.tipo_pago == 'CUOTA' else (self.entregable or 'Entregable')
        return f"{desc}: {self.monto} {self.moneda} ({self.estado})"
