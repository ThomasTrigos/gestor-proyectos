import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  Lightbulb,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { healthScoreApi } from '../../api/healthScore';
import {
  HealthScoreData,
  NivelRiesgo,
  NIVEL_RIESGO_LABELS,
  ShapFactor
} from '../../types';
import { ProyectoDia0Modal } from './ProyectoDia0Modal';
import { SnapshotFormModal } from './SnapshotFormModal';

interface ProyectoHealthScoreTabProps {
  proyectoId: string;
  proyectoNombre: string;
  puedeEditar: boolean;
}

export const ProyectoHealthScoreTab: React.FC<ProyectoHealthScoreTabProps> = ({
  proyectoId,
  proyectoNombre,
  puedeEditar,
}) => {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showDia0Modal, setShowDia0Modal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await healthScoreApi.getProyectoHealthScore(proyectoId);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar la información de salud del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyectoId) {
      cargarDatos();
    }
  }, [proyectoId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Calculando Project Health Score y métricas de éxito...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-gray-900">Salud del Proyecto no Inicializada</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {error || 'Para activar el predictor de salud, configure el perfil Día 0 o registre el primer snapshot.'}
        </p>
        {puedeEditar && (
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setShowDia0Modal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Settings className="w-4 h-4" />
              Configurar Día 0
            </button>
          </div>
        )}
        <ProyectoDia0Modal
          isOpen={showDia0Modal}
          onClose={() => setShowDia0Modal(false)}
          proyectoId={proyectoId}
          onSuccess={cargarDatos}
        />
      </div>
    );
  }

  const {
    phs_actual,
    nivel_riesgo,
    tiene_dia0,
    tiene_snapshots,
    alerta_snapshot_pendiente,
    ultimo_snapshot,
    desglose_explicabilidad,
    accion_recomendada,
    historico_grafico,
  } = data;

  const score = phs_actual ?? 0;

  // Colores por nivel de riesgo
  const getBadgeRiesgo = () => {
    switch (nivel_riesgo) {
      case NivelRiesgo.SALUDABLE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case NivelRiesgo.LATENTE:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case NivelRiesgo.ACTIVO:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case NivelRiesgo.INMINENTE:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGaugeColor = () => {
    if (score >= 70) return '#10b981'; // Emerald
    if (score >= 55) return '#f59e0b'; // Amber
    if (score >= 35) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Alerta Semanal si está pendiente */}
      {alerta_snapshot_pendiente?.requiere_snapshot && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Alerta de Seguimiento Semanal
              </h4>
              <p className="text-xs text-amber-700">
                Han transcurrido {alerta_snapshot_pendiente.dias_desde_ultimo} días desde el último corte.
                Registrar un snapshot periódico mantiene actualizadas las alertas de no retorno (CSI) y fricción.
              </p>
            </div>
          </div>
          {puedeEditar && (
            <button
              onClick={() => setShowSnapshotModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Registrar Snapshot Semanal
            </button>
          )}
        </div>
      )}

      {/* Header y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              Project Health Score (PHS)
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${getBadgeRiesgo()}`}
            >
              {NIVEL_RIESGO_LABELS[nivel_riesgo] || nivel_riesgo}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Predictor de éxito de software basado en EVM, fricción con stakeholders y empoderamiento NLP
          </p>
        </div>

        <div className="flex items-center gap-2">
          {puedeEditar && (
            <>
              <button
                onClick={() => setShowDia0Modal(true)}
                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                {tiene_dia0 ? 'Ajustar Día 0' : 'Configurar Día 0'}
              </button>
              <button
                onClick={() => setShowSnapshotModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Snapshot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bloque Principal de Métricas y PHS Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Principal (Gauge / Tarjeta) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-4">
              <span>ESTADO CONSOLIDADO</span>
              <span>
                {ultimo_snapshot ? `Corte #${ultimo_snapshot.numero_corte}` : 'Línea Base Día 0'}
              </span>
            </div>

            <div className="flex items-center justify-center py-4">
              <div className="relative flex items-center justify-center">
                {/* SVG circular gauge */}
                <svg className="w-44 h-44 transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="72"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="72"
                    stroke={getGaugeColor()}
                    strokeWidth="14"
                    strokeDasharray={452.39}
                    strokeDashoffset={452.39 - (452.39 * score) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    {score}
                  </span>
                  <span className="text-xs font-bold text-gray-400">/ 100 PTS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 text-center space-y-1">
            <span className="text-xs font-medium text-gray-500">Probabilidad de Éxito:</span>
            <p className="text-sm font-bold text-gray-800">
              {score >= 70
                ? '🟢 Alta probabilidad de entrega exitosa'
                : score >= 55
                ? '🟡 Riesgo latente detectado (ajustable)'
                : score >= 35
                ? '🟠 Riesgo activo de sobrecosto o retraso'
                : '🔴 Cancelación inminente / Zona crítica'}
            </p>
          </div>
        </div>

        {/* Métricas Clave de Salud */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* CSI */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Recuperabilidad (CSI)</span>
              <Compass className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {ultimo_snapshot?.csi ?? '1.00'}
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                  (ultimo_snapshot?.csi ?? 1.0) >= 0.9
                    ? 'bg-emerald-50 text-emerald-700'
                    : (ultimo_snapshot?.csi ?? 1.0) >= 0.7
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {(ultimo_snapshot?.csi ?? 1.0) < 0.7 ? 'Punto no retorno' : (ultimo_snapshot?.csi ?? 1.0) < 0.9 ? 'Atención' : 'Recuperable'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">CPI × SPI (Eddoug et al.)</p>
          </div>

          {/* RFC */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Fricción Cliente (RFC)</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {Math.round((ultimo_snapshot?.rfc ?? 0) * 100)}%
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                  (ultimo_snapshot?.rfc ?? 0) >= 0.65
                    ? 'bg-red-50 text-red-700'
                    : (ultimo_snapshot?.rfc ?? 0) >= 0.4
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {(ultimo_snapshot?.rfc ?? 0) >= 0.65 ? 'Alerta Abandono' : 'En Rango'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Demoras atribuibles al cliente</p>
          </div>

          {/* N4 Empoderamiento */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Empoderamiento (N4)</span>
              <Award className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {Math.round((ultimo_snapshot?.n4_empoderamiento ?? 0.7) * 100)}%
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 inline-block mt-1">
                Predictor #1 Humano
              </span>
            </div>
            <p className="text-[10px] text-gray-400">β=0.663 (Ahmad et al.)</p>
          </div>

          {/* SPI */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Desempeño Tiempo (SPI)</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {ultimo_snapshot?.spi ?? '1.00'}
              </div>
              <span className="text-[11px] text-gray-500">
                {(ultimo_snapshot?.spi ?? 1.0) >= 1.0 ? 'Adelantado / A tiempo' : 'Atrasado'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">EV / PV</p>
          </div>

          {/* CPI */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Desempeño Costo (CPI)</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {ultimo_snapshot?.cpi ?? '1.00'}
              </div>
              <span className="text-[11px] text-gray-500">
                {(ultimo_snapshot?.cpi ?? 1.0) >= 1.0 ? 'En presupuesto' : 'Sobrecosto'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">EV / AC</p>
          </div>

          {/* Tareas Vencidas */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Tareas Vencidas</span>
              <AlertTriangle className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {Math.round(ultimo_snapshot?.tasa_tareas_vencidas ?? 0)}%
              </div>
              <span className="text-[11px] text-gray-500">
                {(ultimo_snapshot?.tasa_tareas_vencidas ?? 0) > 20 ? 'Riesgo operativo' : 'Normal'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Mora de tareas asignadas</p>
          </div>
        </div>
      </div>

      {/* Acción Prescriptiva Recomendada */}
      {accion_recomendada && (
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-md space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-300 shrink-0" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-indigo-200">
              Acción Recomendada (Diagnóstico Prescriptivo)
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-indigo-50 whitespace-pre-line pl-7">
            {accion_recomendada}
          </p>
        </div>
      )}

      {/* Desglose SHAP Waterfall */}
      {desglose_explicabilidad?.factores?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Desglose Explicable Atribuible (SHAP Waterfall)
            </h3>
            <span className="text-xs text-gray-400">
              Puntaje base: {desglose_explicabilidad.puntaje_base} pts → PHS Actual: {score} pts
            </span>
          </div>

          <div className="space-y-2.5">
            {desglose_explicabilidad.factores.map((f: ShapFactor, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">{f.variable}</span>
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-md">
                      {f.valor_real}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{f.explicacion}</p>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                      f.impacto > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : f.impacto < 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {f.impacto > 0 ? `+${f.impacto}` : f.impacto} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos de Evolución Histórica (Recharts) */}
      {historico_grafico && historico_grafico.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: PHS en el tiempo */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Evolución del Project Health Score (PHS)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historico_grafico}>
                  <defs>
                    <linearGradient id="phsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="phs"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#phsGradient)"
                    name="PHS (Pts)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: CSI y Fricción con Cliente */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Métricas Operativas (CSI y Fricción RFC %)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historico_grafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="csi"
                    stroke="#059669"
                    strokeWidth={2}
                    name="CSI (Recuperabilidad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rfc"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="RFC (% Culpa Cliente)"
                  />
                  <Line
                    type="monotone"
                    dataKey="n4_empoderamiento"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    name="Empoderamiento %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <ProyectoDia0Modal
        isOpen={showDia0Modal}
        onClose={() => setShowDia0Modal(false)}
        proyectoId={proyectoId}
        onSuccess={cargarDatos}
      />
      <SnapshotFormModal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        proyectoId={proyectoId}
        proyectoNombre={proyectoNombre}
        onSuccess={cargarDatos}
      />
    </div>
  );
};
