from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import Reunion
from .serializers import ReunionSerializer
from apps.personal.permissions import EsRRHH, EsRRHHoGerente
from apps.core.services.email_service import enviar_email_reunion
from apps.core.services.icalendar_service import generar_ics_reunion
from apps.proyectos.services.nlp_analyzer import extraer_texto_de_archivo, diagnosticar_reunion_completa


class ReunionViewSet(viewsets.ModelViewSet):
    queryset = Reunion.objects.all()
    serializer_class = ReunionSerializer
    filterset_fields = ['proyecto', 'tipo_reunion']
    search_fields = ['titulo']
    ordering_fields = ['titulo', 'fecha_hora_inicio', 'fecha_hora_fin', 'created_at', 'updated_at']

    def get_queryset(self):
        papelera = self.request.query_params.get('papelera', 'false').lower() == 'true'
        base_qs = Reunion.objects.select_related('proyecto__empresa').prefetch_related(
            'participantes_internos__personal', 'participantes_externos'
        )
        if papelera:
            qs = base_qs.filter(eliminado=True).order_by('-fecha_eliminacion')
        else:
            qs = base_qs.filter(eliminado=False).order_by('-fecha_hora_inicio')


        user = self.request.user
        if user and user.is_authenticated:
            personal = getattr(user, 'personal', None)
            if personal and personal.rol not in ['RRHH', 'GERENTE']:
                from django.db.models import Q
                qs = qs.filter(
                    Q(proyecto__equipo_asignaciones__personal=personal) |
                    Q(proyecto__lider_proyecto=personal) |
                    Q(participantes_internos__personal=personal)
                ).distinct()
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'completar', 'analizar_transcripcion', 'analizar_acta', 'estado_ia']:
            return [IsAuthenticated()]
        return [EsRRHHoGerente()]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def completar(self, request, pk=None):
        reunion = self.get_object()
        personal = getattr(request.user, 'personal', None) if request.user.is_authenticated else None
        if personal and personal.rol not in ['RRHH', 'GERENTE']:
            es_participante = reunion.participantes_internos.filter(personal=personal).exists()
            es_del_proyecto = reunion.proyecto and (
                reunion.proyecto.lider_proyecto_id == personal.id or
                reunion.proyecto.equipo_asignaciones.filter(personal=personal).exists()
            )
            if not es_participante and not es_del_proyecto:
                return Response({'error': 'No tienes permiso para modificar esta reunión.'}, status=status.HTTP_403_FORBIDDEN)

        reunion.completada = not reunion.completada
        reunion.fecha_completada = timezone.now() if reunion.completada else None
        reunion.save(update_fields=['completada', 'fecha_completada'])
        return Response({
            'id': str(reunion.id),
            'completada': reunion.completada,
            'fecha_completada': reunion.fecha_completada
        })

    def perform_destroy(self, instance):
        instance.eliminado = True
        instance.fecha_eliminacion = timezone.now()
        user = self.request.user
        if hasattr(user, 'personal'):
            instance.eliminado_por = user.personal
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[EsRRHHoGerente])
    def restaurar(self, request, pk=None):
        try:
            reunion = Reunion.objects.get(pk=pk, eliminado=True)
        except Reunion.DoesNotExist:
            return Response({'error': 'La reunión no se encuentra en la papelera.'}, status=status.HTTP_404_NOT_FOUND)

        reunion.eliminado = False
        reunion.fecha_eliminacion = None
        reunion.eliminado_por = None
        reunion.save()
        return Response({'ok': True, 'mensaje': f'Reunión "{reunion.titulo}" restaurada exitosamente.'})

    def perform_create(self, serializer):
        reunion = serializer.save()
        ics_content = generar_ics_reunion(reunion)
        enviar_email_reunion(reunion, ics_content)

    @action(detail=False, methods=['get'], url_path='estado-ia')
    def estado_ia(self, request):
        from apps.proyectos.services.nlp_analyzer import obtener_estado_configuracion_ia
        return Response(obtener_estado_configuracion_ia())

    @action(detail=False, methods=['post'], url_path='analizar-transcripcion', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def analizar_transcripcion(self, request):
        archivo = request.FILES.get('archivo')
        texto = request.data.get('texto', '')

        if archivo:
            try:
                texto = extraer_texto_de_archivo(archivo)
            except Exception as e:
                return Response({'error': f"Error al extraer texto del archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not texto or not str(texto).strip():
            return Response({'error': 'No se proveyó texto ni archivo de transcripción para analizar.'}, status=status.HTTP_400_BAD_REQUEST)

        proveedor = request.data.get('proveedor', 'AUTO')
        diagnostico = diagnosticar_reunion_completa(str(texto), proveedor_solicitado=proveedor)
        return Response({
            'texto_extraido': str(texto)[:3000] + ('...' if len(str(texto)) > 3000 else ''),
            'caracteres': len(str(texto)),
            'diagnostico': diagnostico,
            'proveedor': diagnostico.get('proveedor', 'Desconocido'),
            'es_ia_remota': diagnostico.get('es_ia_remota', False)
        })

    @action(detail=True, methods=['post'], url_path='analizar-acta')
    def analizar_acta(self, request, pk=None):
        reunion = self.get_object()
        if not reunion.acta or not reunion.acta.strip():
            return Response({'error': 'Esta reunión no cuenta con texto en su acta para analizar.'}, status=status.HTTP_400_BAD_REQUEST)

        proveedor = request.data.get('proveedor', 'AUTO')
        diagnostico = diagnosticar_reunion_completa(reunion.acta, proveedor_solicitado=proveedor)
        return Response({
            'reunion_id': str(reunion.id),
            'titulo': reunion.titulo,
            'diagnostico': diagnostico,
            'proveedor': diagnostico.get('proveedor', 'Desconocido'),
            'es_ia_remota': diagnostico.get('es_ia_remota', False)
        })

