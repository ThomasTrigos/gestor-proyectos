from rest_framework import viewsets
from .models import Financiacion, CuotaPago
from .serializers import FinanciacionSerializer, CuotaPagoSerializer
from apps.personal.permissions import EsRRHH, EsRRHHoGerente
import calendar
import datetime
from decimal import Decimal, ROUND_HALF_UP

def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return sourcedate.replace(year=year, month=month, day=day)

def ultimo_lunes_del_mes(year, month):
    last_day = calendar.monthrange(year, month)[1]
    d = datetime.date(year, month, last_day)
    while d.weekday() != 0:  # 0 es Lunes
        d -= datetime.timedelta(days=1)
    return d

def redondear_moneda(valor):
    return Decimal(str(valor)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

class FinanciacionViewSet(viewsets.ModelViewSet):
    queryset = Financiacion.objects.all().order_by('-created_at')
    serializer_class = FinanciacionSerializer
    filterset_fields = ['empresa', 'proyecto', 'tipo_trabajo', 'forma_pago', 'moneda']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]

    def perform_create(self, serializer):
        financiacion = serializer.save()
        
        # Si ya se crearon pagos o cuotas anidados en el serializer, no generar por defecto
        if financiacion.cuotas.exists():
            return

        monto_total = financiacion.monto_total
        forma_pago = financiacion.forma_pago
        fecha_acuerdo = financiacion.fecha_acuerdo
        moneda = financiacion.moneda
        
        if forma_pago == 'MES_ADELANTADO':
            monto_cuota = redondear_moneda(monto_total / Decimal(12))
            for i in range(12):
                fecha_vencimiento = add_months(fecha_acuerdo, i)
                fecha_aviso = ultimo_lunes_del_mes(fecha_vencimiento.year, fecha_vencimiento.month)
                CuotaPago.objects.create(
                    financiacion=financiacion,
                    tipo_pago='CUOTA',
                    numero_cuota=i+1,
                    monto=monto_cuota,
                    moneda=moneda,
                    fecha_pago=fecha_vencimiento,
                    fecha_vencimiento=fecha_vencimiento,
                    fecha_aviso=fecha_aviso,
                    modalidad='ADELANTADO',
                    estado='PAGADO'
                )
        elif forma_pago == 'MES_VENCIDO':
            monto_cuota = redondear_moneda(monto_total / Decimal(12))
            for i in range(12):
                fecha_vencimiento = add_months(fecha_acuerdo, i+1)
                fecha_aviso = ultimo_lunes_del_mes(fecha_vencimiento.year, fecha_vencimiento.month)
                CuotaPago.objects.create(
                    financiacion=financiacion,
                    tipo_pago='CUOTA',
                    numero_cuota=i+1,
                    monto=monto_cuota,
                    moneda=moneda,
                    fecha_pago=fecha_vencimiento,
                    fecha_vencimiento=fecha_vencimiento,
                    fecha_aviso=fecha_aviso,
                    modalidad='VENCIDO',
                    estado='EN_ESPERA'
                )
        elif forma_pago == 'ANUAL_ADELANTADO':
            fecha_aviso = ultimo_lunes_del_mes(fecha_acuerdo.year, fecha_acuerdo.month)
            CuotaPago.objects.create(
                financiacion=financiacion,
                tipo_pago='CUOTA',
                numero_cuota=1,
                monto=redondear_moneda(monto_total),
                moneda=moneda,
                fecha_pago=fecha_acuerdo,
                fecha_vencimiento=fecha_acuerdo,
                fecha_aviso=fecha_aviso,
                modalidad='ADELANTADO',
                estado='PAGADO'
            )
        elif forma_pago == 'PLAN_CUOTAS':
            cantidad = financiacion.cantidad_cuotas
            if cantidad and cantidad > 0:
                monto_cuota = redondear_moneda(monto_total / Decimal(cantidad))
                for i in range(cantidad):
                    fecha_vencimiento = add_months(fecha_acuerdo, i)
                    fecha_aviso = ultimo_lunes_del_mes(fecha_vencimiento.year, fecha_vencimiento.month)
                    CuotaPago.objects.create(
                        financiacion=financiacion,
                        tipo_pago='CUOTA',
                        numero_cuota=i+1,
                        monto=monto_cuota,
                        moneda=moneda,
                        fecha_pago=fecha_vencimiento,
                        fecha_vencimiento=fecha_vencimiento,
                        fecha_aviso=fecha_aviso,
                        modalidad='VENCIDO',
                        estado='EN_ESPERA'
                    )

class CuotaPagoViewSet(viewsets.ModelViewSet):
    queryset = CuotaPago.objects.all().order_by('numero_cuota')
    serializer_class = CuotaPagoSerializer
    filterset_fields = ['financiacion', 'estado']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]
