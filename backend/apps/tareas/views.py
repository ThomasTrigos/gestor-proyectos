from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from .models import Tarea
from .serializers import TareaSerializer, TareaConfirmacionSerializer
from apps.personal.authentication import TokenConfirmacionAuthentication
from apps.personal.permissions import EsRRHH, EsRRHHoGerente

class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.all().order_by('-created_at')
    serializer_class = TareaSerializer
    filterset_fields = ['proyecto', 'asignado_a', 'estado', 'prioridad', 'estado_proyecto']
    search_fields = ['titulo']

    def get_queryset(self):
        qs = Tarea.objects.select_related(
            'proyecto__empresa', 'asignado_a', 'asignado_por', 'columna_kanban'
        ).all().order_by('-created_at')
        user = self.request.user
        if user and user.is_authenticated:
            personal = getattr(user, 'personal', None)
            if personal and personal.rol not in ['RRHH', 'GERENTE']:
                qs = qs.filter(asignado_a=personal)
        return qs


    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'completar', 'cambiar_estado']:
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'create']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def completar(self, request, pk=None):
        tarea = self.get_object()
        personal = getattr(request.user, 'personal', None) if request.user.is_authenticated else None
        if personal and personal.rol not in ['RRHH', 'GERENTE']:
            if tarea.asignado_a_id != personal.id and (not tarea.proyecto or tarea.proyecto.lider_proyecto_id != personal.id):
                return Response({'error': 'No tienes permiso para modificar esta tarea.'}, status=status.HTTP_403_FORBIDDEN)
        
        tarea.estado = 'COMPLETADA'
        tarea.fecha_completada = timezone.now()
        if tarea.proyecto:
            col_comp = tarea.proyecto.columnas_kanban.filter(estado_asociado='COMPLETADA').order_by('orden').first()
            if col_comp:
                tarea.columna_kanban = col_comp
        tarea.save()
        return Response(TareaSerializer(tarea).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cambiar_estado(self, request, pk=None):
        tarea = self.get_object()
        personal = getattr(request.user, 'personal', None) if request.user.is_authenticated else None
        if personal and personal.rol not in ['RRHH', 'GERENTE']:
            if tarea.asignado_a_id != personal.id and (not tarea.proyecto or tarea.proyecto.lider_proyecto_id != personal.id):
                return Response({'error': 'No tienes permiso para modificar esta tarea.'}, status=status.HTTP_403_FORBIDDEN)
        
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA']:
            return Response({'error': 'Estado no válido.'}, status=status.HTTP_400_BAD_REQUEST)
            
        tarea.estado = nuevo_estado
        if nuevo_estado == 'COMPLETADA':
            tarea.fecha_completada = timezone.now()
        elif nuevo_estado == 'EN_PROGRESO' and not tarea.fecha_inicio_trabajo:
            tarea.fecha_inicio_trabajo = timezone.now()
            
        if tarea.proyecto:
            col = tarea.proyecto.columnas_kanban.filter(estado_asociado=nuevo_estado).order_by('orden').first()
            if col:
                tarea.columna_kanban = col
                
        tarea.save()
        return Response(TareaSerializer(tarea).data)

    def perform_create(self, serializer):
        from apps.core.middleware import get_current_user
        from apps.core.signals import get_personal_from_user
        from apps.core.services.email_service import enviar_email_tarea
        from apps.core.services.icalendar_service import generar_ics_tarea
        from apps.proyectos.models import ProyectoEquipo
        from apps.proyectos.views import asegurar_columnas_kanban
        
        user = get_current_user()
        personal = get_personal_from_user(user)
        
        tarea = serializer.save(asignado_por=personal)

        # 1. Si la tarea pertenece a un proyecto y tiene un asignado, auto-incorporarlo al equipo del proyecto
        if tarea.proyecto and tarea.asignado_a:
            ProyectoEquipo.objects.get_or_create(
                proyecto=tarea.proyecto,
                personal=tarea.asignado_a,
                defaults={'es_lider': False}
            )

        # 2. Vincular directamente al tablero Kanban
        if tarea.proyecto:
            asegurar_columnas_kanban(tarea.proyecto)
            if not tarea.columna_kanban or tarea.columna_kanban.proyecto_id != tarea.proyecto_id:
                cols = list(tarea.proyecto.columnas_kanban.all().order_by('orden'))
                col_match = next((c for c in cols if c.estado_asociado == tarea.estado), cols[0] if cols else None)
                if col_match:
                    tarea.columna_kanban = col_match
                    tarea.save(update_fields=['columna_kanban'])

        # 3. Notificaciones por email e iCalendar
        try:
            ics_content = generar_ics_tarea(tarea)
            enviar_email_tarea(tarea, ics_content)
            tarea.notificado_email = True
            tarea.notificado_icalendar = True
            tarea.save(update_fields=['notificado_email', 'notificado_icalendar'])
        except Exception:
            pass

    def perform_update(self, serializer):
        from apps.proyectos.models import ProyectoEquipo
        from apps.proyectos.views import asegurar_columnas_kanban

        tarea = serializer.save()

        # 1. Si la tarea pertenece a un proyecto y tiene un asignado, auto-incorporarlo al equipo del proyecto
        if tarea.proyecto and tarea.asignado_a:
            ProyectoEquipo.objects.get_or_create(
                proyecto=tarea.proyecto,
                personal=tarea.asignado_a,
                defaults={'es_lider': False}
            )

        # 2. Vincular directamente al tablero Kanban si no tiene o pertenece a otro proyecto
        if tarea.proyecto:
            asegurar_columnas_kanban(tarea.proyecto)
            if not tarea.columna_kanban or tarea.columna_kanban.proyecto_id != tarea.proyecto_id:
                cols = list(tarea.proyecto.columnas_kanban.all().order_by('orden'))
                col_match = next((c for c in cols if c.estado_asociado == tarea.estado), cols[0] if cols else None)
                if col_match:
                    tarea.columna_kanban = col_match
                    tarea.save(update_fields=['columna_kanban'])

class TareaConfirmacionView(viewsets.ViewSet):
    permission_classes = []

    def _validar_acceso_tarea(self, request, tarea):
        token_str = request.query_params.get('token')
        if token_str:
            try:
                import uuid
                token_uuid = uuid.UUID(token_str)
                # Validar token unívoco de la tarea
                if tarea.token_confirmacion and tarea.token_confirmacion == token_uuid:
                    if tarea.fecha_expiracion_token and timezone.now() > tarea.fecha_expiracion_token:
                        return False, "El enlace de confirmación de esta tarea ha expirado."
                    return True, None
                # Compatibilidad hacia atrás: token del empleado
                if tarea.asignado_a and tarea.asignado_a.token_confirmacion == token_uuid:
                    return True, None
            except (ValueError, TypeError):
                return False, "Token con formato inválido."

        # Si el usuario está autenticado y tiene permisos
        user = request.user
        if user and user.is_authenticated:
            personal = getattr(user, 'personal', None)
            if personal and (personal.id == tarea.asignado_a_id or personal.rol in ['RRHH', 'GERENTE']):
                return True, None
            if user.is_staff or user.is_superuser:
                return True, None

        return False, "Acceso no autorizado. Se requiere un token válido o sesión iniciada."

    @action(detail=True, methods=['get'])
    def detalle(self, request, pk=None):
        try:
            tarea = Tarea.objects.get(pk=pk)
        except Tarea.DoesNotExist:
            return Response({'error': 'Tarea no encontrada.'}, status=404)

        autorizado, error_msg = self._validar_acceso_tarea(request, tarea)
        if not autorizado:
            return Response({'error': error_msg}, status=403)

        return Response(TareaSerializer(tarea).data)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        try:
            tarea = Tarea.objects.get(pk=pk)
        except Tarea.DoesNotExist:
            return Response({'error': 'Tarea no encontrada.'}, status=404)

        autorizado, error_msg = self._validar_acceso_tarea(request, tarea)
        if not autorizado:
            return Response({'error': error_msg}, status=403)

        serializer = TareaConfirmacionSerializer(data=request.data)
        if serializer.is_valid():
            accion = serializer.validated_data['accion']
            now = timezone.now()
            if accion == 'LEER' and not tarea.fecha_leido:
                tarea.fecha_leido = now
            elif accion == 'INICIAR':
                if not tarea.fecha_leido:
                    tarea.fecha_leido = now
                if not tarea.fecha_inicio_trabajo:
                    tarea.fecha_inicio_trabajo = now
                tarea.estado = 'EN_PROGRESO'
            elif accion == 'COMPLETAR':
                tarea.fecha_completada = now
                tarea.estado = 'COMPLETADA'
            tarea.save()
            return Response({'status': 'ok', 'estado': tarea.estado})
        return Response(serializer.errors, status=400)

class MisTareasView(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [TokenConfirmacionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TareaSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Tarea.objects.none()
        return Tarea.objects.filter(asignado_a=user).select_related('proyecto__empresa', 'asignado_a').order_by('-created_at')

