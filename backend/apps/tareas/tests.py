from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.personal.models import Personal
from apps.empresas.models import Empresa
from apps.proyectos.models import Proyecto
from apps.tareas.models import Tarea


class TareaFechaInicioTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='gerente_tareas', password='password123')
        self.personal = Personal.objects.create(
            user=self.user,
            nombre='Martin',
            apellido='Lider',
            email='martin@empresa.com',
            cargo='Tech Lead',
            rol='GERENTE',
            fecha_ingreso='2025-01-01'
        )
        self.programador_user = User.objects.create_user(username='dev1', password='password123')
        self.programador = Personal.objects.create(
            user=self.programador_user,
            nombre='Ana',
            apellido='Dev',
            email='ana@dev.com',
            cargo='Fullstack Developer',
            rol='EMPLEADO',
            fecha_ingreso='2025-02-01'
        )

        self.empresa = Empresa.objects.create(
            razon_social='Global Logistics SA',
            cuit='30-79998888-1',
            direccion='Calle 1',
            telefono='123456',
            email='info@logistic.com'
        )
        self.proyecto = Proyecto.objects.create(
            nombre='Sistema de Despachos',
            descripcion='App web',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_crear_tarea_con_fecha_inicio_futura(self):
        hoy = date.today()
        inicio_futuro = hoy + timedelta(days=15)
        limite_futuro = hoy + timedelta(days=30)

        payload = {
            'proyecto': str(self.proyecto.id),
            'asignado_a': str(self.programador.id),
            'titulo': 'Migración de base de datos a PostgreSQL 16',
            'descripcion': 'Planificada para realizarse a mitad de mes.',
            'prioridad': 'ALTA',
            'fecha_inicio': inicio_futuro.isoformat(),
            'fecha_limite': limite_futuro.isoformat(),
        }

        res = self.client.post('/api/tareas/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['fecha_inicio'], inicio_futuro.isoformat())
        self.assertEqual(res.data['fecha_limite'], limite_futuro.isoformat())

        tarea_db = Tarea.objects.get(id=res.data['id'])
        self.assertEqual(tarea_db.fecha_inicio, inicio_futuro)
        self.assertEqual(tarea_db.fecha_limite, limite_futuro)

    def test_crear_tarea_sin_fecha_inicio_es_opcional(self):
        hoy = date.today()
        limite = hoy + timedelta(days=7)

        payload = {
            'proyecto': str(self.proyecto.id),
            'asignado_a': str(self.programador.id),
            'titulo': 'Bugfix urgente en login',
            'descripcion': 'Comenzar inmediatamente.',
            'prioridad': 'URGENTE',
            'fecha_limite': limite.isoformat(),
        }

        res = self.client.post('/api/tareas/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.data['fecha_inicio'])

        tarea_db = Tarea.objects.get(id=res.data['id'])
        self.assertIsNone(tarea_db.fecha_inicio)

    def test_validacion_fecha_inicio_posterior_a_fecha_limite_falla(self):
        hoy = date.today()
        inicio_invalido = hoy + timedelta(days=20)
        limite_anterior = hoy + timedelta(days=10)

        payload = {
            'proyecto': str(self.proyecto.id),
            'asignado_a': str(self.programador.id),
            'titulo': 'Tarea con fechas incongruentes',
            'descripcion': 'La fecha de inicio no puede ser posterior a la fecha límite.',
            'prioridad': 'MEDIA',
            'fecha_inicio': inicio_invalido.isoformat(),
            'fecha_limite': limite_anterior.isoformat(),
        }

        res = self.client.post('/api/tareas/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('fecha_inicio', res.data)

    def test_crear_tarea_con_estado_proyecto_explicito(self):
        payload = {
            'proyecto': str(self.proyecto.id),
            'asignado_a': str(self.programador.id),
            'titulo': 'Relevamiento preliminar con cliente',
            'descripcion': 'Fase de preventa y relevamiento.',
            'prioridad': 'MEDIA',
            'estado_proyecto': 'OPORTUNIDAD',
            'fecha_limite': '2026-11-15',
        }
        res = self.client.post('/api/tareas/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado_proyecto'], 'OPORTUNIDAD')
        tarea_db = Tarea.objects.get(id=res.data['id'])
        self.assertEqual(tarea_db.estado_proyecto, 'OPORTUNIDAD')

    def test_crear_tarea_hereda_estado_proyecto_del_proyecto_si_omite(self):
        # Crear un estado actual para el proyecto
        from apps.proyectos.models import EstadoProyecto
        EstadoProyecto.objects.create(
            proyecto=self.proyecto,
            estado='SEGUIMIENTO',
            razon_cambio='Pasa a seguimiento y soporte'
        )

        payload = {
            'proyecto': str(self.proyecto.id),
            'asignado_a': str(self.programador.id),
            'titulo': 'Atención de tickets post-implementación',
            'descripcion': 'Mantenimiento preventivo.',
            'prioridad': 'BAJA',
            'fecha_limite': '2026-12-01',
        }
        res = self.client.post('/api/tareas/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado_proyecto'], 'SEGUIMIENTO')
        tarea_db = Tarea.objects.get(id=res.data['id'])
        self.assertEqual(tarea_db.estado_proyecto, 'SEGUIMIENTO')
