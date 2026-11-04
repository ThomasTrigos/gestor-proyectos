from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError
from django.db.models import Max, Avg, Q
from django.utils import timezone
from .models import Proyecto, EstadoProyecto, ProyectoEquipo, ProyectoDia0, ProyectoSnapshot
from .serializers import (
    ProyectoSerializer, CambiarEstadoSerializer, ProyectoEquipoSerializer,
    ProyectoDia0Serializer, ProyectoSnapshotSerializer
)
from .state_machine import validar_transicion
from apps.personal.permissions import EsRRHH, EsRRHHoGerente
from apps.tareas.models import ColumnaKanban, Tarea
from apps.tareas.serializers import ColumnaKanbanSerializer, TareaSerializer
from .services.phs_engine import calcular_phs_dia0, calcular_phs_snapshot, generar_sugerencias_automaticas
from .services.nlp_analyzer import extraer_texto_de_archivo, analizar_texto_minuta



def asegurar_columnas_kanban(proyecto):
    # Columnas predefinidas del tablero Kanban (fijas y no modificables)
    COLUMNAS_ESTANDAR = [
        ('Backlog', 'slate', 0, 'PENDIENTE'),
        ('Por hacer', 'blue', 1, 'PENDIENTE'),
        ('En Progreso', 'indigo', 2, 'EN_PROGRESO'),
        ('En Revisión', 'amber', 3, 'EN_PROGRESO'),
        ('Completada', 'emerald', 4, 'COMPLETADA'),
    ]

    for nombre, color, orden, estado in COLUMNAS_ESTANDAR:
        col = proyecto.columnas_kanban.filter(nombre__iexact=nombre).first()
        if not col and nombre == 'Por hacer':
            col = proyecto.columnas_kanban.filter(nombre__iexact='Por Hacer').first()

        if col:
            col.nombre = nombre
            col.color = color
            col.orden = orden
            col.estado_asociado = estado
            col.save(update_fields=['nombre', 'color', 'orden', 'estado_asociado'])
        else:
            ColumnaKanban.objects.create(
                proyecto=proyecto,
                nombre=nombre,
                color=color,
                orden=orden,
                estado_asociado=estado
            )

    # Reasignar tarjetas de columnas no estándar si existieran y eliminarlas
    nombres_estandar = [c[0] for c in COLUMNAS_ESTANDAR]
    col_defecto = proyecto.columnas_kanban.filter(nombre='Por hacer').first() or proyecto.columnas_kanban.first()
    columnas_sobrantes = proyecto.columnas_kanban.exclude(nombre__in=nombres_estandar)
    for c in columnas_sobrantes:
        c.tareas.all().update(columna_kanban=col_defecto)
        c.delete()

    # Asignar tareas sin columna a su correspondiente columna según estado
    tareas_sin_col = Tarea.objects.filter(proyecto=proyecto, columna_kanban__isnull=True)
    if tareas_sin_col.exists():
        cols = list(proyecto.columnas_kanban.all().order_by('orden'))
        first_col = next((c for c in cols if c.nombre == 'Por hacer'), cols[0] if cols else None)
        for t in tareas_sin_col:
            col_match = next((c for c in cols if c.estado_asociado == t.estado and c.nombre != 'Backlog'), first_col)
            t.columna_kanban = col_match
            t.save(update_fields=['columna_kanban'])


def usuario_es_lider_o_admin(proyecto, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    personal = getattr(user, 'personal', None)
    if not personal:
        return user.is_staff or user.is_superuser
    if personal.rol in ['RRHH', 'GERENTE']:
        return True
    if proyecto.lider_proyecto_id == personal.id:
        return True
    return proyecto.equipo_asignaciones.filter(personal=personal, es_lider=True).exists()


class ProyectoViewSet(viewsets.ModelViewSet):
    queryset = Proyecto.objects.all()
    serializer_class = ProyectoSerializer
    filterset_fields = ['empresa']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'fecha_inicio_estimada', 'created_at', 'updated_at']

    def get_queryset(self):
        papelera = self.request.query_params.get('papelera', 'false').lower() == 'true'
        base_qs = Proyecto.objects.select_related('empresa', 'lider_proyecto').prefetch_related(
            'estados', 'equipo_asignaciones__personal'
        )
        if papelera:
            qs = base_qs.filter(eliminado=True).order_by('-fecha_eliminacion')
        else:
            qs = base_qs.filter(eliminado=False).order_by('-created_at')


        user = self.request.user
        if user and user.is_authenticated:
            personal = getattr(user, 'personal', None)
            if personal and personal.rol not in ['RRHH', 'GERENTE']:
                from django.db.models import Q
                qs = qs.filter(
                    Q(lider_proyecto=personal) |
                    Q(equipo_asignaciones__personal=personal)
                ).distinct()
        return qs

    def get_permissions(self):
        if self.action in [
            'list', 'retrieve', 'estados_posibles',
            'kanban', 'mover_tarjeta_kanban',
            'crear_columna_kanban', 'editar_columna_kanban',
            'eliminar_columna_kanban', 'reordenar_columnas_kanban',
            'health_score', 'snapshots', 'snapshots_sugerencias',
            'analizar_minuta', 'dia0'
        ]:
            return [IsAuthenticated()]
        if self.action in ['health_overview']:
            return [EsRRHHoGerente()]
        return [EsRRHH()]

    def perform_destroy(self, instance):
        instance.eliminado = True
        instance.fecha_eliminacion = timezone.now()
        user = self.request.user
        if hasattr(user, 'personal'):
            instance.eliminado_por = user.personal
        instance.save()

    @action(detail=True, methods=['post'], permission_classes=[EsRRHH])
    def restaurar(self, request, pk=None):
        try:
            proyecto = Proyecto.objects.get(pk=pk, eliminado=True)
        except Proyecto.DoesNotExist:
            return Response({'error': 'El proyecto no se encuentra en la papelera.'}, status=status.HTTP_404_NOT_FOUND)

        proyecto.eliminado = False
        proyecto.fecha_eliminacion = None
        proyecto.eliminado_por = None
        proyecto.save()
        return Response({'ok': True, 'mensaje': f'Proyecto "{proyecto.nombre}" restaurado exitosamente.'})

    def perform_create(self, serializer):
        proyecto = serializer.save()
        user = self.request.user
        personal = user.personal if hasattr(user, 'personal') else None
        EstadoProyecto.objects.create(
            proyecto=proyecto,
            estado='OPORTUNIDAD',
            razon_cambio='Creación inicial',
            cambiado_por=personal
        )
        asegurar_columnas_kanban(proyecto)

    @action(detail=True, methods=['get'])
    def estados_posibles(self, request, pk=None):
        proyecto = self.get_object()
        estado_actual_obj = proyecto.estados.first()
        estado_actual = estado_actual_obj.estado if estado_actual_obj else None
        from .state_machine import TRANSICIONES_VALIDAS
        posibles = TRANSICIONES_VALIDAS.get(estado_actual, [])
        return Response({
            'estado_actual': estado_actual,
            'estados_posibles': posibles
        })

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        proyecto = self.get_object()
        serializer = CambiarEstadoSerializer(data=request.data)
        if serializer.is_valid():
            nuevo_estado = serializer.validated_data['estado']
            razon = serializer.validated_data['razon_cambio']
            
            estado_actual_obj = proyecto.estados.first()
            estado_actual = estado_actual_obj.estado if estado_actual_obj else None
            
            try:
                validar_transicion(estado_actual, nuevo_estado)
            except ValidationError as e:
                mensaje = e.message if hasattr(e, 'message') else str(e)
                return Response({'error': mensaje}, status=status.HTTP_400_BAD_REQUEST)

            personal = None
            if hasattr(request.user, 'personal'):
                personal = request.user.personal

            if 'fecha_fin_estimada' in serializer.validated_data:
                proyecto.fecha_fin_estimada = serializer.validated_data['fecha_fin_estimada']
                proyecto.save(update_fields=['fecha_fin_estimada'])

            EstadoProyecto.objects.create(
                proyecto=proyecto,
                estado=nuevo_estado,
                razon_cambio=razon,
                cambiado_por=personal
            )
            return Response(ProyectoSerializer(proyecto).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def asignar_equipo(self, request, pk=None):
        proyecto = self.get_object()
        personal_id = request.data.get('personal') or request.data.get('personal_id')
        if not personal_id:
            return Response({'error': 'personal es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.personal.models import Personal
        try:
            personal = Personal.objects.get(id=personal_id)
        except Personal.DoesNotExist:
            return Response({'error': 'Personal no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        es_lider = bool(request.data.get('es_lider', False))

        equipo, created = ProyectoEquipo.objects.get_or_create(
            proyecto=proyecto,
            personal=personal,
            defaults={'es_lider': es_lider}
        )
        if not created:
            if 'es_lider' in request.data:
                equipo.es_lider = es_lider
                equipo.save(update_fields=['es_lider'])
            else:
                return Response({'error': 'Este personal ya forma parte del equipo del proyecto'}, status=status.HTTP_400_BAD_REQUEST)

        if es_lider:
            proyecto.lider_proyecto = personal
            proyecto.save(update_fields=['lider_proyecto'])

        notificar = request.data.get('notificar', True)
        if notificar:
            from apps.core.services.email_service import enviar_email_equipo
            try:
                enviar_email_equipo(proyecto, personal)
                equipo.notificado_email = True
                equipo.save(update_fields=['notificado_email'])
            except Exception:
                pass

        return Response(ProyectoEquipoSerializer(equipo).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def designar_lider(self, request, pk=None):
        """
        Designa explícitamente a un miembro del equipo como Líder del Proyecto.
        """
        proyecto = self.get_object()
        personal_id = request.data.get('personal_id') or request.data.get('personal')
        if not personal_id:
            return Response({'error': 'personal_id es requerido'}, status=400)

        from apps.personal.models import Personal
        try:
            personal = Personal.objects.get(id=personal_id)
        except Personal.DoesNotExist:
            return Response({'error': 'Personal no encontrado'}, status=404)

        # Quitar marca de líder anterior en el equipo
        proyecto.equipo_asignaciones.update(es_lider=False)
        # Asignar o actualizar al nuevo líder
        equipo, _ = ProyectoEquipo.objects.get_or_create(proyecto=proyecto, personal=personal)
        equipo.es_lider = True
        equipo.save(update_fields=['es_lider'])

        proyecto.lider_proyecto = personal
        proyecto.save(update_fields=['lider_proyecto'])

        return Response({
            'ok': True,
            'mensaje': f'{personal.nombre} {personal.apellido} ha sido designado como Líder del Proyecto {proyecto.nombre}.',
            'proyecto': ProyectoSerializer(proyecto).data
        })

    @action(detail=True, methods=['post'])
    def desasignar_equipo(self, request, pk=None):
        proyecto = self.get_object()
        personal_id = request.data.get('personal') or request.data.get('personal_id')
        if not personal_id:
            return Response({'error': 'personal es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        ProyectoEquipo.objects.filter(proyecto=proyecto, personal_id=personal_id).delete()
        if proyecto.lider_proyecto_id and str(proyecto.lider_proyecto_id) == str(personal_id):
            proyecto.lider_proyecto = None
            proyecto.save(update_fields=['lider_proyecto'])
        return Response({'status': 'Miembro desasignado correctamente'})

    # =========================================================================
    # TABLERO KANBAN DRAG & DROP Y GESTIÓN DE COLUMNAS (POR EL LÍDER O GERENTE)
    # =========================================================================

    @action(detail=True, methods=['get'])
    def kanban(self, request, pk=None):
        """
        Retorna la estructura completa del tablero Kanban: columnas ordenadas y tareas agrupadas.
        """
        proyecto = self.get_object()
        asegurar_columnas_kanban(proyecto)

        puede_editar = False
        columnas = proyecto.columnas_kanban.all().order_by('orden', 'created_at')

        columnas_data = []
        personal = getattr(request.user, 'personal', None) if request.user and request.user.is_authenticated else None
        for col in columnas:
            tareas_col = col.tareas.all().order_by('orden_en_columna', '-created_at')
            if personal and personal.rol not in ['RRHH', 'GERENTE'] and not puede_editar:
                tareas_col = tareas_col.filter(asignado_a=personal)
            columnas_data.append({
                'id': str(col.id),
                'nombre': col.nombre,
                'color': col.color,
                'orden': col.orden,
                'estado_asociado': col.estado_asociado,
                'tareas': TareaSerializer(tareas_col, many=True).data
            })

        lider_info = None
        if proyecto.lider_proyecto:
            lider_info = {
                'id': str(proyecto.lider_proyecto.id),
                'nombre': proyecto.lider_proyecto.nombre,
                'apellido': proyecto.lider_proyecto.apellido,
                'email': proyecto.lider_proyecto.email,
            }

        return Response({
            'proyecto_id': str(proyecto.id),
            'proyecto_nombre': proyecto.nombre,
            'lider_proyecto': lider_info,
            'puede_editar_columnas': puede_editar,
            'columnas': columnas_data
        })

    @action(detail=True, methods=['post'], url_path='kanban/mover-tarjeta')
    def mover_tarjeta_kanban(self, request, pk=None):
        """
        Actualiza la columna y el orden de una tarjeta tras una acción de Drag & Drop.
        """
        proyecto = self.get_object()
        tarea_id = request.data.get('tarea_id')
        columna_destino_id = request.data.get('columna_destino_id')
        nuevo_orden = request.data.get('nuevo_orden', 0)

        if not tarea_id or not columna_destino_id:
            return Response({'error': 'tarea_id y columna_destino_id son requeridos'}, status=400)

        try:
            tarea = Tarea.objects.get(id=tarea_id, proyecto=proyecto)
        except Tarea.DoesNotExist:
            return Response({'error': 'La tarea no pertenece a este proyecto'}, status=404)

        try:
            columna_dest = ColumnaKanban.objects.get(id=columna_destino_id, proyecto=proyecto)
        except ColumnaKanban.DoesNotExist:
            return Response({'error': 'La columna destino no pertenece a este proyecto'}, status=404)

        tarea.columna_kanban = columna_dest
        try:
            tarea.orden_en_columna = int(nuevo_orden)
        except (ValueError, TypeError):
            tarea.orden_en_columna = 0

        # Si la columna tiene mapeado un estado de tarea, sincronizarlo automáticamente
        if columna_dest.estado_asociado:
            tarea.estado = columna_dest.estado_asociado
            from django.utils import timezone
            if columna_dest.estado_asociado == 'COMPLETADA':
                if not tarea.fecha_completada:
                    tarea.fecha_completada = timezone.now()
            elif columna_dest.estado_asociado == 'EN_PROGRESO':
                if not tarea.fecha_inicio_trabajo:
                    tarea.fecha_inicio_trabajo = timezone.now()
                tarea.fecha_completada = None
            elif columna_dest.estado_asociado == 'PENDIENTE':
                tarea.fecha_completada = None

        tarea.save()


        return Response({
            'ok': True,
            'tarea_id': str(tarea.id),
            'columna_id': str(columna_dest.id),
            'nuevo_orden': tarea.orden_en_columna,
            'nuevo_estado': tarea.estado,
            'estado_label': tarea.get_estado_display()
        })

    @action(detail=True, methods=['post'], url_path='kanban/columnas')
    def crear_columna_kanban(self, request, pk=None):
        return Response({
            'error': 'Las columnas del tablero Kanban están predefinidas (Backlog, Por hacer, En Progreso, En Revisión, Completada) y no se pueden agregar nuevas columnas.'
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'patch'], url_path=r'kanban/columnas/(?P<columna_id>[^/.]+)')
    def editar_columna_kanban(self, request, pk=None, columna_id=None):
        return Response({
            'error': 'Las columnas del tablero Kanban están predefinidas y no se pueden modificar.'
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path=r'kanban/columnas/(?P<columna_id>[^/.]+)')
    def eliminar_columna_kanban(self, request, pk=None, columna_id=None):
        return Response({
            'error': 'Las columnas del tablero Kanban están predefinidas y no se pueden eliminar.'
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='kanban/reordenar-columnas')
    def reordenar_columnas_kanban(self, request, pk=None):
        return Response({
            'error': 'El orden de las columnas del tablero Kanban es fijo y predeterminado.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # PROJECT HEALTH SCORE (PHS) & PREDICTOR DE ÉXITO
    # =========================================================================

    @action(detail=True, methods=['get', 'post'])
    def dia0(self, request, pk=None):
        proyecto = self.get_object()

        if request.method == 'GET':
            dia0 = getattr(proyecto, 'perfil_dia0', None)
            if dia0:
                return Response(ProyectoDia0Serializer(dia0).data)

            # Sugerencias iniciales si aún no fue guardado
            duracion_dias = 90
            if proyecto.fecha_inicio_estimada and proyecto.fecha_fin_estimada:
                delta = (proyecto.fecha_fin_estimada - proyecto.fecha_inicio_estimada).days
                if delta > 0:
                    duracion_dias = delta

            defaults = {
                'pm_experiencia_anios': 3,
                'modalidad_contratacion': 'IN_HOUSE',
                'categoria_proyecto': 'PRODUCTO_CORE',
                'presupuesto_base': 0.00,
                'duracion_estimada_dias': duracion_dias,
                'esfuerzo_meses_persona': 3.0,
                'complejidad_tecnica': 3,
                'competencia_equipo_pct': 75.0,
                'certeza_requerimientos': 3,
                'conocimiento_sponsor': 2,
                'tolerancia_desviacion_tiempo_pct': 15.0,
                'tolerancia_desviacion_costo_pct': 15.0,
                'certificaciones_pm': [],
                'configurado': False
            }
            calculo_previo = calcular_phs_dia0(defaults)
            defaults['phs_inicial'] = calculo_previo['phs_inicial']
            return Response(defaults)

        # POST / PUT (Guardar perfil Día 0)
        if not usuario_es_lider_o_admin(proyecto, request.user):
            raise PermissionDenied("No tiene permisos para modificar la configuración Día 0 de este proyecto.")

        dia0 = getattr(proyecto, 'perfil_dia0', None)
        serializer = ProyectoDia0Serializer(dia0, data=request.data, partial=bool(dia0))
        if serializer.is_valid():
            # Calcular PHS inicial con el motor de regresión logística a priori
            calc_res = calcular_phs_dia0(serializer.validated_data)
            dia0_inst = serializer.save(
                proyecto=proyecto,
                phs_inicial=calc_res['phs_inicial']
            )
            return Response(ProyectoDia0Serializer(dia0_inst).data, status=status.HTTP_200_OK if dia0 else status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def snapshots(self, request, pk=None):
        proyecto = self.get_object()

        if request.method == 'GET':
            qs = proyecto.snapshots.all().order_by('-fecha_corte', '-numero_corte')
            return Response(ProyectoSnapshotSerializer(qs, many=True).data)

        # POST: Crear nuevo snapshot periódico
        if not usuario_es_lider_o_admin(proyecto, request.user):
            raise PermissionDenied("No tiene permisos para registrar snapshots en este proyecto.")

        data = request.data.copy()
        archivo = request.FILES.get('archivo_minuta')
        texto_minuta = data.get('texto_minuta', '')

        # Si se adjuntó un archivo externo (.pdf, .docx, .txt), extraer texto y analizar
        if archivo:
            try:
                texto_extraido = extraer_texto_de_archivo(archivo)
                texto_minuta = texto_extraido
                data['texto_minuta_analizado'] = texto_extraido[:5000]
            except Exception as e:
                return Response({'error': f"Error al procesar archivo de minuta: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Si hay texto de minuta (cargado o extraído), ejecutar NLP
        if texto_minuta and str(texto_minuta).strip():
            prev_snap = proyecto.snapshots.first()
            prev_text = prev_snap.texto_minuta_analizado if prev_snap else None
            nlp_res = analizar_texto_minuta(str(texto_minuta), prev_text)
            for k in ['n4_empoderamiento', 'n5_claridad_hitos', 'n6_participacion_cliente', 'n7_tension', 's_cliente', 's_equipo', 'delta_s']:
                # Solo sobrescribir si no se forzó un valor manual explícito
                if k not in data or data[k] == '' or data[k] is None:
                    data[k] = nlp_res[k]
            if not data.get('texto_minuta_analizado'):
                data['texto_minuta_analizado'] = str(texto_minuta)[:5000]

        # Determinar número de corte si no vino dado
        ultimo_snap = proyecto.snapshots.first()
        if 'numero_corte' not in data or not data['numero_corte']:
            data['numero_corte'] = (ultimo_snap.numero_corte + 1) if ultimo_snap else 1
        if 'fecha_corte' not in data or not data['fecha_corte']:
            data['fecha_corte'] = timezone.localdate()

        # Ejecutar consolidación matemática de PHS
        phs_calc = calcular_phs_snapshot(proyecto, data, ultimo_snap)

        # Construir datos finales para el modelo
        data['score_a_priori'] = phs_calc['score_a_priori']
        data['indice_operativo'] = phs_calc['indice_operativo']
        data['indice_nlp'] = phs_calc['indice_nlp']
        data['phs'] = phs_calc['phs']
        data['nivel_riesgo'] = phs_calc['nivel_riesgo']
        data['spi'] = phs_calc['spi']
        data['cpi'] = phs_calc['cpi']
        data['csi'] = phs_calc['csi']
        data['ratio_contacto'] = phs_calc['ratio_contacto']
        data['rfc'] = phs_calc['rfc']
        data['indice_desviacion'] = phs_calc['indice_desviacion']
        data['desglose_explicabilidad'] = phs_calc['desglose_explicabilidad']
        data['accion_recomendada'] = phs_calc['accion_recomendada']

        serializer = ProyectoSnapshotSerializer(data=data)
        if serializer.is_valid():
            personal = getattr(request.user, 'personal', None)
            snapshot = serializer.save(
                proyecto=proyecto,
                registrado_por=personal,
                archivo_minuta=archivo
            )
            return Response(ProyectoSnapshotSerializer(snapshot).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='snapshots-sugerencias')
    def snapshots_sugerencias(self, request, pk=None):
        proyecto = self.get_object()
        sugerencias = generar_sugerencias_automaticas(proyecto)
        return Response(sugerencias)

    @action(detail=True, methods=['get'], url_path='health-score')
    def health_score(self, request, pk=None):
        proyecto = self.get_object()
        ultimo_snap = proyecto.snapshots.first()
        dia0 = getattr(proyecto, 'perfil_dia0', None)

        if not ultimo_snap and not dia0:
            # Calcular estimación básica para proyectos sin inicializar
            return Response({
                'phs_actual': None,
                'nivel_riesgo': 'SIN_DATOS',
                'tiene_dia0': False,
                'tiene_snapshots': False,
                'mensaje': 'Configure el perfil Día 0 o registre el primer snapshot semanal para activar el predictor de salud.'
            })

        # Datos históricos para gráficos
        historico_qs = proyecto.snapshots.all().order_by('fecha_corte', 'numero_corte')
        historico = []
        for s in historico_qs:
            historico.append({
                'corte': f"Corte #{s.numero_corte}",
                'numero_corte': s.numero_corte,
                'fecha': s.fecha_corte.strftime('%d/%m/%Y'),
                'phs': s.phs,
                'csi': s.csi,
                'spi': s.spi,
                'cpi': s.cpi,
                'rfc': round(s.rfc * 100, 1),
                'n4_empoderamiento': round(s.n4_empoderamiento * 100, 1),
                's_cliente': s.s_cliente,
                'nivel_riesgo': s.nivel_riesgo
            })

        # Estado actual
        phs_valor = ultimo_snap.phs if ultimo_snap else dia0.phs_inicial
        nivel = ultimo_snap.nivel_riesgo if ultimo_snap else (
            'SALUDABLE' if phs_valor > 70 else ('LATENTE' if phs_valor >= 55 else ('ACTIVO' if phs_valor >= 35 else 'INMINENTE'))
        )

        desglose = ultimo_snap.desglose_explicabilidad if ultimo_snap else {
            'puntaje_base': dia0.phs_inicial if dia0 else 89,
            'phs_resultado': phs_valor,
            'factores': [
                {
                    'variable': 'Línea Base Día 0',
                    'valor_real': f"{phs_valor} pts",
                    'impacto': 0,
                    'signo': 'neutral',
                    'explicacion': 'Puntaje de partida a priori derivado del perfil y experiencia del equipo.'
                }
            ]
        }

        accion = ultimo_snap.accion_recomendada if ultimo_snap else (
            "Proyecto en fase inicial con perfil Día 0 establecido. Registre el primer snapshot semanal para iniciar el seguimiento evolutivo."
        )

        hoy = timezone.now().date()
        alerta_semanal = False
        dias_desde_ultimo = 0
        if ultimo_snap:
            dias_desde_ultimo = (hoy - ultimo_snap.fecha_corte).days
            alerta_semanal = dias_desde_ultimo >= 7
        elif dia0:
            dias_desde_ultimo = (hoy - dia0.created_at.date()).days
            alerta_semanal = dias_desde_ultimo >= 7

        return Response({
            'phs_actual': phs_valor,
            'nivel_riesgo': nivel,
            'tiene_dia0': bool(dia0),
            'tiene_snapshots': bool(ultimo_snap),
            'alerta_snapshot_pendiente': {
                'requiere_snapshot': alerta_semanal,
                'dias_desde_ultimo': dias_desde_ultimo,
                'ultimo_corte': str(ultimo_snap.fecha_corte) if ultimo_snap else None,
                'numero_ultimo_corte': ultimo_snap.numero_corte if ultimo_snap else 0
            },
            'ultimo_snapshot': ProyectoSnapshotSerializer(ultimo_snap).data if ultimo_snap else None,
            'desglose_explicabilidad': desglose,
            'accion_recomendada': accion,
            'historico_grafico': historico
        })

    @action(detail=False, methods=['get'], url_path='health-overview')
    def health_overview(self, request):
        proyectos = Proyecto.objects.filter(eliminado=False)
        total_proyectos = proyectos.count()
        
        saludables = 0
        latente = 0
        activo = 0
        inminente = 0
        sin_datos = 0
        suma_phs = 0
        con_phs = 0
        alertas_pendientes = 0
        hoy = timezone.now().date()

        for p in proyectos:
            snap = p.snapshots.first()
            if snap:
                score = snap.phs
                suma_phs += score
                con_phs += 1
                if snap.nivel_riesgo == 'SALUDABLE':
                    saludables += 1
                elif snap.nivel_riesgo == 'LATENTE':
                    latente += 1
                elif snap.nivel_riesgo == 'ACTIVO':
                    activo += 1
                elif snap.nivel_riesgo == 'INMINENTE':
                    inminente += 1
                
                if (hoy - snap.fecha_corte).days >= 7:
                    alertas_pendientes += 1
            elif hasattr(p, 'perfil_dia0') and p.perfil_dia0:
                score = p.perfil_dia0.phs_inicial
                suma_phs += score
                con_phs += 1
                if score > 70:
                    saludables += 1
                elif score >= 55:
                    latente += 1
                elif score >= 35:
                    activo += 1
                else:
                    inminente += 1
                if (hoy - p.perfil_dia0.created_at.date()).days >= 7:
                    alertas_pendientes += 1
            else:
                sin_datos += 1

        promedio = round(suma_phs / con_phs, 1) if con_phs > 0 else 0.0

        return Response({
            'total_proyectos': total_proyectos,
            'proyectos_con_seguimiento': con_phs,
            'phs_promedio': promedio,
            'distribucion_riesgo': {
                'saludable': saludables,
                'latente': latente,
                'activo': activo,
                'inminente': inminente,
                'sin_datos': sin_datos
            },
            'snapshots_pendientes_alerta': alertas_pendientes
        })

    @action(detail=False, methods=['post'], url_path='analizar-minuta', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def analizar_minuta(self, request):
        archivo = request.FILES.get('archivo')
        texto = request.data.get('texto', '')

        if archivo:
            try:
                texto = extraer_texto_de_archivo(archivo)
            except Exception as e:
                return Response({'error': f"Error al extraer texto del archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        if not texto or not str(texto).strip():
            return Response({'error': 'No se proveyó texto ni archivo válido para analizar.'}, status=status.HTTP_400_BAD_REQUEST)

        proveedor = request.data.get('proveedor', 'AUTO')
        analisis = analizar_texto_minuta(str(texto), proveedor_solicitado=proveedor)
        return Response({
            'texto_extraido_resumen': str(texto)[:1000] + ('...' if len(str(texto)) > 1000 else ''),
            'longitud_caracteres': len(str(texto)),
            'caracteres': len(str(texto)),
            'nlp': analisis,
            'analisis': analisis,
            'proveedor': analisis.get('proveedor', 'Motor Local'),
            'es_ia_remota': analisis.get('es_ia_remota', False)
        })

