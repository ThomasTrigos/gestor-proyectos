import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import { tareasApi } from '../../api/tareas';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import { 
  Tarea, ESTADO_TAREA_LABELS, PRIORIDAD_LABELS, RolPersonal, 
  ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, EstadoProyectoEnum 
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate } from '../../utils/formatters';
import { 
  CalendarDays, CheckCircle2, Clock, AlertTriangle, Flame, 
  UserX, Filter, RotateCcw, LayoutGrid, List, Layers, 
  CheckCheck, ChevronDown, ChevronUp, PlayCircle, XCircle
} from 'lucide-react';
import { HealthScorePromptModal } from '../../components/healthScore/HealthScorePromptModal';
import { SnapshotFormModal } from '../../components/healthScore/SnapshotFormModal';
import { 
  TableroTareas, ModoAgrupacion, getEstadoPlazo, 
  ESTADO_PLAZO_CONFIG, EstadoPlazo 
} from '../../components/tareas/TableroTareas';
import { GraficosTareasWidget } from '../../components/tareas/GraficosTareasWidget';

const getPrioridadVariant = (prioridad: string) => {
  switch (prioridad) {
    case 'BAJA': return 'green';
    case 'MEDIA': return 'yellow';
    case 'ALTA': return 'orange';
    case 'URGENTE': return 'red';
    default: return 'gray';
  }
};

const getEstadoVariant = (estado: string) => {
  switch (estado) {
    case 'COMPLETADA': return 'success';
    case 'EN_PROGRESO': return 'blue';
    case 'PENDIENTE': return 'warning';
    case 'CANCELADA': return 'danger';
    default: return 'gray';
  }
};

export default function TareasListPage() {
  const { data, isLoading, refetch } = useApiQuery<any>(['tareas'], '/tareas/');
  const { user } = useAuth();
  const isRRHH = user?.rol === RolPersonal.RRHH;
  const isGerente = user?.rol === RolPersonal.GERENTE;
  const isNonEmpleado = isRRHH || isGerente;

  const [completandoId, setCompletandoId] = useState<string | null>(null);

  // Estados para modal reactivo de salud al completar tarea
  const [promptSaludOpen, setPromptSaludOpen] = useState(false);
  const [tareaProyecto, setTareaProyecto] = useState<{ id: string; nombre: string; titulo: string } | null>(null);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);

  // Estados del Tablero para roles no empleados
  const [vistaModo, setVistaModo] = useState<'tablero' | 'lista'>(isNonEmpleado ? 'tablero' : 'lista');
  const [modoAgrupacion, setModoAgrupacion] = useState<ModoAgrupacion>('plazo');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleCompletar = async (tareaId: string) => {
    const t = rawTareas.find(item => item.id === tareaId);
    try {
      setCompletandoId(tareaId);
      await tareasApi.completar(tareaId);
      refetch();

      if (t && (t.proyecto_id || t.proyecto)) {
        const projId = t.proyecto_id || (typeof t.proyecto === 'object' ? (t.proyecto as any).id : t.proyecto);
        const projNombre = t.proyecto_nombre || (typeof t.proyecto === 'object' ? (t.proyecto as any).nombre : 'Proyecto');
        setTareaProyecto({ id: String(projId), nombre: projNombre, titulo: t.titulo });
        setPromptSaludOpen(true);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al completar la tarea');
    } finally {
      setCompletandoId(null);
    }
  };
  
  const rawTareas = getResults<Tarea>(data);

  // Estados para selectores e indicadores visuales interactivos
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('TODAS');
  const [filtroRapido, setFiltroRapido] = useState<'todas' | 'urgentes' | 'completadas' | 'atrasadas' | 'sin_confirmar'>('todas');

  const hoyStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Indicador: Cantidad de tareas incompletas de alta urgencia
  const tareasIncompletasUrgentes = useMemo(() => {
    return rawTareas.filter(t => 
      t.prioridad === 'URGENTE' && 
      t.estado !== 'COMPLETADA' && 
      t.estado !== 'CANCELADA'
    );
  }, [rawTareas]);

  // Universo de tareas filtrado por nivel de prioridad para calcular los siguientes indicadores
  const tareasSegunPrioridad = useMemo(() => {
    if (filtroPrioridad === 'TODAS') return rawTareas;
    return rawTareas.filter(t => t.prioridad === filtroPrioridad);
  }, [rawTareas, filtroPrioridad]);

  // 2. Indicador: Cantidad de tareas completadas
  const tareasCompletadas = useMemo(() => {
    return tareasSegunPrioridad.filter(t => t.estado === 'COMPLETADA');
  }, [tareasSegunPrioridad]);

  // 3. Indicador: Cantidad de tareas atrasadas
  const tareasAtrasadas = useMemo(() => {
    return tareasSegunPrioridad.filter(t => {
      if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') return false;
      if (!t.fecha_limite) return false;
      const limite = String(t.fecha_limite).split('T')[0];
      return limite < hoyStr;
    });
  }, [tareasSegunPrioridad, hoyStr]);

  // 4. Indicador: No confirmadas por el trabajador
  const tareasNoConfirmadas = useMemo(() => {
    return tareasSegunPrioridad.filter(t => {
      if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') return false;
      return !t.fecha_leido && !t.fecha_inicio_trabajo;
    });
  }, [tareasSegunPrioridad]);

  // Tareas filtradas aplicadas a la tabla según selector de prioridad y clics en indicadores
  const tareasFiltradas = useMemo(() => {
    let list = rawTareas;

    if (filtroPrioridad !== 'TODAS') {
      list = list.filter(t => t.prioridad === filtroPrioridad);
    }

    if (filtroRapido === 'urgentes') {
      list = list.filter(t => t.prioridad === 'URGENTE' && t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA');
    } else if (filtroRapido === 'completadas') {
      list = list.filter(t => t.estado === 'COMPLETADA');
    } else if (filtroRapido === 'atrasadas') {
      list = list.filter(t => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA' && t.fecha_limite && String(t.fecha_limite).split('T')[0] < hoyStr);
    } else if (filtroRapido === 'sin_confirmar') {
      list = list.filter(t => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA' && !t.fecha_leido && !t.fecha_inicio_trabajo);
    }

    return list;
  }, [rawTareas, filtroPrioridad, filtroRapido, hoyStr]);

  // Extractores de ordenamiento (incluye nombre, fecha_inicio, fecha_limite, created_at, estado)
  const sortExtractors = useMemo(() => ({
    getText: (t: Tarea) => t.titulo,
    getEstado: (t: Tarea) => t.estado,
    getPrioridad: (t: Tarea) => t.prioridad,
    getUpdatedAt: (t: Tarea) => t.updated_at,
    getCreatedAt: (t: Tarea) => t.created_at || (t as any).fecha_asignacion,
    getFechaInicio: (t: Tarea) => t.fecha_inicio,
    getFechaLimite: (t: Tarea) => t.fecha_limite
  }), []);

  const { sortedItems: tareas, sortCriterion, setSortCriterion } = useTableSort<Tarea>(
    tareasFiltradas,
    sortExtractors,
    'fecha_limite_asc'
  );

  const handleHeaderSort = (key: string) => {
    if (key === 'alfabetico') {
      setSortCriterion(sortCriterion === 'alfabetico_asc' ? 'alfabetico_desc' : 'alfabetico_asc');
    } else if (key === 'prioridad') {
      setSortCriterion(sortCriterion === 'prioridad_desc' ? 'prioridad_asc' : 'prioridad_desc');
    } else if (key === 'estado') {
      setSortCriterion(sortCriterion === 'estado_asc' ? 'estado_desc' : 'estado_asc');
    } else if (key === 'fecha_inicio') {
      setSortCriterion(sortCriterion === 'fecha_inicio_asc' ? 'fecha_inicio_desc' : 'fecha_inicio_asc');
    } else if (key === 'fecha_limite') {
      setSortCriterion(sortCriterion === 'fecha_limite_asc' ? 'fecha_limite_desc' : 'fecha_limite_asc');
    } else if (key === 'created_at') {
      setSortCriterion(sortCriterion === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc');
    }
  };

  const getSortHeaderState = (key: string) => {
    if (key === 'alfabetico' && sortCriterion.startsWith('alfabetico')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'prioridad' && sortCriterion.startsWith('prioridad')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'estado' && sortCriterion.startsWith('estado')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'fecha_inicio' && sortCriterion.startsWith('fecha_inicio')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'fecha_limite' && sortCriterion.startsWith('fecha_limite')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'created_at' && sortCriterion.startsWith('created_at')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    return { key: undefined, dir: undefined };
  };

  const currentSortHeader = getSortHeaderState(
    sortCriterion.startsWith('alfabetico') ? 'alfabetico' :
    sortCriterion.startsWith('prioridad') ? 'prioridad' :
    sortCriterion.startsWith('estado') ? 'estado' :
    sortCriterion.startsWith('fecha_inicio') ? 'fecha_inicio' :
    sortCriterion.startsWith('fecha_limite') ? 'fecha_limite' :
    sortCriterion.startsWith('created_at') ? 'created_at' : ''
  );

  // Agrupaciones para la Vista Lista separada
  const gruposLista = useMemo(() => {
    if (modoAgrupacion === 'ninguno') return null;

    interface GrupoItemDef {
      key: string;
      label: string;
      badgeClass: string;
      desc?: string;
      items: Tarea[];
    }

    if (modoAgrupacion === 'prioridad') {
      const defs = [
        { key: 'URGENTE', label: '🔴 Prioridad Urgente', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', desc: 'Atención crítica e inmediata' },
        { key: 'ALTA', label: '🟠 Prioridad Alta', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300', desc: 'Prioridad alta para el proyecto' },
        { key: 'MEDIA', label: '🟡 Prioridad Media', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Prioridad estándar' },
        { key: 'BAJA', label: '🟢 Prioridad Baja', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', desc: 'Baja exigencia temporal' },
      ];
      return defs.map((d): GrupoItemDef => ({
        ...d,
        items: tareas.filter(t => t.prioridad === d.key)
      }));
    }

    if (modoAgrupacion === 'kanban') {
      const defs = [
        { key: 'Backlog', label: '📋 Backlog', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300', desc: 'Tareas en reserva o pendientes de asignación' },
        { key: 'Por hacer', label: '⏳ Por Hacer', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Planificadas para iniciar' },
        { key: 'En Progreso', label: '🚀 En Progreso', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300', desc: 'En curso por el equipo' },
        { key: 'En Revisión', label: '🔍 En Revisión', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Pendientes de validación o testing' },
        { key: 'Completada', label: '✅ Completada', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', desc: 'Entregables finalizados' },
      ];
      return defs.map((d): GrupoItemDef => ({
        ...d,
        items: tareas.filter(t => {
          const colNombre = (t.columna_kanban_nombre || '').toLowerCase();
          const target = d.key.toLowerCase();
          if (colNombre) return colNombre === target;
          if (target === 'por hacer' && t.estado === 'PENDIENTE') return true;
          if (target === 'en progreso' && t.estado === 'EN_PROGRESO') return true;
          if (target === 'completada' && t.estado === 'COMPLETADA') return true;
          return false;
        })
      }));
    }

    if (modoAgrupacion === 'plazo') {
      const defs = [
        { key: 'TERMINADA_A_TIEMPO', label: '✅ Terminada a Tiempo', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', desc: 'Completadas en o antes de la fecha límite' },
        { key: 'TERMINADA_DESTIEMPO', label: '⚠️ Terminada a Destiempo', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Completadas con posterioridad a la fecha límite' },
        { key: 'EN_PROGRESO', label: '⏳ En Progreso', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'En curso dentro de los plazos fijados' },
        { key: 'ATRASADA', label: '🚨 Atrasada', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', desc: 'Pendientes con fecha límite vencida' },
      ];
      return defs.map((d): GrupoItemDef => ({
        ...d,
        items: tareas.filter(t => getEstadoPlazo(t, hoyStr) === d.key)
      }));
    }

    return null;
  }, [modoAgrupacion, tareas, hoyStr]);

  if (isLoading) return <LoadingSpinner />;

  // Renderizador de filas de la tabla
  const renderRow = (item: Tarea) => {
    const estadoPlazo = getEstadoPlazo(item, hoyStr);
    const plazoConf = ESTADO_PLAZO_CONFIG[estadoPlazo];
    const esFutura = item.fecha_inicio && String(item.fecha_inicio).split('T')[0] > hoyStr;

    return (
      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
          <div className="font-semibold text-gray-900">{item.titulo}</div>
          {item.descripcion && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{item.descripcion}</div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="font-medium text-gray-900">
            {item.proyecto_nombre || (typeof item.proyecto === 'object' ? item.proyecto?.nombre : '-') || '-'}
          </div>
          {item.empresa_nombre && (
            <div className="text-xs text-indigo-600 font-normal">{item.empresa_nombre}</div>
          )}
          {item.estado_proyecto && (
            <div className="mt-1">
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                ESTADO_PROYECTO_COLORS[item.estado_proyecto as EstadoProyectoEnum] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                Etapa: {ESTADO_PROYECTO_LABELS[item.estado_proyecto as EstadoProyectoEnum] || item.estado_proyecto}
              </span>
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          <div className="font-medium text-gray-900">
            {item.asignado_a_nombre || (item.asignado_a ? `${item.asignado_a.nombre} ${item.asignado_a.apellido}` : '-') || '-'}
          </div>
          {item.asignado_a_email && (
            <div className="text-xs text-gray-500">{item.asignado_a_email}</div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <Badge variant={getPrioridadVariant(item.prioridad)}>
            {PRIORIDAD_LABELS[item.prioridad] || item.prioridad}
          </Badge>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <Badge variant={getEstadoVariant(item.estado)}>
            {ESTADO_TAREA_LABELS[item.estado] || item.estado}
          </Badge>
          {item.columna_kanban_nombre && (
            <div className="text-[10px] text-gray-500 mt-1">
              Col: {item.columna_kanban_nombre}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {item.fecha_inicio ? (
            <div className="flex items-center gap-1.5 text-xs text-sky-700 font-semibold">
              <span>{formatDate(item.fecha_inicio)}</span>
              {esFutura && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
                  Futura
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs italic">No definida</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          <div className="font-medium text-gray-800 text-xs">
            {formatDate(item.fecha_limite)}
          </div>
          {item.created_at && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              Creada: {formatDate(item.created_at)}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${plazoConf.badgeClass}`}>
            {plazoConf.label}
          </span>
          {item.fecha_completada && (
            <div className="text-[10px] text-emerald-600 mt-0.5">
              ✓ {formatDate(item.fecha_completada)}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {item.estado !== 'COMPLETADA' && (
              <button
                onClick={() => handleCompletar(item.id)}
                disabled={completandoId === item.id}
                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                title="Marcar tarea como completada"
              >
                {completandoId === item.id ? '...' : '✓ Completar'}
              </button>
            )}
            {(isRRHH || isGerente) ? (
              <Link
                to={`/tareas/${item.id}/editar`}
                className="text-primary-600 hover:text-primary-900 font-medium text-xs"
              >
                Editar
              </Link>
            ) : (
              <Link
                to={`/proyectos/${item.proyecto_id || (typeof item.proyecto === 'string' ? item.proyecto : (item.proyecto as any)?.id)}/kanban`}
                className="text-primary-600 hover:text-primary-900 font-medium text-xs"
              >
                Ver en Tablero
              </Link>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const tableHeaders = [
    { label: 'Título', sortKey: 'alfabetico' },
    'Proyecto',
    'Asignado a',
    { label: 'Prioridad', sortKey: 'prioridad' },
    { label: 'Estado', sortKey: 'estado' },
    { label: 'Fecha Comienzo', sortKey: 'fecha_inicio' },
    { label: 'Fecha Terminación', sortKey: 'fecha_limite' },
    'Plazo / Cumplimiento',
    'Acciones'
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isNonEmpleado ? 'Tablero General de Control de Tareas' : 'Mis Tareas'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isNonEmpleado
              ? 'Panel de control directivo para supervisar estados, entregables, prioridades y cumplimiento de plazos.'
              : 'Seguimiento de entregables asignados y avance de trabajo en proyectos.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/calendario">
            <Button variant="secondary" className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span>Ver en Calendario</span>
            </Button>
          </Link>
          {isRRHH && (
            <Link to="/tareas/nueva">
              <Button variant="primary">+ Asignar Nueva Tarea</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Panel Analítico y Gráficos Personalizables (Solo para roles directivos no empleados) */}
      {isNonEmpleado && (
        <GraficosTareasWidget tareas={rawTareas} hoyStr={hoyStr} />
      )}

      {/* Barra de Control de Vistas y Agrupación (Solo para roles que no sean empleados) */}
      {isNonEmpleado && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Selector de Vista: Tablero vs Lista */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setVistaModo('tablero')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                vistaModo === 'tablero'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>Vista Tablero</span>
            </button>
            <button
              onClick={() => setVistaModo('lista')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                vistaModo === 'lista'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <List className="w-4 h-4 text-indigo-600" />
              <span>Vista Lista</span>
            </button>
          </div>

          {/* Selector de Separación / Agrupación */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Separar según:</span>
            </div>
            <select
              value={modoAgrupacion}
              onChange={(e) => setModoAgrupacion(e.target.value as ModoAgrupacion)}
              className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="plazo">⏱️ Estado según Fecha de Terminación (A tiempo, Destiempo, En progreso, Atrasada)</option>
              <option value="kanban">📊 Estado Kanban (Backlog, Por hacer, En Progreso, etc.)</option>
              <option value="prioridad">🚩 Nivel de Prioridad (Urgente, Alta, Media, Baja)</option>
              <option value="ninguno">📋 Sin agrupar (Lista Plana)</option>
            </select>
          </div>
        </div>
      )}

      {/* Selector de Nivel de Prioridad para Métricas e Indicadores Visuales */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filtrar Prioridad en Métricas:</span>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="TODAS">Todas las Prioridades ({rawTareas.length} tareas)</option>
            <option value="URGENTE">🔴 Urgente</option>
            <option value="ALTA">🟠 Alta</option>
            <option value="MEDIA">🟡 Media</option>
            <option value="BAJA">🟢 Baja</option>
          </select>
        </div>

        {filtroRapido !== 'todas' && (
          <button
            onClick={() => setFiltroRapido('todas')}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Quitar filtro de tarjeta activa</span>
          </button>
        )}
      </div>

      {/* Indicador 1: Cantidad de tareas incompletas de alta urgencia */}
      {tareasIncompletasUrgentes.length > 0 && (
        <div
          onClick={() => setFiltroRapido(filtroRapido === 'urgentes' ? 'todas' : 'urgentes')}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            filtroRapido === 'urgentes'
              ? 'border-rose-600 bg-rose-50 shadow-md ring-2 ring-rose-300'
              : 'border-rose-300 bg-gradient-to-r from-rose-500/10 via-rose-50 to-white hover:border-rose-400 hover:shadow-xs'
          }`}
          title="Haga clic para ver únicamente las tareas urgentes incompletas"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs animate-pulse">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-rose-900">
                  {tareasIncompletasUrgentes.length} {tareasIncompletasUrgentes.length === 1 ? 'Tarea Incompleta' : 'Tareas Incompletas'} de Alta Urgencia
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-rose-600 text-white rounded-full">
                  Atención Crítica
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Existen entregables urgentes pendientes que requieren resolución inmediata del equipo.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            {filtroRapido === 'urgentes' ? '✕ Quitar Filtro Urgentes' : 'Ver Tareas Urgentes →'}
          </button>
        </div>
      )}

      {/* Indicadores Visuales Estándar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Indicador 2: Completadas */}
        <div
          onClick={() => setFiltroRapido(filtroRapido === 'completadas' ? 'todas' : 'completadas')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between bg-white ${
            filtroRapido === 'completadas'
              ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/50 shadow-sm'
              : 'border-gray-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
          title="Haga clic para ver las tareas completadas"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">Tareas Completadas</span>
              <span className="text-2xl font-black text-gray-900">{tareasCompletadas.length}</span>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                {tareasSegunPrioridad.length > 0 ? `${Math.round((tareasCompletadas.length / tareasSegunPrioridad.length) * 100)}% del total seleccionado` : '0%'}
              </span>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Finalizadas
          </div>
        </div>

        {/* Indicador 3: Atrasadas */}
        <div
          onClick={() => setFiltroRapido(filtroRapido === 'atrasadas' ? 'todas' : 'atrasadas')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between bg-white ${
            filtroRapido === 'atrasadas'
              ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/50 shadow-sm'
              : 'border-gray-200 hover:border-amber-300 hover:shadow-xs'
          }`}
          title="Haga clic para ver las tareas atrasadas"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${tareasAtrasadas.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">Tareas Atrasadas</span>
              <span className={`text-2xl font-black ${tareasAtrasadas.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {tareasAtrasadas.length}
              </span>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                Con fecha límite vencida
              </span>
            </div>
          </div>
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            tareasAtrasadas.length > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            Vencidas
          </div>
        </div>

        {/* Indicador 4: No confirmadas */}
        <div
          onClick={() => setFiltroRapido(filtroRapido === 'sin_confirmar' ? 'todas' : 'sin_confirmar')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between bg-white ${
            filtroRapido === 'sin_confirmar'
              ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/50 shadow-sm'
              : 'border-gray-200 hover:border-indigo-300 hover:shadow-xs'
          }`}
          title="Haga clic para ver las tareas no confirmadas por el trabajador"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${tareasNoConfirmadas.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">No Confirmadas por Trabajador</span>
              <span className={`text-2xl font-black ${tareasNoConfirmadas.length > 0 ? 'text-indigo-900' : 'text-gray-900'}`}>
                {tareasNoConfirmadas.length}
              </span>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                Sin lectura ni confirmación de inicio
              </span>
            </div>
          </div>
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            tareasNoConfirmadas.length > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            Sin Confirmar
          </div>
        </div>
      </div>

      {/* Barra de Ordenamiento Global */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-lg border shadow-sm">
        <div className="text-xs text-gray-500 font-medium">
          Total de tareas: <span className="font-semibold text-gray-800">{tareas.length}</span>
          {isNonEmpleado && (
            <span className="ml-2 text-indigo-600 font-semibold">
              • Modo: {vistaModo === 'tablero' ? 'Tablero en Tarjetas' : 'Lista en Tablas'}
            </span>
          )}
        </div>
        <TableSortControl
          value={sortCriterion}
          onChange={setSortCriterion}
          hasEstado={true}
          hasPrioridad={true}
          hasFechaInicio={true}
          hasFechaLimite={true}
          labelAlphabetical="Nombre / Título"
          labelEstado="Estado actual"
          labelDate="Fecha de creación"
          dateDescText="Más reciente"
          dateAscText="Más antigua"
        />
      </div>
      
      {/* Visualización Principal: Vista Tablero vs Vista Lista */}
      {isNonEmpleado && vistaModo === 'tablero' ? (
        <TableroTareas
          tareas={tareas}
          agrupacion={modoAgrupacion}
          onCompletar={handleCompletar}
          completandoId={completandoId}
          isRRHH={isRRHH}
          isGerente={isGerente}
          hoyStr={hoyStr}
        />
      ) : (
        /* Vista Lista (Con agrupación o Plana) */
        tareas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No hay tareas registradas actualmente.
          </div>
        ) : gruposLista ? (
          /* Lista Separada en Secciones Agrupadas */
          <div className="space-y-6">
            {gruposLista.map(grupo => {
              const isCollapsed = !!collapsedGroups[grupo.key];
              return (
                <div key={grupo.key} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <div
                    onClick={() => toggleGroupCollapse(grupo.key)}
                    className="p-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-gray-800">{grupo.label}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${grupo.badgeClass}`}>
                        {grupo.items.length} {grupo.items.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                      {grupo.desc && (
                        <span className="text-xs text-gray-400 hidden sm:inline">
                          — {grupo.desc}
                        </span>
                      )}
                    </div>
                    <button className="text-gray-500 hover:text-gray-700">
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>

                  {!isCollapsed && (
                    grupo.items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 italic">
                        No hay tareas en este grupo.
                      </div>
                    ) : (
                      <Table
                        headers={tableHeaders}
                        currentSortKey={currentSortHeader.key}
                        sortDirection={currentSortHeader.dir}
                        onSort={handleHeaderSort}
                      >
                        {grupo.items.map(renderRow)}
                      </Table>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Lista Plana Sin Agrupar */
          <Table
            headers={tableHeaders}
            currentSortKey={currentSortHeader.key}
            sortDirection={currentSortHeader.dir}
            onSort={handleHeaderSort}
          >
            {tareas.map(renderRow)}
          </Table>
        )
      )}

      {/* Modal Reactivo de Salud al Completar Tarea */}
      {tareaProyecto && (
        <HealthScorePromptModal
          isOpen={promptSaludOpen}
          onClose={() => {
            setPromptSaludOpen(false);
            setTareaProyecto(null);
          }}
          onConfirm={() => {
            setPromptSaludOpen(false);
            setSnapshotModalOpen(true);
          }}
          proyectoNombre={tareaProyecto.nombre}
          motivo="TAREA_ACTUALIZADA"
          detalle={`Se completó la tarea "${tareaProyecto.titulo}".`}
        />
      )}

      {/* Modal de Carga de Snapshot */}
      {tareaProyecto && (
        <SnapshotFormModal
          isOpen={snapshotModalOpen}
          onClose={() => {
            setSnapshotModalOpen(false);
            setTareaProyecto(null);
          }}
          proyectoId={tareaProyecto.id}
          proyectoNombre={tareaProyecto.nombre}
          onSuccess={() => {
            setSnapshotModalOpen(false);
            setTareaProyecto(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
