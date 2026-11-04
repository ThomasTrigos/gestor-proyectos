import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Tarea, PrioridadTarea, EstadoTarea, PRIORIDAD_LABELS, ESTADO_TAREA_LABELS } from '../../types';
import { getEstadoPlazo, EstadoPlazo, ESTADO_PLAZO_CONFIG } from './TableroTareas';
import { formatDate } from '../../utils/formatters';
import { 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  SlidersHorizontal, Calendar, Layers, Clock, CheckCircle2, 
  AlertTriangle, Filter, ChevronDown, ChevronUp, Sparkles, BarChart2
} from 'lucide-react';

export type TipoGrafico = 'bar' | 'line' | 'histogram' | 'pie';
export type TipoIntervalo = 'todos' | '7d' | '14d' | '30d' | 'mes' | '90d' | 'anio' | 'custom';
export type DimensionDato = 'plazo' | 'prioridad' | 'kanban' | 'evolucion' | 'responsable';

export interface ChartItem {
  name: string;
  value: number;
  cantidad?: number;
  color?: string;
  rawDate?: string;
  Creadas?: number;
  Completadas?: number;
  Límites?: number;
  Total?: number;
  Pendientes?: number;
  [key: string]: any;
}

interface GraficosTareasWidgetProps {
  tareas: Tarea[];
  hoyStr: string;
}

export const GraficosTareasWidget: React.FC<GraficosTareasWidgetProps> = ({ tareas, hoyStr }) => {
  const [abierto, setAbierto] = useState(true);
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('bar');
  const [dimension, setDimension] = useState<DimensionDato>('plazo');
  const [intervalo, setIntervalo] = useState<TipoIntervalo>('30d');
  const [fechaDesdePersonalizada, setFechaDesdePersonalizada] = useState('');
  const [fechaHastaPersonalizada, setFechaHastaPersonalizada] = useState('');

  // 1. Calcular el rango de fechas del intervalo
  const { fechaInicio, fechaFin, intervaloLabel } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (intervalo === 'todos') {
      return { fechaInicio: null, fechaFin: null, intervaloLabel: 'Todo el histórico' };
    }

    if (intervalo === 'custom') {
      const ini = fechaDesdePersonalizada ? new Date(fechaDesdePersonalizada + 'T00:00:00') : null;
      const fin = fechaHastaPersonalizada ? new Date(fechaHastaPersonalizada + 'T23:59:59') : null;
      return { 
        fechaInicio: ini, 
        fechaFin: fin, 
        intervaloLabel: `${fechaDesdePersonalizada || 'Inicio'} hasta ${fechaHastaPersonalizada || 'Hoy'}` 
      };
    }

    const ini = new Date(hoy);
    ini.setHours(0, 0, 0, 0);

    if (intervalo === '7d') {
      ini.setDate(ini.getDate() - 7);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Últimos 7 días' };
    }
    if (intervalo === '14d') {
      ini.setDate(ini.getDate() - 14);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Últimos 14 días' };
    }
    if (intervalo === '30d') {
      ini.setDate(ini.getDate() - 30);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Últimos 30 días' };
    }
    if (intervalo === 'mes') {
      ini.setDate(1);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Este mes' };
    }
    if (intervalo === '90d') {
      ini.setDate(ini.getDate() - 90);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Último trimestre (90 días)' };
    }
    if (intervalo === 'anio') {
      ini.setMonth(0, 1);
      return { fechaInicio: ini, fechaFin: hoy, intervaloLabel: 'Este año' };
    }

    return { fechaInicio: null, fechaFin: null, intervaloLabel: 'Todo' };
  }, [intervalo, fechaDesdePersonalizada, fechaHastaPersonalizada]);

  // 2. Filtrar tareas en el intervalo seleccionado
  const tareasEnIntervalo = useMemo(() => {
    if (!fechaInicio && !fechaFin) return tareas;

    return tareas.filter(t => {
      // Se evalúan las fechas clave de la tarea: fecha_limite, created_at, fecha_completada, fecha_inicio
      const dates: Date[] = [];
      if (t.fecha_limite) dates.push(new Date(t.fecha_limite));
      if (t.created_at) dates.push(new Date(t.created_at));
      if (t.fecha_completada) dates.push(new Date(t.fecha_completada));
      if (t.fecha_inicio) dates.push(new Date(t.fecha_inicio));

      if (dates.length === 0) return true;

      return dates.some(d => {
        if (fechaInicio && d < fechaInicio) return false;
        if (fechaFin && d > fechaFin) return false;
        return true;
      });
    });
  }, [tareas, fechaInicio, fechaFin]);

  // 3. Métricas rápidas de KPIs en el intervalo
  const kpis = useMemo(() => {
    const total = tareasEnIntervalo.length;
    const completadas = tareasEnIntervalo.filter(t => t.estado === 'COMPLETADA').length;
    const completadasATiempo = tareasEnIntervalo.filter(t => getEstadoPlazo(t, hoyStr) === 'TERMINADA_A_TIEMPO').length;
    const completadasDestiempo = tareasEnIntervalo.filter(t => getEstadoPlazo(t, hoyStr) === 'TERMINADA_DESTIEMPO').length;
    const atrasadas = tareasEnIntervalo.filter(t => getEstadoPlazo(t, hoyStr) === 'ATRASADA').length;
    const enProgreso = tareasEnIntervalo.filter(t => getEstadoPlazo(t, hoyStr) === 'EN_PROGRESO').length;

    const tasaCumplimiento = completadas > 0 ? Math.round((completadasATiempo / completadas) * 100) : 0;
    const tasaAtraso = total > 0 ? Math.round((atrasadas / total) * 100) : 0;

    return {
      total,
      completadas,
      completadasATiempo,
      completadasDestiempo,
      atrasadas,
      enProgreso,
      tasaCumplimiento,
      tasaAtraso
    };
  }, [tareasEnIntervalo, hoyStr]);

  // 4. Preparación de datos para cada dimensión
  const chartData: ChartItem[] = useMemo(() => {
    // Si el tipo seleccionado es Histograma, construimos la distribución de frecuencias de plazos
    if (tipoGrafico === 'histogram') {
      const bins = [
        { key: 'muy_atrasadas', name: '> 15 días atrasada', cantidad: 0, color: '#be123c' },
        { key: 'atrasadas_8_15', name: '8 a 15 días atrasada', cantidad: 0, color: '#e11d48' },
        { key: 'atrasadas_1_7', name: '1 a 7 días atrasada', cantidad: 0, color: '#f43f5e' },
        { key: 'hoy', name: 'Vence hoy', cantidad: 0, color: '#f97316' },
        { key: 'en_1_7', name: 'Próximos 1 a 7 días', cantidad: 0, color: '#3b82f6' },
        { key: 'en_8_15', name: 'Próximos 8 a 15 días', cantidad: 0, color: '#6366f1' },
        { key: 'en_16_30', name: 'Próximos 16 a 30 días', cantidad: 0, color: '#8b5cf6' },
        { key: 'mas_30', name: '> 30 días futuros', cantidad: 0, color: '#10b981' },
      ];

      const hoyTs = new Date(hoyStr).getTime();

      tareasEnIntervalo.forEach(t => {
        if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA' || !t.fecha_limite) return;
        const limTs = new Date(String(t.fecha_limite).split('T')[0]).getTime();
        const diffDias = Math.round((limTs - hoyTs) / (1000 * 60 * 60 * 24));

        if (diffDias < -15) bins[0].cantidad += 1;
        else if (diffDias >= -15 && diffDias <= -8) bins[1].cantidad += 1;
        else if (diffDias >= -7 && diffDias <= -1) bins[2].cantidad += 1;
        else if (diffDias === 0) bins[3].cantidad += 1;
        else if (diffDias >= 1 && diffDias <= 7) bins[4].cantidad += 1;
        else if (diffDias >= 8 && diffDias <= 15) bins[5].cantidad += 1;
        else if (diffDias >= 16 && diffDias <= 30) bins[6].cantidad += 1;
        else if (diffDias > 30) bins[7].cantidad += 1;
      });

      return bins.map(b => ({
        name: b.name,
        value: b.cantidad,
        cantidad: b.cantidad,
        color: b.color
      }));
    }

    // Dimensión 1: Estado según Fecha de Terminación (Plazo)
    if (dimension === 'plazo') {
      const counts: Record<EstadoPlazo, number> = {
        TERMINADA_A_TIEMPO: 0,
        TERMINADA_DESTIEMPO: 0,
        EN_PROGRESO: 0,
        ATRASADA: 0,
        CANCELADA: 0
      };

      tareasEnIntervalo.forEach(t => {
        const ep = getEstadoPlazo(t, hoyStr);
        counts[ep] = (counts[ep] || 0) + 1;
      });

      const colores: Record<EstadoPlazo, string> = {
        TERMINADA_A_TIEMPO: '#10b981',
        TERMINADA_DESTIEMPO: '#f59e0b',
        EN_PROGRESO: '#3b82f6',
        ATRASADA: '#ef4444',
        CANCELADA: '#6b7280'
      };

      return (Object.keys(counts) as EstadoPlazo[])
        .filter(k => k !== 'CANCELADA' || counts[k] > 0)
        .map(k => ({
          name: ESTADO_PLAZO_CONFIG[k].label,
          value: counts[k],
          cantidad: counts[k],
          color: colores[k]
        }));
    }

    // Dimensión 2: Nivel de Prioridad
    if (dimension === 'prioridad') {
      const prioridades: PrioridadTarea[] = [
        PrioridadTarea.URGENTE,
        PrioridadTarea.ALTA,
        PrioridadTarea.MEDIA,
        PrioridadTarea.BAJA
      ];

      const colores: Record<PrioridadTarea, string> = {
        [PrioridadTarea.URGENTE]: '#e11d48',
        [PrioridadTarea.ALTA]: '#f97316',
        [PrioridadTarea.MEDIA]: '#eab308',
        [PrioridadTarea.BAJA]: '#10b981'
      };

      return prioridades.map(p => {
        const count = tareasEnIntervalo.filter(t => t.prioridad === p).length;
        return {
          name: PRIORIDAD_LABELS[p],
          value: count,
          cantidad: count,
          color: colores[p]
        };
      });
    }

    // Dimensión 3: Estado Kanban
    if (dimension === 'kanban') {
      const cols = [
        { name: 'Backlog', color: '#64748b' },
        { name: 'Por hacer', color: '#3b82f6' },
        { name: 'En Progreso', color: '#6366f1' },
        { name: 'En Revisión', color: '#f59e0b' },
        { name: 'Completada', color: '#10b981' },
      ];

      return cols.map(c => {
        const target = c.name.toLowerCase();
        const count = tareasEnIntervalo.filter(t => {
          const colNombre = (t.columna_kanban_nombre || '').toLowerCase();
          if (colNombre) return colNombre === target;
          if (target === 'por hacer' && t.estado === 'PENDIENTE') return true;
          if (target === 'en progreso' && t.estado === 'EN_PROGRESO') return true;
          if (target === 'completada' && t.estado === 'COMPLETADA') return true;
          return false;
        }).length;

        return {
          name: c.name,
          value: count,
          cantidad: count,
          color: c.color
        };
      });
    }

    // Dimensión 4: Evolución Temporal (Agrupada por fecha)
    if (dimension === 'evolucion') {
      const dateMap: Record<string, { creadas: number; completadas: number; limites: number }> = {};

      tareasEnIntervalo.forEach(t => {
        if (t.created_at) {
          const d = String(t.created_at).split('T')[0];
          if (!dateMap[d]) dateMap[d] = { creadas: 0, completadas: 0, limites: 0 };
          dateMap[d].creadas += 1;
        }
        if (t.fecha_completada) {
          const d = String(t.fecha_completada).split('T')[0];
          if (!dateMap[d]) dateMap[d] = { creadas: 0, completadas: 0, limites: 0 };
          dateMap[d].completadas += 1;
        }
        if (t.fecha_limite) {
          const d = String(t.fecha_limite).split('T')[0];
          if (!dateMap[d]) dateMap[d] = { creadas: 0, completadas: 0, limites: 0 };
          dateMap[d].limites += 1;
        }
      });

      const sortedDates = Object.keys(dateMap).sort();
      if (sortedDates.length === 0) return [];

      return sortedDates.map(d => ({
        name: formatDate(d),
        rawDate: d,
        Creadas: dateMap[d].creadas,
        Completadas: dateMap[d].completadas,
        Límites: dateMap[d].limites,
        value: dateMap[d].completadas // para compatibilidad con pie/bar
      }));
    }

    // Dimensión 5: Carga por Responsable
    if (dimension === 'responsable') {
      const respMap: Record<string, { total: number; completadas: number; pendientes: number }> = {};

      tareasEnIntervalo.forEach(t => {
        const name = t.asignado_a_nombre || 'Sin Asignar';
        if (!respMap[name]) respMap[name] = { total: 0, completadas: 0, pendientes: 0 };
        respMap[name].total += 1;
        if (t.estado === 'COMPLETADA') {
          respMap[name].completadas += 1;
        } else {
          respMap[name].pendientes += 1;
        }
      });

      const colors = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      return Object.keys(respMap).map((name, idx) => ({
        name,
        value: respMap[name].total,
        Total: respMap[name].total,
        Completadas: respMap[name].completadas,
        Pendientes: respMap[name].pendientes,
        color: colors[idx % colors.length]
      }));
    }

    return [];
  }, [tipoGrafico, dimension, tareasEnIntervalo, hoyStr]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
      {/* Cabecera del Widget con Toggle de Contracción */}
      <div 
        onClick={() => setAbierto(!abierto)}
        className="p-4 bg-gradient-to-r from-indigo-50/70 via-white to-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">
                Métricas Gráficas y Analítica de Tareas
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-700">
                {intervaloLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Visualización estadística personalizable en tiempo real para gerencia y supervisión directiva.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-gray-400 font-medium">
            {abierto ? 'Ocultar analítica' : 'Mostrar gráficos'}
          </span>
          <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
            {abierto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="p-4 md:p-6 space-y-6">
          {/* Barra de Personalización (Presentación + Sección de Datos e Intervalo) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
            
            {/* 1. Personalización de la Presentación (Tipo de Gráfico) */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Presentación Gráfica:</span>
              </label>
              <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setTipoGrafico('bar')}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    tipoGrafico === 'bar'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Gráfico de Barras"
                >
                  <BarChart3 className="w-4 h-4 mb-0.5" />
                  <span>Barras</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoGrafico('line')}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    tipoGrafico === 'line'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Gráfico de Líneas / Tendencia"
                >
                  <LineChartIcon className="w-4 h-4 mb-0.5" />
                  <span>Líneas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoGrafico('histogram')}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    tipoGrafico === 'histogram'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Histograma de Distribución de Plazos"
                >
                  <BarChart2 className="w-4 h-4 mb-0.5" />
                  <span>Histograma</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoGrafico('pie')}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    tipoGrafico === 'pie'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Gráfico de Torta / Donut"
                >
                  <PieChartIcon className="w-4 h-4 mb-0.5" />
                  <span>Torta</span>
                </button>
              </div>
            </div>

            {/* 2. Dimensión de Datos (Variable a Analizar) */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Variable / Dimensión:</span>
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value as DimensionDato)}
                disabled={tipoGrafico === 'histogram'}
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <option value="plazo">⏱️ Estado según Fecha de Terminación (Plazos)</option>
                <option value="prioridad">🚩 Nivel de Prioridad (Urgente, Alta, Media, Baja)</option>
                <option value="kanban">📊 Estado en Tablero Kanban</option>
                <option value="evolucion">📅 Evolución Temporal (Creadas vs Completadas)</option>
                <option value="responsable">👤 Carga de Tareas por Responsable</option>
              </select>
              {tipoGrafico === 'histogram' && (
                <p className="text-[10px] text-indigo-600 italic">
                  Histograma: distribución de frecuencias por rangos de días hasta fecha límite.
                </p>
              )}
            </div>

            {/* 3. Selección de Intervalo Temporal */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Intervalo de Fechas:</span>
              </label>
              <select
                value={intervalo}
                onChange={(e) => setIntervalo(e.target.value as TipoIntervalo)}
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="30d">Últimos 30 días</option>
                <option value="7d">Últimos 7 días</option>
                <option value="14d">Últimos 14 días</option>
                <option value="mes">Este mes</option>
                <option value="90d">Último trimestre (90 días)</option>
                <option value="anio">Este año</option>
                <option value="todos">Todo el histórico</option>
                <option value="custom">Rango Personalizado...</option>
              </select>
            </div>

          </div>

          {/* Selector de Rango Personalizado si está activo */}
          {intervalo === 'custom' && (
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-indigo-900">Elegir Intervalo Personalizado:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Desde:</span>
                <input
                  type="date"
                  value={fechaDesdePersonalizada}
                  onChange={(e) => setFechaDesdePersonalizada(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Hasta:</span>
                <input
                  type="date"
                  value={fechaHastaPersonalizada}
                  onChange={(e) => setFechaHastaPersonalizada(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-xs cursor-pointer"
                />
              </div>
              {(fechaDesdePersonalizada || fechaHastaPersonalizada) && (
                <button
                  type="button"
                  onClick={() => { setFechaDesdePersonalizada(''); setFechaHastaPersonalizada(''); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Restablecer fechas
                </button>
              )}
            </div>
          )}

          {/* Tarjetas de Resumen KPI para el Intervalo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
              <span className="text-[11px] font-semibold text-gray-500 block">Total en Intervalo</span>
              <span className="text-xl font-black text-gray-900">{kpis.total}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">tareas evaluadas</span>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 block">Tasa a Tiempo</span>
              <span className="text-xl font-black text-emerald-800">{kpis.tasaCumplimiento}%</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">{kpis.completadasATiempo} a tiempo</span>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-center">
              <span className="text-[11px] font-semibold text-amber-700 block">A Destiempo</span>
              <span className="text-xl font-black text-amber-800">{kpis.completadasDestiempo}</span>
              <span className="text-[10px] text-amber-600 block mt-0.5">con retraso</span>
            </div>

            <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 text-center">
              <span className="text-[11px] font-semibold text-rose-700 block">Atrasadas Actuales</span>
              <span className="text-xl font-black text-rose-800">{kpis.atrasadas}</span>
              <span className="text-[10px] text-rose-600 block mt-0.5">{kpis.tasaAtraso}% del intervalo</span>
            </div>
          </div>

          {/* Área de Gráfico Responsivo */}
          <div className="w-full h-80 min-h-[320px] bg-white rounded-xl border border-gray-200 p-2 sm:p-4">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <BarChart3 className="w-8 h-8 text-gray-300 mb-2" />
                <span>No hay datos de tareas disponibles para el intervalo y dimensión seleccionados.</span>
              </div>
            ) : tipoGrafico === 'pie' ? (
              /* GRÁFICO DE TORTA / DONUT */
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} tareas`, name]} 
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-semibold text-gray-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : tipoGrafico === 'line' ? (
              /* GRÁFICO DE LÍNEAS / TENDENCIA */
              <ResponsiveContainer width="100%" height="100%">
                {dimension === 'evolucion' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-20} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="Creadas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Completadas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Límites" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name="Cantidad" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#6366f1' }} 
                      activeDot={{ r: 7 }} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : tipoGrafico === 'histogram' ? (
              /* HISTOGRAMA DE FRECUENCIAS */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap={3} margin={{ top: 15, right: 20, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                    angle={-25} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(val: any) => [`${val} tareas`, 'Frecuencia']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="cantidad" name="Frecuencia de Tareas" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`hist-${index}`} fill={entry.color || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              /* GRÁFICO DE BARRAS ESTÁNDAR */
              <ResponsiveContainer width="100%" height="100%">
                {dimension === 'responsable' ? (
                  <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pendientes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} tareas`, 'Total']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} 
                    />
                    <Bar dataKey="value" name="Cantidad" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`bar-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
