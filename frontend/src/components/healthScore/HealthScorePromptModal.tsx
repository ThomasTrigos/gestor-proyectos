import React from 'react';
import { Sparkles, Calendar, CheckSquare, Clock, ArrowRight, X } from 'lucide-react';

interface HealthScorePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proyectoNombre: string;
  motivo?: 'REUNION_COMPLETADA' | 'TAREA_ACTUALIZADA' | 'SEMANAL_PENDIENTE' | 'GENERAL';
  detalle?: string;
}

export const HealthScorePromptModal: React.FC<HealthScorePromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  proyectoNombre,
  motivo = 'GENERAL',
  detalle,
}) => {
  if (!isOpen) return null;

  const renderIcono = () => {
    switch (motivo) {
      case 'REUNION_COMPLETADA':
        return <Calendar className="w-6 h-6 text-indigo-600" />;
      case 'TAREA_ACTUALIZADA':
        return <CheckSquare className="w-6 h-6 text-emerald-600" />;
      case 'SEMANAL_PENDIENTE':
        return <Clock className="w-6 h-6 text-amber-600" />;
      default:
        return <Sparkles className="w-6 h-6 text-indigo-600" />;
    }
  };

  const renderTitulo = () => {
    switch (motivo) {
      case 'REUNION_COMPLETADA':
        return 'Reunión Finalizada: ¿Actualizar Salud del Proyecto?';
      case 'TAREA_ACTUALIZADA':
        return 'Hito o Tarea Actualizada';
      case 'SEMANAL_PENDIENTE':
        return 'Alerta Semanal: Snapshot Pendiente';
      default:
        return 'Actualización de Project Health Score';
    }
  };

  const renderMensaje = () => {
    switch (motivo) {
      case 'REUNION_COMPLETADA':
        return `Se ha marcado la reunión como completada. Puedes analizar la minuta o registrar un nuevo corte de salud para "${proyectoNombre}".`;
      case 'TAREA_ACTUALIZADA':
        return `La evolución en las tareas modifica el progreso real (Earned Value) de "${proyectoNombre}". ¿Deseas actualizar el snapshot operativo?`;
      case 'SEMANAL_PENDIENTE':
        return `Han transcurrido más de 7 días desde el último corte de seguimiento de "${proyectoNombre}". Es recomendable registrar el snapshot semanal.`;
      default:
        return `¿Deseas registrar un nuevo Snapshot periódico para evaluar el estado y riesgo de "${proyectoNombre}"?`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-3 bg-indigo-50 rounded-2xl">
            {renderIcono()}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-gray-900">{renderTitulo()}</h3>
          <p className="text-sm text-gray-600">{renderMensaje()}</p>
          {detalle && (
            <p className="text-xs text-indigo-600 font-medium bg-indigo-50/60 p-2 rounded-xl">
              {detalle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Más tarde
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <span>Registrar Snapshot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
