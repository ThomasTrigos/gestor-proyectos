from decimal import Decimal
from django.test import TestCase
from apps.empresas.models import Empresa
from apps.proyectos.models import Proyecto
from apps.financiacion.models import Financiacion, CuotaPago
from apps.financiacion.serializers import FinanciacionSerializer, CuotaPagoSerializer

class FinanciacionDolaresTestCase(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(
            razon_social="Tech Solutions S.A.",
            nombre_comercial="TechSolutions",
            cuit="30-71234567-9",
            email="contacto@techsolutions.com",
            telefono="1144556677"
        )
        self.proyecto = Proyecto.objects.create(
            nombre="ERP Custom",
            descripcion="Desarrollo ERP",
            empresa=self.empresa,
            tipo_servicio=["DESARROLLO"]
        )

    def test_crear_financiacion_con_cuotas_usd(self):
        data = {
            'empresa': self.empresa.id,
            'proyecto': self.proyecto.id,
            'tipo_trabajo': 'DESARROLLO',
            'monto_total': Decimal('2500000.00'),
            'moneda': 'ARS',
            'forma_pago': 'PLAN_CUOTAS',
            'fecha_acuerdo': '2026-09-15',
            'cuotas': [
                {
                    'tipo_pago': 'CUOTA',
                    'numero_cuota': 1,
                    'monto': Decimal('1250000.00'),
                    'moneda': 'ARS',
                    'fecha_pago': '2026-10-15',
                    'pago_en_dolares': True,
                    'monto_usd': Decimal('1000.00'),
                    'cotizacion_usd': Decimal('1250.0000'),
                    'estado': 'EN_ESPERA',
                    'modalidad': 'VENCIDO'
                },
                {
                    'tipo_pago': 'CUOTA',
                    'numero_cuota': 2,
                    'monto': Decimal('1250000.00'),
                    'moneda': 'ARS',
                    'fecha_pago': '2026-11-15',
                    'pago_en_dolares': True,
                    'monto_usd': Decimal('961.54'),
                    'cotizacion_usd': Decimal('1300.0000'),
                    'estado': 'EN_ESPERA',
                    'modalidad': 'VENCIDO'
                }
            ]
        }

        serializer = FinanciacionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        financiacion = serializer.save()

        self.assertEqual(financiacion.cuotas.count(), 2)
        c1 = financiacion.cuotas.get(numero_cuota=1)
        self.assertTrue(c1.pago_en_dolares)
        self.assertEqual(c1.monto_usd, Decimal('1000.00'))
        self.assertEqual(c1.cotizacion_usd, Decimal('1250.0000'))

        c2 = financiacion.cuotas.get(numero_cuota=2)
        self.assertTrue(c2.pago_en_dolares)
        self.assertEqual(c2.monto_usd, Decimal('961.54'))
        self.assertEqual(c2.cotizacion_usd, Decimal('1300.0000'))

    def test_cuotas_mixtas_ars_y_usd(self):
        financiacion = Financiacion.objects.create(
            empresa=self.empresa,
            proyecto=self.proyecto,
            tipo_trabajo='CONSULTORIA',
            monto_total=Decimal('1000000.00'),
            moneda='ARS',
            forma_pago='PLAN_CUOTAS',
            fecha_acuerdo='2026-09-15'
        )
        c_pesos = CuotaPago.objects.create(
            financiacion=financiacion,
            tipo_pago='CUOTA',
            numero_cuota=1,
            monto=Decimal('500000.00'),
            moneda='ARS',
            pago_en_dolares=False
        )
        c_usd = CuotaPago.objects.create(
            financiacion=financiacion,
            tipo_pago='CUOTA',
            numero_cuota=2,
            monto=Decimal('500000.00'),
            moneda='ARS',
            pago_en_dolares=True,
            monto_usd=Decimal('400.00'),
            cotizacion_usd=Decimal('1250.0000')
        )

        self.assertFalse(c_pesos.pago_en_dolares)
        self.assertIsNone(c_pesos.monto_usd)
        self.assertTrue(c_usd.pago_en_dolares)
        self.assertEqual(c_usd.monto_usd, Decimal('400.00'))
        self.assertEqual(c_usd.cotizacion_usd, Decimal('1250.0000'))
