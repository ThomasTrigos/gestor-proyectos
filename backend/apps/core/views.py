import os
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Adjunto, AuditLog, Recordatorio, ConfiguracionEmail, ConfiguracionIA
from .serializers import (
    AdjuntoSerializer, AuditLogSerializer, RecordatorioSerializer,
    ConfiguracionEmailSerializer, ConfiguracionIASerializer
)
from apps.personal.permissions import EsRRHHoGerente, EsGerente
from apps.proyectos.models import Proyecto, EstadoProyecto
from apps.tareas.models import Tarea
from apps.reuniones.models import Reunion
from apps.financiacion.models import Financiacion, CuotaPago
from apps.personal.models import Personal
from apps.empresas.models import Empresa
from django.db.models import Count, Sum, Q, Subquery, OuterRef, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

class AdjuntoViewSet(viewsets.ModelViewSet):
    queryset = Adjunto.objects.all().order_by('-created_at')
    serializer_class = AdjuntoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        personal = getattr(self.request.user, 'personal', None) if self.request.user.is_authenticated else None
        serializer.save(subido_por=personal)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-fecha')
    serializer_class = AuditLogSerializer
    permission_classes = [EsRRHHoGerente]
    filterset_fields = {
        'tabla': ['exact', 'icontains'],
        'registro_id': ['exact'],
        'usuario_id': ['exact'],
        'accion': ['exact'],
        'fecha': ['gte', 'lte']
    }

    def get_queryset(self):
        qs = super().get_queryset()
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_desde:
            qs = qs.filter(fecha__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha__date__lte=fecha_hasta)
        return qs

class RecordatorioViewSet(viewsets.ModelViewSet):
    queryset = Recordatorio.objects.all().order_by('fecha', 'hora', '-created_at')
    serializer_class = RecordatorioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = {
        'fecha': ['exact', 'gte', 'lte'],
        'completado': ['exact'],
        'prioridad': ['exact'],
    }

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        personal = getattr(user, 'personal', None) if user.is_authenticated else None
        if personal and personal.rol not in ['RRHH', 'GERENTE']:
            qs = qs.filter(usuario=personal)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.request.user
        personal = getattr(user, 'personal', None) if user.is_authenticated else None
        email_dest = serializer.validated_data.get('email_destino')
        if not email_dest:
            email_dest = personal.email if personal else (user.email if user.is_authenticated else None)
        recordatorio = serializer.save(usuario=personal, email_destino=email_dest)

        aviso_email = None
        if recordatorio.enviar_email_futuro:
            from .services.email_service import enviar_email_recordatorio
            from .models import ConfiguracionEmail
            tiene_smtp = ConfiguracionEmail.objects.filter(activo=True).exists()
            enviado = enviar_email_recordatorio(recordatorio)
            if not tiene_smtp:
                aviso_email = (
                    f"Nota guardada exitosamente. Aviso: Para que los correos lleguen a tu casilla ({email_dest}), "
                    "es necesario activar un servidor de correo saliente (Gmail, Outlook, Brevo, etc.) en Configuración > Config. Correo."
                )
            elif not enviado:
                aviso_email = (
                    f"Nota guardada, pero ocurrió un problema al entregar el correo a {email_dest}. "
                    "Verifique las credenciales SMTP en Configuración > Config. Correo."
                )

        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        if aviso_email:
            data['aviso_email'] = aviso_email
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def toggle_completado(self, request, pk=None):
        recordatorio = self.get_object()
        recordatorio.completado = not recordatorio.completado
        recordatorio.save(update_fields=['completado'])
        return Response({'id': recordatorio.id, 'completado': recordatorio.completado})


@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_proyectos_estado(request):
    latest_states = Proyecto.objects.annotate(
        estado=Subquery(
            EstadoProyecto.objects.filter(proyecto=OuterRef('pk')).order_by('-fecha_cambio').values('estado')[:1]
        )
    ).values('estado').annotate(cantidad=Count('id'))
    return Response(list(latest_states))

@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_tareas_programador(request):
    tareas = Personal.objects.filter(rol__in=['EMPLEADO', 'PROGRAMADOR']).annotate(
        total=Count('tareas_asignadas'),
        pendientes=Count('tareas_asignadas', filter=Q(tareas_asignadas__estado='PENDIENTE')),
        en_progreso=Count('tareas_asignadas', filter=Q(tareas_asignadas__estado='EN_PROGRESO')),
        completadas=Count('tareas_asignadas', filter=Q(tareas_asignadas__estado='COMPLETADA')),
    ).values('id', 'nombre', 'apellido', 'total', 'pendientes', 'en_progreso', 'completadas')
    data = []
    for t in tareas:
        t_dict = dict(t)
        t_dict['personal_id'] = str(t['id'])
        data.append(t_dict)
    return Response(data)

@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_resumen_financiero(request):
    """
    Calcula el resumen financiero agrupado por moneda para proyectos activos.
    Evita multiplicaciones producidas por JOINs directos entre Financiacion y CuotaPago,
    asegurando que total_acordado y total_cobrado reflejen con total exactitud
    la realidad financiera y los porcentajes de cobro.
    """
    monedas_fin = Financiacion.objects.filter(proyecto__eliminado=False).values_list('moneda', flat=True).distinct()
    monedas_cuotas = CuotaPago.objects.filter(financiacion__proyecto__eliminado=False).values_list('moneda', flat=True).distinct()
    monedas = set(monedas_fin).union(set(monedas_cuotas))
    if not monedas:
        monedas = {'ARS'}

    resultado = []
    monedas_ordenadas = sorted(list(monedas), key=lambda m: (0 if m == 'ARS' else (1 if m == 'USD' else 2), m))

    for m in monedas_ordenadas:
        total_acordado = Financiacion.objects.filter(
            moneda=m,
            proyecto__eliminado=False
        ).aggregate(total=Sum('monto_total'))['total'] or Decimal('0.00')

        total_cobrado = CuotaPago.objects.filter(
            financiacion__proyecto__eliminado=False,
            moneda=m,
            estado='PAGADO'
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')

        total_pendiente = CuotaPago.objects.filter(
            financiacion__proyecto__eliminado=False,
            moneda=m,
            estado__in=['PENDIENTE', 'VENCIDO', 'EN_ESPERA', 'VERIFICANDOSE', 'IMPAGO']
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')

        if total_acordado > 0 and (total_cobrado + total_pendiente) == 0:
            total_pendiente = total_acordado

        divisor = total_acordado if total_acordado > 0 else (total_cobrado + total_pendiente)
        porcentaje_cobrado = round(float((total_cobrado / divisor) * 100), 1) if divisor > 0 else 0.0

        resultado.append({
            'moneda': m,
            'total_acordado': float(total_acordado),
            'total_cobrado': float(total_cobrado),
            'total_pendiente': float(total_pendiente),
            'porcentaje_cobrado': min(100.0, porcentaje_cobrado),
        })

    return Response(resultado)

@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_proximas_reuniones(request):
    reuniones = Reunion.objects.filter(
        fecha_hora_inicio__gte=timezone.now(),
        eliminado=False
    ).select_related('proyecto__empresa').order_by('fecha_hora_inicio')[:10]
    data = [{
        'id': str(r.id),
        'titulo': r.titulo,
        'motivo': r.titulo,
        'fecha_hora': r.fecha_hora_inicio,
        'fecha_hora_inicio': r.fecha_hora_inicio,
        'modalidad': r.tipo_reunion,
        'proyecto_nombre': r.proyecto.nombre if r.proyecto else '-',
        'empresa_nombre': r.proyecto.empresa.razon_social if r.proyecto and r.proyecto.empresa else '-'
    } for r in reuniones]
    return Response(data)

@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_carga_trabajo(request):
    carga = Personal.objects.annotate(
        personal_id=F('id'),
        proyectos_activos=Count('proyectos_asignados', distinct=True),
        tareas_pendientes=Count('tareas_asignadas', filter=Q(tareas_asignadas__estado='PENDIENTE')),
        tareas_vencidas=Count('tareas_asignadas', filter=Q(tareas_asignadas__estado='PENDIENTE', tareas_asignadas__fecha_limite__lt=timezone.now().date())),
    ).values('id', 'personal_id', 'nombre', 'apellido', 'cargo', 'proyectos_activos', 'tareas_pendientes', 'tareas_vencidas')
    return Response(list(carga))

@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_proyectos_por_vencer(request):
    hasta = timezone.now().date() + timedelta(days=30)
    desde = timezone.now().date()
    proyectos = Proyecto.objects.filter(
        fecha_fin_estimada__range=[desde, hasta],
        eliminado=False
    ).select_related('empresa').prefetch_related('estados')
    data = []
    for p in proyectos:
        dias = (p.fecha_fin_estimada - desde).days if p.fecha_fin_estimada else 0
        estado_obj = p.estados.first()
        data.append({
            'id': str(p.id),
            'nombre': p.nombre,
            'fecha_estimada_fin': p.fecha_fin_estimada,
            'dias_restantes': dias,
            'estado': estado_obj.estado if estado_obj else 'OPORTUNIDAD',
            'empresa_nombre': p.empresa.razon_social if p.empresa else '-'
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([EsRRHHoGerente])
def metricas_resumen_general(request):
    total_proyectos = Proyecto.objects.count()
    total_empresas = Empresa.objects.count()
    total_personal = Personal.objects.count()
    tareas_pendientes = Tarea.objects.filter(estado='PENDIENTE').count()
    
    # Proyectos activos = aquellos cuyo ultimo estado es TRABAJANDO
    proyectos_activos = Proyecto.objects.annotate(
        latest_estado=Subquery(
            EstadoProyecto.objects.filter(proyecto=OuterRef('pk')).order_by('-fecha_cambio').values('estado')[:1]
        )
    ).filter(latest_estado='TRABAJANDO').count()

    data = {
        'total_proyectos': total_proyectos,
        'proyectos_activos': proyectos_activos,
        'total_empresas': total_empresas,
        'total_personal': total_personal,
        'tareas_pendientes': tareas_pendientes,
    }
    return Response(data)


class ConfiguracionEmailViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionEmail.objects.all().order_by('-activo', '-updated_at')
    serializer_class = ConfiguracionEmailSerializer
    permission_classes = [EsRRHHoGerente]

    @action(detail=False, methods=['get'])
    def activa(self, request):
        config = ConfiguracionEmail.objects.filter(activo=True).first()
        if not config:
            return Response({'activo': False, 'mensaje': 'No hay configuración de correo activa'}, status=200)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def probar(self, request):
        email_destino = request.data.get('email_destino')
        if not email_destino:
            personal = getattr(request.user, 'personal', None)
            email_destino = personal.email if (personal and personal.email) else (request.user.email if request.user.is_authenticated else None)
            if not email_destino:
                return Response({'error': 'Debe especificar el campo email_destino'}, status=400)

        password_plano = request.data.get('password')
        host = request.data.get('host')
        usuario = request.data.get('usuario')

        config_a_probar = None
        if host and usuario and password_plano:
            # Probar credenciales al vuelo sin necesidad de haber guardado previamente
            config_a_probar = ConfiguracionEmail(
                proveedor=request.data.get('proveedor', 'GMAIL'),
                host=host,
                port=int(request.data.get('port', 587)),
                usuario=usuario,
                use_tls=bool(request.data.get('use_tls', True)),
                use_ssl=bool(request.data.get('use_ssl', False)),
                remitente_default=request.data.get('remitente_default', usuario),
            )
            config_a_probar.set_password(password_plano)
        else:
            config_id = request.data.get('config_id')
            if config_id:
                config_a_probar = ConfiguracionEmail.objects.filter(id=config_id).first()
            else:
                config_a_probar = ConfiguracionEmail.objects.filter(activo=True).first()

        if not config_a_probar:
            return Response({
                'ok': False,
                'error': 'No se proporcionaron credenciales completas ni existe una configuración SMTP activa en base de datos.'
            }, status=400)

        from .services.email_service import enviar_email_prueba
        try:
            enviar_email_prueba(destinatario=email_destino, config=config_a_probar)
            return Response({
                'ok': True,
                'mensaje': f'¡Correo de prueba enviado exitosamente a {email_destino}!'
            })
        except Exception as e:
            return Response({
                'ok': False,
                'error': f'Error de conexión SMTP: {str(e)}'
            }, status=400)


class ConfiguracionIAViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionIA.objects.all().order_by('-es_predeterminado', '-activo', 'proveedor')
    serializer_class = ConfiguracionIASerializer
    permission_classes = [EsRRHHoGerente]

    @action(detail=False, methods=['get'])
    def proveedores(self, request):
        from apps.proyectos.services.nlp_analyzer import obtener_estado_configuracion_ia
        return Response(obtener_estado_configuracion_ia())

    @action(detail=False, methods=['post'])
    def probar(self, request):
        proveedor = request.data.get('proveedor', '').upper().strip()
        modelo = request.data.get('modelo', '').strip()
        api_key = request.data.get('api_key', '').strip()
        config_id = request.data.get('id')

        if not api_key and config_id:
            try:
                conf = ConfiguracionIA.objects.get(id=config_id)
                api_key = conf.get_api_key()
                if not modelo:
                    modelo = conf.modelo
                if not proveedor:
                    proveedor = conf.proveedor
            except ConfiguracionIA.DoesNotExist:
                return Response({'ok': False, 'error': 'Configuración de IA no encontrada.'}, status=404)

        if not api_key:
            env_map = {
                'GEMINI': ['GEMINI_API_KEY'],
                'GROK': ['GROK_API_KEY', 'XAI_API_KEY'],
                'CLAUDE': ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'],
                'OPENAI': ['OPENAI_API_KEY'],
            }
            for k in env_map.get(proveedor, []):
                val = os.getenv(k, '').strip()
                if val:
                    api_key = val
                    break

        if not api_key:
            return Response({'ok': False, 'error': f'No se proporcionó una API Key para probar {proveedor}.'}, status=400)

        from apps.proyectos.services.nlp_analyzer import probar_conexion_proveedor
        resultado = probar_conexion_proveedor(proveedor, api_key, modelo)
        return Response(resultado)

    @action(detail=True, methods=['post'])
    def establecer_predeterminado(self, request, pk=None):
        config = self.get_object()
        config.es_predeterminado = True
        config.activo = True
        config.save()
        return Response({'ok': True, 'mensaje': f'{config.nombre} establecido como proveedor predeterminado.'})

