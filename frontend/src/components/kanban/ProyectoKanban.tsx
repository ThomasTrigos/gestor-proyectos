import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, Crown, User, Calendar, 
  AlertCircle, CheckCircle2, RefreshCw, Filter, Sparkles 
} from 'lucide-react';
import { kanbanApi } from '../../api/kanban';
import { personalApi } from '../../api/personal';
import client from '../../api/client';
import { 
  KanbanBoardData, KanbanColumnaConTareas, Tarea, PrioridadTarea, 
  PRIORIDAD_COLORS, PRIORIDAD_LABELS, Personal,
  ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS, EstadoProyectoEnum
} from '../../types';

interface ProyectoKanbanProps {
  proyectoId: string;
  onActualizar?: () => void;
}

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; headerBg: string }> = {
  slate: { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-800', headerBg: 'bg-slate-200' },
  blue: { border: 'border-blue-300', bg: 'bg-blue-50/50', text: 'text-blue-800', headerBg: 'bg-blue-200' },
  amber: { border: 'border-amber-300', bg: 'bg-amber-50/50', text: 'text-amber-800', headerBg: 'bg-amber-200' },
  emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50/50', text: 'text-emerald-800', headerBg: 'bg-emerald-200' },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50/50', text: 'text-purple-800', headerBg: 'bg-purple-200' },
  rose: { border: 'border-rose-300', bg: 'bg-rose-50/50', text: 'text-rose-800', headerBg: 'bg-rose-200' },
  cyan: { border: 'border-cyan-300', bg: 'bg-cyan-50/50', text: 'text-cyan-800', headerBg: 'bg-cyan-200' },
  indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50/50', text: 'text-indigo-800', headerBg: 'bg-indigo-200' },
};

export const ProyectoKanban: React.FC<ProyectoKanbanProps> = ({ proyectoId, onActualizar }) => {
  const [board, setBoard] = useState<KanbanBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Filtros
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('TODAS');
  const [filtroTexto, setFiltroTexto] = useState<string>('');

  // Modal para creación directa de tareas en Kanban
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [tareaTitulo, setTareaTitulo] = useState('');
  const [tareaDescripcion, setTareaDescripcion] = useState('');
  const [tareaAsignadoA, setTareaAsignadoA] = useState('');
  const [tareaPrioridad, setTareaPrioridad] = useState('MEDIA');
  const [tareaEstadoProyecto, setTareaEstadoProyecto] = useState('TRABAJANDO');
  const [tareaFechaInicio, setTareaFechaInicio] = useState('');
  const [tareaFechaLimite, setTareaFechaLimite] = useState('');
  const [tareaColumnaId, setTareaColumnaId] = useState('');
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  useEffect(() => {
    cargarTablero();
    personalApi.getAll().then(data => setPersonalList(data || [])).catch(() => {});
  }, [proyectoId]);

  const cargarTablero = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await kanbanApi.getBoard(proyectoId);
      setBoard(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al cargar el tablero Kanban.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (!board) return;

    // Clonar columnas para actualización optimista
    const columnasNuevas = board.columnas.map(col => ({
      ...col,
      tareas: [...col.tareas]
    }));

    const colOrigen = columnasNuevas.find(c => c.id === source.droppableId);
    const colDestino = columnasNuevas.find(c => c.id === destination.droppableId);

    if (!colOrigen || !colDestino) return;

    // Quitar tarea del origen
    const [tareaMovida] = colOrigen.tareas.splice(source.index, 1);
    if (!tareaMovida) return;

    // Actualizar datos de la tarea optimista
    const tareaActualizada: Tarea = {
      ...tareaMovida,
      columna_kanban: colDestino.id,
      estado: (colDestino.estado_asociado as any) || tareaMovida.estado
    };

    // Insertar en destino
    colDestino.tareas.splice(destination.index, 0, tareaActualizada);

    setBoard({
      ...board,
      columnas: columnasNuevas
    });

    try {
      await kanbanApi.moverTarjeta(proyectoId, draggableId, destination.droppableId, destination.index);
      if (onActualizar) onActualizar();
    } catch (err) {
      console.error('Error al persistir movimiento en backend:', err);
      // Revertir recargando
      cargarTablero();
    }
  };

  const abrirModalCrearTarea = (columnaId?: string) => {
    setTareaTitulo('');
    setTareaDescripcion('');
    setTareaAsignadoA('');
    setTareaPrioridad('MEDIA');
    setTareaEstadoProyecto('TRABAJANDO');
    setTareaFechaInicio('');
    setTareaFechaLimite('');
    const defaultCol = columnaId || (board?.columnas[0]?.id || '');
    setTareaColumnaId(defaultCol);
    setModalTareaOpen(true);
  };

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaTitulo.trim()) return;
    if (!tareaAsignadoA) {
      alert('Debe seleccionar a quién asignar la tarea.');
      return;
    }

    if (tareaFechaInicio && tareaFechaLimite && tareaFechaInicio > tareaFechaLimite) {
      alert('La fecha de inicio no puede ser posterior a la fecha límite.');
      return;
    }

    setGuardandoTarea(true);
    try {
      await client.post('/tareas/', {
        proyecto: proyectoId,
        columna_kanban: tareaColumnaId || undefined,
        titulo: tareaTitulo.trim(),
        descripcion: tareaDescripcion.trim(),
        asignado_a: tareaAsignadoA,
        prioridad: tareaPrioridad,
        estado_proyecto: tareaEstadoProyecto,
        fecha_inicio: tareaFechaInicio || null,
        fecha_limite: tareaFechaLimite || null
      });

      setModalTareaOpen(false);
      setMensaje(`Tarea "${tareaTitulo.trim()}" añadida exitosamente al tablero.`);
      await cargarTablero();
      if (onActualizar) onActualizar();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Error al crear la tarea en el tablero');
    } finally {
      setGuardandoTarea(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600 text-sm font-medium">Cargando tablero Kanban...</span>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-rose-600" />
        <span>{error || 'No se pudo cargar la información del tablero.'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header del Kanban */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Tablero Kanban del Proyecto</h2>
              {board.lider_proyecto ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-950 border-2 border-indigo-600 ring-2 ring-indigo-200 shadow-sm">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Líder: {board.lider_proyecto.nombre} {board.lider_proyecto.apellido}</span>
                </span>
              ) : (
                <span className="text-xs text-gray-500 italic">Sin líder asignado</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Arrastra y suelta tarjetas entre columnas para actualizar su progreso en tiempo real.
            </p>
          </div>
        </div>

        {/* Acciones y Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Añadir Tarea al Tablero */}
          <button
            onClick={() => abrirModalCrearTarea()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Tarea</span>
          </button>

          {/* Filtro de Prioridad */}
          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              className="bg-transparent border-none text-xs focus:ring-0 cursor-pointer font-medium"
            >
              <option value="TODAS">Todas las Prioridades</option>
              <option value="URGENTE">Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{mensaje}</span>
        </div>
      )}

      {/* Tablero Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
          {board.columnas.map((col) => {
            const estiloColor = COLOR_CLASSES[col.color] || COLOR_CLASSES.slate;

            // Filtrar tareas de la columna
            const tareasFiltradas = col.tareas.filter(t => {
              if (filtroPrioridad !== 'TODAS' && t.prioridad !== filtroPrioridad) return false;
              if (filtroTexto && !t.titulo.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
              return true;
            });

            return (
              <div
                key={col.id}
                className={`w-80 shrink-0 rounded-xl border ${estiloColor.border} ${estiloColor.bg} flex flex-col max-h-[750px] shadow-xs`}
              >
                {/* Encabezado de Columna (Fija) */}
                <div className={`p-3 border-b ${estiloColor.border} ${estiloColor.headerBg} rounded-t-xl flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${estiloColor.text}`}>
                      {col.nombre}
                    </span>
                    <span className="px-2 py-0.5 bg-white/80 text-gray-700 text-xs font-bold rounded-full border border-gray-200">
                      {col.tareas.length}
                    </span>
                  </div>
                </div>

                {/* Zona Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2 flex-1 overflow-y-auto space-y-2.5 transition-colors min-h-[150px] ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/60 rounded-b-xl' : ''
                      }`}
                    >
                      {tareasFiltradas.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400 italic">
                          Sin tarjetas en esta columna
                        </div>
                      ) : (
                        tareasFiltradas.map((tarea, index) => (
                          <Draggable key={tarea.id} draggableId={tarea.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition hover:shadow-md cursor-grab active:cursor-grabbing ${
                                  dragSnapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 rotate-1' : ''
                                }`}
                              >
                                {/* Header Tarjeta: Prioridad y Etapa */}
                                <div className="flex items-center justify-between mb-1.5 gap-1 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORIDAD_COLORS[tarea.prioridad as PrioridadTarea] || 'bg-gray-100'}`}>
                                      {PRIORIDAD_LABELS[tarea.prioridad as PrioridadTarea] || tarea.prioridad}
                                    </span>
                                    {tarea.estado_proyecto && (
                                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                                        ESTADO_PROYECTO_COLORS[tarea.estado_proyecto as EstadoProyectoEnum] || 'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}>
                                        {ESTADO_PROYECTO_LABELS[tarea.estado_proyecto as EstadoProyectoEnum] || tarea.estado_proyecto}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500">
                                    {tarea.fecha_inicio && (
                                      <span className="text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded text-[10px]" title="Fecha de inicio planificada">
                                        Ini: {tarea.fecha_inicio}
                                      </span>
                                    )}
                                    {tarea.fecha_limite && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        {tarea.fecha_limite}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Título */}
                                <h4 className="text-sm font-semibold text-gray-900 leading-snug">
                                  {tarea.titulo}
                                </h4>

                                {tarea.descripcion && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                    {tarea.descripcion}
                                  </p>
                                )}

                                {/* Footer Tarjeta: Asignado */}
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                                  <div className="flex items-center gap-1.5 font-medium truncate">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {tarea.asignado_a_nombre ? tarea.asignado_a_nombre.charAt(0) : '?'}
                                    </div>
                                    <span className="truncate">{tarea.asignado_a_nombre || 'Sin asignar'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Botón rápido Añadir Tarea en esta columna */}
                <div className="p-2 pt-0">
                  <button
                    onClick={() => abrirModalCrearTarea(col.id)}
                    className="w-full py-1.5 px-3 border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-white text-gray-500 hover:text-indigo-600 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir tarea a esta columna</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal para Crear Tarea desde el Tablero Kanban */}
      {modalTareaOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>Añadir Nueva Tarea al Tablero Kanban</span>
            </h3>

            <form onSubmit={handleCrearTarea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título de la Tarea <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tareaTitulo}
                  onChange={(e) => setTareaTitulo(e.target.value)}
                  placeholder="Ej: Integrar pasarela de cobros..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={tareaDescripcion}
                  onChange={(e) => setTareaDescripcion(e.target.value)}
                  placeholder="Instrucciones o detalles de la tarea..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Columna Destino
                  </label>
                  <select
                    value={tareaColumnaId}
                    onChange={(e) => setTareaColumnaId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {board?.columnas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.estado_asociado ? `(${c.estado_asociado})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={tareaPrioridad}
                    onChange={(e) => setTareaPrioridad(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Etapa de Proyecto Asociada
                </label>
                <select
                  value={tareaEstadoProyecto}
                  onChange={(e) => setTareaEstadoProyecto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="OPORTUNIDAD">Oportunidad (Inicial / Relevamiento)</option>
                  <option value="TRABAJANDO">Trabajando (Ejecución Oficial)</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="SEGUIMIENTO">Seguimiento (Soporte)</option>
                  <option value="CONCRETADO">Concretado</option>
                  <option value="CAIDO">Caído</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Las tareas en etapa Oportunidad se ponderan hasta un 10% en el cálculo de salud del proyecto.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Asignar a Profesional <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={tareaAsignadoA}
                  onChange={(e) => setTareaAsignadoA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seleccione un profesional...</option>
                  {personalList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido} ({p.rol} - {p.cargo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha de Inicio <span className="text-gray-400 font-normal">(Opcional / A futuro)</span>
                  </label>
                  <input
                    type="date"
                    value={tareaFechaInicio}
                    onChange={(e) => setTareaFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={tareaFechaLimite}
                    onChange={(e) => setTareaFechaLimite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <p className="text-xs text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                💡 <strong>Auto-incorporación:</strong> Si el profesional seleccionado no pertenece al equipo del proyecto, el sistema lo integrará automáticamente como miembro al guardar la tarea.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTareaOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTarea}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {guardandoTarea ? 'Añadiendo...' : 'Añadir Tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProyectoKanban;
