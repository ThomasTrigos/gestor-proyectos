import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Save,
  ShieldCheck,
  Calculator,
  Award,
  Layers,
  DollarSign,
  Clock,
  Users
} from 'lucide-react';
import { healthScoreApi } from '../../api/healthScore';
import {
  ProyectoDia0,
  ModalidadContratacion,
  MODALIDAD_LABELS,
  CategoriaProyecto,
  CATEGORIA_LABELS
} from '../../types';

interface ProyectoDia0ModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: string;
  onSuccess: () => void;
}

export const ProyectoDia0Modal: React.FC<ProyectoDia0ModalProps> = ({
  isOpen,
  onClose,
  proyectoId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProyectoDia0>({
    pm_experiencia_anios: 3,
    modalidad_contratacion: ModalidadContratacion.IN_HOUSE,
    categoria_proyecto: CategoriaProyecto.PRODUCTO_CORE,
    presupuesto_base: 0,
    duracion_estimada_dias: 90,
    esfuerzo_meses_persona: 3.0,
    complejidad_tecnica: 3,
    competencia_equipo_pct: 75.0,
    certeza_requerimientos: 3,
    conocimiento_sponsor: 2,
    tolerancia_desviacion_tiempo_pct: 15.0,
    tolerancia_desviacion_costo_pct: 15.0,
    certificaciones_pm: [],
    phs_inicial: 89,
  });

  useEffect(() => {
    if (!isOpen || !proyectoId) return;
    const fetchDia0 = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await healthScoreApi.getProyectoDia0(proyectoId);
        setFormData({
          pm_experiencia_anios: data.pm_experiencia_anios ?? 3,
          modalidad_contratacion: data.modalidad_contratacion || ModalidadContratacion.IN_HOUSE,
          categoria_proyecto: data.categoria_proyecto || CategoriaProyecto.PRODUCTO_CORE,
          presupuesto_base: Number(data.presupuesto_base) || 0,
          duracion_estimada_dias: data.duracion_estimada_dias || 90,
          esfuerzo_meses_persona: Number(data.esfuerzo_meses_persona) || 3.0,
          complejidad_tecnica: data.complejidad_tecnica ?? 3,
          competencia_equipo_pct: Number(data.competencia_equipo_pct) ?? 75.0,
          certeza_requerimientos: data.certeza_requerimientos ?? 3,
          conocimiento_sponsor: data.conocimiento_sponsor ?? 2,
          tolerancia_desviacion_tiempo_pct: Number(data.tolerancia_desviacion_tiempo_pct) || 15.0,
          tolerancia_desviacion_costo_pct: Number(data.tolerancia_desviacion_costo_pct) || 15.0,
          certificaciones_pm: data.certificaciones_pm || [],
          phs_inicial: data.phs_inicial ?? 89,
        });
      } catch (err: any) {
        setError('No se pudo cargar la configuración Día 0');
      } finally {
        setLoading(false);
      }
    };
    fetchDia0();
  }, [isOpen, proyectoId]);

  // Estimador local rápido en vivo
  const calcularPhsEnVivo = () => {
    let logit = 2.089;
    const z_pm = ((formData.pm_experiencia_anios || 3) - 3) / 3;
    logit += Math.min(1.5, Math.max(-1.0, z_pm * 0.45));

    if (formData.modalidad_contratacion === ModalidadContratacion.OUTSOURCED) logit += 0.4;
    else if (formData.modalidad_contratacion === ModalidadContratacion.MIXTO) logit += 0.15;

    if (formData.categoria_proyecto === CategoriaProyecto.PRODUCTO_CORE) logit += 0.15;
    else if (formData.categoria_proyecto === CategoriaProyecto.SOPORTE_INTERNO) logit += 0.25;
    else if (formData.categoria_proyecto === CategoriaProyecto.INNOVACION) logit -= 0.3;
    else if (formData.categoria_proyecto === CategoriaProyecto.TRANSVERSAL) logit -= 0.5;

    if (formData.presupuesto_base > 0) {
      const z_pres = Math.log10(Math.max(1000, formData.presupuesto_base)) - 4.5;
      logit -= Math.min(0.6, Math.max(-0.4, z_pres * 0.25));
    }

    logit += ((formData.certeza_requerimientos || 3) - 3) * 0.18;
    logit += (((formData.competencia_equipo_pct || 75) - 75) / 25) * 0.25;
    logit += ((formData.conocimiento_sponsor || 2) - 2) * 0.18;
    logit -= ((formData.complejidad_tecnica || 3) - 3) * 0.2;

    if (formData.duracion_estimada_dias > 180) logit -= 0.2;
    if (formData.duracion_estimada_dias > 365) logit -= 0.25;

    const p = 1.0 / (1.0 + Math.exp(-logit));
    return Math.round(Math.max(0.1, Math.min(0.98, p)) * 100);
  };

  const phsVivo = calcularPhsEnVivo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await healthScoreApi.saveProyectoDia0(proyectoId, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al guardar la configuración Día 0');
    } finally {
      setSaving(false);
    }
  };

  const toggleCertificacion = (cert: string) => {
    const list = formData.certificaciones_pm || [];
    if (list.includes(cert)) {
      setFormData({ ...formData, certificaciones_pm: list.filter((c) => c !== cert) });
    } else {
      setFormData({ ...formData, certificaciones_pm: [...list, cert] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Calculator className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Línea Base: Configuración Día 0</h2>
              <p className="text-xs text-indigo-200">
                Modelo predictivo a priori sustentado en literatura científica
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Gauge en vivo */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Prior Bayesiano Inicial P(Éxito)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-200/60 text-indigo-800">
                  Strang & Vajjhala + Gemino
                </span>
              </div>
              <p className="text-xs text-gray-600 max-w-md">
                Estimación de éxito estructural calculada en tiempo real según la gobernanza y recursos ingresados.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-indigo-900">
                {phsVivo} <span className="text-sm font-semibold text-indigo-600">/ 100</span>
              </div>
              <span
                className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  phsVivo >= 70
                    ? 'bg-emerald-100 text-emerald-800'
                    : phsVivo >= 55
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {phsVivo >= 70 ? '🟢 Saludable' : phsVivo >= 55 ? '🟡 Latente' : '🔴 Riesgo Alto'}
              </span>
            </div>
          </div>

          {/* Bloque 1: Gobernanza y PM */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              1. Gobernanza y Liderazgo (Predictor #1 en Literatura)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Experiencia del PM (Años)
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={formData.pm_experiencia_anios}
                  onChange={(e) =>
                    setFormData({ ...formData, pm_experiencia_anios: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-gray-500">β = −1.441 (Reduce fallo)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Modalidad de Contratación
                </label>
                <select
                  value={formData.modalidad_contratacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modalidad_contratacion: e.target.value as ModalidadContratacion,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.entries(MODALIDAD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500">Predictor #2</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Categoría del Proyecto
                </label>
                <select
                  value={formData.categoria_proyecto}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categoria_proyecto: e.target.value as CategoriaProyecto,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500">Predictor #3</span>
              </div>
            </div>
          </div>

          {/* Bloque 2: Escala y Riesgo Estructural */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              2. Dimensión y Riesgo Estructural (Gemino et al.)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Presupuesto Base Estimado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.presupuesto_base}
                    onChange={(e) =>
                      setFormData({ ...formData, presupuesto_base: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-gray-500">Mayor monto = mayor riesgo estructural</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Duración Estimada (Días)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duracion_estimada_dias}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duracion_estimada_dias: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Esfuerzo (Meses-Persona)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.esfuerzo_meses_persona}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      esfuerzo_meses_persona: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Escalas de Madurez y Conocimiento */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              3. Recursos de Conocimiento y Complejidad Técnica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700">
                    Complejidad Técnica del Stack:
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    Nivel {formData.complejidad_tecnica} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.complejidad_tecnica}
                  onChange={(e) =>
                    setFormData({ ...formData, complejidad_tecnica: parseInt(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>1: Estándar</span>
                  <span>3: Moderada</span>
                  <span>5: Muy Alta / Nueva tecnología</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700">
                    Competencia del Equipo en la Tecnología:
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    {formData.competencia_equipo_pct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={formData.competencia_equipo_pct}
                  onChange={(e) =>
                    setFormData({ ...formData, competencia_equipo_pct: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Bajo dominio</span>
                  <span>75%: Estándar</span>
                  <span>100%: Expertos senior</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700">
                    Certeza Inicial de Requerimientos:
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    Nivel {formData.certeza_requerimientos} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.certeza_requerimientos}
                  onChange={(e) =>
                    setFormData({ ...formData, certeza_requerimientos: parseInt(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>1: Ambiguos</span>
                  <span>3: Estructurados</span>
                  <span>5: Cerrados / Claros</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700">
                    Conocimiento del Sponsor en el Dominio:
                  </label>
                  <span className="text-xs font-bold text-indigo-600">
                    Nivel {formData.conocimiento_sponsor} / 3
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  value={formData.conocimiento_sponsor}
                  onChange={(e) =>
                    setFormData({ ...formData, conocimiento_sponsor: parseInt(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>1: Nulo / Delegado</span>
                  <span>2: Parcial</span>
                  <span>3: Avanzado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 4: Tolerancias contractuales y Certificaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-900">
                🎯 Definición de Éxito Pactada (Target)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tolerancia Tiempo
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.tolerancia_desviacion_tiempo_pct}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerancia_desviacion_tiempo_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-gray-500">Ej: 15%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tolerancia Costo
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.tolerancia_desviacion_costo_pct}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tolerancia_desviacion_costo_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-gray-500">Ej: 15%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-800">
                  Certificaciones del PM (Informativo)
                </h4>
                <span className="text-[10px] text-gray-500 italic">β=0 (sin sesgo)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['PMP', 'Scrum Master', 'Agile Coach', 'PRINCE2'].map((cert) => (
                  <label key={cert} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.certificaciones_pm || []).includes(cert)}
                      onChange={() => toggleCertificacion(cert)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">{cert}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Se actualizará el PHS inicial del proyecto a {phsVivo} pts.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Línea Base'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
