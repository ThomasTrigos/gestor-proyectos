import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import client from '../../api/client';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import {
  Proyecto, ESTADO_PROYECTO_LABELS, ESTADO_PROYECTO_COLORS,
  EstadoProyectoEnum, RolPersonal, TipoServicio, TIPO_SERVICIO_LABELS
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate, formatCurrency } from '../../utils/formatters';
import { Briefcase, Trash2, RotateCcw, AlertCircle, CheckCircle2, Layers, DollarSign, TrendingUp } from 'lucide-react';

export default function ProyectosListPage() {
  const [tabActiva, setTabActiva] = useState<'activos' | 'papelera'>('activos');
  const [accionLoading, setAccionLoading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const endpoint = tabActiva === 'papelera' ? '/proyectos/?papelera=true' : '/proyectos/';
  const { data, isLoading, refetch } = useApiQuery<any>(['proyectos', tabActiva], endpoint);
  const { data: finData, refetch: refetchFinData } = useApiQuery<any>(
    ['metricas-financieras-proyectos'],
    '/core/metricas/resumen-financiero/',
    undefined,
    { refetchOnMount: 'always', staleTime: 0 }
  );
  const { user } = useAuth();
  const isRRHH = user?.rol === RolPersonal.RRHH;

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<string>('ARS');

  const rawProyectos = getResults<Proyecto>(data);

  // Métrica 1: Estado de proyectos general (todos los proyectos)
  const resumenEstados = useMemo(() => {
    const total = rawProyectos.length;
    const conteo: Record<string, number> = {
      [EstadoProyectoEnum.OPORTUNIDAD]: 0,
      [EstadoProyectoEnum.TRABAJANDO]: 0,
      [EstadoProyectoEnum.PAUSADO]: 0,
      [EstadoProyectoEnum.SEGUIMIENTO]: 0,
      [EstadoProyectoEnum.CONCRETADO]: 0,
      [EstadoProyectoEnum.CAIDO]: 0,
    };

    rawProyectos.forEach(p => {
      const est = p.estado_actual?.estado || EstadoProyectoEnum.OPORTUNIDAD;
      if (conteo[est] !== undefined) conteo[est]++;
    });

    return { total, conteo };
  }, [rawProyectos]);

  // Métrica 2: Porcentaje de cobros en los proyectos
  const monedasDisponibles = useMemo(() => {
    if (!finData || !Array.isArray(finData) || finData.length === 0) return ['ARS'];
    return finData.map((d: any) => d.moneda);
  }, [finData]);

  const monedaActiva = monedasDisponibles.includes(monedaSeleccionada)
    ? monedaSeleccionada
    : (monedasDisponibles[0] || 'ARS');

  const metricasCobro = useMemo(() => {
    if (!finData || !Array.isArray(finData) || finData.length === 0) {
      return { totalAcordado: 0, totalCobrado: 0, totalPendiente: 0, porcentajeCobrado: 0, moneda: 'ARS' };
    }
    const itemMoneda = finData.find((d: any) => d.moneda === monedaActiva) || finData[0];
    const totalAcordado = Number(itemMoneda.total_acordado || 0);
    const totalCobrado = Number(itemMoneda.total_cobrado || 0);
    const totalPendiente = Number(itemMoneda.total_pendiente || 0);
    const divisor = totalAcordado > 0 ? totalAcordado : (totalCobrado + totalPendiente);
    const porcentajeCobrado = itemMoneda.porcentaje_cobrado !== undefined
      ? Math.round(Number(itemMoneda.porcentaje_cobrado))
      : (divisor > 0 ? Math.min(100, Math.round((totalCobrado / divisor) * 100)) : 0);

    return { totalAcordado, totalCobrado, totalPendiente, porcentajeCobrado, moneda: itemMoneda.moneda || 'ARS' };
  }, [finData, monedaActiva]);

  const proyectosFiltrados = useMemo(() => {
    return rawProyectos.filter((p: Proyecto) => {
      const coincideNombre = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.empresa_razon_social && p.empresa_razon_social.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const estadoActual = p.estado_actual?.estado || EstadoProyectoEnum.OPORTUNIDAD;
      const coincideEstado = !filtroEstado || estadoActual === filtroEstado;

      return coincideNombre && coincideEstado;
    });
  }, [rawProyectos, searchTerm, filtroEstado]);

  const sortExtractors = useMemo(() => ({
    getText: (p: Proyecto) => p.nombre,
    getEstado: (p: Proyecto) => p.estado_actual?.estado || '',
    getUpdatedAt: (p: Proyecto) => p.updated_at,
    getCreatedAt: (p: Proyecto) => p.created_at || p.fecha_inicio_estimada
  }), []);

  const { sortedItems: proyectos, sortCriterion, setSortCriterion } = useTableSort<Proyecto>(
    proyectosFiltrados,
    sortExtractors,
    'created_at_desc'
  );

  const handleHeaderSort = (key: string) => {
    if (key === 'alfabetico') {
      setSortCriterion(sortCriterion === 'alfabetico_asc' ? 'alfabetico_desc' : 'alfabetico_asc');
    } else if (key === 'estado') {
      setSortCriterion(sortCriterion === 'estado_asc' ? 'estado_desc' : 'estado_asc');
    } else if (key === 'created_at') {
      setSortCriterion(sortCriterion === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc');
    }
  };

  const getSortHeaderState = (key: string) => {
    if (key === 'alfabetico' && sortCriterion.startsWith('alfabetico')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'estado' && sortCriterion.startsWith('estado')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'created_at' && sortCriterion.startsWith('created_at')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    return { key: undefined, dir: undefined };
  };

  const currentSortHeader = getSortHeaderState(
    sortCriterion.startsWith('alfabetico') ? 'alfabetico' :
    sortCriterion.startsWith('estado') ? 'estado' :
    sortCriterion.startsWith('created_at') ? 'created_at' : ''
  );

  const handleMoverAPapelera = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas enviar el proyecto "${nombre}" a la papelera? Los integrantes y tareas quedarán ocultos temporalmente.`)) {
      return;
    }
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.delete(`/proyectos/${id}/`);
      setMensaje({ tipo: 'exito', texto: `Proyecto "${nombre}" enviado a la papelera.` });
      refetch();
      refetchFinData();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo mover a la papelera.' });
    } finally {
      setAccionLoading(null);
    }
  };

  const handleRestaurar = async (id: string, nombre: string) => {
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.post(`/proyectos/${id}/restaurar/`);
      setMensaje({ tipo: 'exito', texto: `Proyecto "${nombre}" restaurado exitosamente.` });
      refetch();
      refetchFinData();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo restaurar.' });
    } finally {
      setAccionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos de Software</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestione el ciclo de vida de los proyectos, asignaciones y avance de desarrollo.
          </p>
        </div>
        {isRRHH && (
          <Link to={`/proyectos/nuevo`}>
            <Button variant="primary">+ Nuevo Proyecto</Button>
          </Link>
        )}
      </div>

      {mensaje && (
        <div className={`p-3.5 rounded-lg text-sm flex items-center gap-2 border ${
          mensaje.tipo === 'exito'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Indicadores Visuales de Proyectos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Indicador 1: Estado General de Proyectos (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Estado de Proyectos General</h3>
                <p className="text-xs text-gray-500">Distribución de los {resumenEstados.total} proyectos en el sistema</p>
              </div>
            </div>
            {filtroEstado && (
              <button
                onClick={() => setFiltroEstado('')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                ✕ Limpiar filtro ({ESTADO_PROYECTO_LABELS[filtroEstado as EstadoProyectoEnum]})
              </button>
            )}
          </div>

          {/* Barra de Distribución Porcentual */}
          {resumenEstados.total > 0 ? (
            <div className="space-y-3">
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                {resumenEstados.conteo[EstadoProyectoEnum.TRABAJANDO] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.TRABAJANDO] / resumenEstados.total) * 100}%` }}
                    className="bg-blue-500 h-full transition-all"
                    title={`Trabajando: ${resumenEstados.conteo[EstadoProyectoEnum.TRABAJANDO]}`}
                  />
                )}
                {resumenEstados.conteo[EstadoProyectoEnum.OPORTUNIDAD] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.OPORTUNIDAD] / resumenEstados.total) * 100}%` }}
                    className="bg-purple-500 h-full transition-all"
                    title={`Oportunidad: ${resumenEstados.conteo[EstadoProyectoEnum.OPORTUNIDAD]}`}
                  />
                )}
                {resumenEstados.conteo[EstadoProyectoEnum.CONCRETADO] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.CONCRETADO] / resumenEstados.total) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Concretado: ${resumenEstados.conteo[EstadoProyectoEnum.CONCRETADO]}`}
                  />
                )}
                {resumenEstados.conteo[EstadoProyectoEnum.SEGUIMIENTO] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.SEGUIMIENTO] / resumenEstados.total) * 100}%` }}
                    className="bg-purple-500 h-full transition-all"
                    title={`Seguimiento: ${resumenEstados.conteo[EstadoProyectoEnum.SEGUIMIENTO]}`}
                  />
                )}
                {resumenEstados.conteo[EstadoProyectoEnum.PAUSADO] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.PAUSADO] / resumenEstados.total) * 100}%` }}
                    className="bg-amber-500 h-full transition-all"
                    title={`Pausado: ${resumenEstados.conteo[EstadoProyectoEnum.PAUSADO]}`}
                  />
                )}
                {resumenEstados.conteo[EstadoProyectoEnum.CAIDO] > 0 && (
                  <div
                    style={{ width: `${(resumenEstados.conteo[EstadoProyectoEnum.CAIDO] / resumenEstados.total) * 100}%` }}
                    className="bg-rose-500 h-full transition-all"
                    title={`Caído: ${resumenEstados.conteo[EstadoProyectoEnum.CAIDO]}`}
                  />
                )}
              </div>

              {/* Píldoras Interactivas por Estado */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                {[
                  { key: EstadoProyectoEnum.TRABAJANDO, label: 'Trabajando', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', dot: 'bg-blue-500' },
                  { key: EstadoProyectoEnum.OPORTUNIDAD, label: 'Oportunidad', color: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100', dot: 'bg-sky-500' },
                  { key: EstadoProyectoEnum.SEGUIMIENTO, label: 'Seguimiento', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', dot: 'bg-purple-500' },
                  { key: EstadoProyectoEnum.CONCRETADO, label: 'Concretado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', dot: 'bg-emerald-500' },
                  { key: EstadoProyectoEnum.PAUSADO, label: 'Pausado', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', dot: 'bg-amber-500' },
                  { key: EstadoProyectoEnum.CAIDO, label: 'Caído', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', dot: 'bg-rose-500' },
                ].map(item => {
                  const cant = resumenEstados.conteo[item.key] || 0;
                  const pct = resumenEstados.total > 0 ? Math.round((cant / resumenEstados.total) * 100) : 0;
                  const activo = filtroEstado === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setFiltroEstado(activo ? '' : item.key)}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                        activo ? 'ring-2 ring-indigo-500 border-indigo-400 font-bold bg-white shadow-xs' : item.color
                      }`}
                      title={`Filtrar por ${item.label}`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-bold">{cant}</span>
                        <span className="text-[10px] opacity-75">{pct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-3 italic">No hay proyectos para computar métricas.</p>
          )}
        </div>

        {/* Indicador 2: Porcentaje de Cobros en los Proyectos */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Porcentaje de Cobros</h3>
                <p className="text-xs text-gray-500">Recaudación acumulada sobre planes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {monedasDisponibles.length > 1 && (
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                  {monedasDisponibles.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonedaSeleccionada(m)}
                      className={`px-2 py-0.5 rounded-md transition-colors ${
                        monedaActiva === m ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {metricasCobro.porcentajeCobrado}% Cobrado
              </span>
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600">{metricasCobro.porcentajeCobrado}%</span>
                <span className="text-xs font-semibold text-gray-400">({metricasCobro.moneda})</span>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Meta: 100% de acuerdos
              </span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                style={{ width: `${metricasCobro.porcentajeCobrado}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Total Cobrado:</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(metricasCobro.totalCobrado, metricasCobro.moneda)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block text-[11px]">Total Pendiente:</span>
              <span className="font-bold text-amber-700">
                {formatCurrency(metricasCobro.totalPendiente, metricasCobro.moneda)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas Activos vs Papelera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTabActiva('activos')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              tabActiva === 'activos'
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Proyectos Activos</span>
          </button>
          {isRRHH && (
            <button
              onClick={() => setTabActiva('papelera')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                tabActiva === 'papelera'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Papelera de Reciclaje</span>
            </button>
          )}
        </div>

        {/* Control de Ordenamiento */}
        <TableSortControl
          value={sortCriterion}
          onChange={setSortCriterion}
          hasEstado={true}
          labelAlphabetical="Nombre de Proyecto"
        />
      </div>

      {/* Filtros y Búsqueda */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por nombre de proyecto o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            options={[
              { value: '', label: 'Todos los estados' },
              ...Object.entries(ESTADO_PROYECTO_LABELS).map(([k, v]) => ({ value: k, label: v }))
            ]}
          />
        </div>
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Table
          headers={[
            { label: 'Proyecto', sortKey: 'alfabetico' },
            'Empresa',
            { label: 'Estado Actual', sortKey: 'estado' },
            'Salud (PHS)',
            { label: 'Fecha Inicio / Registro', sortKey: 'created_at' },
            'Equipo',
            'Acciones'
          ]}
          currentSortKey={currentSortHeader.key}
          sortDirection={currentSortHeader.dir}
          onSort={handleHeaderSort}
        >
          {proyectos.length > 0 ? (
            proyectos.map((item: Proyecto) => {
              const estado = (item.estado_actual?.estado as EstadoProyectoEnum) || EstadoProyectoEnum.OPORTUNIDAD;
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/proyectos/${item.id}`} className="font-semibold text-primary-600 hover:text-primary-900">
                      {item.nombre}
                    </Link>
                    {tabActiva === 'papelera' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                        En papelera
                      </span>
                    )}
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {Array.isArray(item.tipo_servicio) && item.tipo_servicio.length > 0
                        ? item.tipo_servicio.map((s: string) => {
                            if (s === 'OTRO') {
                              return item.tipo_servicio_otro ? `Otro (${item.tipo_servicio_otro})` : 'Otro';
                            }
                            return TIPO_SERVICIO_LABELS[s as TipoServicio] || s;
                          }).join(', ')
                        : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.empresa_razon_social || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_PROYECTO_COLORS[estado]}`}>
                      {ESTADO_PROYECTO_LABELS[estado] || estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.phs_actual !== undefined && item.phs_actual !== null ? (
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                              item.phs_actual >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.phs_actual >= 55
                                ? 'bg-amber-100 text-amber-800'
                                : item.phs_actual >= 35
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.phs_actual} pts
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {item.nivel_riesgo_actual === 'SALUDABLE'
                              ? '🟢'
                              : item.nivel_riesgo_actual === 'LATENTE'
                              ? '🟡'
                              : item.nivel_riesgo_actual === 'ACTIVO'
                              ? '🟠'
                              : '🔴'}
                          </span>
                        </div>
                        {item.alerta_snapshot_pendiente?.requiere_snapshot && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            ⚠️ Snapshot pendiente
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin evaluar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{item.fecha_inicio_estimada ? formatDate(item.fecha_inicio_estimada) : '-'}</div>
                    {item.created_at && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Creado: {formatDate(item.created_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.equipo_asignaciones && item.equipo_asignaciones.length > 0
                      ? `${item.equipo_asignaciones.length} profesional(es)`
                      : 'Sin equipo'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    {tabActiva === 'activos' ? (
                      <>
                        <Link to={`/proyectos/${item.id}`} className="text-primary-600 hover:text-primary-900">
                          Ver Detalle
                        </Link>
                        {isRRHH && (
                          <>
                            <Link to={`/proyectos/${item.id}/editar`} className="text-gray-600 hover:text-gray-900">
                              Editar
                            </Link>
                            <button
                              onClick={() => handleMoverAPapelera(item.id, item.nombre)}
                              disabled={accionLoading === item.id}
                              className="text-rose-600 hover:text-rose-900 font-medium ml-2"
                              title="Mover a papelera de reciclaje"
                            >
                              {accionLoading === item.id ? 'Moviendo...' : 'Eliminar'}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      isRRHH && (
                        <button
                          onClick={() => handleRestaurar(item.id, item.nombre)}
                          disabled={accionLoading === item.id}
                          className="text-emerald-600 hover:text-emerald-900 font-medium inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {accionLoading === item.id ? 'Restaurando...' : 'Restaurar'}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                {tabActiva === 'papelera'
                  ? 'No hay proyectos en la papelera de reciclaje.'
                  : 'No se encontraron proyectos con los filtros indicados.'}
              </td>
            </tr>
          )}
        </Table>
      )}
    </div>
  );
}
