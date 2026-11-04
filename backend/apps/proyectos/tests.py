from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status

from apps.empresas.models import Empresa, ContactoEmpresa
from apps.personal.models import Personal
from apps.proyectos.models import Proyecto, EstadoProyecto, ProyectoEquipo
from apps.proyectos.state_machine import validar_transicion, TRANSICIONES_VALIDAS
from apps.tareas.models import Tarea
from apps.proyectos.services.phs_engine import generar_sugerencias_automaticas

class StateMachineTests(TestCase):
    def test_transiciones_validas(self):
        # Desde OPORTUNIDAD
        self.assertTrue(validar_transicion('OPORTUNIDAD', 'TRABAJANDO'))
        self.assertTrue(validar_transicion('OPORTUNIDAD', 'PAUSADO'))
        self.assertTrue(validar_transicion('OPORTUNIDAD', 'CAIDO'))
        
        # OPORTUNIDAD no puede ir directo a CONCRETADO
        with self.assertRaises(ValidationError):
            validar_transicion('OPORTUNIDAD', 'CONCRETADO')

        # Desde TRABAJANDO
        self.assertTrue(validar_transicion('TRABAJANDO', 'PAUSADO'))
        self.assertTrue(validar_transicion('TRABAJANDO', 'SEGUIMIENTO'))
        self.assertTrue(validar_transicion('TRABAJANDO', 'CONCRETADO'))
        self.assertTrue(validar_transicion('TRABAJANDO', 'CAIDO'))

        # Desde PAUSADO
        self.assertTrue(validar_transicion('PAUSADO', 'TRABAJANDO'))
        self.assertTrue(validar_transicion('PAUSADO', 'SEGUIMIENTO'))
        self.assertTrue(validar_transicion('PAUSADO', 'CAIDO'))
        with self.assertRaises(ValidationError):
            validar_transicion('PAUSADO', 'CONCRETADO')

        # Desde SEGUIMIENTO
        self.assertTrue(validar_transicion('SEGUIMIENTO', 'CONCRETADO'))
        self.assertTrue(validar_transicion('SEGUIMIENTO', 'TRABAJANDO'))
        self.assertTrue(validar_transicion('SEGUIMIENTO', 'PAUSADO'))
        self.assertTrue(validar_transicion('SEGUIMIENTO', 'CAIDO'))

        # Desde CONCRETADO
        self.assertTrue(validar_transicion('CONCRETADO', 'SEGUIMIENTO'))
        with self.assertRaises(ValidationError):
            validar_transicion('CONCRETADO', 'TRABAJANDO')

        # Estados finales
        with self.assertRaises(ValidationError):
            validar_transicion('CAIDO', 'OPORTUNIDAD')

class ProyectoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Crear Empresa con contacto
        self.empresa = Empresa.objects.create(
            razon_social='Tech Corp SA',
            nombre_comercial='TechCorp',
            cuit='30-12345678-9',
            direccion='Av. Siempre Viva 123',
            telefono='1144556677',
            email='info@techcorp.com'
        )
        self.contacto = ContactoEmpresa.objects.create(
            empresa=self.empresa,
            nombre='Carlos Contacto',
            cargo='CTO',
            telefono='1199887766',
            email='carlos@techcorp.com',
            es_principal=True
        )

        # Crear usuario RRHH
        self.user_rrhh = User.objects.create_user(username='rrhh_user', password='password123')
        self.personal_rrhh = Personal.objects.create(
            user=self.user_rrhh,
            nombre='Ana',
            apellido='RRHH',
            email='ana@empresa.com',
            cargo='Responsable RRHH',
            rol='RRHH',
            fecha_ingreso='2024-01-01'
        )

        # Crear usuario Gerente
        self.user_gerente = User.objects.create_user(username='gerente_user', password='password123')
        self.personal_gerente = Personal.objects.create(
            user=self.user_gerente,
            nombre='Guillermo',
            apellido='Gerente',
            email='guille@empresa.com',
            cargo='Gerente Operaciones',
            rol='GERENTE',
            fecha_ingreso='2023-01-01'
        )

        # Crear programador
        self.programador = Personal.objects.create(
            nombre='Pedro',
            apellido='Dev',
            email='pedro@empresa.com',
            cargo='Desarrollador Fullstack',
            rol='PROGRAMADOR',
            fecha_ingreso='2024-03-01'
        )

    def test_creacion_proyecto_inicia_oportunidad(self):
        self.client.force_authenticate(user=self.user_rrhh)
        payload = {
            'nombre': 'Sistema de Gestión',
            'descripcion': 'Desarrollo de ERP a medida',
            'empresa': str(self.empresa.id),
            'tipo_servicio': ['DESARROLLO', 'CONSULTORIA'],
            'fecha_inicio_estimada': '2026-10-01',
            'fecha_fin_estimada': '2027-04-01'
        }
        res = self.client.post('/api/proyectos/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        proyecto_id = res.data['id']
        proyecto = Proyecto.objects.get(id=proyecto_id)
        
        # Verificar que arranca en OPORTUNIDAD automáticamente
        self.assertEqual(proyecto.estados.count(), 1)
        estado_inicial = proyecto.estados.first()
        self.assertEqual(estado_inicial.estado, 'OPORTUNIDAD')
        self.assertEqual(estado_inicial.cambiado_por, self.personal_rrhh)

    def test_cambiar_estado_valido_e_invalido(self):
        self.client.force_authenticate(user=self.user_rrhh)
        proyecto = Proyecto.objects.create(
            nombre='App Móvil',
            descripcion='App iOS y Android',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )
        EstadoProyecto.objects.create(
            proyecto=proyecto,
            estado='OPORTUNIDAD',
            razon_cambio='Inicial',
            cambiado_por=self.personal_rrhh
        )

        # Transición inválida: OPORTUNIDAD -> CONCRETADO directamente
        res_invalida = self.client.post(f'/api/proyectos/{proyecto.id}/cambiar_estado/', {
            'estado': 'CONCRETADO',
            'razon_cambio': 'Aprobado directamente sin trabajar'
        })
        self.assertEqual(res_invalida.status_code, status.HTTP_400_BAD_REQUEST)

        # Transición válida: OPORTUNIDAD -> TRABAJANDO
        res_valida = self.client.post(f'/api/proyectos/{proyecto.id}/cambiar_estado/', {
            'estado': 'TRABAJANDO',
            'razon_cambio': 'Cliente aceptó propuesta y asignamos equipo'
        })
        self.assertEqual(res_valida.status_code, status.HTTP_200_OK)
        
        # Verificar estado actual
        proyecto.refresh_from_db()
        self.assertEqual(proyecto.estados.first().estado, 'TRABAJANDO')

        # Ahora desde TRABAJANDO -> CONCRETADO debe funcionar
        res_concretado = self.client.post(f'/api/proyectos/{proyecto.id}/cambiar_estado/', {
            'estado': 'CONCRETADO',
            'razon_cambio': 'Proyecto entregado con éxito'
        })
        self.assertEqual(res_concretado.status_code, status.HTTP_200_OK)
        proyecto.refresh_from_db()
        self.assertEqual(proyecto.estados.first().estado, 'CONCRETADO')

        # Desde CONCRETADO no puede cambiar a nada
        res_final = self.client.post(f'/api/proyectos/{proyecto.id}/cambiar_estado/', {
            'estado': 'TRABAJANDO',
            'razon_cambio': 'Reabrir'
        })
        self.assertEqual(res_final.status_code, status.HTTP_400_BAD_REQUEST)

    def test_asignar_y_desasignar_equipo(self):
        self.client.force_authenticate(user=self.user_rrhh)
        proyecto = Proyecto.objects.create(
            nombre='Web Portal',
            descripcion='Portal institucional',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )
        
        # Asignar programador
        res_asignar = self.client.post(f'/api/proyectos/{proyecto.id}/asignar_equipo/', {
            'personal': str(self.programador.id),
            'notificar': False
        })
        self.assertEqual(res_asignar.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProyectoEquipo.objects.filter(proyecto=proyecto, personal=self.programador).count(), 1)

        # Asignar repetido debe fallar
        res_repetido = self.client.post(f'/api/proyectos/{proyecto.id}/asignar_equipo/', {
            'personal': str(self.programador.id)
        })
        self.assertEqual(res_repetido.status_code, status.HTTP_400_BAD_REQUEST)

        # Desasignar
        res_desasignar = self.client.post(f'/api/proyectos/{proyecto.id}/desasignar_equipo/', {
            'personal': str(self.programador.id)
        })
        self.assertEqual(res_desasignar.status_code, status.HTTP_200_OK)
        self.assertEqual(ProyectoEquipo.objects.filter(proyecto=proyecto, personal=self.programador).count(), 0)

    def test_permisos_gerente_solo_lectura(self):
        self.client.force_authenticate(user=self.user_gerente)
        proyecto = Proyecto.objects.create(
            nombre='Auditoría de Sistemas',
            descripcion='Revisión de seguridad',
            empresa=self.empresa,
            tipo_servicio=['CONSULTORIA']
        )
        # Gerente puede leer
        res_get = self.client.get(f'/api/proyectos/{proyecto.id}/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        # Gerente NO puede crear proyectos
        res_post = self.client.post('/api/proyectos/', {
            'nombre': 'Proyecto Nuevo',
            'descripcion': 'Test',
            'empresa': str(self.empresa.id),
            'tipo_servicio': ['CONSULTORIA']
        })
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_lider_proyecto_auto_agregado_a_equipo_con_es_lider_true(self):
        """Al establecer Líder de proyecto, se actualiza automáticamente el Equipo con es_lider=True"""
        self.client.force_authenticate(user=self.user_rrhh)
        res = self.client.post('/api/proyectos/', {
            'nombre': 'Proyecto con Líder',
            'descripcion': 'Probando sincronización automática del líder',
            'empresa': str(self.empresa.id),
            'tipo_servicio': ['DESARROLLO'],
            'lider_proyecto': str(self.programador.id),
            'equipo_ids': []
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        proy_id = res.data['id']

        # Verificar que el programador fue añadido automáticamente al equipo con es_lider=True
        pe = ProyectoEquipo.objects.filter(proyecto_id=proy_id, personal=self.programador).first()
        self.assertIsNotNone(pe)
        self.assertTrue(pe.es_lider)

    def test_crear_tarea_auto_incorpora_a_no_miembro_y_vincula_kanban(self):
        """Si se crea una tarea asignada a un no miembro, se agrega automáticamente al equipo y se vincula a Kanban"""
        self.client.force_authenticate(user=self.user_rrhh)
        # Crear proyecto sin equipo
        proyecto = Proyecto.objects.create(
            nombre='Proyecto App Móvil',
            descripcion='Desarrollo react native',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO']
        )
        self.assertEqual(proyecto.equipo_asignaciones.count(), 0)

        # Crear tarea asignada al programador (que no es miembro)
        res = self.client.post('/api/tareas/', {
            'proyecto': str(proyecto.id),
            'titulo': 'Configurar React Navigation',
            'descripcion': 'Rutas y stacks',
            'asignado_a': str(self.programador.id),
            'prioridad': 'ALTA',
            'fecha_limite': '2026-12-31'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        tarea_data = res.data

        # 1. El programador debe haberse incorporado automáticamente al equipo
        self.assertEqual(proyecto.equipo_asignaciones.filter(personal=self.programador).count(), 1)

        # 2. La tarea debe estar vinculada a una columna Kanban válida
        from apps.tareas.models import Tarea
        tarea = Tarea.objects.get(id=tarea_data['id'])
        self.assertIsNotNone(tarea.columna_kanban)
        self.assertEqual(tarea.columna_kanban.proyecto, proyecto)
        self.assertEqual(tarea.columna_kanban.estado_asociado, 'PENDIENTE')


class ProjectHealthScoreEngineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa = Empresa.objects.create(
            razon_social='Salud SA',
            nombre_comercial='SaludCorp',
            cuit='30-99887766-5',
            direccion='Calle Falsa 123',
            telefono='11223344',
            email='info@salud.com'
        )
        ContactoEmpresa.objects.create(
            empresa=self.empresa,
            nombre='Juan Contacto',
            cargo='Gerente IT',
            telefono='11223344',
            email='juan@salud.com',
            es_principal=True
        )
        self.user_rrhh = User.objects.create_user(username='rrhh_phs', email='rrhh_phs@test.com', password='password123')
        self.rrhh = Personal.objects.create(
            user=self.user_rrhh,
            nombre='Ana',
            apellido='RRHH',
            email='rrhh_phs@test.com',
            cargo='HR Specialist',
            rol='RRHH',
            fecha_ingreso='2026-01-01'
        )
        self.programador = Personal.objects.create(
            nombre='Dev',
            apellido='Test',
            email='dev@salud.com',
            cargo='Desarrollador',
            rol='EMPLEADO',
            fecha_ingreso='2026-01-01'
        )
        self.proyecto = Proyecto.objects.create(
            nombre='Sistema Core ERP',
            descripcion='ERP institucional',
            empresa=self.empresa,
            tipo_servicio=['DESARROLLO'],
            lider_proyecto=self.rrhh
        )
        EstadoProyecto.objects.create(
            proyecto=self.proyecto,
            estado='OPORTUNIDAD',
            razon_cambio='Creación inicial',
            cambiado_por=self.rrhh
        )

    def test_phs_dia0_formula(self):
        from apps.proyectos.services.phs_engine import calcular_phs_dia0
        
        # Parámetros estándar iniciales
        res_standard = calcular_phs_dia0({
            'pm_experiencia_anios': 3,
            'modalidad_contratacion': 'IN_HOUSE',
            'categoria_proyecto': 'PRODUCTO_CORE',
            'presupuesto_base': 10000,
            'duracion_estimada_dias': 90,
            'complejidad_tecnica': 3,
            'competencia_equipo_pct': 75.0,
            'certeza_requerimientos': 3,
            'conocimiento_sponsor': 2
        })
        self.assertGreaterEqual(res_standard['phs_inicial'], 85)
        self.assertLessEqual(res_standard['phs_inicial'], 95)

        # PM con mucha experiencia y outsourcing precio fijo incrementa PHS
        res_alta_exp = calcular_phs_dia0({
            'pm_experiencia_anios': 10,
            'modalidad_contratacion': 'OUTSOURCED',
            'categoria_proyecto': 'SOPORTE_INTERNO',
            'presupuesto_base': 10000,
            'duracion_estimada_dias': 60,
            'complejidad_tecnica': 1,
            'competencia_equipo_pct': 95.0,
            'certeza_requerimientos': 5,
            'conocimiento_sponsor': 3
        })
        self.assertGreater(res_alta_exp['phs_inicial'], res_standard['phs_inicial'])

    def test_evm_and_csi_calculation(self):
        from apps.proyectos.services.phs_engine import calcular_metricas_evm
        
        # Desempeño normal adelantado: PV=50, EV=55, AC=50
        evm_bueno = calcular_metricas_evm(pv=50, ev=55, ac=50)
        self.assertGreater(evm_bueno['spi'], 1.0)
        self.assertGreater(evm_bueno['cpi'], 1.0)
        self.assertGreater(evm_bueno['csi'], 1.0)
        self.assertEqual(evm_bueno['csi_estado'], 'RECUPERABLE')

        # Proyecto en punto de no retorno: PV=60, EV=30 (retrasado), AC=60 (sobrecosto)
        # SPI = 30/60 = 0.5, CPI = 30/60 = 0.5, CSI = 0.25 < 0.70
        evm_critico = calcular_metricas_evm(pv=60, ev=30, ac=60)
        self.assertEqual(evm_critico['csi'], 0.25)
        self.assertEqual(evm_critico['csi_estado'], 'PUNTO_NO_RETORNO')

    def test_nlp_minuta_analyzer(self):
        from apps.proyectos.services.nlp_analyzer import analizar_texto_minuta
        
        texto_positivo = (
            "En la reunión acordamos y definimos la arquitectura del microservicio. "
            "El equipo implementó las correcciones y resolvimos los bugs reportados. "
            "El cliente valida y confirma el entregable para el viernes 25/10. Responsable: Martín. "
            "Excelente avance general, muy satisfechos."
        )
        nlp_res = analizar_texto_minuta(texto_positivo)
        self.assertGreater(nlp_res['n4_empoderamiento'], 0.70)
        self.assertGreater(nlp_res['n5_claridad_hitos'], 0.60)
        self.assertGreater(nlp_res['n6_participacion_cliente'], 0.50)
        self.assertLess(nlp_res['n7_tension'], 0.15)
        self.assertGreater(nlp_res['s_cliente'], 0.0)

        texto_conflictivo = (
            "Estamos esperando aprobación hace semanas, bloqueados por el cliente. "
            "Hay un sobrecosto inaceptable, riesgo de penalización y reclamo contractual por retraso grave. "
            "El cliente está sumamente desconforme e insatisfecho, amenazando con rescisión."
        )
        nlp_conf = analizar_texto_minuta(texto_conflictivo)
        self.assertLess(nlp_conf['n4_empoderamiento'], 0.50)
        self.assertGreater(nlp_conf['n7_tension'], 0.20)
        self.assertLess(nlp_conf['s_cliente'], 0.0)

    def test_api_health_score_flow(self):
        self.client.force_authenticate(user=self.user_rrhh)

        # 1. Configurar Día 0 vía POST
        res_dia0 = self.client.post(f'/api/proyectos/{self.proyecto.id}/dia0/', {
            'pm_experiencia_anios': 5,
            'modalidad_contratacion': 'IN_HOUSE',
            'categoria_proyecto': 'PRODUCTO_CORE',
            'presupuesto_base': '25000.00',
            'duracion_estimada_dias': 90,
            'esfuerzo_meses_persona': '3.00',
            'complejidad_tecnica': 3,
            'competencia_equipo_pct': 80.0,
            'certeza_requerimientos': 4,
            'conocimiento_sponsor': 2
        })
        self.assertEqual(res_dia0.status_code, status.HTTP_201_CREATED)
        self.assertIn('phs_inicial', res_dia0.data)

        # 2. Consultar sugerencias automáticas
        res_sug = self.client.get(f'/api/proyectos/{self.proyecto.id}/snapshots-sugerencias/')
        self.assertEqual(res_sug.status_code, status.HTTP_200_OK)
        self.assertIn('numero_corte', res_sug.data)
        self.assertEqual(res_sug.data['numero_corte'], 1)

        # 3. Registrar Snapshot semanal con texto de minuta
        minuta_texto = (
            "Reunión de sprint semanal. Acordamos los entregables para el próximo viernes. "
            "El equipo destrabó el problema de autenticación y el cliente valida la interfaz. "
            "Progreso excelente y sin impedimentos."
        )
        res_snap = self.client.post(f'/api/proyectos/{self.proyecto.id}/snapshots/', {
            'numero_corte': 1,
            'pv': 25.0,
            'ev': 28.0,
            'ac': 24.0,
            'reuniones_planificadas': 1,
            'reuniones_reales': 1,
            'dias_retraso_total': 0,
            'dias_retraso_cliente': 0,
            'texto_minuta': minuta_texto
        })
        self.assertEqual(res_snap.status_code, status.HTTP_201_CREATED)
        snap_data = res_snap.data
        self.assertIn('phs', snap_data)
        self.assertGreater(snap_data['phs'], 70)
        self.assertEqual(snap_data['nivel_riesgo'], 'SALUDABLE')
        self.assertIn('desglose_explicabilidad', snap_data)
        self.assertIn('accion_recomendada', snap_data)

        # 4. Consultar /health-score/
        res_hs = self.client.get(f'/api/proyectos/{self.proyecto.id}/health-score/')
        self.assertEqual(res_hs.status_code, status.HTTP_200_OK)
        self.assertEqual(res_hs.data['phs_actual'], snap_data['phs'])
        self.assertEqual(res_hs.data['nivel_riesgo'], 'SALUDABLE')
        self.assertEqual(len(res_hs.data['historico_grafico']), 1)

        # 5. Endpoint de prueba de análisis de minuta directo
        res_nlp = self.client.post('/api/proyectos/analizar-minuta/', {
            'texto': 'Acordamos y definimos hitos con fecha de entrega clara para el viernes.'
        })
        self.assertEqual(res_nlp.status_code, status.HTTP_200_OK)
        self.assertIn('nlp', res_nlp.data)
        self.assertIn('n4_empoderamiento', res_nlp.data['nlp'])

    def test_cambio_estado_a_seguimiento_y_fecha_fin_opcional(self):
        self.client.force_authenticate(user=self.user_rrhh)
        # OPORTUNIDAD -> TRABAJANDO
        res1 = self.client.post(f'/api/proyectos/{self.proyecto.id}/cambiar_estado/', {
            'estado': 'TRABAJANDO',
            'razon_cambio': 'Aprobación del cliente e inicio de desarrollo.'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(self.proyecto.estados.first().estado, 'TRABAJANDO')

        # TRABAJANDO -> SEGUIMIENTO (con fecha fin opcional nula / soporte continuo)
        res2 = self.client.post(f'/api/proyectos/{self.proyecto.id}/cambiar_estado/', {
            'estado': 'SEGUIMIENTO',
            'razon_cambio': 'Entrega inicial completada. Pasa a soporte continuo.',
            'fecha_fin_estimada': None
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(self.proyecto.estados.first().estado, 'SEGUIMIENTO')
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.fecha_fin_estimada)

        # SEGUIMIENTO -> CONCRETADO
        res3 = self.client.post(f'/api/proyectos/{self.proyecto.id}/cambiar_estado/', {
            'estado': 'CONCRETADO',
            'razon_cambio': 'Cierre final formal del servicio de soporte.'
        }, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertEqual(self.proyecto.estados.first().estado, 'CONCRETADO')

    def test_phs_ponderacion_etapas_ev_oportunidad_no_infla_avance(self):
        """
        Verifica que tener el 100% de tareas completadas en la etapa OPORTUNIDAD
        no infle el avance del proyecto al 100%, sino que aporte como máximo un 10%.
        """
        # Crear 3 tareas en etapa OPORTUNIDAD asociadas al proyecto
        t1 = Tarea.objects.create(
            proyecto=self.proyecto,
            asignado_a=self.programador,
            titulo='Reunión de relevamiento con cliente',
            descripcion='Definir requerimientos',
            prioridad='ALTA',
            estado='COMPLETADA',
            estado_proyecto='OPORTUNIDAD',
            fecha_limite='2026-11-01'
        )
        t2 = Tarea.objects.create(
            proyecto=self.proyecto,
            asignado_a=self.programador,
            titulo='Armado de propuesta técnica y presupuesto',
            descripcion='Estimación de horas',
            prioridad='ALTA',
            estado='COMPLETADA',
            estado_proyecto='OPORTUNIDAD',
            fecha_limite='2026-11-05'
        )

        # El proyecto está en estado OPORTUNIDAD
        self.assertEqual(self.proyecto.estados.first().estado, 'OPORTUNIDAD')

        # Ambas tareas están 100% completadas
        sugerencias = generar_sugerencias_automaticas(self.proyecto)
        # El EV sugerido NO debe ser 100%, sino como máximo 10.0%
        self.assertEqual(sugerencias['ev'], 10.0)

        # Ahora el proyecto pasa a TRABAJANDO y agregamos tareas de construcción
        EstadoProyecto.objects.create(
            proyecto=self.proyecto,
            estado='TRABAJANDO',
            razon_cambio='Inicio de desarrollo'
        )
        t_dev1 = Tarea.objects.create(
            proyecto=self.proyecto,
            asignado_a=self.programador,
            titulo='Desarrollo frontend dashboard',
            descripcion='Vistas principales',
            prioridad='ALTA',
            estado='COMPLETADA',
            estado_proyecto='TRABAJANDO',
            fecha_limite='2026-11-20'
        )
        t_dev2 = Tarea.objects.create(
            proyecto=self.proyecto,
            asignado_a=self.programador,
            titulo='Desarrollo backend microservicios',
            descripcion='Endpoints API',
            prioridad='ALTA',
            estado='PENDIENTE',
            estado_proyecto='TRABAJANDO',
            fecha_limite='2026-11-30'
        )

        sugerencias_trabajando = generar_sugerencias_automaticas(self.proyecto)
        # 10% (de etapa inicial) + (1 completada de 2 en trabajo = 50% de 75% = 37.5%) = 47.5%
        self.assertEqual(sugerencias_trabajando['ev'], 47.5)


