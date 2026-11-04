from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.empresas.models import Empresa, ContactoEmpresa
from apps.personal.models import Personal
from apps.proyectos.models import Proyecto, ProyectoEquipo
from apps.tareas.models import Tarea
from apps.reuniones.models import Reunion, ReunionParticipanteInterno

class PermisosEmpleadoYReunionesTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Crear Empresa
        self.empresa = Empresa.objects.create(
            razon_social='Empresa Alpha SA',
            nombre_comercial='Empresa Alpha',
            cuit='30-77889900-1',
            direccion='Calle 1',
            telefono='123456',
            email='alpha@test.com'
        )
        ContactoEmpresa.objects.create(
            empresa=self.empresa,
            nombre='Contacto 1',
            cargo='Gerente',
            telefono='123456',
            email='contacto@test.com',
            es_principal=True
        )

        # 1. Usuario RRHH
        self.user_rrhh = User.objects.create_user(username='admin_rrhh', email='rrhh@test.com', password='password123')
        self.personal_rrhh = Personal.objects.create(
            user=self.user_rrhh,
            nombre='RRHH',
            apellido='Admin',
            email='rrhh@test.com',
            cargo='Jefe RRHH',
            rol='RRHH',
            fecha_ingreso='2024-01-01'
        )

        # 2. Empleado 1
        self.user_emp1 = User.objects.create_user(username='emp1', email='emp1@test.com', password='password123')
        self.personal_emp1 = Personal.objects.create(
            user=self.user_emp1,
            nombre='Juan',
            apellido='Empleado1',
            email='emp1@test.com',
            cargo='Programador',
            rol='EMPLEADO',
            fecha_ingreso='2024-01-01'
        )

        # 3. Empleado 2
        self.user_emp2 = User.objects.create_user(username='emp2', email='emp2@test.com', password='password123')
        self.personal_emp2 = Personal.objects.create(
            user=self.user_emp2,
            nombre='Maria',
            apellido='Empleado2',
            email='emp2@test.com',
            cargo='Diseñadora',
            rol='EMPLEADO',
            fecha_ingreso='2024-01-01'
        )

        # Proyecto 1 (Asignado a Empleado 1)
        self.proyecto1 = Proyecto.objects.create(
            nombre='Proyecto 1',
            descripcion='Desc 1',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )
        ProyectoEquipo.objects.create(proyecto=self.proyecto1, personal=self.personal_emp1)

        # Proyecto 2 (Asignado a Empleado 2)
        self.proyecto2 = Proyecto.objects.create(
            nombre='Proyecto 2',
            descripcion='Desc 2',
            empresa=self.empresa,
            tipo_servicio=['CONSULTORIA']
        )
        ProyectoEquipo.objects.create(proyecto=self.proyecto2, personal=self.personal_emp2)

        # Tareas
        self.tarea_emp1 = Tarea.objects.create(
            proyecto=self.proyecto1,
            titulo='Tarea de Juan',
            descripcion='Hacer feature A',
            asignado_a=self.personal_emp1,
            fecha_limite=timezone.now().date()
        )
        self.tarea_emp2 = Tarea.objects.create(
            proyecto=self.proyecto2,
            titulo='Tarea de Maria',
            descripcion='Hacer diseño B',
            asignado_a=self.personal_emp2,
            fecha_limite=timezone.now().date()
        )

        # Reuniones
        now = timezone.now()
        self.reunion_emp1 = Reunion.objects.create(
            proyecto=self.proyecto1,
            titulo='Daily Proyecto 1',
            tipo_reunion='VIRTUAL',
            fecha_hora_inicio=now
        )
        ReunionParticipanteInterno.objects.create(reunion=self.reunion_emp1, personal=self.personal_emp1)

        self.reunion_emp2 = Reunion.objects.create(
            proyecto=self.proyecto2,
            titulo='Sync Proyecto 2',
            tipo_reunion='PRESENCIAL',
            fecha_hora_inicio=now
        )
        ReunionParticipanteInterno.objects.create(reunion=self.reunion_emp2, personal=self.personal_emp2)

        # Reunión general sin proyecto
        self.reunion_general = Reunion.objects.create(
            proyecto=None,
            titulo='All Hands de la Empresa (Sin proyecto)',
            tipo_reunion='VIRTUAL',
            fecha_hora_inicio=now
        )

    def test_reunion_sin_proyecto_creacion(self):
        """RRHH puede crear una reunión sin asignar a ningún proyecto"""
        self.client.force_authenticate(user=self.user_rrhh)
        data = {
            'titulo': 'Reunión General de Fin de Año',
            'tipo_reunion': 'PRESENCIAL',
            'fecha_hora_inicio': timezone.now().isoformat(),
            'proyecto': None
        }
        res = self.client.post('/api/reuniones/', data=data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res.data['proyecto'])

    def test_empleado_solo_ve_proyectos_en_los_que_pertenece(self):
        """Empleado 1 solo debe ver Proyecto 1, no Proyecto 2"""
        self.client.force_authenticate(user=self.user_emp1)
        res = self.client.get('/api/proyectos/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        proyectos_ids = [p['id'] for p in res.data['results']]
        self.assertIn(str(self.proyecto1.id), proyectos_ids)
        self.assertNotIn(str(self.proyecto2.id), proyectos_ids)

    def test_empleado_solo_ve_tareas_asignadas(self):
        """Empleado 1 solo debe ver sus tareas asignadas"""
        self.client.force_authenticate(user=self.user_emp1)
        res = self.client.get('/api/tareas/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        tareas_ids = [t['id'] for t in res.data['results']]
        self.assertIn(str(self.tarea_emp1.id), tareas_ids)
        self.assertNotIn(str(self.tarea_emp2.id), tareas_ids)

    def test_empleado_solo_ve_reuniones_asignadas(self):
        """Empleado 1 ve las reuniones a las que pertenece o está invitado, y no las de otros proyectos"""
        self.client.force_authenticate(user=self.user_emp1)
        res = self.client.get('/api/reuniones/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reuniones_ids = [r['id'] for r in res.data['results']]
        self.assertIn(str(self.reunion_emp1.id), reuniones_ids)
        self.assertNotIn(str(self.reunion_emp2.id), reuniones_ids)
        self.assertNotIn(str(self.reunion_general.id), reuniones_ids)

    def test_empleado_ve_reuniones_de_su_proyecto_sin_asignacion_individual(self):
        """El empleado ve automáticamente reuniones del proyecto al que pertenece sin requerir ser asignado individualmente"""
        reunion_sin_participantes = Reunion.objects.create(
            proyecto=self.proyecto1,
            titulo='Reunión abierta de Proyecto 1',
            tipo_reunion='VIRTUAL',
            fecha_hora_inicio=timezone.now()
        )
        self.client.force_authenticate(user=self.user_emp1)
        res = self.client.get('/api/reuniones/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reuniones_ids = [r['id'] for r in res.data['results']]
        self.assertIn(str(reunion_sin_participantes.id), reuniones_ids)

        # Empleado 2 no pertenece a Proyecto 1, por lo que no debe verla
        self.client.force_authenticate(user=self.user_emp2)
        res2 = self.client.get('/api/reuniones/')
        reuniones_ids_emp2 = [r['id'] for r in res2.data['results']]
        self.assertNotIn(str(reunion_sin_participantes.id), reuniones_ids_emp2)

    def test_estado_ia_endpoint(self):
        """Verifica que el endpoint de estado de IA responda la configuración activa y modo híbrido"""
        self.client.force_authenticate(user=self.user_rrhh)
        res = self.client.get('/api/reuniones/estado-ia/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('proveedor_activo', res.data)
        self.assertIn('modo', res.data)
        self.assertIn('es_remota', res.data)

    def test_analizar_transcripcion_endpoint(self):
        """Verifica que el endpoint de análisis de transcripción devuelva el diagnóstico estructurado"""
        self.client.force_authenticate(user=self.user_rrhh)
        texto_reunion = (
            "En la reunión acordamos avanzar con el entregable del sprint. "
            "El equipo resolvió las incidencias y el cliente valida la versión entregada. "
            "Compromiso para el viernes: despliegue a staging a cargo de Juan."
        )
        res = self.client.post('/api/reuniones/analizar-transcripcion/', {'texto': texto_reunion})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('diagnostico', res.data)
        self.assertIn('veredicto', res.data['diagnostico'])
        self.assertIn('calificacion', res.data['diagnostico'])
        self.assertIn('compromisos', res.data['diagnostico'])
        self.assertIn('nlp_metricas', res.data['diagnostico'])
        self.assertIn('proveedor', res.data['diagnostico'])

    def test_analizar_acta_endpoint(self):
        """Verifica que analizar-acta procese el acta de una reunión existente"""
        self.client.force_authenticate(user=self.user_rrhh)
        self.reunion_emp1.acta = (
            "Reunión de seguimiento. Definimos la arquitectura y acordamos fecha límite para el 15/11. "
            "Cliente confirma requerimientos sin fricción."
        )
        self.reunion_emp1.save(update_fields=['acta'])

        res = self.client.post(f'/api/reuniones/{self.reunion_emp1.id}/analizar-acta/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('diagnostico', res.data)
        self.assertIn('veredicto', res.data['diagnostico'])

