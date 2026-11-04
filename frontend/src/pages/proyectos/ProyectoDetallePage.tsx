import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { proyectosApi } from '../../api/proyectos';
import { personalApi } from '../../api/personal';
import { tareasApi } from '../../api/tareas';
import { reunionesApi } from '../../api/reuniones';
import {
  Proyecto, Tarea, Reunion, Financiacion, Personal,
  ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS, EstadoProyectoEnum,
  ESTADO_TAREA_LABELS, TipoServicio, TIPO_SERVICIO_LABELS
} from '../../types';
import client from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { RolPersonal } from '../../types';
import { Crown, Activity } from 'lucide-react';
import { kanbanApi } from '../../api/kanban';
import ProyectoKanban from '../../components/kanban/ProyectoKanban';
import { ProyectoHealthScoreTab } from '../../components/healthScore/ProyectoHealthScoreTab';
import { HealthScorePromptModal } from '../../components/healthScore/HealthScorePromptModal';
import { SnapshotFormModal } from '../../components/healthScore/SnapshotFormModal';


export default function ProyectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRRHH = user?.rol === RolPersonal.RRHH;
  const isManagerOrHR = isRRHH || user?.rol === RolPersonal.GERENTE;

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [financiacion, setFinanciacion] = useState<Financiacion[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban'); // kanban, tareas, equipo, reuniones, financiacion, historial

  // Modales
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [modalEquipoOpen, setModalEquipoOpen] = useState(false);
  
  // Estado para cambio de estado
  const [nuevoEstado, setNuevoEstado] = useState<string>('');
  const [razonCambio, setRazonCambio] = useState<string>('');
  const [estadosPosibles, setEstadosPosibles] = useState<string[]>([]);
  const [fechaFinEstimadaEstado, setFechaFinEstimadaEstado] = useState<string>('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  // Estado para asignación de equipo
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string>('');
  const [notificarEmail, setNotificarEmail] = useState<boolean>(true);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  // Estado para creación directa de tareas (RRHH / Gerente)
  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [tareaTitulo, setTareaTitulo] = useState('');
  const [tareaDescripcion, setTareaDescripcion] = useState('');
  const [tareaAsignadoA, setTareaAsignadoA] = useState('');
  const [tareaPrioridad, setTareaPrioridad] = useState('MEDIA');
  const [tareaEstadoProyecto, setTareaEstadoProyecto] = useState('TRABAJANDO');
  const [tareaFechaInicio, setTareaFechaInicio] = useState('');
  const [tareaFechaLimite, setTareaFechaLimite] = useState('');
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  // Estados para modal reactivo de salud
  const [promptSaludOpen, setPromptSaludOpen] = useState(false);
  const [motivoPrompt, setMotivoPrompt] = useState<'REUNION_COMPLETADA' | 'TAREA_ACTUALIZADA' | 'SEMANAL_PENDIENTE' | 'GENERAL'>('GENERAL');
  const [detallePrompt, setDetallePrompt] = useState<string>('');
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);

  const fetchProyecto = async () => {
    try {
      const projRes = await proyectosApi.getById(id!);
      setProyecto(projRes);
    } catch (error) {
      console.error('Error al recargar proyecto', error);
    }
  };

  const handleCompletarTarea = async (tareaId: string) => {
    try {
      await tareasApi.completar(tareaId);
      const tRes = await client.get(`/tareas/?proyecto=${id}`);
      setTareas(tRes.data.results || tRes.data || []);
      // Alerta reactiva de salud
      setMotivoPrompt('TAREA_ACTUALIZADA');
      setDetallePrompt('Se completó una tarea clave del proyecto.');
      setPromptSaludOpen(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al completar la tarea');
    }
  };

  const handleToggleReunion = async (reunionId: string) => {
    try {
      await reunionesApi.completar(reunionId);
      const rRes = await client.get(`/reuniones/?proyecto=${id}`);
      setReuniones(rRes.data.results || rRes.data || []);
      // Alerta reactiva de salud
      setMotivoPrompt('REUNION_COMPLETADA');
      setDetallePrompt('Se marcó una reunión como finalizada. Puedes registrar o analizar su minuta.');
      setPromptSaludOpen(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al actualizar la reunión');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projRes = await proyectosApi.getById(id!);
        setProyecto(projRes);

        // Cargar tareas del proyecto de manera segura
        try {
          const tRes = await client.get(`/tareas/?proyecto=${id}`);
          setTareas(tRes.data.results || tRes.data || []);
        } catch (e) {
          console.error('Error al cargar tareas del proyecto', e);
        }

        // Cargar reuniones del proyecto de manera segura
        try {
          const rRes = await client.get(`/reuniones/?proyecto=${id}`);
          setReuniones(rRes.data.results || rRes.data || []);
        } catch (e) {
          console.error('Error al cargar reuniones del proyecto', e);
        }

        // Financiación solo visible para Directivos y RRHH
        if (isManagerOrHR) {
          try {
            const fRes = await client.get(`/financiacion/?proyecto=${id}`);
            setFinanciacion(fRes.data.results || fRes.data || []);
          } catch (e) {
            console.error('Error al cargar financiación', e);
          }
        }

        // Lista completa de personal requerida para asignación de equipo y creación de tareas
        if (isManagerOrHR) {
          try {
            const pRes = await personalApi.getAll();
            setPersonalList(pRes || []);
          } catch (e) {
            console.error('Error al cargar lista de personal', e);
          }
        }
      } catch (error) {
        console.error('Error fetching project data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isRRHH, isManagerOrHR]);

  const abrirModalTarea = () => {
    setTareaTitulo('');
    setTareaDescripcion('');
    setTareaAsignadoA('');
    setTareaPrioridad('MEDIA');
    setTareaEstadoProyecto(proyecto?.estado_actual?.estado || 'TRABAJANDO');
    setTareaFechaInicio('');
    setTareaFechaLimite('');
    setModalTareaOpen(true);
  };

  const handleGuardarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaTitulo.trim()) {
      alert('El título de la tarea es obligatorio.');
      return;
    }
    if (!tareaAsignadoA) {
      alert('Debe asignar la tarea a un profesional.');
      return;
    }

    if (tareaFechaInicio && tareaFechaLimite && tareaFechaInicio > tareaFechaLimite) {
      alert('La fecha de inicio no puede ser posterior a la fecha límite.');
      return;
    }

    setGuardandoTarea(true);
    try {
      await client.post('/tareas/', {
        proyecto: id,
        titulo: tareaTitulo.trim(),
        descripcion: tareaDescripcion.trim(),
        asignado_a: tareaAsignadoA,
        prioridad: tareaPrioridad,
        estado_proyecto: tareaEstadoProyecto,
        fecha_inicio: tareaFechaInicio || null,
        fecha_limite: tareaFechaLimite || null
      });

      // Recargar datos del proyecto (el miembro se auto-agrega si no estaba en el equipo) y las tareas
      await fetchProyecto();
      const tRes = await client.get(`/tareas/?proyecto=${id}`);
      setTareas(tRes.data.results || tRes.data || []);
      setModalTareaOpen(false);

      // Alerta reactiva de salud
      setMotivoPrompt('TAREA_ACTUALIZADA');
      setDetallePrompt(`Se incorporó la tarea "${tareaTitulo}".`);
      setPromptSaludOpen(true);
    } catch (error: any) {
      console.error('Error al crear tarea', error);
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Error al crear la tarea.';
      alert(msg);
    } finally {
      setGuardandoTarea(false);
    }
  };

  const abrirModalEstado = async () => {
    try {
      const data = await proyectosApi.getEstadosPosibles(id!);
      setEstadosPosibles(data.estados_posibles);
      if (data.estados_posibles.length > 0) {
        setNuevoEstado(data.estados_posibles[0]);
      } else {
        setNuevoEstado('');
      }
      setRazonCambio('');
      setFechaFinEstimadaEstado(proyecto?.fecha_fin_estimada || '');
      setModalEstadoOpen(true);
    } catch (error) {
      alert('Error al consultar transiciones permitidas');
    }
  };

  const handleCambiarEstado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEstado || !razonCambio.trim()) {
      alert('Debe indicar el nuevo estado y el motivo del cambio');
      return;
    }
    setGuardandoEstado(true);
    try {
      const fechaFin = nuevoEstado === 'SEGUIMIENTO'
        ? (fechaFinEstimadaEstado.trim() ? fechaFinEstimadaEstado : null)
        : (fechaFinEstimadaEstado.trim() ? fechaFinEstimadaEstado : undefined);
      await proyectosApi.cambiarEstado(id!, nuevoEstado, razonCambio, fechaFin);
      await fetchProyecto();
      setModalEstadoOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al cambiar estado';
      alert(msg);
    } finally {
      setGuardandoEstado(false);
    }
  };

  const abrirModalEquipo = () => {
    setPersonalSeleccionado('');
    setNotificarEmail(true);
    setModalEquipoOpen(true);
  };

  const handleAsignarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalSeleccionado) {
      alert('Seleccione un profesional para asignar');
      return;
    }
    setGuardandoEquipo(true);
    try {
      await proyectosApi.asignarEquipo(id!, personalSeleccionado, notificarEmail);
      await fetchProyecto();
      setModalEquipoOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al asignar miembro';
      alert(msg);
    } finally {
      setGuardandoEquipo(false);
    }
  };

  const handleDesasignarEquipo = async (personalId: string) => {
    if (!window.confirm('¿Está seguro de quitar a este profesional del equipo?')) return;
    try {
      await proyectosApi.desasignarEquipo(id!, personalId);
      await fetchProyecto();
    } catch (error: any) {
      alert('Error al desasignar miembro del equipo');
    }
  };

  const handleDesignarLider = async (personalId: string, nombre: string) => {
    if (!window.confirm(`¿Designar a ${nombre} como Líder de este proyecto? Podrá gestionar columnas del tablero Kanban y coordinar tareas.`)) return;
    try {
      await kanbanApi.designarLider(id!, personalId);
      await fetchProyecto();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al designar líder del proyecto');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  }

  if (!proyecto) {
    return <div className="text-center p-8 text-red-500">Proyecto no encontrado</div>;
  }

  const estadoActual = (proyecto.estado_actual?.estado as EstadoProyectoEnum) || EstadoProyectoEnum.OPORTUNIDAD;
  const esEstadoFinal = estadoActual === EstadoProyectoEnum.CONCRETADO || estadoActual === EstadoProyectoEnum.CAIDO;

  // Personal disponible para agregar al equipo (que no esté ya asignado)
  const equipoActualIds = (proyecto.equipo_asignaciones || []).map(e => e.personal || (e as any).personal_id);
  const personalDisponible = personalList.filter(p => !equipoActualIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{proyecto.nombre}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ESTADO_PROYECTO_COLORS[estadoActual]}`}>
                {ESTADO_PROYECTO_LABELS[estadoActual]}
              </span>
              {proyecto.phs_actual !== undefined && proyecto.phs_actual !== null && (
                <button
                  type="button"
                  onClick={() => setActiveTab('health_score')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PHS: {proyecto.phs_actual}/100</span>
                </button>
              )}
            </div>
            <p className="text-lg text-gray-600 mt-1">
              Empresa: <strong className="text-gray-900">{proyecto.empresa_razon_social || (typeof proyecto.empresa === 'object' ? proyecto.empresa?.razon_social : null) || '-'}</strong>
              {proyecto.empresa_nombre_comercial && <span className="text-gray-500 text-sm"> ({proyecto.empresa_nombre_comercial})</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate(`/proyectos/${id}/kanban`)}>
              📋 Tablero Kanban
            </Button>
            {isManagerOrHR && (
              <Button variant="primary" onClick={abrirModalTarea}>
                + Nueva Tarea
              </Button>
            )}
            {isRRHH && (
              <>
                {!esEstadoFinal && (
                  <Button variant="secondary" onClick={abrirModalEstado}>
                    Cambiar Estado
                  </Button>
                )}
                <Button variant="secondary" onClick={abrirModalEquipo}>
                  + Asignar Equipo
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/proyectos/${id}/editar`)}>
                  Editar
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-gray-700 bg-gray-50 p-3 rounded-md text-sm mb-4">
          {proyecto.descripcion}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">Tipo de Servicio</h3>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {Array.isArray(proyecto.tipo_servicio) && proyecto.tipo_servicio.length > 0
                ? proyecto.tipo_servicio.map((s: string) => {
                    if (s === 'OTRO') {
                      return proyecto.tipo_servicio_otro ? `Otro (${proyecto.tipo_servicio_otro})` : 'Otro';
                    }
                    return TIPO_SERVICIO_LABELS[s as TipoServicio] || s;
                  }).join(', ')
                : '-'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">Líder del Proyecto</h3>
            <div className="mt-1 text-sm font-medium text-gray-900">
              {proyecto.lider_proyecto_nombre ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  {proyecto.lider_proyecto_nombre}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">No asignado</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">Fechas Estimadas</h3>
            <p className="mt-1 text-sm text-gray-900">
              {proyecto.fecha_inicio_estimada ? new Date(proyecto.fecha_inicio_estimada).toLocaleDateString('es-ES') : 'Sin definir'} 
              {' → '}
              {proyecto.fecha_fin_estimada ? new Date(proyecto.fecha_fin_estimada).toLocaleDateString('es-ES') : 'Sin definir'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase">Último Cambio de Estado</h3>
            <p className="mt-1 text-xs text-gray-700">
              {proyecto.estado_actual?.fecha_cambio ? new Date(proyecto.estado_actual.fecha_cambio).toLocaleString('es-ES') : '-'}
            </p>
          </div>
        </div>

        {/* Equipo Encargado (Cápsulas de miembros con Líder resaltado con borde más grueso) */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Equipo Encargado</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {proyecto.equipo_asignaciones?.length || 0}
              </span>
            </h3>
            {isRRHH && (
              <button
                type="button"
                onClick={abrirModalEquipo}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                + Gestionar Equipo
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {proyecto.equipo_asignaciones && proyecto.equipo_asignaciones.length > 0 ? (
              proyecto.equipo_asignaciones.map((eq: any) => {
                const nombre = eq.personal_nombre || (eq.personal ? `${eq.personal.nombre} ${eq.personal.apellido}` : 'Miembro');
                const cargo = eq.personal_cargo || eq.personal?.cargo || '';
                const esLider = eq.es_lider || (proyecto.lider_proyecto_nombre && proyecto.lider_proyecto_nombre === nombre);

                return (
                  <div
                    key={eq.id || eq.personal_id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                      esLider
                        ? 'border-2 border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/90 text-indigo-950 font-bold shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 font-medium hover:border-slate-300'
                    }`}
                  >
                    {esLider ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Crown className="w-3.5 h-3.5 fill-amber-400" />
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    )}
                    <span>{nombre}</span>
                    {cargo && <span className="text-[10px] text-gray-500 font-normal">({cargo})</span>}
                    {esLider && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
                        Líder
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic">No hay miembros asignados al equipo de este proyecto.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'health_score', label: 'Health Score 🎯' },
          { id: 'kanban', label: 'Tablero Kanban 📋' },
          { id: 'tareas', label: `Listado de Tareas (${tareas.length})` },
          { id: 'equipo', label: `Equipo (${proyecto.equipo_asignaciones?.length || 0})` },
          { id: 'reuniones', label: `Reuniones (${reuniones.length})` },
          ...(isManagerOrHR ? [{ id: 'financiacion', label: `Financiación (${financiacion.length})` }] : []),
          { id: 'historial', label: `Historial de Estados (${proyecto.estados?.length || 0})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="p-0 overflow-hidden">
        {activeTab === 'health_score' && (
          <div className="p-6">
            <ProyectoHealthScoreTab
              proyectoId={id!}
              proyectoNombre={proyecto.nombre}
              puedeEditar={isManagerOrHR}
            />
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="p-4 bg-slate-50/50">
            <ProyectoKanban proyectoId={id!} onActualizar={fetchProyecto} />
          </div>
        )}

        {activeTab === 'tareas' && (
          <div>
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Tareas Vinculadas al Proyecto</h3>
                <p className="text-xs text-gray-500">Todas las tareas están directamente asociadas a las columnas del Tablero Kanban.</p>
              </div>
              {isManagerOrHR && (
                <Button variant="primary" size="sm" onClick={abrirModalTarea}>
                  + Nueva Tarea
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Etapa Proyecto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado a</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Límite</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tareas.length > 0 ? tareas.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.titulo}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded border ${
                        t.estado_proyecto ? (ESTADO_PROYECTO_COLORS[t.estado_proyecto as EstadoProyectoEnum] || 'bg-gray-100 text-gray-800 border-gray-200') : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {t.estado_proyecto ? (ESTADO_PROYECTO_LABELS[t.estado_proyecto as EstadoProyectoEnum] || t.estado_proyecto) : 'Trabajando'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {t.asignado_a ? `${t.asignado_a.nombre} ${t.asignado_a.apellido}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={t.estado === 'COMPLETADA' ? 'success' : 'info'}>
                        {ESTADO_TAREA_LABELS[t.estado] || t.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {t.fecha_inicio && (
                        <div className="text-xs text-sky-700 font-semibold mb-0.5">
                          Ini: {new Date(t.fecha_inicio).toLocaleDateString('es-ES')}
                        </div>
                      )}
                      <div>
                        {t.fecha_limite ? `Límite: ${new Date(t.fecha_limite).toLocaleDateString('es-ES')}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {t.estado !== 'COMPLETADA' ? (
                        <button
                          onClick={() => handleCompletarTarea(t.id)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                          title="Marcar tarea como completada"
                        >
                          ✓ Completar
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium">Completada</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-500">No hay tareas asociadas a este proyecto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {activeTab === 'equipo' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profesional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo / Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Asignación</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proyecto.equipo_asignaciones && proyecto.equipo_asignaciones.length > 0 ? (
                  proyecto.equipo_asignaciones.map((eq: any) => {
                    const nombre = eq.personal_nombre || (eq.personal ? `${eq.personal.nombre} ${eq.personal.apellido}` : '-');
                    const cargo = eq.personal_cargo || eq.personal?.cargo || '-';
                    const rol = eq.personal_rol || eq.personal?.rol || '';
                    const email = eq.personal_email || eq.personal?.email || '';
                    const personalId = eq.personal?.id || eq.personal;
                    const esLider = eq.es_lider || proyecto.lider_proyecto_nombre === nombre;

                    return (
                      <tr key={eq.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{nombre}</span>
                            {esLider && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Crown className="w-3 h-3 text-amber-600" /> Líder
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{cargo} {rol && `(${rol})`}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {eq.fecha_asignacion ? new Date(eq.fecha_asignacion).toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm space-x-2">
                          {!esLider && (isRRHH || user?.rol === RolPersonal.GERENTE) && (
                            <button
                              onClick={() => handleDesignarLider(personalId, nombre)}
                              className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded border border-amber-300 transition"
                            >
                              ⭐ Designar Líder
                            </button>
                          )}
                          {isRRHH && (
                            <button
                              onClick={() => handleDesasignarEquipo(personalId)}
                              className="text-red-600 hover:text-red-900 font-medium text-xs ml-2"
                            >
                              Quitar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-500">No hay empleados asignados a este proyecto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reuniones' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación / Link</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reuniones.length > 0 ? reuniones.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.titulo}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.tipo_reunion}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(r.fecha_hora_inicio).toLocaleString('es-ES')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.ubicacion || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={r.completada ? 'success' : 'warning'}>
                        {r.completada ? 'Realizada' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleToggleReunion(r.id)}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border transition cursor-pointer ${
                          r.completada
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300'
                        }`}
                        title={r.completada ? 'Marcar como pendiente' : 'Marcar como realizada'}
                      >
                        {r.completada ? '↩ Reabrir' : '✓ Realizada'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-500">No hay reuniones registradas para este proyecto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'financiacion' && (
          <div className="p-6">
            {financiacion.length > 0 ? financiacion.map(f => (
              <div key={f.id} className="mb-4 border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xl text-gray-900">
                    {f.moneda} {f.monto_total?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {f.forma_pago}
                  </span>
                </div>
                {f.cantidad_cuotas && <p className="text-sm text-gray-700 mt-2 font-medium">Plan de {f.cantidad_cuotas} cuotas</p>}
                {f.detalle_entregables && <p className="text-sm text-gray-600 mt-2"><strong>Entregables:</strong> {f.detalle_entregables}</p>}
                {f.detalle_otros && <p className="text-sm text-gray-600 mt-2"><strong>Detalle:</strong> {f.detalle_otros}</p>}

                {f.cuotas && f.cuotas.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <h5 className="font-semibold text-xs uppercase text-gray-500 mb-2">Cuotas registradas:</h5>
                    <table className="min-w-full text-sm bg-white rounded border">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600">
                          <th className="px-3 py-2 text-left">Nº</th>
                          <th className="px-3 py-2 text-left">Monto</th>
                          <th className="px-3 py-2 text-left">Vencimiento</th>
                          <th className="px-3 py-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.cuotas.map(c => (
                          <tr key={c.id} className="border-t">
                            <td className="px-3 py-2">{c.numero_cuota}</td>
                            <td className="px-3 py-2">{c.moneda} {c.monto}</td>
                            <td className="px-3 py-2">{c.fecha_vencimiento || c.fecha_pago ? new Date(c.fecha_vencimiento || c.fecha_pago!).toLocaleDateString('es-ES') : '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                c.estado === 'PAGADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {c.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-6 text-gray-500">
                <p>No se ha registrado información financiera aún.</p>
                <p className="text-xs text-gray-400 mt-1">
                  La financiación se pacta una vez que el proyecto se acepta formalmente.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="p-6">
            <div className="relative border-l-2 border-primary-300 ml-4 space-y-6">
              {proyecto.estados && proyecto.estados.length > 0 ? (
                proyecto.estados.map((est) => (
                  <div key={est.id} className="relative pl-6">
                    <div className="absolute -left-2.5 top-1.5 w-5 h-5 rounded-full bg-primary-600 border-4 border-white"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${ESTADO_PROYECTO_COLORS[est.estado]}`}>
                        {ESTADO_PROYECTO_LABELS[est.estado]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(est.fecha_cambio).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {est.razon_cambio}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Registrado por: {est.cambiado_por_nombre || 'Sistema'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 pl-4">No hay historial registrado</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Modal Cambio de Estado */}
      <Modal
        isOpen={modalEstadoOpen}
        onClose={() => setModalEstadoOpen(false)}
        title="Cambiar Estado del Proyecto"
      >
        <form onSubmit={handleCambiarEstado} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Estado actual: <span className="font-bold">{ESTADO_PROYECTO_LABELS[estadoActual]}</span>
            </p>
          </div>

          {estadosPosibles.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Estado
                </label>
                <Select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  options={estadosPosibles.map(est => ({
                    value: est,
                    label: ESTADO_PROYECTO_LABELS[est as EstadoProyectoEnum] || est
                  }))}
                  required
                />
              </div>

              {nuevoEstado === 'SEGUIMIENTO' ? (
                <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-200 text-xs text-purple-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-purple-950">
                    <span>ℹ️</span>
                    <span>Etapa de Seguimiento (Soporte y Garantía)</span>
                  </div>
                  <p>
                    Esta etapa puede ser de soporte continuo y monitoreo post-entrega sin fecha de caducidad obligatoria, o bien tener una fecha estimada de finalización.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Fecha Fin Estimada de Seguimiento <span className="font-normal text-purple-700">(Opcional)</span>
                    </label>
                    <Input
                      type="date"
                      value={fechaFinEstimadaEstado}
                      onChange={(e) => setFechaFinEstimadaEstado(e.target.value)}
                    />
                    <p className="text-[11px] text-purple-700 mt-1">
                      Deje este campo vacío si el seguimiento no tiene una fecha de finalización predeterminada.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin Estimada del Proyecto <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                  </label>
                  <Input
                    type="date"
                    value={fechaFinEstimadaEstado}
                    onChange={(e) => setFechaFinEstimadaEstado(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo / Razón del Cambio <span className="text-red-500">*</span>
                </label>
                <TextArea
                  value={razonCambio}
                  onChange={(e) => setRazonCambio(e.target.value)}
                  placeholder="Explique el motivo del cambio de estado (ej: aceptación de propuesta, interrupción del cliente, finalización exitosa)..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setModalEstadoOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={guardandoEstado}>
                  {guardandoEstado ? 'Actualizando...' : 'Confirmar Cambio'}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-gray-600 text-sm">
              Este proyecto se encuentra en un estado final ({ESTADO_PROYECTO_LABELS[estadoActual]}). No admite nuevas transiciones de estado.
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Asignar Equipo */}
      <Modal
        isOpen={modalEquipoOpen}
        onClose={() => setModalEquipoOpen(false)}
        title="Asignar Miembro al Equipo"
      >
        <form onSubmit={handleAsignarEquipo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Profesional
            </label>
            <Select
              value={personalSeleccionado}
              onChange={(e) => setPersonalSeleccionado(e.target.value)}
              options={[
                { value: '', label: 'Seleccione un profesional...' },
                ...personalDisponible.map(p => ({
                  value: p.id,
                  label: `${p.nombre} ${p.apellido} (${p.rol} - ${p.cargo})`
                }))
              ]}
              required
            />
          </div>

          <div className="flex items-center mt-3">
            <input
              type="checkbox"
              id="modal_notificar_email"
              checked={notificarEmail}
              onChange={(e) => setNotificarEmail(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="modal_notificar_email" className="text-sm text-gray-700">
              Enviar email de notificación al profesional asignado
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setModalEquipoOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={guardandoEquipo}>
              {guardandoEquipo ? 'Asignando...' : 'Asignar Miembro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear Tarea Directa (RRHH / Gerente) */}
      <Modal
        isOpen={modalTareaOpen}
        onClose={() => setModalTareaOpen(false)}
        title={`Añadir Nueva Tarea - ${proyecto.nombre}`}
      >
        <form onSubmit={handleGuardarTarea} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título de la Tarea <span className="text-red-500">*</span>
            </label>
            <Input
              value={tareaTitulo}
              onChange={(e) => setTareaTitulo(e.target.value)}
              placeholder="Ej: Maquetar módulo de finanzas..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción detallada
            </label>
            <TextArea
              value={tareaDescripcion}
              onChange={(e) => setTareaDescripcion(e.target.value)}
              placeholder="Describa el objetivo, requerimientos y entregables esperados de esta tarea..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asignar a Profesional <span className="text-red-500">*</span>
            </label>
            <Select
              value={tareaAsignadoA}
              onChange={(e) => setTareaAsignadoA(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar profesional...' },
                ...personalList.map(p => {
                  const pertenece = equipoActualIds.includes(p.id);
                  return {
                    value: p.id,
                    label: `${p.nombre} ${p.apellido} (${p.rol} - ${p.cargo}) ${pertenece ? '• [Equipo]' : '• [No miembro]'}`
                  };
                })
              ]}
              required
            />
            {tareaAsignadoA && !equipoActualIds.includes(tareaAsignadoA) && (
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 p-2.5 rounded-md mt-2 flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>
                  Este profesional no forma parte del equipo actual. Al guardar la tarea, <strong>se agregará automáticamente al Equipo Encargado</strong> del proyecto.
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <Select
                value={tareaPrioridad}
                onChange={(e) => setTareaPrioridad(e.target.value)}
                options={[
                  { value: 'BAJA', label: 'Baja' },
                  { value: 'MEDIA', label: 'Media' },
                  { value: 'ALTA', label: 'Alta' },
                  { value: 'URGENTE', label: 'Urgente' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etapa de Proyecto Asociada
              </label>
              <Select
                value={tareaEstadoProyecto}
                onChange={(e) => setTareaEstadoProyecto(e.target.value)}
                options={[
                  { value: 'OPORTUNIDAD', label: 'Oportunidad (Inicial / Relevamiento)' },
                  { value: 'TRABAJANDO', label: 'Trabajando (Ejecución Oficial)' },
                  { value: 'PAUSADO', label: 'Pausado' },
                  { value: 'SEGUIMIENTO', label: 'Seguimiento (Soporte / Post-entrega)' },
                  { value: 'CONCRETADO', label: 'Concretado' },
                  { value: 'CAIDO', label: 'Caído' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio <span className="text-gray-400 font-normal text-xs">(Opcional / A futuro)</span>
              </label>
              <Input
                type="date"
                value={tareaFechaInicio}
                onChange={(e) => setTareaFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Límite
              </label>
              <Input
                type="date"
                value={tareaFechaLimite}
                onChange={(e) => setTareaFechaLimite(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            📌 La tarea se vinculará directamente a la columna inicial del Tablero Kanban del proyecto y notificará al profesional asignado.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setModalTareaOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={guardandoTarea}>
              {guardandoTarea ? 'Guardando Tarea...' : 'Crear y Vincular Tarea'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Reactivo de Salud (PHS Prompt) */}
      <HealthScorePromptModal
        isOpen={promptSaludOpen}
        onClose={() => setPromptSaludOpen(false)}
        onConfirm={() => {
          setPromptSaludOpen(false);
          setSnapshotModalOpen(true);
        }}
        proyectoNombre={proyecto.nombre}
        motivo={motivoPrompt}
        detalle={detallePrompt}
      />

      {/* Modal de Carga de Snapshot Periódico */}
      <SnapshotFormModal
        isOpen={snapshotModalOpen}
        onClose={() => setSnapshotModalOpen(false)}
        proyectoId={id!}
        proyectoNombre={proyecto.nombre}
        onSuccess={() => {
          fetchProyecto();
        }}
      />
    </div>
  );
}

