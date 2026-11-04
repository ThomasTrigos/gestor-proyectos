from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid

from apps.personal.models import Personal
from apps.empresas.models import Empresa, ContactoEmpresa
from apps.proyectos.models import Proyecto, EstadoProyecto, ProyectoEquipo
from apps.tareas.models import Tarea, ColumnaKanban
from apps.reuniones.models import Reunion, ReunionParticipanteInterno, ParticipanteExterno, ResultadoReunion
from apps.financiacion.models import Financiacion, CuotaPago
from apps.core.models import Recordatorio, AuditLog


class Command(BaseCommand):
    help = 'Limpia los datos de prueba obsoletos y genera datos iniciales actualizados y consistentes'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Iniciando limpieza total de datos de prueba obsoletos...'))

        # 1. Limpieza en cascada de modelos operativos
        CuotaPago.objects.all().delete()
        Financiacion.objects.all().delete()
        ParticipanteExterno.objects.all().delete()
        ReunionParticipanteInterno.objects.all().delete()
        Reunion.objects.all().delete()
        Tarea.objects.all().delete()
        ColumnaKanban.objects.all().delete()
        ProyectoEquipo.objects.all().delete()
        EstadoProyecto.objects.all().delete()
        Proyecto.objects.all().delete()
        ContactoEmpresa.objects.all().delete()
        Empresa.objects.all().delete()
        Recordatorio.objects.all().delete()
        AuditLog.objects.all().delete()
        Personal.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Base de datos depurada correctamente.'))
        self.stdout.write(self.style.NOTICE('Generando nuevos usuarios, empresas, proyectos, tareas y finanzas...'))

        today = timezone.now().date()
        now = timezone.now()

        # -------------------------------------------------------------
        # 1. USUARIOS Y PERSONAL (Credenciales seguras y roles claros)
        # -------------------------------------------------------------
        # Admin / Superusuario
        user_admin = User.objects.create_superuser(
            username='admin',
            email='admin@gestor.com',
            password='AdminPassword2026!',
            first_name='Admin',
            last_name='General'
        )
        personal_admin = Personal.objects.create(
            user=user_admin,
            nombre='Admin',
            apellido='General',
            email='admin@gestor.com',
            telefono='+54 11 5000-0001',
            cargo='Administrador del Sistema',
            rol='RRHH',
            activo=True,
            fecha_ingreso=today - timedelta(days=500)
        )

        # RRHH (Recursos Humanos)
        user_rrhh = User.objects.create_user(
            username='rrhh',
            email='rrhh@empresa.com',
            password='RrhhPassword2026!',
            first_name='Valeria',
            last_name='Martínez'
        )
        personal_rrhh = Personal.objects.create(
            user=user_rrhh,
            nombre='Valeria',
            apellido='Martínez',
            email='rrhh@empresa.com',
            telefono='+54 11 5000-0002',
            cargo='Líder de RRHH y Operaciones',
            rol='RRHH',
            activo=True,
            fecha_ingreso=today - timedelta(days=365)
        )

        # Gerente de Operaciones
        user_gerente = User.objects.create_user(
            username='gerente',
            email='gerente@empresa.com',
            password='GerentePassword2026!',
            first_name='Esteban',
            last_name='Gómez'
        )
        personal_gerente = Personal.objects.create(
            user=user_gerente,
            nombre='Esteban',
            apellido='Gómez',
            email='gerente@empresa.com',
            telefono='+54 11 5000-0003',
            cargo='Director de Operaciones',
            rol='GERENTE',
            activo=True,
            fecha_ingreso=today - timedelta(days=400)
        )

        # Líder Técnico Fullstack
        user_dev1 = User.objects.create_user(
            username='pedro.dev',
            email='pedro.dev@empresa.com',
            password='EmpleadoPassword2026!',
            first_name='Pedro',
            last_name='Sánchez'
        )
        personal_dev1 = Personal.objects.create(
            user=user_dev1,
            nombre='Pedro',
            apellido='Sánchez',
            email='pedro.dev@empresa.com',
            telefono='+54 11 5000-0004',
            cargo='Líder Técnico Fullstack',
            rol='EMPLEADO',
            activo=True,
            fecha_ingreso=today - timedelta(days=250)
        )

        # Especialista Frontend React
        user_dev2 = User.objects.create_user(
            username='lucia.dev',
            email='lucia.dev@empresa.com',
            password='EmpleadoPassword2026!',
            first_name='Lucía',
            last_name='Fernández'
        )
        personal_dev2 = Personal.objects.create(
            user=user_dev2,
            nombre='Lucía',
            apellido='Fernández',
            email='lucia.dev@empresa.com',
            telefono='+54 11 5000-0005',
            cargo='Frontend React Specialist',
            rol='EMPLEADO',
            activo=True,
            fecha_ingreso=today - timedelta(days=180)
        )

        # DevOps & Cloud Specialist
        user_dev3 = User.objects.create_user(
            username='tomas.dev',
            email='tomas.dev@empresa.com',
            password='EmpleadoPassword2026!',
            first_name='Tomás',
            last_name='Navarro'
        )
        personal_dev3 = Personal.objects.create(
            user=user_dev3,
            nombre='Tomás',
            apellido='Navarro',
            email='tomas.dev@empresa.com',
            telefono='+54 11 5000-0006',
            cargo='DevOps & Cloud Engineer',
            rol='EMPLEADO',
            activo=True,
            fecha_ingreso=today - timedelta(days=120)
        )

        # -------------------------------------------------------------
        # 2. EMPRESAS (Clientes corporativos)
        # -------------------------------------------------------------
        emp1 = Empresa.objects.create(
            razon_social='Fintech Solutions S.A.',
            nombre_comercial='FintechSol',
            cuit='30-71234567-9',
            direccion='Av. Corrientes 1234, CABA',
            telefono='+54 11 4321-8899',
            email='contacto@fintechsol.com',
            sitio_web='https://fintechsol.com',
            notas='Cliente corporativo sector financiero y pagos virtuales.'
        )
        ContactoEmpresa.objects.create(
            empresa=emp1,
            nombre='Mariano Rodríguez',
            cargo='Chief Technology Officer',
            telefono='+54 9 11 5566-7788',
            email='mrodriguez@fintechsol.com',
            es_principal=True
        )

        emp2 = Empresa.objects.create(
            razon_social='Logística Global de Cargas S.R.L.',
            nombre_comercial='GlobalLog',
            cuit='30-98765432-1',
            direccion='Ruta Panamericana Km 45, Campana',
            telefono='+54 3489 44-5566',
            email='info@globallog.com.ar',
            sitio_web='https://globallog.com.ar',
            notas='Distribución y almacenamiento regional de gran escala.'
        )
        ContactoEmpresa.objects.create(
            empresa=emp2,
            nombre='Claudia García',
            cargo='Gerente de Sistemas',
            telefono='+54 9 11 3344-5566',
            email='cgarcia@globallog.com.ar',
            es_principal=True
        )

        emp3 = Empresa.objects.create(
            razon_social='SaludDigital Cono Sur S.A.',
            nombre_comercial='SaludDigital',
            cuit='30-65432198-4',
            direccion='Av. Libertador 4500, CABA',
            telefono='+54 11 4800-1122',
            email='info@saluddigital.com',
            sitio_web='https://saluddigital.com',
            notas='Red de centros médicos y servicios de teleconsulta.'
        )
        ContactoEmpresa.objects.create(
            empresa=emp3,
            nombre='Dr. Martín Benítez',
            cargo='Director de Tecnología Médica',
            telefono='+54 9 11 9988-7766',
            email='mbenitez@saluddigital.com',
            es_principal=True
        )

        emp4 = Empresa.objects.create(
            razon_social='Retail Express Argentina S.A.',
            nombre_comercial='RetailExpress',
            cuit='30-55443322-7',
            direccion='Carlos Pellegrini 850, CABA',
            telefono='+54 11 4390-3300',
            email='contacto@retailexpress.com.ar',
            sitio_web='https://retailexpress.com.ar',
            notas='Cadena de retail y comercio electrónico multicanal.'
        )
        ContactoEmpresa.objects.create(
            empresa=emp4,
            nombre='Sofia Larrea',
            cargo='Head of Digital Channels',
            telefono='+54 9 11 2233-4455',
            email='slarrea@retailexpress.com.ar',
            es_principal=True
        )

        # -------------------------------------------------------------
        # 3. PROYECTOS (Cubriendo todas las etapas del ciclo de vida)
        # -------------------------------------------------------------
        # Proyecto 1: App Móvil y Billetera Digital (TRABAJANDO)
        p1 = Proyecto.objects.create(
            nombre='App Móvil y Billetera Digital',
            descripcion='Desarrollo de billetera virtual con transferencias QR, pagos con tarjeta y conciliación automatizada.',
            empresa=emp1,
            tipo_servicio=['DESARROLLO', 'CONSULTORIA'],
            lider_proyecto=personal_dev1,
            fecha_inicio_estimada=today - timedelta(days=35),
            fecha_fin_estimada=today + timedelta(days=60),
            notas='Arquitectura basada en microservicios e infraestructura cloud en AWS.'
        )
        EstadoProyecto.objects.create(proyecto=p1, estado='OPORTUNIDAD', razon_cambio='Propuesta comercial enviada', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p1, estado='TRABAJANDO', razon_cambio='Propuesta aceptada, contrato firmado', cambiado_por=personal_rrhh)
        ProyectoEquipo.objects.get_or_create(proyecto=p1, personal=personal_dev2, defaults={'es_lider': False, 'notificado_email': True})

        col1_p1 = ColumnaKanban.objects.create(proyecto=p1, nombre='Por Hacer', color='slate', orden=0, estado_asociado='PENDIENTE')
        col2_p1 = ColumnaKanban.objects.create(proyecto=p1, nombre='En Desarrollo', color='blue', orden=1, estado_asociado='EN_PROGRESO')
        col3_p1 = ColumnaKanban.objects.create(proyecto=p1, nombre='Code Review & QA', color='amber', orden=2, estado_asociado='EN_PROGRESO')
        col4_p1 = ColumnaKanban.objects.create(proyecto=p1, nombre='Completada', color='emerald', orden=3, estado_asociado='COMPLETADA')

        # Proyecto 2: Plataforma de Telemedicina y Turnos (TRABAJANDO)
        p2 = Proyecto.objects.create(
            nombre='Plataforma de Telemedicina y Turnos',
            descripcion='Sistema web y móvil para reserva de citas médicas, recetas electrónicas y videoconsultas encriptadas.',
            empresa=emp3,
            tipo_servicio=['DESARROLLO', 'IMPLEMENTACION_CAPACITACION'],
            lider_proyecto=personal_dev2,
            fecha_inicio_estimada=today - timedelta(days=15),
            fecha_fin_estimada=today + timedelta(days=75),
            notas='Cumplimiento estricto de confidencialidad de historias clínicas.'
        )
        EstadoProyecto.objects.create(proyecto=p2, estado='OPORTUNIDAD', razon_cambio='Primer contacto comercial', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p2, estado='TRABAJANDO', razon_cambio='Adjudicación del pliego y firma de acuerdo', cambiado_por=personal_rrhh)
        ProyectoEquipo.objects.get_or_create(proyecto=p2, personal=personal_dev3, defaults={'es_lider': False, 'notificado_email': True})

        col1_p2 = ColumnaKanban.objects.create(proyecto=p2, nombre='Backlog', color='slate', orden=0, estado_asociado='PENDIENTE')
        col2_p2 = ColumnaKanban.objects.create(proyecto=p2, nombre='En Progreso', color='blue', orden=1, estado_asociado='EN_PROGRESO')
        col3_p2 = ColumnaKanban.objects.create(proyecto=p2, nombre='QA Clínico', color='purple', orden=2, estado_asociado='EN_PROGRESO')
        col4_p2 = ColumnaKanban.objects.create(proyecto=p2, nombre='Desplegado', color='emerald', orden=3, estado_asociado='COMPLETADA')

        # Proyecto 3: Sistema WMS y Trazabilidad de Flota (SEGUIMIENTO - sin fecha fin obligatoria)
        p3 = Proyecto.objects.create(
            nombre='Sistema Integral de Trazabilidad y WMS',
            descripcion='Módulo de gestión de depósitos, inventarios y seguimiento en tiempo real de flota con telemetría GPS.',
            empresa=emp2,
            tipo_servicio=['DESARROLLO', 'CONSULTORIA'],
            lider_proyecto=personal_dev3,
            fecha_inicio_estimada=today - timedelta(days=90),
            fecha_fin_estimada=None,  # Caso real de seguimiento post-lanzamiento continuo
            notas='Etapa de seguimiento operativo y mantenimiento evolutivo continuo.'
        )
        EstadoProyecto.objects.create(proyecto=p3, estado='OPORTUNIDAD', razon_cambio='Contacto comercial inicial', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p3, estado='TRABAJANDO', razon_cambio='Comienzo de desarrollo de módulos', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p3, estado='SEGUIMIENTO', razon_cambio='Puesta en producción exitosa; inicio de etapa de seguimiento y soporte continuo', cambiado_por=personal_rrhh)
        ProyectoEquipo.objects.get_or_create(proyecto=p3, personal=personal_dev1, defaults={'es_lider': False, 'notificado_email': True})

        col1_p3 = ColumnaKanban.objects.create(proyecto=p3, nombre='Solicitudes', color='slate', orden=0, estado_asociado='PENDIENTE')
        col2_p3 = ColumnaKanban.objects.create(proyecto=p3, nombre='En Análisis', color='amber', orden=1, estado_asociado='EN_PROGRESO')
        col3_p3 = ColumnaKanban.objects.create(proyecto=p3, nombre='En Monitoreo', color='cyan', orden=2, estado_asociado='EN_PROGRESO')
        col4_p3 = ColumnaKanban.objects.create(proyecto=p3, nombre='Resuelto', color='emerald', orden=3, estado_asociado='COMPLETADA')

        # Proyecto 4: Portal B2B de Reabastecimiento (OPORTUNIDAD)
        p4 = Proyecto.objects.create(
            nombre='Portal B2B de Reabastecimiento Automatizado',
            descripcion='Plataforma mayorista para proveedores de RetailExpress con órdenes automáticas por stock crítico.',
            empresa=emp4,
            tipo_servicio=['DESARROLLO', 'CONSULTORIA'],
            lider_proyecto=personal_dev1,
            fecha_inicio_estimada=today + timedelta(days=20),
            fecha_fin_estimada=today + timedelta(days=120),
            notas='En etapa de preventa y validación de requerimientos técnicos.'
        )
        EstadoProyecto.objects.create(proyecto=p4, estado='OPORTUNIDAD', razon_cambio='Reunión inicial de relevamiento', cambiado_por=personal_rrhh)

        # Proyecto 5: Integración Legacy ERP SAP (CONCRETADO)
        p5 = Proyecto.objects.create(
            nombre='Integración Legacy ERP SAP con API Cloud',
            descripcion='Conector bidireccional entre SAP ECC y aplicaciones de pedidos online.',
            empresa=emp4,
            tipo_servicio=['DESARROLLO'],
            lider_proyecto=personal_dev3,
            fecha_inicio_estimada=today - timedelta(days=120),
            fecha_fin_estimada=today - timedelta(days=10),
            notas='Proyecto concluido a entera satisfacción del cliente.'
        )
        EstadoProyecto.objects.create(proyecto=p5, estado='OPORTUNIDAD', razon_cambio='Propuesta enviada', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p5, estado='TRABAJANDO', razon_cambio='Desarrollo activo', cambiado_por=personal_rrhh)
        EstadoProyecto.objects.create(proyecto=p5, estado='CONCRETADO', razon_cambio='Aceptación formal del entregable final y pase a producción', cambiado_por=personal_rrhh)

        # -------------------------------------------------------------
        # 4. TAREAS (Con fecha_inicio, fecha_limite y estado_proyecto)
        # -------------------------------------------------------------
        # Tareas Proyecto 1
        Tarea.objects.create(
            proyecto=p1,
            asignado_a=personal_dev1,
            asignado_por=personal_rrhh,
            titulo='Diseño de arquitectura de microservicios y esquema PostgreSQL',
            descripcion='Definir tablas relacionales, llaves foráneas y auditoría para transferencias y billeteras.',
            prioridad='ALTA',
            estado='COMPLETADA',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col4_p1,
            fecha_inicio=today - timedelta(days=30),
            fecha_limite=today - timedelta(days=15),
            fecha_completada=now - timedelta(days=16)
        )

        Tarea.objects.create(
            proyecto=p1,
            asignado_a=personal_dev1,
            asignado_por=personal_rrhh,
            titulo='Integración de pasarela de pagos con Webhooks QR',
            descripcion='Implementar el protocolo transaccional con MercadoPago y conciliación bancaria.',
            prioridad='URGENTE',
            estado='EN_PROGRESO',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col2_p1,
            fecha_inicio=today - timedelta(days=5),
            fecha_limite=today + timedelta(days=7)
        )

        Tarea.objects.create(
            proyecto=p1,
            asignado_a=personal_dev2,
            asignado_por=personal_rrhh,
            titulo='Desarrollo de pantallas de Onboarding y validación KYC en React',
            descripcion='Maquetación de formularios accesibles, carga de documentación y validación facial.',
            prioridad='ALTA',
            estado='EN_PROGRESO',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col2_p1,
            fecha_inicio=today - timedelta(days=2),
            fecha_limite=today + timedelta(days=12)
        )

        Tarea.objects.create(
            proyecto=p1,
            asignado_a=personal_dev3,
            asignado_por=personal_rrhh,
            titulo='Pruebas de estrés y seguridad en pasarela transaccional',
            descripcion='Simular picos de 5.000 operaciones por segundo y auditar endpoints contra inyecciones.',
            prioridad='MEDIA',
            estado='PENDIENTE',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col1_p1,
            fecha_inicio=today + timedelta(days=10),  # Inicio a futuro
            fecha_limite=today + timedelta(days=25)
        )

        # Tareas Proyecto 2
        Tarea.objects.create(
            proyecto=p2,
            asignado_a=personal_dev2,
            asignado_por=personal_rrhh,
            titulo='Módulo interactivo de turnos y agendas médicas por especialidad',
            descripcion='Calendario sincrónico con bloqueo automático de sobreturnos y notificación por email.',
            prioridad='ALTA',
            estado='EN_PROGRESO',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col2_p2,
            fecha_inicio=today - timedelta(days=8),
            fecha_limite=today + timedelta(days=10)
        )

        Tarea.objects.create(
            proyecto=p2,
            asignado_a=personal_dev3,
            asignado_por=personal_rrhh,
            titulo='Integración con WebRTC para salas de videoconsulta cifradas',
            descripcion='Servidores TURN/STUN dedicados y grabación optativa con consentimiento del paciente.',
            prioridad='URGENTE',
            estado='PENDIENTE',
            estado_proyecto='TRABAJANDO',
            columna_kanban=col1_p2,
            fecha_inicio=today + timedelta(days=5),  # Inicio a futuro
            fecha_limite=today + timedelta(days=20)
        )

        # Tareas Proyecto 3 (Etapa SEGUIMIENTO)
        Tarea.objects.create(
            proyecto=p3,
            asignado_a=personal_dev3,
            asignado_por=personal_rrhh,
            titulo='Monitoreo continuo de telemetría y sincronización GPS de flota',
            descripcion='Verificar la latencia de ingestión de coordenadas satelitales en el broker MQTT.',
            prioridad='ALTA',
            estado='EN_PROGRESO',
            estado_proyecto='SEGUIMIENTO',
            columna_kanban=col3_p3,
            fecha_inicio=today - timedelta(days=10),
            fecha_limite=today + timedelta(days=15)
        )

        Tarea.objects.create(
            proyecto=p3,
            asignado_a=personal_dev1,
            asignado_por=personal_rrhh,
            titulo='Optimización de consultas de inventario en depósito central',
            descripcion='Crear índices compuestos y caché Redis para acelerar el picking de almacenes.',
            prioridad='MEDIA',
            estado='PENDIENTE',
            estado_proyecto='SEGUIMIENTO',
            columna_kanban=col1_p3,
            fecha_inicio=today + timedelta(days=3),  # Inicio a futuro
            fecha_limite=today + timedelta(days=18)
        )

        # Tareas Proyecto 4 (Etapa OPORTUNIDAD)
        Tarea.objects.create(
            proyecto=p4,
            asignado_a=personal_dev1,
            asignado_por=personal_rrhh,
            titulo='Elaboración de especificación técnica y dimensionamiento cloud',
            descripcion='Definir matriz de compatibilidad con proveedores y esquema de licenciamiento sugerido.',
            prioridad='MEDIA',
            estado='EN_PROGRESO',
            estado_proyecto='OPORTUNIDAD',
            fecha_inicio=today - timedelta(days=3),
            fecha_limite=today + timedelta(days=8)
        )

        # -------------------------------------------------------------
        # 5. REUNIONES (Distribuidas en el calendario alrededor de hoy)
        # -------------------------------------------------------------
        # Reunión 1: Mañana (Planificada)
        r1 = Reunion.objects.create(
            proyecto=p1,
            titulo='Sprint Review: Demostración de Pagos QR y Billetera',
            tipo_reunion='VIRTUAL',
            descripcion='Presentación del avance técnico al CTO de Fintech Solutions y validación de endpoints.',
            fecha_hora_inicio=now + timedelta(days=1, hours=3),
            fecha_hora_fin=now + timedelta(days=1, hours=4),
            ubicacion='https://meet.google.com/abc-demo-fintech'
        )
        ReunionParticipanteInterno.objects.create(reunion=r1, personal=personal_dev1)
        ReunionParticipanteInterno.objects.create(reunion=r1, personal=personal_dev2)
        ParticipanteExterno.objects.create(reunion=r1, nombre='Mariano Rodríguez', email='mrodriguez@fintechsol.com', empresa_nombre='Fintech Solutions S.A.')

        # Reunión 2: En 3 días (Planificada)
        r2 = Reunion.objects.create(
            proyecto=p2,
            titulo='Comité de Seguimiento Clínico y Plataforma de Turnos',
            tipo_reunion='VIRTUAL',
            descripcion='Revisión del flujo de agendamiento y requerimientos de recetas médicas electrónicas.',
            fecha_hora_inicio=now + timedelta(days=3, hours=5),
            fecha_hora_fin=now + timedelta(days=3, hours=6),
            ubicacion='https://meet.google.com/med-salud-turno'
        )
        ReunionParticipanteInterno.objects.create(reunion=r2, personal=personal_dev2)
        ReunionParticipanteInterno.objects.create(reunion=r2, personal=personal_dev3)
        ParticipanteExterno.objects.create(reunion=r2, nombre='Dr. Martín Benítez', email='mbenitez@saluddigital.com', empresa_nombre='SaludDigital Cono Sur S.A.')

        # Reunión 3: Hace 2 días (Realizada)
        r3 = Reunion.objects.create(
            proyecto=p3,
            titulo='Mesa Mensual de SLA y Performance de Flota GlobalLog',
            tipo_reunion='PRESENCIAL',
            descripcion='Revisión de métricas de disponibilidad del sistema WMS y tiempos de respuesta.',
            fecha_hora_inicio=now - timedelta(days=2, hours=4),
            fecha_hora_fin=now - timedelta(days=2, hours=2),
            ubicacion='Oficinas Centrales GlobalLog - Campana',
            completada=True,
            fecha_completada=now - timedelta(days=2, hours=2),
            resultado=ResultadoReunion.BUENA,
            compromisos='Optimizar consultas de stock crítico y reconfigurar alertas de temperatura en camiones.'
        )
        ReunionParticipanteInterno.objects.create(reunion=r3, personal=personal_dev3)
        ReunionParticipanteInterno.objects.create(reunion=r3, personal=personal_gerente)
        ParticipanteExterno.objects.create(reunion=r3, nombre='Claudia García', email='cgarcia@globallog.com.ar', empresa_nombre='Logística Global de Cargas S.R.L.')

        # Reunión 4: La próxima semana (Planificada)
        r4 = Reunion.objects.create(
            proyecto=p4,
            titulo='Mesa de Relevamiento Técnico: Portal B2B Retail',
            tipo_reunion='VIRTUAL',
            descripcion='Análisis de formatos EDI / JSON para intercambio de órdenes con proveedores de RetailExpress.',
            fecha_hora_inicio=now + timedelta(days=7, hours=2),
            fecha_hora_fin=now + timedelta(days=7, hours=3),
            ubicacion='https://meet.google.com/retail-b2b-sync'
        )
        ReunionParticipanteInterno.objects.create(reunion=r4, personal=personal_dev1)
        ReunionParticipanteInterno.objects.create(reunion=r4, personal=personal_gerente)
        ParticipanteExterno.objects.create(reunion=r4, nombre='Sofia Larrea', email='slarrea@retailexpress.com.ar', empresa_nombre='Retail Express Argentina S.A.')

        # -------------------------------------------------------------
        # 6. FINANCIACIÓN Y COBROS (Planes acordados, cuotas y entregables)
        # -------------------------------------------------------------
        # Financiación Proyecto 1 (USD 18.000 en 3 cuotas)
        fin1 = Financiacion.objects.create(
            proyecto=p1,
            empresa=emp1,
            monto_total=Decimal('18000.00'),
            monto_usd=Decimal('18000.00'),
            moneda='USD',
            forma_pago='PLAN_CUOTAS',
            cantidad_cuotas=3,
            fecha_acuerdo=today - timedelta(days=35),
            notas='Acuerdo pactado en 3 cuotas mensuales de USD 6.000 transferibles a cuenta corporativa.'
        )
        CuotaPago.objects.create(
            financiacion=fin1,
            numero_cuota=1,
            monto=Decimal('6000.00'),
            monto_pagado=Decimal('6000.00'),
            monto_usd=Decimal('6000.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today - timedelta(days=15),
            fecha_pago=today - timedelta(days=14),
            estado='PAGADO',
            detalle='Anticipo inicial y entrega de prototipo funcional'
        )
        CuotaPago.objects.create(
            financiacion=fin1,
            numero_cuota=2,
            monto=Decimal('6000.00'),
            monto_usd=Decimal('6000.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today + timedelta(days=10),
            estado='PENDIENTE',
            detalle='Cuota intermedia: Pasarela de pagos y validación KYC'
        )
        CuotaPago.objects.create(
            financiacion=fin1,
            numero_cuota=3,
            monto=Decimal('6000.00'),
            monto_usd=Decimal('6000.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today + timedelta(days=40),
            estado='PENDIENTE',
            detalle='Cuota final: Despliegue en producción y homologación bancaria'
        )

        # Financiación Proyecto 2 (ARS 15.000.000 por Entregables)
        fin2 = Financiacion.objects.create(
            proyecto=p2,
            empresa=emp3,
            monto_total=Decimal('15000000.00'),
            moneda='ARS',
            forma_pago='ENTREGABLES',
            fecha_acuerdo=today - timedelta(days=15),
            notas='Esquema de 3 hitos de $5.000.000 supeditados a validación médica.'
        )
        CuotaPago.objects.create(
            financiacion=fin2,
            tipo_pago='ENTREGABLE',
            entregable='Hito 1: Arquitectura y Módulo de Agendamiento',
            monto=Decimal('5000000.00'),
            monto_pagado=Decimal('5000000.00'),
            moneda='ARS',
            fecha_vencimiento=today - timedelta(days=5),
            fecha_pago=today - timedelta(days=4),
            estado='PAGADO',
            detalle='Aprobación del diseño UX y esquema de bases de datos de turnos'
        )
        CuotaPago.objects.create(
            financiacion=fin2,
            tipo_pago='ENTREGABLE',
            entregable='Hito 2: Motor WebRTC y Sala de Videoconsulta',
            monto=Decimal('5000000.00'),
            moneda='ARS',
            fecha_vencimiento=today + timedelta(days=15),
            estado='PENDIENTE',
            detalle='Implementación de sala de espera virtual y videollamada HD'
        )
        CuotaPago.objects.create(
            financiacion=fin2,
            tipo_pago='ENTREGABLE',
            entregable='Hito 3: Integración con Receta Digital y Pase a Producción',
            monto=Decimal('5000000.00'),
            moneda='ARS',
            fecha_vencimiento=today + timedelta(days=60),
            estado='PENDIENTE',
            detalle='Cierre de proyecto y capacitación al personal médico'
        )

        # Financiación Proyecto 3 (Soporte mensual USD 1.500)
        fin3 = Financiacion.objects.create(
            proyecto=p3,
            empresa=emp2,
            monto_total=Decimal('18000.00'),
            monto_usd=Decimal('18000.00'),
            moneda='USD',
            forma_pago='MES_ADELANTADO',
            cantidad_cuotas=12,
            fecha_acuerdo=today - timedelta(days=90),
            notas='Abono mensual de mantenimiento evolutivo y monitoreo 24/7.'
        )
        CuotaPago.objects.create(
            financiacion=fin3,
            numero_cuota=1,
            monto=Decimal('1500.00'),
            monto_pagado=Decimal('1500.00'),
            monto_usd=Decimal('1500.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today - timedelta(days=20),
            fecha_pago=today - timedelta(days=21),
            estado='PAGADO',
            detalle='Abono de soporte y monitoreo - Mes anterior'
        )
        CuotaPago.objects.create(
            financiacion=fin3,
            numero_cuota=2,
            monto=Decimal('1500.00'),
            monto_usd=Decimal('1500.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today + timedelta(days=10),
            estado='PENDIENTE',
            detalle='Abono de soporte y monitoreo - Mes corriente'
        )

        # Financiación Proyecto 5 (USD 12.000 100% Cobrada)
        fin5 = Financiacion.objects.create(
            proyecto=p5,
            empresa=emp4,
            monto_total=Decimal('12000.00'),
            monto_usd=Decimal('12000.00'),
            moneda='USD',
            forma_pago='PLAN_CUOTAS',
            cantidad_cuotas=2,
            fecha_acuerdo=today - timedelta(days=120),
            notas='Proyecto finalizado y cobrado en su totalidad.'
        )
        CuotaPago.objects.create(
            financiacion=fin5,
            numero_cuota=1,
            monto=Decimal('6000.00'),
            monto_pagado=Decimal('6000.00'),
            monto_usd=Decimal('6000.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today - timedelta(days=70),
            fecha_pago=today - timedelta(days=70),
            estado='PAGADO'
        )
        CuotaPago.objects.create(
            financiacion=fin5,
            numero_cuota=2,
            monto=Decimal('6000.00'),
            monto_pagado=Decimal('6000.00'),
            monto_usd=Decimal('6000.00'),
            pago_en_dolares=True,
            moneda='USD',
            fecha_vencimiento=today - timedelta(days=15),
            fecha_pago=today - timedelta(days=14),
            estado='PAGADO'
        )

        # -------------------------------------------------------------
        # 7. RECORDATORIOS PERSONALES (Para el calendario interactivo)
        # -------------------------------------------------------------
        Recordatorio.objects.create(
            usuario=personal_rrhh,
            titulo='Revisar planillas de horas y evaluaciones de desempeño trimestrales',
            descripcion='Consolidar informes de los desarrolladores para la revisión mensual de objetivos.',
            fecha=today,
            hora='09:30:00',
            prioridad='ALTA',
            completado=False
        )

        Recordatorio.objects.create(
            usuario=personal_gerente,
            titulo='Reunión de planificación presupuestaria y flujo de cobros Q4',
            descripcion='Cruzar los vencimientos de financiación con el área contable para proyectar ingresos.',
            fecha=today + timedelta(days=2),
            hora='16:00:00',
            prioridad='MEDIA',
            completado=False
        )

        Recordatorio.objects.create(
            usuario=personal_dev1,
            titulo='Backup de base de datos antes del despliegue de pasarelas',
            descripcion='Generar snapshot completo de PostgreSQL y validar réplica en AWS RDS.',
            fecha=today + timedelta(days=4),
            hora='08:00:00',
            prioridad='URGENTE',
            completado=False
        )

        self.stdout.write(self.style.SUCCESS('\n======================================================='))
        self.stdout.write(self.style.SUCCESS(' ¡DATOS INICIALES NUEVOS GENERADOS EXITOSAMENTE! '))
        self.stdout.write(self.style.SUCCESS('======================================================='))
        self.stdout.write('Usuarios y Credenciales creadas:')
        self.stdout.write('  - Administrador: admin      / admin@gestor.com      (Pass: AdminPassword2026!)')
        self.stdout.write('  - RRHH:          rrhh       / rrhh@empresa.com      (Pass: RrhhPassword2026!)')
        self.stdout.write('  - Gerente:       gerente    / gerente@empresa.com   (Pass: GerentePassword2026!)')
        self.stdout.write('  - Líder Dev:     pedro.dev  / pedro.dev@empresa.com (Pass: EmpleadoPassword2026!)')
        self.stdout.write('  - Frontend Dev:  lucia.dev  / lucia.dev@empresa.com (Pass: EmpleadoPassword2026!)')
        self.stdout.write('  - DevOps Eng:    tomas.dev  / tomas.dev@empresa.com (Pass: EmpleadoPassword2026!)')
        self.stdout.write('=======================================================\n')
