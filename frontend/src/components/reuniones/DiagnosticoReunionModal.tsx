import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  Calendar,
  Copy,
  Check
} from 'lucide-react';
import { DiagnosticoReunion } from '../../types';

interface DiagnosticoReunionModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostico: DiagnosticoReunion | null;
  tituloReunion?: string;
  onAplicarResumen?: (resumen: string) => void;
}

export const DiagnosticoReunionModal: React.FC<DiagnosticoReunionModalProps> = ({
  isOpen,
  onClose,
  diagnostico,
  tituloReunion = 'Reunión',
  onAplicarResumen,
}) => {
  const [copiado, setCopiado] = React.useState(false);

  if (!isOpen || !diagnostico) return null;

  const getVeredictoBadgeColor = () => {
    switch (diagnostico.calificacion) {
      case 'EXCELENTE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'BUENA':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FRICCION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CRITICA':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(diagnostico.resumen_sugerido);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">Diagnóstico de Reunión con IA</h2>
                {diagnostico.proveedor && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                    diagnostico.es_ia_remota 
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' 
                      : 'bg-white/10 text-indigo-200 border border-white/20'
                  }`}>
                    {diagnostico.proveedor}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 truncate max-w-md">
                {tituloReunion} • Análisis de transcripción y dinámica relacional
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Veredicto General */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Evaluación General
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getVeredictoBadgeColor()}`}>
                {diagnostico.veredicto}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800">
              {diagnostico.descripcion_clima}
            </p>
          </div>

          {/* Clima de Cliente y Equipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Clima del Cliente
                </span>
                <span className="text-[11px] font-semibold text-blue-700">
                  Sentimiento: {diagnostico.nlp_metricas.s_cliente > 0 ? `+${diagnostico.nlp_metricas.s_cliente}` : diagnostico.nlp_metricas.s_cliente}
                </span>
              </div>
              <p className="text-xs text-blue-950 font-medium">
                {diagnostico.diagnostico_cliente}
              </p>
            </div>

            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Dinámica del Equipo
                </span>
                <span className="text-[11px] font-semibold text-indigo-700">
                  Empoderamiento: {Math.round(diagnostico.nlp_metricas.n4_empoderamiento * 100)}%
                </span>
              </div>
              <p className="text-xs text-indigo-950 font-medium">
                {diagnostico.diagnostico_equipo}
              </p>
            </div>
          </div>

          {/* Compromisos Detectados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Compromisos y Acuerdos Detectados
            </h4>
            {diagnostico.compromisos && diagnostico.compromisos.length > 0 ? (
              <ul className="space-y-1.5">
                {diagnostico.compromisos.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-200/80 p-2.5 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">No se identificaron oraciones de compromisos con fecha explícita.</p>
            )}
          </div>

          {/* Alertas y Fricción si las hay */}
          {diagnostico.alertas && diagnostico.alertas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Puntos de Fricción / Advertencias
              </h4>
              <ul className="space-y-1.5">
                {diagnostico.alertas.map((a, i) => (
                  <li key={i} className="text-xs text-red-800 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumen Sugerido en Markdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Resumen Ejecutivo Sugerido para el Acta
              </h4>
              <button
                type="button"
                onClick={handleCopiar}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar texto'}
              </button>
            </div>
            <pre className="text-xs bg-gray-900 text-gray-100 p-3.5 rounded-xl whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
              {diagnostico.resumen_sugerido}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Diagnóstico generado automáticamente mediante modelos NLP de lenguaje natural.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Cerrar
            </button>
            {onAplicarResumen && (
              <button
                type="button"
                onClick={() => {
                  onAplicarResumen(diagnostico.resumen_sugerido);
                  onClose();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Resumen al Acta</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
