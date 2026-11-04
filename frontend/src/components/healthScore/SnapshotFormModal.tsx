import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageSquare,
  Users,
  Activity
} from 'lucide-react';
import { healthScoreApi } from '../../api/healthScore';
import { SnapshotSugerencias } from '../../types';

interface SnapshotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: string;
  proyectoNombre?: string;
  onSuccess: () => void;
}

export const SnapshotFormModal: React.FC<SnapshotFormModalProps> = ({
  isOpen,
  onClose,
  proyectoId,
  proyectoNombre = 'Proyecto',
  onSuccess,
}) => {
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [analyzingNlp, setAnalyzingNlp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [numeroCorte, setNumeroCorte] = useState<number>(1);
  const [fechaCorte, setFechaCorte] = useState<string>(new Date().toISOString().split('T')[0]);

  // EVM
  const [pv, setPv] = useState<number>(0);
  const [ev, setEv] = useState<number>(0);
  const [ac, setAc] = useState<number>(0);
  const [tasaTareasVencidas, setTasaTareasVencidas] = useState<number>(0);

  // Fricción
  const [reunionesPlan, setReunionesPlan] = useState<number>(1);
  const [reunionesReales, setReunionesReales] = useState<number>(1);
  const [diasRetrasoTotal, setDiasRetrasoTotal] = useState<number>(0);
  const [diasRetrasoCliente, setDiasRetrasoCliente] = useState<number>(0);
  const [canalPredominante, setCanalPredominante] = useState<string>('SINCRONICO_VIDEO');
  const [cambiosAlcance, setCambiosAlcance] = useState<number>(0);
  const [rotacionPersonal, setRotacionPersonal] = useState<number>(0);

  // NLP & Minutas
  const [archivoMinuta, setArchivoMinuta] = useState<File | null>(null);
  const [textoMinuta, setTextoMinuta] = useState<string>('');
  const [n4Empoderamiento, setN4Empoderamiento] = useState<number>(0.7);
  const [n5Claridad, setN5Claridad] = useState<number>(0.7);
  const [n6Participacion, setN6Participacion] = useState<number>(0.5);
  const [n7Tension, setN7Tension] = useState<number>(0.05);
  const [sCliente, setSCliente] = useState<number>(0.2);
  const [nlpHallazgos, setNlpHallazgos] = useState<string[]>([]);
  const [nlpProveedor, setNlpProveedor] = useState<string | null>(null);
  const [proveedorIA, setProveedorIA] = useState<string>('AUTO');

  // Precargar sugerencias automáticas al abrir
  useEffect(() => {
    if (!isOpen || !proyectoId) return;
    cargarSugerencias();
  }, [isOpen, proyectoId]);

  const cargarSugerencias = async () => {
    try {
      setLoadingSugerencias(true);
      setError(null);
      const sug: SnapshotSugerencias = await healthScoreApi.getSnapshotSugerencias(proyectoId);
      setNumeroCorte(sug.numero_corte || 1);
      setFechaCorte(sug.fecha_corte || new Date().toISOString().split('T')[0]);
      setPv(sug.pv || 0);
      setEv(sug.ev || 0);
      setAc(sug.ac || 0);
      setTasaTareasVencidas(sug.tasa_tareas_vencidas || 0);
      setReunionesPlan(sug.reuniones_planificadas || 1);
      setReunionesReales(sug.reuniones_reales || 1);
      setDiasRetrasoTotal(sug.dias_retraso_total || 0);
      setDiasRetrasoCliente(sug.dias_retraso_cliente || 0);
      setCanalPredominante(sug.canal_predominante || 'SINCRONICO_VIDEO');
      setCambiosAlcance(sug.cambios_alcance_periodo || 0);
      setRotacionPersonal(sug.rotacion_personal_clave || 0);
      setN4Empoderamiento(sug.n4_empoderamiento ?? 0.7);
      setN5Claridad(sug.n5_claridad_hitos ?? 0.7);
      setN6Participacion(sug.n6_participacion_cliente ?? 0.5);
      setN7Tension(sug.n7_tension ?? 0.05);
      setSCliente(sug.s_cliente ?? 0.2);
    } catch (err) {
      // Ignorar fallback silencioso
    } finally {
      setLoadingSugerencias(false);
    }
  };

  const handleAnalizarMinuta = async () => {
    if (!archivoMinuta && !textoMinuta.trim()) {
      setError('Cargue un archivo (.txt, .pdf, .docx) o ingrese texto para analizar con NLP.');
      return;
    }
    try {
      setAnalyzingNlp(true);
      setError(null);
      const res = await healthScoreApi.analizarMinuta(archivoMinuta, textoMinuta, proveedorIA);
      const dataNlp = res?.nlp || res?.analisis;
      if (dataNlp) {
        setN4Empoderamiento(dataNlp.n4_empoderamiento);
        setN5Claridad(dataNlp.n5_claridad_hitos);
        setN6Participacion(dataNlp.n6_participacion_cliente);
        setN7Tension(dataNlp.n7_tension);
        setSCliente(dataNlp.s_cliente);
        setNlpHallazgos(dataNlp.resumen_hallazgos || []);
        setNlpProveedor(res.proveedor || dataNlp.proveedor || null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al procesar la minuta con NLP.');
    } finally {
      setAnalyzingNlp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('numero_corte', String(numeroCorte));
      formData.append('fecha_corte', fechaCorte);
      formData.append('pv', String(pv));
      formData.append('ev', String(ev));
      formData.append('ac', String(ac));
      formData.append('tasa_tareas_vencidas', String(tasaTareasVencidas));
      formData.append('reuniones_planificadas', String(reunionesPlan));
      formData.append('reuniones_reales', String(reunionesReales));
      formData.append('dias_retraso_total', String(diasRetrasoTotal));
      formData.append('dias_retraso_cliente', String(diasRetrasoCliente));
      formData.append('canal_predominante', canalPredominante);
      formData.append('cambios_alcance_periodo', String(cambiosAlcance));
      formData.append('rotacion_personal_clave', String(rotacionPersonal));
      formData.append('n4_empoderamiento', String(n4Empoderamiento));
      formData.append('n5_claridad_hitos', String(n5Claridad));
      formData.append('n6_participacion_cliente', String(n6Participacion));
      formData.append('n7_tension', String(n7Tension));
      formData.append('s_cliente', String(sCliente));

      if (textoMinuta.trim()) {
        formData.append('texto_minuta', textoMinuta);
      }
      if (archivoMinuta) {
        formData.append('archivo_minuta', archivoMinuta);
      }

      await healthScoreApi.createProyectoSnapshot(proyectoId, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al registrar el snapshot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const rfcCalculado = diasRetrasoTotal > 0 ? (diasRetrasoCliente / diasRetrasoTotal) * 100 : 0;
  const spiEstimado = pv > 0 ? (ev / pv).toFixed(2) : '1.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Activity className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Nuevo Snapshot Periódico — Corte #{numeroCorte}
              </h2>
              <p className="text-xs text-indigo-200">
                {proyectoNombre} • Evaluación de salud operativa, fricción y señales humanas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Barra de autofill con datos del sistema */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-900 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Precarga inteligente:</strong> El sistema calcula automáticamente el EV por tareas, el PV por cronograma y reuniones realizadas.
              </span>
            </div>
            <button
              type="button"
              onClick={cargarSugerencias}
              disabled={loadingSugerencias}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingSugerencias ? 'Calculando...' : 'Recalcular con Datos Actuales'}
            </button>
          </div>

          {/* Bloque 1: Datos Generales del Corte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Número de Corte / Snapshot
              </label>
              <input
                type="number"
                min="1"
                value={numeroCorte}
                onChange={(e) => setNumeroCorte(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Fecha del Corte
              </label>
              <input
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Bloque 2: Métricas Operativas EVM */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Métricas EVM (Earned Value Management)
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                SPI Estimado: {spiEstimado}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  PV: Planificado (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={pv}
                  onChange={(e) => setPv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
                <span className="text-[10px] text-gray-500">Avance esperado a hoy</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  EV: Completado Real (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={ev}
                  onChange={(e) => setEv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
                <span className="text-[10px] text-gray-500">Avance real medido</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  AC: Costo Real / Pagado ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ac}
                  onChange={(e) => setAc(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <span className="text-[10px] text-gray-500">Gasto o cuotas pagadas</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tasa Tareas Vencidas (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={tasaTareasVencidas}
                  onChange={(e) => setTasaTareasVencidas(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <span className="text-[10px] text-gray-500">Tareas en mora vs total</span>
              </div>
            </div>
          </div>

          {/* Bloque 3: Fricción y Stakeholders */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Fricción, Comunicación y Desviaciones
              </h3>
              {diasRetrasoTotal > 0 && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    rfcCalculado >= 65
                      ? 'bg-red-100 text-red-800'
                      : rfcCalculado >= 40
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  RFC: {rfcCalculado.toFixed(0)}% culpa del cliente
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reuniones Planificadas
                </label>
                <input
                  type="number"
                  min="1"
                  value={reunionesPlan}
                  onChange={(e) => setReunionesPlan(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reuniones Reales Realizadas
                </label>
                <input
                  type="number"
                  min="0"
                  value={reunionesReales}
                  onChange={(e) => setReunionesReales(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Canal Predominante
                </label>
                <select
                  value={canalPredominante}
                  onChange={(e) => setCanalPredominante(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="SINCRONICO_VIDEO">Sincrónico Video (Meet / Zoom)</option>
                  <option value="SINCRONICO_AUDIO">Sincrónico Audio / Llamada</option>
                  <option value="ASINCRONICO_CHAT">Asincrónico Chat (Slack / Teams)</option>
                  <option value="ASINCRONICO_EMAIL">Asincrónico Email</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Días de Retraso Total Acumulado
                </label>
                <input
                  type="number"
                  min="0"
                  value={diasRetrasoTotal}
                  onChange={(e) => setDiasRetrasoTotal(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Días Retraso Atribuibles al Cliente
                </label>
                <input
                  type="number"
                  min="0"
                  max={diasRetrasoTotal || 365}
                  value={diasRetrasoCliente}
                  onChange={(e) => setDiasRetrasoCliente(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
                <span className="text-[10px] text-gray-500">Demora en aprobaciones / feedback</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cambios de Alcance en el Período
                </label>
                <input
                  type="number"
                  min="0"
                  value={cambiosAlcance}
                  onChange={(e) => setCambiosAlcance(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Bloque 4: Señales Humanas y Evaluación de Reuniones */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-4">
            {/* Opción 1: Calificación Manual Directa (Sin IA) */}
            <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">
                  ¿Cómo fue la última reunión / período? (Calificación Manual Directa sin IA)
                </span>
                <span className="text-[10px] text-gray-400">Click para auto-ajustar señales</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: '🟢 Muy Fructífera', sub: 'Autonomía alta / sin tensión', n4: 0.85, n6: 0.8, n7: 0.0, s: 0.5, n5: 0.85 },
                  { label: '🔵 Constructiva', sub: 'Normal / colaborativa', n4: 0.7, n6: 0.55, n7: 0.05, s: 0.2, n5: 0.7 },
                  { label: '🟡 Con Fricción', sub: 'Dudas / bloqueos leves', n4: 0.45, n6: 0.4, n7: 0.25, s: -0.15, n5: 0.5 },
                  { label: '🔴 Tensa / Bloqueada', sub: 'Desacuerdos / reclamos', n4: 0.25, n6: 0.25, n7: 0.55, s: -0.6, n5: 0.35 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setN4Empoderamiento(preset.n4);
                      setN6Participacion(preset.n6);
                      setN7Tension(preset.n7);
                      setSCliente(preset.s);
                      setN5Claridad(preset.n5);
                    }}
                    className="p-2 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-left transition-all cursor-pointer text-xs group"
                  >
                    <span className="font-bold text-gray-800 group-hover:text-indigo-900 block truncate">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate">
                      {preset.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Opcional: Adjuntar Transcripción para Análisis Asistido por IA
                </h3>
                <p className="text-[11px] text-gray-500">
                  Puede subir un archivo (.txt, .pdf, .docx) o pegar la minuta para procesar automáticamente
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={proveedorIA}
                  onChange={(e) => setProveedorIA(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-indigo-200 rounded-xl bg-white text-indigo-950 font-semibold focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  title="Selecciona la IA que procesará la minuta"
                >
                  <option value="AUTO">✨ Auto (Predeterminado)</option>
                  <option value="GEMINI">Google Gemini</option>
                  <option value="GROK">xAI Grok</option>
                  <option value="CLAUDE">Anthropic Claude</option>
                  <option value="OPENAI">OpenAI (GPT)</option>
                  <option value="LOCAL">Motor Local (Offline)</option>
                </select>

                <button
                  type="button"
                  onClick={handleAnalizarMinuta}
                  disabled={analyzingNlp}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {analyzingNlp ? 'Analizando...' : 'Analizar Minuta'}
                </button>
              </div>
            </div>

            {/* Subida de archivo / textarea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adjuntar Archivo Externo (.pdf, .docx, .txt)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-indigo-400 transition-colors bg-white">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setArchivoMinuta(e.target.files?.[0] || null)}
                    className="hidden"
                    id="archivo-minuta-upload"
                  />
                  <label htmlFor="archivo-minuta-upload" className="cursor-pointer block">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-xs text-indigo-600 font-semibold">
                      {archivoMinuta ? archivoMinuta.name : 'Seleccionar archivo del equipo'}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX o TXT</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  O pegar texto de la minuta / transcripción
                </label>
                <textarea
                  rows={3}
                  value={textoMinuta}
                  onChange={(e) => setTextoMinuta(e.target.value)}
                  placeholder="Ej: En la reunión acordamos los hitos... el cliente validó la entrega..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Hallazgos NLP si existen */}
            {nlpHallazgos.length > 0 && (
              <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 block">
                    Hallazgos Detectados por IA / NLP:
                  </span>
                  {nlpProveedor && (
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {nlpProveedor}
                    </span>
                  )}
                </div>
                <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                  {nlpHallazgos.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sliders de ajuste de señales humanas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Empoderamiento (N4):</span>
                  <span className="font-bold text-indigo-600">{Math.round(n4Empoderamiento * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={n4Empoderamiento}
                  onChange={(e) => setN4Empoderamiento(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-gray-400 block">β=0.663 (Resolución vs permiso)</span>
              </div>

              <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Participación Cliente (N6):</span>
                  <span className="font-bold text-indigo-600">{Math.round(n6Participacion * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={n6Participacion}
                  onChange={(e) => setN6Participacion(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[10px] text-gray-400 block">Aporte constructivo del sponsor</span>
              </div>

              <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Índice Tensión (N7):</span>
                  <span className={`font-bold ${n7Tension > 0.2 ? 'text-red-600' : 'text-gray-600'}`}>
                    {Math.round(n7Tension * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={n7Tension}
                  onChange={(e) => setN7Tension(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
                <span className="text-[10px] text-gray-400 block">Léxico de conflicto o penalización</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Se generará el reporte explicable y recomendaciones prescriptivas automáticas.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Procesando...' : 'Calcular & Guardar Snapshot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
