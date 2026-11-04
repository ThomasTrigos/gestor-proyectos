import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Reunion,
  Recordatorio,
  Tarea,
  Proyecto,
  Personal,
  RolPersonal,
  PrioridadTarea,
  PRIORIDAD_LABELS,
  PRIORIDAD_COLORS,
  ESTADO_TAREA_LABELS,
  Financiacion,
  CuotaPago,
} from '../../types';
import { reunionesApi } from '../../api/reuniones';
import { recordatoriosApi } from '../../api/recordatorios';
import { tareasApi } from '../../api/tareas';
import { proyectosApi } from '../../api/proyectos';
import { personalApi } from '../../api/personal';
import { financiacionApi } from '../../api/financiacion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Mail,
  Briefcase,
  X,
  Bell,
  Check,
  CalendarDays,
  ListTodo,
  Calendar as CalendarIcon,
  DollarSign,
  CheckSquare,
  Building2,
  FolderKanban,
  Filter,
  Rocket,
  GripVertical,
  Flag,
} from 'lucide-react';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export interface FinanciacionEvento {
  id: string;
  financiacionId: string;
  proyectoId?: string;
  proyectoNombre?: string;
  empresaNombre?: string;
  tipo: 'VENCIMIENTO_CUOTA' | 'VENCIMIENTO_ENTREGABLE' | 'ACUERDO_FINANCIACION';
  titulo: string;
  descripcion?: string;
  monto: number;
  moneda: string;
  montoUsd?: number | string | null;
  pagoEnDolares?: boolean;
  estado?: string;
  fecha: string; // YYYY-MM-DD
  numeroCuota?: number | null;
  entregable?: string;
}

const ReunionesCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManagerOrHR = user?.rol === RolPersonal.GERENTE || user?.rol === RolPersonal.RRHH;

  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [financiaciones, setFinanciaciones] = useState<Financiacion[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtros de visualización activa
  const [filtros, setFiltros] = useState({
    reuniones: true,
    financiacion: true,
    tareasInicio: true,
    tareasFin: true,
    recordatorios: true,
  });

  // Estado para arrastrar y soltar (Drag and Drop)
  const [draggingItem, setDraggingItem] = useState<{
    tipo: 'reunion' | 'tarea_inicio' | 'tarea_limite' | 'recordatorio' | 'cuota';
    id: string;
    titulo: string;
    fechaOrigen: string;
    raw: any;
  } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [reprogramando, setReprogramando] = useState(false);
  const [notificacionArrastre, setNotificacionArrastre] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'agenda' | 'recordatorio' | 'tarea'>('agenda');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Form State: Recordatorio
  const [recTitulo, setRecTitulo] = useState('');
  const [recDescripcion, setRecDescripcion] = useState('');
  const [recHora, setRecHora] = useState('');
  const [recPrioridad, setRecPrioridad] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [recEnviarEmail, setRecEnviarEmail] = useState(false);
  const [recEmailDestino, setRecEmailDestino] = useState('');
  const [savingRec, setSavingRec] = useState(false);

  // Form State: Tarea rápida (RRHH / Gerente)
  const [taskProyectoId, setTaskProyectoId] = useState('');
  const [taskAsignadoAId, setTaskAsignadoAId] = useState('');
  const [taskTitulo, setTaskTitulo] = useState('');
  const [taskDescripcion, setTaskDescripcion] = useState('');
  const [taskPrioridad, setTaskPrioridad] = useState<PrioridadTarea>(PrioridadTarea.MEDIA);
  const [taskFechaInicio, setTaskFechaInicio] = useState('');
  const [taskFechaLimite, setTaskFechaLimite] = useState('');
  const [taskNotificarEmail, setTaskNotificarEmail] = useState(true);
  const [savingTask, setSavingTask] = useState(false);

  const loadData = async () => {
    try {
      const promises: Promise<any>[] = [
        reunionesApi.getAll(),
        recordatoriosApi.getAll(),
        tareasApi.getAll(),
      ];

      if (isManagerOrHR) {
        promises.push(
          financiacionApi.getAll().catch(err => {
            console.warn('No se pudo cargar financiación', err);
            return [];
          }),
          proyectosApi.getAll().catch(() => []),
          personalApi.getAll().catch(() => [])
        );
      }

      const results = await Promise.all(promises);
      const [reunionesRes, recordatoriosRes, tareasRes] = results;
      setReuniones(Array.isArray(reunionesRes) ? reunionesRes : []);
      setRecordatorios(Array.isArray(recordatoriosRes) ? recordatoriosRes : []);
      setTareas(Array.isArray(tareasRes) ? tareasRes : []);

      if (isManagerOrHR && results.length > 3) {
        const [, , , finRes, proyRes, persRes] = results;
        setFinanciaciones(Array.isArray(finRes) ? finRes : (finRes?.results || []));
        const pList = Array.isArray(proyRes) ? proyRes : (proyRes?.results || []);
        setProyectos(pList);
        setPersonalList(Array.isArray(persRes) ? persRes : []);
      }
    } catch (error) {
      console.error('Error al cargar datos del calendario', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Group events by date key 'YYYY-MM-DD'
  const getReunionDateKey = (r: Reunion) => {
    const fStr = r.fecha_hora_inicio || r.fecha_hora;
    if (!fStr) return null;
    const d = new Date(fStr);
    if (isNaN(d.getTime())) return fStr.substring(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const reunionesByDate = useMemo(() => {
    const map: { [key: string]: Reunion[] } = {};
    reuniones.forEach(r => {
      const k = getReunionDateKey(r);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    return map;
  }, [reuniones]);

  const recordatoriosByDate = useMemo(() => {
    const map: { [key: string]: Recordatorio[] } = {};
    recordatorios.forEach(rec => {
      if (!rec.fecha) return;
      const k = rec.fecha.substring(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(rec);
    });
    return map;
  }, [recordatorios]);

  // Inicios de tareas organizados por fecha de inicio (elemento propio en el calendario)
  const tareasInicioByDate = useMemo(() => {
    const map: { [key: string]: Tarea[] } = {};
    tareas.forEach(t => {
      if (!t.fecha_inicio) return;
      const k = t.fecha_inicio.substring(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [tareas]);

  // Entregas de tareas organizadas por fecha límite
  const tareasFinByDate = useMemo(() => {
    const map: { [key: string]: Tarea[] } = {};
    tareas.forEach(t => {
      if (!t.fecha_limite) return;
      const k = t.fecha_limite.substring(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [tareas]);

  const tareasByDate = tareasFinByDate;

  // Eventos de Financiación (Acuerdos, Vencimientos de Cuotas y Entregables)
  const financiacionEventos = useMemo(() => {
    const eventos: FinanciacionEvento[] = [];
    financiaciones.forEach(f => {
      const proyNombre = f.proyecto_nombre || (typeof f.proyecto === 'object' ? (f.proyecto as any)?.nombre : undefined) || 'Proyecto';
      const empNombre = f.empresa_nombre || (typeof f.empresa === 'object' ? ((f.empresa as any)?.nombre_comercial || (f.empresa as any)?.razon_social) : undefined) || '';

      // 1. Fecha de acuerdo del plan
      if (f.fecha_acuerdo) {
        const k = f.fecha_acuerdo.substring(0, 10);
        eventos.push({
          id: `acuerdo-${f.id}`,
          financiacionId: f.id,
          proyectoId: typeof f.proyecto === 'string' ? f.proyecto : (f.proyecto as any)?.id || (f as any).proyecto_id,
          proyectoNombre: proyNombre,
          empresaNombre: empNombre,
          tipo: 'ACUERDO_FINANCIACION',
          titulo: `Acuerdo: ${proyNombre}`,
          descripcion: `Firma y pacto de financiación por un monto total de ${Number(f.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${f.moneda}.`,
          monto: Number(f.monto_total),
          moneda: f.moneda,
          fecha: k,
        });
      }

      // 2. Cuotas y cobros por entregables
      if (Array.isArray(f.cuotas)) {
        f.cuotas.forEach((c: CuotaPago, idx: number) => {
          if (c.fecha_vencimiento) {
            const k = c.fecha_vencimiento.substring(0, 10);
            const esEntregable = c.tipo_pago === 'ENTREGABLE' || !!c.entregable;
            const tituloItem = esEntregable
              ? `Cobro Entregable: ${c.entregable || c.detalle || 'Hito'}`
              : `Vencimiento Cuota #${c.numero_cuota || (idx + 1)}`;

            eventos.push({
              id: `cuota-${c.id || `${f.id}-${idx}`}`,
              financiacionId: f.id,
              proyectoId: typeof f.proyecto === 'string' ? f.proyecto : (f.proyecto as any)?.id || (f as any).proyecto_id,
              proyectoNombre: proyNombre,
              empresaNombre: empNombre,
              tipo: esEntregable ? 'VENCIMIENTO_ENTREGABLE' : 'VENCIMIENTO_CUOTA',
              titulo: tituloItem,
              descripcion: c.detalle || undefined,
              monto: Number(c.monto),
              moneda: c.moneda || f.moneda || 'ARS',
              montoUsd: c.monto_usd,
              pagoEnDolares: c.pago_en_dolares,
              estado: c.estado,
              fecha: k,
              numeroCuota: c.numero_cuota,
              entregable: c.entregable,
            });
          }
        });
      }
    });
    return eventos;
  }, [financiaciones]);

  const financiacionByDate = useMemo(() => {
    const map: { [key: string]: FinanciacionEvento[] } = {};
    financiacionEventos.forEach(ev => {
      if (!ev.fecha) return;
      const k = ev.fecha.substring(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    return map;
  }, [financiacionEventos]);

  // Estadísticas del mes actual seleccionado
  const statsMes = useMemo(() => {
    const mesPrefijo = `${year}-${String(month + 1).padStart(2, '0')}`;
    let totReuniones = 0;
    let totFinanzas = 0;
    let totTareasInicio = 0;
    let totTareasFin = 0;
    let totRecordatorios = 0;

    Object.entries(reunionesByDate).forEach(([k, list]) => {
      if (k.startsWith(mesPrefijo)) totReuniones += list.length;
    });
    Object.entries(financiacionByDate).forEach(([k, list]) => {
      if (k.startsWith(mesPrefijo)) totFinanzas += list.length;
    });
    Object.entries(tareasInicioByDate).forEach(([k, list]) => {
      if (k.startsWith(mesPrefijo)) totTareasInicio += list.length;
    });
    Object.entries(tareasFinByDate).forEach(([k, list]) => {
      if (k.startsWith(mesPrefijo)) totTareasFin += list.length;
    });
    Object.entries(recordatoriosByDate).forEach(([k, list]) => {
      if (k.startsWith(mesPrefijo)) totRecordatorios += list.length;
    });

    return { totReuniones, totFinanzas, totTareasInicio, totTareasFin, totRecordatorios };
  }, [year, month, reunionesByDate, financiacionByDate, tareasInicioByDate, tareasFinByDate, recordatoriosByDate]);

  const handleDayClick = (dayNumber: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(dayNumber).padStart(2, '0');
    const dateKey = `${year}-${mStr}-${dStr}`;

    setSelectedDateKey(dateKey);
    setActionMessage(null);

    // Default form values
    setRecTitulo('');
    setRecDescripcion('');
    setRecHora('');
    setRecPrioridad('MEDIA');
    setRecEnviarEmail(false);
    setRecEmailDestino(user?.email || '');

    setTaskProyectoId(proyectos.length > 0 ? proyectos[0].id : '');
    setTaskAsignadoAId('');
    setTaskTitulo('');
    setTaskDescripcion('');
    setTaskPrioridad(PrioridadTarea.MEDIA);
    setTaskFechaInicio('');
    setTaskFechaLimite(dateKey);
    setTaskNotificarEmail(true);

    const dayReuniones = reunionesByDate[dateKey] || [];
    const dayRecs = recordatoriosByDate[dateKey] || [];
    const dayTareasInicio = tareasInicioByDate[dateKey] || [];
    const dayTareasFin = tareasFinByDate[dateKey] || [];
    const dayFinanzas = financiacionByDate[dateKey] || [];

    if (dayReuniones.length > 0 || dayRecs.length > 0 || dayTareasInicio.length > 0 || dayTareasFin.length > 0 || dayFinanzas.length > 0) {
      setModalTab('agenda');
    } else {
      setModalTab('recordatorio');
    }

    setIsModalOpen(true);
  };

  // --- Handlers de Arrastrar y Soltar (Drag and Drop) ---
  const handleDragStart = (
    e: React.DragEvent,
    item: {
      tipo: 'reunion' | 'tarea_inicio' | 'tarea_limite' | 'recordatorio' | 'cuota';
      id: string;
      titulo: string;
      fechaOrigen: string;
      raw: any;
    }
  ) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem(item);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateKey) {
      setDragOverDate(dateKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverDate === dateKey) {
      setDragOverDate(null);
    }
  };

  const handleDropOnDate = async (e: React.DragEvent, targetDateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);

    let item = draggingItem;
    if (!item) {
      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (dataStr) item = JSON.parse(dataStr);
      } catch {}
    }
    setDraggingItem(null);

    if (!item) return;
    if (item.fechaOrigen === targetDateKey) return; // Mismo día, sin cambios

    setReprogramando(true);
    setNotificacionArrastre(null);

    try {
      if (item.tipo === 'tarea_inicio') {
        const t = item.raw as Tarea;
        let nuevoLimite: string | undefined = undefined;
        let avisoExtra = '';
        if (t.fecha_limite && targetDateKey > t.fecha_limite) {
          nuevoLimite = targetDateKey;
          avisoExtra = ' (Se ajustó también la fecha límite al mismo día)';
        }
        await tareasApi.patch(t.id, {
          fecha_inicio: targetDateKey,
          ...(nuevoLimite ? { fecha_limite: nuevoLimite } : {})
        });
        setNotificacionArrastre({
          type: 'success',
          text: `Inicio de tarea "${t.titulo}" reprogramado al ${formatDate(targetDateKey)}.${avisoExtra}`
        });
        await loadData();
      } else if (item.tipo === 'tarea_limite') {
        const t = item.raw as Tarea;
        let nuevoInicio: string | undefined = undefined;
        let avisoExtra = '';
        if (t.fecha_inicio && targetDateKey < t.fecha_inicio) {
          nuevoInicio = targetDateKey;
          avisoExtra = ' (Se ajustó también la fecha de inicio al mismo día)';
        }
        await tareasApi.patch(t.id, {
          fecha_limite: targetDateKey,
          ...(nuevoInicio ? { fecha_inicio: nuevoInicio } : {})
        });
        setNotificacionArrastre({
          type: 'success',
          text: `Fecha límite de entrega de "${t.titulo}" reprogramada al ${formatDate(targetDateKey)}.${avisoExtra}`
        });
        await loadData();
      } else if (item.tipo === 'reunion') {
        const r = item.raw as Reunion;
        const origStr = r.fecha_hora_inicio || r.fecha_hora || '';
        let timePart = '10:00:00';
        if (origStr.includes('T')) {
          timePart = origStr.split('T')[1].split('.')[0];
        } else if (origStr.includes(' ')) {
          timePart = origStr.split(' ')[1].split('.')[0];
        }
        const newInicio = `${targetDateKey}T${timePart}`;
        let newFin: string | undefined = undefined;
        if (r.fecha_hora_fin) {
          let finTime = '11:00:00';
          if (r.fecha_hora_fin.includes('T')) finTime = r.fecha_hora_fin.split('T')[1].split('.')[0];
          else if (r.fecha_hora_fin.includes(' ')) finTime = r.fecha_hora_fin.split(' ')[1].split('.')[0];
          newFin = `${targetDateKey}T${finTime}`;
        }
        await reunionesApi.patch(r.id, {
          fecha_hora_inicio: newInicio,
          ...(newFin ? { fecha_hora_fin: newFin } : {})
        });
        setNotificacionArrastre({
          type: 'success',
          text: `Reunión "${item.titulo}" reprogramada al ${formatDate(targetDateKey)} a las ${timePart.substring(0, 5)} hs.`
        });
        await loadData();
      } else if (item.tipo === 'recordatorio') {
        const rec = item.raw as Recordatorio;
        await recordatoriosApi.patch(rec.id!, {
          fecha: targetDateKey
        });
        setNotificacionArrastre({
          type: 'success',
          text: `Recordatorio "${item.titulo}" reprogramado al ${formatDate(targetDateKey)}.`
        });
        await loadData();
      } else if (item.tipo === 'cuota') {
        const fin = item.raw as FinanciacionEvento;
        const cleanId = fin.id.replace(/^cuota-/, '');
        await financiacionApi.patchCuota(cleanId, {
          fecha_vencimiento: targetDateKey
        });
        setNotificacionArrastre({
          type: 'success',
          text: `Vencimiento de cobro "${item.titulo}" reprogramado al ${formatDate(targetDateKey)}.`
        });
        await loadData();
      }
    } catch (error: any) {
      console.error('Error al mover elemento en calendario', error);
      const msg = error.response?.data?.error || error.response?.data?.detail || 'No se pudo mover el elemento a la nueva fecha.';
      setNotificacionArrastre({
        type: 'error',
        text: `Error al mover elemento: ${msg}`
      });
    } finally {
      setReprogramando(false);
    }
  };

  const handleToggleRecordatorio = async (recId?: string) => {
    if (!recId) return;
    try {
      await recordatoriosApi.toggleCompletado(recId);
      const updated = await recordatoriosApi.getAll();
      setRecordatorios(updated);
    } catch (err) {
      console.error('Error al actualizar recordatorio', err);
    }
  };

  const handleDeleteRecordatorio = async (recId?: string) => {
    if (!recId) return;
    if (!window.confirm('¿Seguro que deseas eliminar este recordatorio?')) return;
    try {
      await recordatoriosApi.delete(recId);
      const updated = await recordatoriosApi.getAll();
      setRecordatorios(updated);
    } catch (err) {
      console.error('Error al eliminar recordatorio', err);
    }
  };

  const handleGuardarRecordatorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitulo.trim() || !selectedDateKey) {
      setActionMessage({ type: 'error', text: 'El título del recordatorio es obligatorio.' });
      return;
    }

    setSavingRec(true);
    setActionMessage(null);
    try {
      const res = await recordatoriosApi.create({
        titulo: recTitulo.trim(),
        descripcion: recDescripcion.trim() || undefined,
        fecha: selectedDateKey,
        hora: recHora || null,
        prioridad: recPrioridad,
        enviar_email_futuro: recEnviarEmail,
        email_destino: recEnviarEmail ? (recEmailDestino.trim() || user?.email) : undefined,
      });

      const updatedRecs = await recordatoriosApi.getAll();
      setRecordatorios(updatedRecs);

      setRecTitulo('');
      setRecDescripcion('');
      setRecHora('');
      setRecEnviarEmail(false);

      if (res?.aviso_email) {
        setActionMessage({
          type: 'warning',
          text: res.aviso_email,
        });
      } else {
        setActionMessage({
          type: 'success',
          text: recEnviarEmail
            ? `¡Recordatorio guardado! Notificación programada para ${recEmailDestino.trim() || user?.email || 'tu casilla'}.`
            : '¡Recordatorio registrado exitosamente!',
        });
      }
      setModalTab('agenda');
    } catch (err: any) {
      console.error('Error al crear recordatorio', err);
      setActionMessage({ type: 'error', text: 'No se pudo guardar el recordatorio. Intente nuevamente.' });
    } finally {
      setSavingRec(false);
    }
  };

  const handleGuardarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitulo.trim() || !taskProyectoId || !taskAsignadoAId) {
      setActionMessage({
        type: 'error',
        text: 'Por favor complete el Proyecto, Trabajador Asignado y Título de la tarea.'
      });
      return;
    }

    if (taskFechaInicio && taskFechaLimite && taskFechaInicio > taskFechaLimite) {
      setActionMessage({
        type: 'error',
        text: 'La Fecha de Inicio no puede ser posterior a la Fecha Límite.'
      });
      return;
    }

    setSavingTask(true);
    setActionMessage(null);
    try {
      const payload: any = {
        proyecto: taskProyectoId,
        asignado_a: taskAsignadoAId,
        titulo: taskTitulo.trim(),
        descripcion: taskDescripcion.trim(),
        prioridad: taskPrioridad,
        fecha_inicio: taskFechaInicio || null,
        fecha_limite: taskFechaLimite || selectedDateKey,
        notificado_email: taskNotificarEmail,
      };

      await tareasApi.create(payload);
      const updatedTareas = await tareasApi.getAll();
      setTareas(updatedTareas);

      setTaskTitulo('');
      setTaskDescripcion('');
      setActionMessage({ type: 'success', text: '¡Tarea creada y asignada con éxito al trabajador!' });
      setModalTab('agenda');
    } catch (err: any) {
      console.error('Error al asignar tarea', err);
      setActionMessage({ type: 'error', text: 'No se pudo asignar la tarea. Verifique los campos ingresados.' });
    } finally {
      setSavingTask(false);
    }
  };

  // Format date display for modal title
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateKey) return '';
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const diaSemanaNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()];
    return `${diaSemanaNombre}, ${d} de ${MESES[m - 1]} de ${y}`;
  }, [selectedDateKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const selectedDayReuniones = selectedDateKey ? (reunionesByDate[selectedDateKey] || []) : [];
  const selectedDayFinanzas = selectedDateKey ? (financiacionByDate[selectedDateKey] || []) : [];
  const selectedDayTareasInicio = selectedDateKey ? (tareasInicioByDate[selectedDateKey] || []) : [];
  const selectedDayTareasFin = selectedDateKey ? (tareasFinByDate[selectedDateKey] || []) : [];
  const selectedDayRecordatorios = selectedDateKey ? (recordatoriosByDate[selectedDateKey] || []) : [];
  const totalEventosDia = selectedDayReuniones.length + selectedDayFinanzas.length + selectedDayTareasInicio.length + selectedDayTareasFin.length + selectedDayRecordatorios.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-primary-600 w-7 h-7" />
            Calendario de Actividades y Compromisos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManagerOrHR
              ? 'Visualización integral de reuniones, fechas y vencimientos de financiación, inicios y entregas de tareas y recordatorios. Arrastre cualquier elemento para reprogramar su fecha.'
              : 'Visualización integral de tus reuniones asignadas, inicios y entregas de tareas y recordatorios personales. Arrastre cualquier elemento para reprogramar su fecha.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={goToToday} variant="secondary" className="text-sm">
            Hoy
          </Button>
          {isManagerOrHR && (
            <Button onClick={() => navigate('/reuniones/nueva')} variant="primary" className="flex items-center gap-2">
              <Plus size={16} />
              Nueva Reunión
            </Button>
          )}
        </div>
      </div>

      {/* Notificaciones y Avisos de Arrastre */}
      {draggingItem && (
        <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>✋</span>
            <span>Arrastrando: <strong>{draggingItem.titulo}</strong></span>
            <span className="text-indigo-200 text-xs hidden sm:inline">— Suelte sobre cualquier casillero del calendario para reprogramar su fecha.</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">Modo Arrastre Activo</span>
        </div>
      )}

      {reprogramando && (
        <div className="p-3 bg-amber-500 text-white rounded-xl shadow flex items-center gap-2 text-sm font-semibold">
          <LoadingSpinner />
          <span>Reprogramando fecha en el sistema...</span>
        </div>
      )}

      {notificacionArrastre && (
        <div className={`p-3.5 rounded-xl shadow-xs border flex items-center justify-between text-sm ${
          notificacionArrastre.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : notificacionArrastre.type === 'warning'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notificacionArrastre.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{notificacionArrastre.text}</span>
          </div>
          <button
            onClick={() => setNotificacionArrastre(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Resumen mensual en tarjetas pequeñas */}
      <div className={`grid ${isManagerOrHR ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-3`}>
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
            <CalendarIcon size={20} />
          </div>
          <div>
            <div className="text-xs text-blue-700 font-medium">Reuniones ({MESES[month]})</div>
            <div className="text-lg font-bold text-blue-900">{statsMes.totReuniones}</div>
          </div>
        </div>

        {/* Inicios de Tareas */}
        <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 text-sky-700 rounded-lg">
            <Rocket size={20} />
          </div>
          <div>
            <div className="text-xs text-sky-700 font-medium">Inicios de Tareas</div>
            <div className="text-lg font-bold text-sky-900">{statsMes.totTareasInicio}</div>
          </div>
        </div>

        {/* Entregas de Tareas */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
            <CheckSquare size={20} />
          </div>
          <div>
            <div className="text-xs text-amber-700 font-medium">Entregas de Tareas</div>
            <div className="text-lg font-bold text-amber-900">{statsMes.totTareasFin}</div>
          </div>
        </div>

        {isManagerOrHR && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-xs text-emerald-700 font-medium">Finanzas & Cobros</div>
              <div className="text-lg font-bold text-emerald-900">{statsMes.totFinanzas}</div>
            </div>
          </div>
        )}

        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
            <Bell size={20} />
          </div>
          <div>
            <div className="text-xs text-purple-700 font-medium">Notas & Avisos</div>
            <div className="text-lg font-bold text-purple-900">{statsMes.totRecordatorios}</div>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="p-6 shadow-sm border border-gray-200">
        {/* Navigation & Interactive Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={prevMonth} variant="secondary" className="p-2 hover:bg-gray-100">
              <ChevronLeft size={20} />
            </Button>
            <h2 className="text-xl font-bold text-gray-800 min-w-[200px] text-center">
              {MESES[month]} {year}
            </h2>
            <Button onClick={nextMonth} variant="secondary" className="p-2 hover:bg-gray-100">
              <ChevronRight size={20} />
            </Button>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold mr-1 flex items-center gap-1">
              <Filter size={14} /> Filtros:
            </span>

            {/* Filtro: Reuniones */}
            <button
              onClick={() => setFiltros(f => ({ ...f, reuniones: !f.reuniones }))}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filtros.reuniones
                  ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
              }`}
              title="Alternar visualización de reuniones"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Reuniones</span>
            </button>

            {/* Filtro: Inicios de Tareas (Elemento propio) */}
            <button
              onClick={() => setFiltros(f => ({ ...f, tareasInicio: !f.tareasInicio }))}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filtros.tareasInicio
                  ? 'bg-sky-100 text-sky-800 border-sky-300 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
              }`}
              title="Alternar visualización de inicios planificados de tareas"
            >
              <span>🚀</span>
              <span>Inicios de Tareas</span>
            </button>

            {/* Filtro: Entregas de Tareas (Elemento propio) */}
            <button
              onClick={() => setFiltros(f => ({ ...f, tareasFin: !f.tareasFin }))}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filtros.tareasFin
                  ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
              }`}
              title="Alternar visualización de fechas límite de entrega de tareas"
            >
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>Entregas de Tareas</span>
            </button>

            {/* Filtro: Financiación */}
            {isManagerOrHR && (
              <button
                onClick={() => setFiltros(f => ({ ...f, financiacion: !f.financiacion }))}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  filtros.financiacion
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
                }`}
                title="Alternar visualización de acuerdos y cobros de financiación"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Financiación & Cobros</span>
              </button>
            )}

            {/* Filtro: Recordatorios */}
            <button
              onClick={() => setFiltros(f => ({ ...f, recordatorios: !f.recordatorios }))}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filtros.recordatorios
                  ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
              }`}
              title="Alternar visualización de notas personales"
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span>Recordatorios</span>
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DIAS_SEMANA.map((dia, idx) => (
            <div
              key={dia}
              className={`text-center font-semibold text-sm py-2 rounded ${
                idx >= 5 ? 'text-gray-400 bg-gray-50/50' : 'text-gray-700 bg-gray-50'
              }`}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Blank cells */}
          {blanks.map(blank => (
            <div
              key={`blank-${blank}`}
              className="min-h-[175px] lg:min-h-[200px] bg-gray-50/50 rounded-lg border border-dashed border-gray-200"
            />
          ))}

          {/* Days */}
          {days.map(day => {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const dateKey = `${year}-${mStr}-${dStr}`;

            const dayReuniones = filtros.reuniones ? (reunionesByDate[dateKey] || []) : [];
            const dayFinanzas = (isManagerOrHR && filtros.financiacion) ? (financiacionByDate[dateKey] || []) : [];
            const dayTareasInicio = filtros.tareasInicio ? (tareasInicioByDate[dateKey] || []) : [];
            const dayTareasFin = filtros.tareasFin ? (tareasFinByDate[dateKey] || []) : [];
            const dayRecs = filtros.recordatorios ? (recordatoriosByDate[dateKey] || []) : [];
            const totalItems = dayReuniones.length + dayFinanzas.length + dayTareasInicio.length + dayTareasFin.length + dayRecs.length;

            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            const isSelected = selectedDateKey === dateKey && isModalOpen;
            const isDragOver = dragOverDate === dateKey;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={(e) => handleDragLeave(e, dateKey)}
                onDrop={(e) => handleDropOnDate(e, dateKey)}
                className={`group min-h-[175px] lg:min-h-[200px] p-2.5 border rounded-lg cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  isDragOver
                    ? 'border-indigo-500 ring-4 ring-indigo-300 bg-indigo-50/90 shadow-lg scale-[1.02] z-10'
                    : isSelected
                    ? 'border-primary-500 ring-2 ring-primary-300 bg-primary-50/30 shadow-md'
                    : isToday
                    ? 'border-blue-400 bg-blue-50/40 shadow-xs hover:border-primary-500 hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-primary-400 hover:bg-gray-50/80 hover:shadow-xs'
                }`}
                title={draggingItem ? `Suelte aquí para mover a este día (${dateKey})` : "Haga clic para ver los compromisos del día o registrar actividades"}
              >
                {/* Day Number and Quick Action Prompt */}
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'text-gray-700 group-hover:text-primary-600'
                    }`}
                  >
                    {day}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 text-primary-500 hover:text-primary-700 transition-opacity text-xs flex items-center gap-0.5">
                    <Plus size={16} />
                  </span>
                </div>

                {/* Day Items List with Text Wrapping & Dynamic Font Sizing */}
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[155px] pr-0.5 scrollbar-thin">
                  {/* Reuniones (Arrastrables) */}
                  {dayReuniones.slice(0, 3).map(r => {
                    const fStr = r.fecha_hora_inicio || r.fecha_hora || '';
                    const timeStr = fStr ? new Date(fStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                    const titulo = r.titulo || r.motivo || 'Reunión';
                    return (
                      <div
                        key={`r-${r.id}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, {
                          tipo: 'reunion',
                          id: r.id,
                          titulo,
                          fechaOrigen: dateKey,
                          raw: r
                        })}
                        onDragEnd={handleDragEnd}
                        className="calendar-event-item px-2 py-1 bg-blue-100 text-blue-900 rounded font-medium flex items-start gap-1.5 border border-blue-200 cursor-grab active:cursor-grabbing hover:bg-blue-200 transition-all select-none shadow-2xs whitespace-normal break-words"
                        title={`Reunión: ${timeStr} - ${titulo} (Arrastre para mover de fecha)`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1"></span>
                        <span className="whitespace-normal break-words leading-tight">{timeStr ? `${timeStr} ` : ''}{titulo}</span>
                      </div>
                    );
                  })}

                  {/* Inicios de Tareas (Elemento propio en el calendario) */}
                  {dayTareasInicio.slice(0, 3).map(t => (
                    <div
                      key={`t-ini-${t.id}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, {
                        tipo: 'tarea_inicio',
                        id: t.id,
                        titulo: `Inicio: ${t.titulo}`,
                        fechaOrigen: dateKey,
                        raw: t
                      })}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => { e.stopPropagation(); navigate(`/tareas/${t.id}/editar`); }}
                      className="calendar-event-item px-2 py-1 bg-sky-100 text-sky-950 rounded font-semibold flex items-start gap-1.5 border border-sky-300 cursor-grab active:cursor-grabbing hover:bg-sky-200 transition-all select-none shadow-2xs whitespace-normal break-words"
                      title={`🚀 Inicio de Tarea: ${t.titulo} (${t.proyecto_nombre || ''}) - Arrastre para mover fecha de inicio`}
                    >
                      <span className="shrink-0 mt-0.5 leading-none">🚀</span>
                      <span className="whitespace-normal break-words leading-tight">Inicio: {t.titulo}</span>
                    </div>
                  ))}

                  {/* Entregas de Tareas (Fecha Límite) */}
                  {dayTareasFin.slice(0, 3).map(t => (
                    <div
                      key={`t-fin-${t.id}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, {
                        tipo: 'tarea_limite',
                        id: t.id,
                        titulo: `Entrega: ${t.titulo}`,
                        fechaOrigen: dateKey,
                        raw: t
                      })}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => { e.stopPropagation(); navigate(`/tareas/${t.id}/editar`); }}
                      className="calendar-event-item px-2 py-1 bg-amber-100 text-amber-950 rounded font-medium flex items-start gap-1.5 border border-amber-300 cursor-grab active:cursor-grabbing hover:bg-amber-200 transition-all select-none shadow-2xs whitespace-normal break-words"
                      title={`🏁 Entrega / Límite: ${t.titulo} (${t.proyecto_nombre || ''}) - Arrastre para mover fecha límite`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="whitespace-normal break-words leading-tight">Entrega: {t.titulo}</span>
                    </div>
                  ))}

                  {/* Financiación y Cobros */}
                  {isManagerOrHR && dayFinanzas.slice(0, 3).map(fin => {
                    const montoFormat = fin.pagoEnDolares && fin.montoUsd
                      ? `${fin.montoUsd} USD`
                      : `${Number(fin.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })} ${fin.moneda}`;
                    const esDrag = fin.tipo !== 'ACUERDO_FINANCIACION';
                    return (
                      <div
                        key={`fin-${fin.id}`}
                        draggable={esDrag}
                        onDragStart={(e) => esDrag && handleDragStart(e, {
                          tipo: 'cuota',
                          id: fin.id,
                          titulo: fin.titulo,
                          fechaOrigen: dateKey,
                          raw: fin
                        })}
                        onDragEnd={handleDragEnd}
                        className={`calendar-event-item px-2 py-1 bg-emerald-100 text-emerald-950 rounded font-medium flex items-start gap-1.5 border border-emerald-200 transition-all select-none shadow-2xs whitespace-normal break-words ${
                          esDrag ? 'cursor-grab active:cursor-grabbing hover:bg-emerald-200' : ''
                        }`}
                        title={`Financiación: ${fin.titulo} (${montoFormat}) - ${fin.proyectoNombre || ''} ${esDrag ? '(Arrastre para reprogramar cobro)' : ''}`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="whitespace-normal break-words leading-tight font-semibold">{fin.titulo}</span>
                      </div>
                    );
                  })}

                  {/* Recordatorios */}
                  {dayRecs.slice(0, 2).map(rec => (
                    <div
                      key={`rec-${rec.id}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, {
                        tipo: 'recordatorio',
                        id: rec.id!,
                        titulo: rec.titulo,
                        fechaOrigen: dateKey,
                        raw: rec
                      })}
                      onDragEnd={handleDragEnd}
                      className={`calendar-event-item px-2 py-1 rounded font-medium flex items-start gap-1.5 border cursor-grab active:cursor-grabbing hover:bg-purple-200 transition-all select-none shadow-2xs whitespace-normal break-words ${
                        rec.completado
                          ? 'bg-gray-100 text-gray-500 line-through border-gray-200'
                          : 'bg-purple-100 text-purple-950 border-purple-200'
                      }`}
                      title={`Recordatorio: ${rec.titulo} (Arrastre para mover de fecha)`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-1"></span>
                      <span className="whitespace-normal break-words leading-tight">{rec.hora ? `${rec.hora} ` : ''}{rec.titulo}</span>
                    </div>
                  ))}

                  {/* More items indicator */}
                  {totalItems > 4 && (
                    <div className="text-xs text-gray-500 font-bold text-center pt-1">
                      +{totalItems - 4} más...
                    </div>
                  )}
                </div>

                {totalItems === 0 && (
                  <div className="text-xs text-gray-400 group-hover:text-primary-500 text-center py-2 transition-colors">
                    + Registrar actividad
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Day Interactive Modal */}
      {isModalOpen && selectedDateKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  Detalles del Día
                </span>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                  <CalendarDays size={20} className="text-primary-600" />
                  {formattedSelectedDate}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-white px-6 pt-2 overflow-x-auto">
              <button
                onClick={() => { setModalTab('agenda'); setActionMessage(null); }}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                  modalTab === 'agenda'
                    ? 'border-primary-600 text-primary-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListTodo size={16} />
                Agenda y Compromisos
                {totalEventosDia > 0 && (
                  <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
                    {totalEventosDia}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setModalTab('recordatorio'); setActionMessage(null); }}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                  modalTab === 'recordatorio'
                    ? 'border-primary-600 text-primary-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell size={16} />
                Dejar Recordatorio / Nota
              </button>

              {isManagerOrHR && (
                <button
                  onClick={() => { setModalTab('tarea'); setActionMessage(null); }}
                  className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                    modalTab === 'tarea'
                      ? 'border-primary-600 text-primary-600 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Briefcase size={16} />
                  Asignar Tarea Rápida
                </button>
              )}
            </div>

            {/* Action Feedback Message */}
            {actionMessage && (
              <div
                className={`mx-6 mt-4 p-3 rounded-lg text-sm flex items-start sm:items-center gap-2 ${
                  actionMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : actionMessage.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {actionMessage.type === 'success' ? (
                  <Check size={16} className="shrink-0 mt-0.5 sm:mt-0 text-green-600" />
                ) : actionMessage.type === 'warning' ? (
                  <AlertCircle size={16} className="shrink-0 mt-0.5 sm:mt-0 text-amber-600" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 mt-0.5 sm:mt-0 text-red-600" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: AGENDA DEL DIA */}
              {modalTab === 'agenda' && (
                <div className="space-y-6">
                  {/* SECCIÓN 1: REUNIONES */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Reuniones Programadas ({selectedDayReuniones.length})
                    </h3>
                    {selectedDayReuniones.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        No hay reuniones agendadas para esta fecha.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDayReuniones.map(r => {
                          const fStr = r.fecha_hora_inicio || r.fecha_hora || '';
                          const timeStr = fStr
                            ? new Date(fStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                            : '';
                          return (
                            <div
                              key={r.id}
                              className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-blue-50 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                                    {timeStr || 'Hora a definir'}
                                  </span>
                                  <h4 className="font-bold text-gray-900 text-sm">
                                    {r.titulo || r.motivo || 'Reunión sin título'}
                                  </h4>
                                </div>
                                {r.descripcion && (
                                  <p className="text-xs text-gray-600 line-clamp-2">{r.descripcion}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                  <span>Tipo: <strong>{r.tipo_reunion}</strong></span>
                                  {r.ubicacion && <span>Lugar: <strong>{r.ubicacion}</strong></span>}
                                  {(r as any).proyecto_nombre && <span>Proyecto: <strong>{(r as any).proyecto_nombre}</strong></span>}
                                  {r.completada && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      Realizada
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={async () => {
                                    try {
                                      await reunionesApi.completar(r.id);
                                      loadData();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error || 'No se pudo actualizar el estado de la reunión');
                                    }
                                  }}
                                  className={`text-xs px-2.5 py-1 rounded border font-semibold transition cursor-pointer ${
                                    r.completada
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300'
                                  }`}
                                  title={r.completada ? 'Marcar como pendiente' : 'Marcar como realizada'}
                                >
                                  {r.completada ? '↩ Reabrir' : '✓ Realizada'}
                                </button>
                                {isManagerOrHR && (
                                  <Button
                                    onClick={() => navigate(`/reuniones/${r.id}/editar`)}
                                    variant="secondary"
                                    className="text-xs py-1 px-3"
                                  >
                                    Ver / Editar
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 2: FECHAS DE FINANCIACIÓN Y COBROS (SOLO PARA DIRECTIVOS/RRHH) */}
                  {isManagerOrHR && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Fechas de Financiación y Cobros ({selectedDayFinanzas.length})
                      </h3>
                    {selectedDayFinanzas.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        No hay compromisos financieros, vencimientos ni firmas de acuerdos programados para este día.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDayFinanzas.map(fin => {
                          const montoTexto = fin.pagoEnDolares && fin.montoUsd
                            ? `${Number(fin.montoUsd).toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD`
                            : `${Number(fin.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${fin.moneda}`;

                          const esAcuerdo = fin.tipo === 'ACUERDO_FINANCIACION';

                          return (
                            <div
                              key={fin.id}
                              className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-emerald-50 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    esAcuerdo
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-200 text-emerald-900'
                                  }`}>
                                    {esAcuerdo ? 'Firma de Acuerdo' : 'Vencimiento de Cobro'}
                                  </span>
                                  <h4 className="font-bold text-gray-900 text-sm">
                                    {fin.titulo}
                                  </h4>
                                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                                    {montoTexto}
                                  </span>
                                </div>

                                {fin.descripcion && (
                                  <p className="text-xs text-gray-600">{fin.descripcion}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-0.5">
                                  {fin.proyectoNombre && (
                                    <span className="flex items-center gap-1">
                                      <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                                      Proyecto: <strong>{fin.proyectoNombre}</strong>
                                    </span>
                                  )}
                                  {fin.empresaNombre && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                      Empresa: <strong>{fin.empresaNombre}</strong>
                                    </span>
                                  )}
                                  {fin.estado && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      fin.estado === 'PAGADO'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : fin.estado === 'VENCIDO'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      Estado: {fin.estado}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isManagerOrHR && (
                                <Button
                                  onClick={() => navigate(`/financiacion/${fin.financiacionId}/editar`)}
                                  variant="secondary"
                                  className="text-xs py-1 px-3 shrink-0"
                                >
                                  Ver Financiación
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  )}

                  {/* SECCIÓN 3: INICIOS DE TAREAS PLANIFICADOS */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                      Inicios de Tareas Planificados ({selectedDayTareasInicio.length})
                    </h3>
                    {selectedDayTareasInicio.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        No hay tareas programadas para iniciar en este día.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDayTareasInicio.map(t => (
                          <div
                            key={`inicio-${t.id}`}
                            className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-sky-50 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Rocket size={13} className="text-sky-600" /> Inicio de Tarea
                                </span>
                                <h4 className="font-bold text-gray-900 text-sm">{t.titulo}</h4>
                                {t.fecha_limite && (
                                  <span className="text-xs text-gray-500 italic">
                                    (Entrega límite: {formatDate(t.fecha_limite)})
                                  </span>
                                )}
                              </div>

                              {t.descripcion && (
                                <p className="text-xs text-gray-600 line-clamp-2">{t.descripcion}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-xs text-gray-600 font-medium">
                                  Asignado a: <strong className="text-gray-800">{t.asignado_a_nombre || 'No asignado'}</strong>
                                </span>
                                {t.proyecto_nombre && (
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                                    {t.proyecto_nombre}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${PRIORIDAD_COLORS[t.prioridad]}`}>
                                  {PRIORIDAD_LABELS[t.prioridad]}
                                </span>
                                <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold">
                                  {ESTADO_TAREA_LABELS[t.estado] || t.estado}
                                </span>
                              </div>
                            </div>

                            {isManagerOrHR ? (
                              <Button
                                onClick={() => navigate(`/tareas/${t.id}/editar`)}
                                variant="secondary"
                                className="text-xs py-1 px-3 shrink-0"
                              >
                                Ver / Editar
                              </Button>
                            ) : (
                              (t.proyecto_id || (t as any).proyecto) && (
                                <Button
                                  onClick={() => navigate(`/proyectos/${t.proyecto_id || (typeof (t as any).proyecto === 'string' ? (t as any).proyecto : (t as any).proyecto?.id)}/kanban`)}
                                  variant="secondary"
                                  className="text-xs py-1 px-3 shrink-0"
                                >
                                  Ver en Tablero
                                </Button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 4: ENTREGAS DE TAREAS (FECHA LÍMITE) */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Entregas de Tareas (Fecha Límite) ({selectedDayTareasFin.length})
                    </h3>
                    {selectedDayTareasFin.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        No hay tareas con fecha límite de entrega para este día.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDayTareasFin.map(t => (
                          <div
                            key={`fin-${t.id}`}
                            className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-amber-50 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Flag size={13} className="text-amber-600" /> Fecha Límite
                                </span>
                                <h4 className="font-bold text-gray-900 text-sm">{t.titulo}</h4>
                                {t.fecha_inicio && (
                                  <span className="text-xs text-gray-500 italic">
                                    (Inició: {formatDate(t.fecha_inicio)})
                                  </span>
                                )}
                              </div>

                              {t.descripcion && (
                                <p className="text-xs text-gray-600 line-clamp-2">{t.descripcion}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-xs text-gray-600 font-medium">
                                  Asignado a: <strong className="text-gray-800">{t.asignado_a_nombre || 'No asignado'}</strong>
                                </span>
                                {t.proyecto_nombre && (
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                                    {t.proyecto_nombre}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${PRIORIDAD_COLORS[t.prioridad]}`}>
                                  {PRIORIDAD_LABELS[t.prioridad]}
                                </span>
                                <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold">
                                  {ESTADO_TAREA_LABELS[t.estado] || t.estado}
                                </span>
                              </div>
                            </div>

                            {isManagerOrHR ? (
                              <Button
                                onClick={() => navigate(`/tareas/${t.id}/editar`)}
                                variant="secondary"
                                className="text-xs py-1 px-3 shrink-0"
                              >
                                Ver / Editar
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                {t.estado !== 'COMPLETADA' && (
                                  <Button
                                    onClick={async () => {
                                      try {
                                        await tareasApi.completar(t.id);
                                        loadData();
                                      } catch (err: any) {
                                        alert(err.response?.data?.error || 'Error al completar la tarea');
                                      }
                                    }}
                                    variant="primary"
                                    className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    ✓ Completar
                                  </Button>
                                )}
                                {(t.proyecto_id || (t as any).proyecto) && (
                                  <Button
                                    onClick={() => navigate(`/proyectos/${t.proyecto_id || (typeof (t as any).proyecto === 'string' ? (t as any).proyecto : (t as any).proyecto?.id)}/kanban`)}
                                    variant="secondary"
                                    className="text-xs py-1 px-3 shrink-0"
                                  >
                                    Ver en Tablero
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 5: RECORDATORIOS PERSONALES */}
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        Recordatorios y Notas ({selectedDayRecordatorios.length})
                      </h3>
                      <button
                        onClick={() => setModalTab('recordatorio')}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} />
                        Añadir nota
                      </button>
                    </div>

                    {selectedDayRecordatorios.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                        No hay notas ni recordatorios para este día.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDayRecordatorios.map(rec => (
                          <div
                            key={rec.id}
                            className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 transition-colors ${
                              rec.completado
                                ? 'bg-gray-50 border-gray-200 opacity-75'
                                : 'bg-purple-50/60 border-purple-200 hover:bg-purple-50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1">
                              <button
                                onClick={() => handleToggleRecordatorio(rec.id)}
                                className="mt-0.5 text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"
                                title={rec.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                              >
                                {rec.completado ? (
                                  <CheckCircle2 size={18} className="text-green-600" />
                                ) : (
                                  <Circle size={18} className="text-purple-400" />
                                )}
                              </button>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-sm font-bold ${
                                      rec.completado ? 'line-through text-gray-500' : 'text-gray-900'
                                    }`}
                                  >
                                    {rec.titulo}
                                  </span>

                                  {rec.hora && (
                                    <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                      <Clock size={12} />
                                      {rec.hora}
                                    </span>
                                  )}

                                  {rec.prioridad && (
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase ${
                                        rec.prioridad === 'URGENTE'
                                          ? 'bg-rose-100 text-rose-800'
                                          : rec.prioridad === 'ALTA'
                                          ? 'bg-red-100 text-red-700'
                                          : rec.prioridad === 'MEDIA'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {rec.prioridad}
                                    </span>
                                  )}
                                </div>

                                {rec.descripcion && (
                                  <p className="text-xs text-gray-600 whitespace-pre-line">
                                    {rec.descripcion}
                                  </p>
                                )}

                                {rec.enviar_email_futuro && (
                                  <div className="flex items-center gap-1.5 mt-2 text-xs text-purple-700 font-medium">
                                    <Mail size={13} />
                                    <span>
                                      {rec.email_enviado
                                        ? `Aviso enviado por email a ${rec.email_destino || rec.usuario_email || 'usuario'}`
                                        : `Aviso programado para enviarse por email a: ${rec.email_destino || rec.usuario_email || 'usuario'}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteRecordatorio(rec.id)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="Eliminar recordatorio"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DEJAR RECORDATORIO */}
              {modalTab === 'recordatorio' && (
                <form onSubmit={handleGuardarRecordatorio} className="space-y-4">
                  <div className="bg-purple-50/70 p-3.5 rounded-lg border border-purple-200 flex items-start gap-2.5">
                    <Bell className="text-purple-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-purple-900">
                      <strong>Nuevo Recordatorio / Nota Personal</strong>
                      <p className="mt-0.5 text-purple-700">
                        Guarda un recordatorio para el día <strong>{formattedSelectedDate}</strong> con opción a enviarte un correo electrónico a futuro.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título / Asunto del Recordatorio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recTitulo}
                      onChange={e => setRecTitulo(e.target.value)}
                      placeholder="Ej: Revisar entregable con el equipo de desarrollo"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora (Opcional)
                      </label>
                      <input
                        type="time"
                        value={recHora}
                        onChange={e => setRecHora(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={recPrioridad}
                        onChange={e => setRecPrioridad(e.target.value as any)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      >
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                        <option value="URGENTE">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción o Notas Adicionales
                    </label>
                    <textarea
                      value={recDescripcion}
                      onChange={e => setRecDescripcion(e.target.value)}
                      placeholder="Escriba los detalles o notas que desea recordar..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  {/* Future Email Notification Checkbox */}
                  <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recEnviarEmail}
                        onChange={e => {
                          const checked = e.target.checked;
                          setRecEnviarEmail(checked);
                          if (checked && !recEmailDestino) {
                            setRecEmailDestino(user?.email || '');
                          }
                        }}
                        className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                            <Mail size={15} className="text-primary-600" />
                            Enviarme una nota a mí mismo a futuro por correo electrónico
                          </span>
                          {user?.email && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-800 border border-primary-200">
                              {user.email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {user?.email ? (
                            <>
                              Se enviará automáticamente un correo a <strong>{user.email}</strong> con el recordatorio y sus detalles.
                            </>
                          ) : (
                            'Se despachará una notificación por correo electrónico con esta nota y sus detalles.'
                          )}
                        </p>
                      </div>
                    </label>

                    {recEnviarEmail && (
                      <div className="pl-7 pt-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Casilla de correo destino:
                        </label>
                        <input
                          type="email"
                          value={recEmailDestino}
                          onChange={e => setRecEmailDestino(e.target.value)}
                          placeholder={user?.email || "tu-correo@empresa.com"}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {user?.email
                            ? `Precompletado con tu dirección (${user.email}). Puedes cambiarlo si deseas recibirlo en otra casilla.`
                            : 'Ingresa la dirección donde deseas recibir el recordatorio.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setModalTab('agenda')}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingRec}
                      className="flex items-center gap-2"
                    >
                      {savingRec ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Check size={16} />
                      )}
                      Guardar Recordatorio
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: ASIGNAR TAREA RAPIDA (RRHH & GERENTE ONLY) */}
              {modalTab === 'tarea' && isManagerOrHR && (
                <form onSubmit={handleGuardarTarea} className="space-y-4">
                  <div className="bg-amber-50/80 p-3.5 rounded-lg border border-amber-200 flex items-start gap-2.5">
                    <Briefcase className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-900">
                      <strong>Asignación Rápida de Tarea (Rol: {user?.rol})</strong>
                      <p className="mt-0.5 text-amber-700">
                        Crea y asigna una tarea a un integrante del personal estableciendo como fecha límite el <strong>{formattedSelectedDate}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proyecto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={taskProyectoId}
                        onChange={e => setTaskProyectoId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                      >
                        <option value="">Seleccione un proyecto...</option>
                        {proyectos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trabajador Asignado <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={taskAsignadoAId}
                        onChange={e => setTaskAsignadoAId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                      >
                        <option value="">Seleccione al profesional...</option>
                        {personalList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} {p.apellido} ({p.cargo} - {p.rol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título de la Tarea <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={taskTitulo}
                      onChange={e => setTaskTitulo(e.target.value)}
                      placeholder="Ej: Desarrollar módulo de exportación de informes"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={taskPrioridad}
                        onChange={e => setTaskPrioridad(e.target.value as PrioridadTarea)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      >
                        <option value={PrioridadTarea.BAJA}>Baja</option>
                        <option value={PrioridadTarea.MEDIA}>Media</option>
                        <option value={PrioridadTarea.ALTA}>Alta</option>
                        <option value={PrioridadTarea.URGENTE}>Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio <span className="text-gray-400 text-xs font-normal">(Opcional / A futuro)</span>
                      </label>
                      <input
                        type="date"
                        value={taskFechaInicio}
                        onChange={e => setTaskFechaInicio(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Límite <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={taskFechaLimite}
                        onChange={e => setTaskFechaLimite(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción y Criterios de Aceptación
                    </label>
                    <textarea
                      value={taskDescripcion}
                      onChange={e => setTaskDescripcion(e.target.value)}
                      placeholder="Detalles sobre lo que se debe realizar y requerimientos técnicos..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taskNotificarEmail}
                        onChange={e => setTaskNotificarEmail(e.target.checked)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        <Mail size={15} className="text-primary-600" />
                        Notificar por correo electrónico al trabajador con archivo .ics
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setModalTab('agenda')}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingTask}
                      className="flex items-center gap-2"
                    >
                      {savingTask ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Check size={16} />
                      )}
                      Crear y Asignar Tarea
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
              <span>Haga clic fuera o en la cruz para cerrar esta ventana.</span>
              <Button
                variant="secondary"
                className="text-xs py-1 px-3"
                onClick={() => setIsModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReunionesCalendarPage;
