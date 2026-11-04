import React from 'react';
import { Link } from 'react-router-dom';
import { Tarea, RolPersonal, ESTADO_TAREA_LABELS, PRIORIDAD_LABELS, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS, EstadoProyectoEnum } from '../../types';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/formatters';
import { 
  CheckCircle2, Clock, AlertTriangle, Flame, PlayCircle, 
  XCircle, User, Calendar, ExternalLink, Edit3, ArrowRight,
  Layers, CheckCheck
} from 'lucide-react';

export type ModoAgrupacion = 'prioridad' | 'kanban' | 'plazo' | 'ninguno';

export type EstadoPlazo = 'TERMINADA_A_TIEMPO' | 'TERMINADA_DESTIEMPO' | 'EN_PROGRESO' | 'ATRASADA' | 'CANCELADA';

export function getEstadoPlazo(t: Tarea, hoyStr: string): EstadoPlazo {
  if (t.estado === 'CANCELADA') return 'CANCELADA';

  if (t.estado === 'COMPLETADA') {
    if (!t.fecha_limite || !t.fecha_completada) {
      return 'TERMINADA_A_TIEMPO';
    }
    const fechaCompStr = String(t.fecha_completada).split('T')[0];
    const fechaLimStr = String(t.fecha_limite).split('T')[0];
    return fechaCompStr <= fechaLimStr ? 'TERMINADA_A_TIEMPO' : 'TERMINADA_DESTIEMPO';
  }

  if (!t.fecha_limite) {
    return 'EN_PROGRESO';
  }
  const fechaLimStr = String(t.fecha_limite).split('T')[0];
  return fechaLimStr < hoyStr ? 'ATRASADA' : 'EN_PROGRESO';
}

export const ESTADO_PLAZO_CONFIG: Record<EstadoPlazo, {
  label: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'blue' | 'gray';
  colorBg: string;
  colorBorder: string;
  colorHeader: string;
  badgeClass: string;
  desc: string;
}> = {
  TERMINADA_A_TIEMPO: {
    label: 'Terminada a Tiempo',
    badgeVariant: 'success',
    colorBg: 'bg-emerald-50/40',
    colorBorder: 'border-emerald-200',
    colorHeader: 'bg-emerald-500 text-white',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Completada dentro del plazo estipulado'
  },
  TERMINADA_DESTIEMPO: {
    label: 'Terminada a Destiempo',
    badgeVariant: 'warning',
    colorBg: 'bg-amber-50/40',
    colorBorder: 'border-amber-200',
    colorHeader: 'bg-amber-500 text-white',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Completada con posterioridad a la fecha límite'
  },
  EN_PROGRESO: {
    label: 'En Progreso',
    badgeVariant: 'blue',
    colorBg: 'bg-blue-50/40',
    colorBorder: 'border-blue-200',
    colorHeader: 'bg-blue-500 text-white',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'En curso dentro de los plazos fijados'
  },
  ATRASADA: {
    label: 'Atrasada',
    badgeVariant: 'danger',
    colorBg: 'bg-rose-50/40',
    colorBorder: 'border-rose-200',
    colorHeader: 'bg-rose-500 text-white',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    desc: 'Pendiente con fecha límite vencida'
  },
  CANCELADA: {
    label: 'Cancelada',
    badgeVariant: 'gray',
    colorBg: 'bg-gray-50/40',
    colorBorder: 'border-gray-200',
    colorHeader: 'bg-gray-500 text-white',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    desc: 'Tareas suspendidas o canceladas'
  }
};

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

interface TableroTareasProps {
  tareas: Tarea[];
  agrupacion: ModoAgrupacion;
  onCompletar: (id: string) => void;
  completandoId: string | null;
  isRRHH: boolean;
  isGerente: boolean;
  hoyStr: string;
}

interface ColumnaData {
  id: string;
  titulo: string;
  descripcion?: string;
  badgeClass?: string;
  headerClass?: string;
  tareas: Tarea[];
}

export const TableroTareas: React.FC<TableroTareasProps> = ({
  tareas,
  agrupacion,
  onCompletar,
  completandoId,
  isRRHH,
  isGerente,
  hoyStr,
}) => {
  // Construir columnas según la agrupación seleccionada
  const columnas: ColumnaData[] = React.useMemo(() => {
    if (agrupacion === 'prioridad') {
      const defs = [
        { id: 'URGENTE', titulo: 'Urgente', headerClass: 'bg-rose-600 text-white', desc: 'Atención crítica inmediata' },
        { id: 'ALTA', titulo: 'Alta', headerClass: 'bg-orange-500 text-white', desc: 'Prioridad alta para el proyecto' },
        { id: 'MEDIA', titulo: 'Media', headerClass: 'bg-amber-500 text-white', desc: 'Prioridad estándar' },
        { id: 'BAJA', titulo: 'Baja', headerClass: 'bg-emerald-600 text-white', desc: 'Baja exigencia temporal' },
      ];
      return defs.map(col => ({
        ...col,
        descripcion: col.desc,
        tareas: tareas.filter(t => t.prioridad === col.id),
      }));
    }

    if (agrupacion === 'kanban') {
      const defs = [
        { id: 'Backlog', titulo: 'Backlog', headerClass: 'bg-slate-700 text-white' },
        { id: 'Por hacer', titulo: 'Por Hacer', headerClass: 'bg-blue-600 text-white' },
        { id: 'En Progreso', titulo: 'En Progreso', headerClass: 'bg-indigo-600 text-white' },
        { id: 'En Revisión', titulo: 'En Revisión', headerClass: 'bg-amber-600 text-white' },
        { id: 'Completada', titulo: 'Completada', headerClass: 'bg-emerald-600 text-white' },
      ];

      return defs.map(col => {
        const tareasCol = tareas.filter(t => {
          const colNombre = (t.columna_kanban_nombre || '').toLowerCase();
          const target = col.id.toLowerCase();
          if (colNombre) return colNombre === target;
          if (target === 'por hacer' && t.estado === 'PENDIENTE') return true;
          if (target === 'en progreso' && t.estado === 'EN_PROGRESO') return true;
          if (target === 'completada' && t.estado === 'COMPLETADA') return true;
          return false;
        });

        return {
          id: col.id,
          titulo: col.titulo,
          headerClass: col.headerClass,
          tareas: tareasCol,
        };
      });
    }

    if (agrupacion === 'plazo') {
      const defs: { id: EstadoPlazo; titulo: string; headerClass: string; desc: string }[] = [
        { id: 'TERMINADA_A_TIEMPO', titulo: 'Terminada a Tiempo', headerClass: 'bg-emerald-600 text-white', desc: 'Finalizadas dentro de la fecha límite' },
        { id: 'TERMINADA_DESTIEMPO', titulo: 'Terminada a Destiempo', headerClass: 'bg-amber-600 text-white', desc: 'Completadas con retraso sobre la fecha límite' },
        { id: 'EN_PROGRESO', titulo: 'En Progreso', headerClass: 'bg-blue-600 text-white', desc: 'En curso y en fecha' },
        { id: 'ATRASADA', titulo: 'Atrasada', headerClass: 'bg-rose-600 text-white', desc: 'Pendiente con fecha límite vencida' },
      ];

      return defs.map(col => ({
        id: col.id,
        titulo: col.titulo,
        descripcion: col.desc,
        headerClass: col.headerClass,
        tareas: tareas.filter(t => getEstadoPlazo(t, hoyStr) === col.id),
      }));
    }

    // Sin agrupar (columna única general)
    return [{
      id: 'todas',
      titulo: 'Todas las Tareas',
      headerClass: 'bg-indigo-700 text-white',
      descripcion: 'Listado completo en vista de tarjetas',
      tareas: tareas,
    }];
  }, [agrupacion, tareas, hoyStr]);

  return (
    <div className="w-full">
      {columnas.length === 0 || tareas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 shadow-sm">
          No hay tareas registradas para mostrar en el tablero.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columnas.map(col => (
            <div
              key={col.id}
              className="bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col shadow-xs overflow-hidden"
            >
              {/* Encabezado de Columna */}
              <div className={`p-3 ${col.headerClass || 'bg-gray-800 text-white'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{col.titulo}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-black">
                    {col.tareas.length}
                  </span>
                </div>
                {col.tareas.length > 0 && tareas.length > 0 && (
                  <span className="text-[10px] opacity-80 font-medium">
                    {Math.round((col.tareas.length / tareas.length) * 100)}%
                  </span>
                )}
              </div>

              {col.descripcion && (
                <div className="px-3 py-1.5 bg-gray-100 text-[11px] text-gray-500 border-b border-gray-200">
                  {col.descripcion}
                </div>
              )}

              {/* Lista de Tarjetas */}
              <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
                {col.tareas.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 bg-white/60 rounded-lg border border-dashed border-gray-300">
                    Sin tareas en este grupo
                  </div>
                ) : (
                  col.tareas.map(tarea => {
                    const estadoPlazo = getEstadoPlazo(tarea, hoyStr);
                    const plazoConf = ESTADO_PLAZO_CONFIG[estadoPlazo];
                    const esFutura = tarea.fecha_inicio && String(tarea.fecha_inicio).split('T')[0] > hoyStr;

                    return (
                      <div
                        key={tarea.id}
                        className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5"
                      >
                        {/* Cabecera de la Tarjeta */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={getPrioridadVariant(tarea.prioridad)}>
                              {PRIORIDAD_LABELS[tarea.prioridad] || tarea.prioridad}
                            </Badge>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${plazoConf.badgeClass}`}>
                              {plazoConf.label}
                            </span>
                          </div>
                          <Badge variant={getEstadoVariant(tarea.estado)}>
                            {ESTADO_TAREA_LABELS[tarea.estado] || tarea.estado}
                          </Badge>
                        </div>

                        {/* Título y Descripción */}
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm leading-tight hover:text-indigo-600 transition-colors">
                            {tarea.titulo}
                          </h4>
                          {tarea.descripcion && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {tarea.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Proyecto y Empresa */}
                        <div className="bg-gray-50 p-2 rounded-lg text-xs space-y-0.5 border border-gray-100">
                          <div className="font-semibold text-gray-800 flex items-center justify-between">
                            <span className="truncate">{tarea.proyecto_nombre || 'Proyecto'}</span>
                            {tarea.columna_kanban_nombre && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                                {tarea.columna_kanban_nombre}
                              </span>
                            )}
                          </div>
                          {tarea.empresa_nombre && (
                            <div className="text-[11px] text-indigo-600 truncate">
                              {tarea.empresa_nombre}
                            </div>
                          )}
                          {tarea.estado_proyecto && (
                            <div className="pt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                                ESTADO_PROYECTO_COLORS[tarea.estado_proyecto as EstadoProyectoEnum] || 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {ESTADO_PROYECTO_LABELS[tarea.estado_proyecto as EstadoProyectoEnum] || tarea.estado_proyecto}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Responsable asignado */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                            {tarea.asignado_a_nombre ? tarea.asignado_a_nombre.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-medium text-gray-800 truncate">
                            {tarea.asignado_a_nombre || 'Sin asignar'}
                          </span>
                        </div>

                        {/* Fechas de Comienzo y Terminación */}
                        <div className="pt-1 border-t border-gray-100 text-[11px] space-y-1">
                          {tarea.fecha_inicio && (
                            <div className="flex items-center justify-between text-sky-700">
                              <span className="text-gray-400">Comienzo:</span>
                              <div className="flex items-center gap-1 font-semibold">
                                <span>{formatDate(tarea.fecha_inicio)}</span>
                                {esFutura && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-bold">
                                    Futura
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Terminación:</span>
                            <span className={`font-semibold ${estadoPlazo === 'ATRASADA' ? 'text-rose-600' : 'text-gray-800'}`}>
                              {formatDate(tarea.fecha_limite)}
                            </span>
                          </div>

                          {tarea.fecha_completada && (
                            <div className="flex items-center justify-between text-emerald-700">
                              <span className="text-gray-400">Completada el:</span>
                              <span className="font-semibold">{formatDate(tarea.fecha_completada)}</span>
                            </div>
                          )}
                        </div>

                        {/* Acciones de la Tarjeta */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          {tarea.estado !== 'COMPLETADA' && (
                            <button
                              onClick={() => onCompletar(tarea.id)}
                              disabled={completandoId === tarea.id}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer flex items-center gap-1"
                              title="Marcar tarea como completada"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>{completandoId === tarea.id ? '...' : 'Completar'}</span>
                            </button>
                          )}

                          <div className="flex items-center gap-2 ml-auto">
                            {(isRRHH || isGerente) && (
                              <Link
                                to={`/tareas/${tarea.id}/editar`}
                                className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </Link>
                            )}
                            <Link
                              to={`/proyectos/${tarea.proyecto_id || (typeof tarea.proyecto === 'string' ? tarea.proyecto : (tarea.proyecto as any)?.id)}/kanban`}
                              className="text-gray-500 hover:text-indigo-600 text-xs flex items-center gap-0.5"
                              title="Ver en tablero Kanban del proyecto"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
