from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.core.models import ConfiguracionEmail, ConfiguracionIA
from apps.core.services.encryption import cifrar_texto, descifrar_texto
from apps.personal.models import Personal
from apps.empresas.models import Empresa
from apps.proyectos.models import Proyecto


class ConfiguracionEmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='gerente1', password='password123')
        self.personal = Personal.objects.create(
            user=self.user,
            nombre='Carlos',
            apellido='Gerente',
            email='gerente@empresa.com',
            cargo='Director de Operaciones',
            rol='GERENTE',
            fecha_ingreso='2025-01-01'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_cifrado_y_descifrado_texto(self):
        original = "PasswordSeguro2026!#"
        cifrado = cifrar_texto(original)
        self.assertNotEqual(cifrado, original)
        self.assertTrue(len(cifrado) > 20)
        descifrado = descifrar_texto(cifrado)
        self.assertEqual(descifrado, original)

    def test_modelo_configuracion_email_cifrado(self):
        config = ConfiguracionEmail(
            proveedor='GMAIL',
            host='smtp.gmail.com',
            port=587,
            usuario='contacto@empresa.com',
            remitente_default='Empresa <contacto@empresa.com>',
            activo=True
        )
        raw_pass = "abcd efgh ijkl mnop"
        config.set_password(raw_pass)
        config.save()

        # En base de datos no debe estar en texto plano
        config_db = ConfiguracionEmail.objects.get(id=config.id)
        self.assertNotEqual(config_db.password_cifrado, raw_pass)
        self.assertEqual(config_db.get_password(), raw_pass)

    def test_solo_una_configuracion_activa_a_la_vez(self):
        c1 = ConfiguracionEmail.objects.create(
            proveedor='GMAIL',
            host='smtp.gmail.com',
            port=587,
            usuario='c1@empresa.com',
            password_cifrado=cifrar_texto('pass1'),
            activo=True
        )
        c2 = ConfiguracionEmail.objects.create(
            proveedor='OUTLOOK',
            host='smtp.office365.com',
            port=587,
            usuario='c2@empresa.com',
            password_cifrado=cifrar_texto('pass2'),
            activo=True
        )
        c1.refresh_from_db()
        self.assertFalse(c1.activo)
        self.assertTrue(c2.activo)

    def test_api_configuracion_email_activa(self):
        ConfiguracionEmail.objects.create(
            proveedor='GMAIL',
            host='smtp.gmail.com',
            port=587,
            usuario='admin@empresa.com',
            password_cifrado=cifrar_texto('gmailpass'),
            activo=True
        )
        response = self.client.get('/api/configuracion-email/activa/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['usuario'], 'admin@empresa.com')
        self.assertTrue(response.data['tiene_password'])
        # La contraseña nunca debe exponerse en la respuesta serializada
        self.assertNotIn('password_cifrado', response.data)
        self.assertNotIn('password', response.data)


class ConfiguracionIATests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='gerente_ia', password='password123')
        self.personal = Personal.objects.create(
            user=self.user,
            nombre='Elena',
            apellido='Tech',
            email='elena@empresa.com',
            cargo='Gerente TI',
            rol='GERENTE',
            fecha_ingreso='2025-01-01'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_modelo_configuracion_ia_cifrado_y_mascara(self):
        conf = ConfiguracionIA(
            proveedor='GEMINI',
            modelo='gemini-1.5-flash',
            es_predeterminado=True
        )
        conf.set_api_key('AIzaSyD-SecretKeyGoogle123456')
        conf.save()

        # Comprobar en BD
        conf_db = ConfiguracionIA.objects.get(id=conf.id)
        self.assertNotEqual(conf_db.api_key_cifrada, 'AIzaSyD-SecretKeyGoogle123456')
        self.assertEqual(conf_db.get_api_key(), 'AIzaSyD-SecretKeyGoogle123456')
        self.assertTrue(conf_db.tiene_api_key)
        self.assertIn('••••', conf_db.mascara_api_key)

    def test_api_configuracion_ia_crud_y_predeterminado(self):
        # 1. Crear configuración para Grok
        res_crear = self.client.post('/api/configuracion-ia/', {
            'proveedor': 'GROK',
            'modelo': 'grok-2-latest',
            'api_key': 'xai-SecretGrokKey9999',
            'es_predeterminado': True
        })
        self.assertEqual(res_crear.status_code, 201)
        self.assertEqual(res_crear.data['proveedor'], 'GROK')
        self.assertTrue(res_crear.data['es_predeterminado'])

        # 2. Crear configuración para Claude
        res_claude = self.client.post('/api/configuracion-ia/', {
            'proveedor': 'CLAUDE',
            'modelo': 'claude-3-5-sonnet-20241022',
            'api_key': 'sk-ant-SecretClaudeKey123',
            'es_predeterminado': True
        })
        self.assertEqual(res_claude.status_code, 201)
        # Claude ahora debe ser el predeterminado y Grok haber cedido el flag
        grok_id = res_crear.data['id']
        grok_db = ConfiguracionIA.objects.get(id=grok_id)
        self.assertFalse(grok_db.es_predeterminado)

        # 3. Endpoint de proveedores disponibles
        res_provs = self.client.get('/api/configuracion-ia/proveedores/')
        self.assertEqual(res_provs.status_code, 200)
        self.assertGreaterEqual(res_provs.data['total_configurados'], 2)
        self.assertTrue(res_provs.data['es_remota'])

    def test_analisis_nlp_con_seleccion_de_proveedor(self):
        from apps.proyectos.services.nlp_analyzer import analizar_texto_minuta, diagnosticar_reunion_completa

        texto = "Reunión operativa. Acordamos los entregables del sprint y resolvimos los impedimentos reportados."
        
        # Probar solicitando LOCAL explícitamente
        res_local = diagnosticar_reunion_completa(texto, proveedor_solicitado='LOCAL')
        self.assertIn('veredicto', res_local)
        self.assertFalse(res_local['es_ia_remota'])
        self.assertEqual(res_local['proveedor'], 'Motor NLP Local Heurístico (Offline)')


class MetricasFinancierasTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='gerente_finanzas', password='password123')
        self.personal = Personal.objects.create(
            user=self.user,
            nombre='Lucia',
            apellido='Finanzas',
            email='lucia@empresa.com',
            cargo='Gerente Finanzas',
            rol='GERENTE',
            fecha_ingreso='2025-01-01'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.empresa = Empresa.objects.create(
            razon_social='Tech Corp SA',
            nombre_comercial='TechCorp',
            cuit='30-71112222-9',
            direccion='Av. Siempre Viva 123',
            telefono='11-4444-5555',
            email='contacto@techcorp.com'
        )

        self.proyecto = Proyecto.objects.create(
            nombre='Portal Web Clientes',
            descripcion='Desarrollo a medida',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )

    def test_metricas_resumen_financiero_calculo_y_porcentaje(self):
        from apps.financiacion.models import Financiacion, CuotaPago

        # Crear financiación de 100,000 ARS dividida en 4 cuotas de 25,000 cada una
        fin = Financiacion.objects.create(
            proyecto=self.proyecto,
            empresa=self.empresa,
            monto_total=100000.00,
            moneda='ARS',
            forma_pago='PLAN_CUOTAS',
            cantidad_cuotas=4,
            fecha_acuerdo='2026-01-01'
        )

        c1 = CuotaPago.objects.create(
            financiacion=fin,
            numero_cuota=1,
            monto=25000.00,
            moneda='ARS',
            estado='PAGADO'
        )
        c2 = CuotaPago.objects.create(
            financiacion=fin,
            numero_cuota=2,
            monto=25000.00,
            moneda='ARS',
            estado='PAGADO'
        )
        c3 = CuotaPago.objects.create(
            financiacion=fin,
            numero_cuota=3,
            monto=25000.00,
            moneda='ARS',
            estado='PENDIENTE'
        )
        c4 = CuotaPago.objects.create(
            financiacion=fin,
            numero_cuota=4,
            monto=25000.00,
            moneda='ARS',
            estado='PENDIENTE'
        )

        res = self.client.get('/api/metricas/resumen-financiero/')
        self.assertEqual(res.status_code, 200)
        datos_ars = next((item for item in res.data if item['moneda'] == 'ARS'), None)
        self.assertIsNotNone(datos_ars)

        # total_acordado debe ser exactamente 100,000 (NO 400,000 por culpa del join con 4 cuotas)
        self.assertEqual(datos_ars['total_acordado'], 100000.00)
        # total_cobrado debe ser 50,000 (dos cuotas de 25,000 pagadas)
        self.assertEqual(datos_ars['total_cobrado'], 50000.00)
        # total_pendiente debe ser 50,000
        self.assertEqual(datos_ars['total_pendiente'], 50000.00)
        # porcentaje_cobrado debe ser exactamente 50.0%
        self.assertEqual(datos_ars['porcentaje_cobrado'], 50.0)

        # Ahora pagamos una cuota más (c3)
        c3.estado = 'PAGADO'
        c3.save()

        res2 = self.client.get('/api/metricas/resumen-financiero/')
        datos_ars2 = next((item for item in res2.data if item['moneda'] == 'ARS'), None)
        self.assertEqual(datos_ars2['total_cobrado'], 75000.00)
        self.assertEqual(datos_ars2['total_pendiente'], 25000.00)
        self.assertEqual(datos_ars2['porcentaje_cobrado'], 75.0)

    def test_excluye_proyectos_en_papelera(self):
        from apps.financiacion.models import Financiacion, CuotaPago

        fin = Financiacion.objects.create(
            proyecto=self.proyecto,
            empresa=self.empresa,
            monto_total=50000.00,
            moneda='ARS',
            fecha_acuerdo='2026-01-01'
        )
        CuotaPago.objects.create(
            financiacion=fin,
            numero_cuota=1,
            monto=50000.00,
            moneda='ARS',
            estado='PAGADO'
        )

        # Enviar proyecto a papelera (eliminado=True)
        self.proyecto.eliminado = True
        self.proyecto.save()

        res = self.client.get('/api/metricas/resumen-financiero/')
        self.assertEqual(res.status_code, 200)
        datos_ars = next((item for item in res.data if item['moneda'] == 'ARS'), None)
        # Debe reflejar 0 acordado y 0 cobrado para proyectos eliminados
        self.assertEqual(datos_ars['total_acordado'], 0.0)
        self.assertEqual(datos_ars['total_cobrado'], 0.0)


