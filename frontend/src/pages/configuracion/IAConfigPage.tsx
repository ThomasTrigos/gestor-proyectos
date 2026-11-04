import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ExternalLink,
  Star,
  Check,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { aiConfigApi } from '../../api/aiConfig';
import {
  ConfiguracionIA,
  EstadoConfiguracionIA,
  ProveedorIA
} from '../../types';

interface ProviderMeta {
  codigo: ProveedorIA;
  nombre: string;
  compania: string;
  colorGradiente: string;
  badgeBg: string;
  icon: React.ReactNode;
  modelosSugeridos: string[];
  linkDoc: string;
  helpTexto: string;
}

const METADATA_PROVEEDORES: Record<ProveedorIA, ProviderMeta> = {
  GEMINI: {
    codigo: 'GEMINI',
    nombre: 'Google Gemini',
    compania: 'Google DeepMind',
    colorGradiente: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Sparkles className="w-5 h-5 text-blue-500" />,
    modelosSugeridos: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    linkDoc: 'https://aistudio.google.com/app/apikey',
    helpTexto: 'Obtén tu API key gratuita o de pago en Google AI Studio. Modelo recomendado: gemini-1.5-flash.'
  },
  GROK: {
    codigo: 'GROK',
    nombre: 'xAI Grok',
    compania: 'xAI',
    colorGradiente: 'from-zinc-800 to-black',
    badgeBg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    modelosSugeridos: ['grok-2-latest', 'grok-2', 'grok-beta'],
    linkDoc: 'https://x.ai/api',
    helpTexto: 'Crea tu API Key en la consola de desarrolladores de xAI. Soporta modelos Grok 2 y Grok Beta.'
  },
  CLAUDE: {
    codigo: 'CLAUDE',
    nombre: 'Anthropic Claude',
    compania: 'Anthropic',
    colorGradiente: 'from-amber-600 to-orange-700',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <Brain className="w-5 h-5 text-orange-500" />,
    modelosSugeridos: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    linkDoc: 'https://console.anthropic.com/settings/keys',
    helpTexto: 'Obtén tu API key en Anthropic Console. Excelente capacidad de síntesis con Claude 3.5 Sonnet.'
  },
  OPENAI: {
    codigo: 'OPENAI',
    nombre: 'OpenAI (GPT)',
    compania: 'OpenAI',
    colorGradiente: 'from-emerald-600 to-teal-800',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Bot className="w-5 h-5 text-emerald-500" />,
    modelosSugeridos: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    linkDoc: 'https://platform.openai.com/api-keys',
    helpTexto: 'Genera tu Secret Key en el panel de OpenAI. Modelo recomendado para velocidad y costo: gpt-4o-mini.'
  },
  LOCAL: {
    codigo: 'LOCAL',
    nombre: 'Motor Heurístico Local',
    compania: 'Integrado / Offline',
    colorGradiente: 'from-gray-700 to-slate-900',
    badgeBg: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: <Cpu className="w-5 h-5 text-gray-500" />,
    modelosSugeridos: ['local-nlp-v1'],
    linkDoc: '#',
    helpTexto: 'Motor local basado en reglas léxicas y regex. No requiere internet ni API Keys.'
  }
};

export const IAConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<EstadoConfiguracionIA | null>(null);
  const [configsBD, setConfigsBD] = useState<ConfiguracionIA[]>([]);

  // Formularios locales por proveedor
  const [formKeys, setFormKeys] = useState<Record<ProveedorIA, string>>({
    GEMINI: '',
    GROK: '',
    CLAUDE: '',
    OPENAI: '',
    LOCAL: ''
  });

  const [formModelos, setFormModelos] = useState<Record<ProveedorIA, string>>({
    GEMINI: 'gemini-1.5-flash',
    GROK: 'grok-2-latest',
    CLAUDE: 'claude-3-5-sonnet-20241022',
    OPENAI: 'gpt-4o-mini',
    LOCAL: 'local-nlp-v1'
  });

  const [mostrarKey, setMostrarKey] = useState<Record<ProveedorIA, boolean>>({
    GEMINI: false,
    GROK: false,
    CLAUDE: false,
    OPENAI: false,
    LOCAL: false
  });

  const [guardando, setGuardando] = useState<ProveedorIA | null>(null);
  const [probando, setProbando] = useState<ProveedorIA | null>(null);
  const [testResultados, setTestResultados] = useState<Record<ProveedorIA, { ok: boolean; mensaje: string } | null>>({
    GEMINI: null,
    GROK: null,
    CLAUDE: null,
    OPENAI: null,
    LOCAL: null
  });

  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [estRes, listRes] = await Promise.all([
        aiConfigApi.getProveedores(),
        aiConfigApi.getAll()
      ]);

      setEstado(estRes);
      setConfigsBD(listRes);

      // Precargar modelos configurados en los estados del formulario
      const nuevosModelos = { ...formModelos };
      listRes.forEach((c) => {
        if (c.proveedor in nuevosModelos && c.modelo) {
          nuevosModelos[c.proveedor] = c.modelo;
        }
      });
      setFormModelos(nuevosModelos);
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: err?.response?.data?.error || 'Error al cargar la configuración de Inteligencia Artificial.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (prov: ProveedorIA) => {
    const key = formKeys[prov]?.trim();
    const modelo = formModelos[prov]?.trim() || METADATA_PROVEEDORES[prov].modelosSugeridos[0];

    const existente = configsBD.find((c) => c.proveedor === prov);

    if (!key && !existente?.tiene_api_key) {
      alert(`Por favor ingrese la API Key para ${METADATA_PROVEEDORES[prov].nombre}.`);
      return;
    }

    try {
      setGuardando(prov);
      setMensajeGlobal(null);

      const payload: Partial<ConfiguracionIA> = {
        proveedor: prov,
        modelo: modelo,
        activo: true
      };

      if (key) {
        payload.api_key = key;
      }

      if (existente) {
        payload.id = existente.id;
      }

      await aiConfigApi.guardar(payload);
      setMensajeGlobal({
        tipo: 'exito',
        texto: `Configuración de ${METADATA_PROVEEDORES[prov].nombre} guardada exitosamente.`
      });

      // Limpiar input de texto plano por seguridad
      setFormKeys((prev) => ({ ...prev, [prov]: '' }));
      await cargarDatos();
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: err?.response?.data?.error || `Error al guardar ${METADATA_PROVEEDORES[prov].nombre}.`
      });
    } finally {
      setGuardando(null);
    }
  };

  const handleProbar = async (prov: ProveedorIA) => {
    const key = formKeys[prov]?.trim();
    const modelo = formModelos[prov]?.trim() || METADATA_PROVEEDORES[prov].modelosSugeridos[0];
    const existente = configsBD.find((c) => c.proveedor === prov);

    try {
      setProbando(prov);
      setTestResultados((prev) => ({ ...prev, [prov]: null }));

      const res = await aiConfigApi.probar({
        proveedor: prov,
        api_key: key || undefined,
        modelo: modelo,
        id: !key && existente ? existente.id : undefined
      });

      if (res.ok) {
        setTestResultados((prev) => ({
          ...prev,
          [prov]: {
            ok: true,
            mensaje: res.mensaje || `Conexión exitosa (${res.latencia_ms}ms).`
          }
        }));
      } else {
        setTestResultados((prev) => ({
          ...prev,
          [prov]: {
            ok: false,
            mensaje: res.error || 'La prueba de conexión falló.'
          }
        }));
      }
    } catch (err: any) {
      setTestResultados((prev) => ({
        ...prev,
        [prov]: {
          ok: false,
          mensaje: err?.response?.data?.error || 'Error al conectar con la API de IA.'
        }
      }));
    } finally {
      setProbando(null);
    }
  };

  const handleEstablecerPredeterminado = async (prov: ProveedorIA) => {
    const existente = configsBD.find((c) => c.proveedor === prov);
    if (!existente) {
      alert(`Primero debes guardar una API Key para ${METADATA_PROVEEDORES[prov].nombre}.`);
      return;
    }

    try {
      setGuardando(prov);
      await aiConfigApi.establecerPredeterminado(existente.id);
      setMensajeGlobal({
        tipo: 'exito',
        texto: `${METADATA_PROVEEDORES[prov].nombre} establecido como motor predeterminado.`
      });
      await cargarDatos();
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: err?.response?.data?.error || 'Error al cambiar proveedor predeterminado.'
      });
    } finally {
      setGuardando(null);
    }
  };

  const handleEliminar = async (id: string, prov: ProveedorIA) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la clave guardada para ${METADATA_PROVEEDORES[prov].nombre}?`)) {
      return;
    }
    try {
      setGuardando(prov);
      await aiConfigApi.eliminar(id);
      setMensajeGlobal({
        tipo: 'exito',
        texto: `Credencial de ${METADATA_PROVEEDORES[prov].nombre} eliminada de la base de datos.`
      });
      await cargarDatos();
    } catch (err: any) {
      setMensajeGlobal({
        tipo: 'error',
        texto: err?.response?.data?.error || 'Error al eliminar la credencial.'
      });
    } finally {
      setGuardando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm font-medium text-gray-600">Cargando proveedores de Inteligencia Artificial...</p>
      </div>
    );
  }

  const proveedoresPrincipales: ProveedorIA[] = ['GEMINI', 'GROK', 'CLAUDE', 'OPENAI'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado y Resumen del Estado */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-300" />
              <h2 className="text-xl font-bold">Motores de Inteligencia Artificial</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/20">
                Multi-Provider
              </span>
            </div>
            <p className="text-xs text-indigo-200 max-w-2xl">
              Carga y administra las APIs de <strong>Gemini</strong>, <strong>Grok</strong>, <strong>Claude</strong> y <strong>OpenAI</strong> para el diagnóstico automático de minutas, transcripciones de reuniones y predicción de éxito de proyectos.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[240px]">
            <div className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">
              Motor Activo en Sistema
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {estado?.proveedor_activo || 'Motor Local'}
            </div>
            <div className="text-[11px] text-indigo-200 mt-1">
              {estado?.total_configurados ? `${estado.total_configurados} proveedor(es) listo(s)` : 'Modo local sin costo activo'}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas globales */}
      {mensajeGlobal && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            mensajeGlobal.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensajeGlobal.tipo === 'exito' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{mensajeGlobal.texto}</span>
          </div>
          <button
            onClick={() => setMensajeGlobal(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Grid de Proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {proveedoresPrincipales.map((prov) => {
          const meta = METADATA_PROVEEDORES[prov];
          const confBD = configsBD.find((c) => c.proveedor === prov);
          const confEnv = estado?.proveedores_disponibles.find(
            (p) => p.proveedor === prov && p.origen === 'VARIABLE_ENTORNO'
          );

          const estaConfigurado = Boolean(confBD?.tiene_api_key || confEnv);
          const esPredeterminado = Boolean(confBD?.es_predeterminado);
          const testRes = testResultados[prov];

          return (
            <div
              key={prov}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                esPredeterminado ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-gray-200'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-gray-100">
                    {meta.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">{meta.nombre}</h3>
                      {esPredeterminado && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          <Star className="w-3 h-3 fill-indigo-600" />
                          PREDETERMINADO
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{meta.compania}</span>
                  </div>
                </div>

                <div>
                  {confBD?.tiene_api_key ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      En Base de Datos
                    </span>
                  ) : confEnv ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      En .env
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-500">
                      No configurado
                    </span>
                  )}
                </div>
              </div>

              {/* Cuerpo del formulario */}
              <div className="p-5 space-y-4 flex-1">
                <p className="text-xs text-gray-600 leading-relaxed">{meta.helpTexto}</p>

                {/* Modelo Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Modelo de Lenguaje:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      list={`modelos-${prov}`}
                      value={formModelos[prov]}
                      onChange={(e) =>
                        setFormModelos((prev) => ({ ...prev, [prov]: e.target.value }))
                      }
                      placeholder={meta.modelosSugeridos[0]}
                      className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                    <datalist id={`modelos-${prov}`}>
                      {meta.modelosSugeridos.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      API Key {confBD?.tiene_api_key && '(Cifrada en BD)'}:
                    </label>
                    <a
                      href={meta.linkDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                    >
                      <span>Obtener Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={mostrarKey[prov] ? 'text' : 'password'}
                      value={formKeys[prov]}
                      onChange={(e) =>
                        setFormKeys((prev) => ({ ...prev, [prov]: e.target.value }))
                      }
                      placeholder={
                        confBD?.mascara_api_key ||
                        confEnv?.mascara_api_key ||
                        'Pega tu API Key aquí...'
                      }
                      className="w-full pl-3 pr-10 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarKey((prev) => ({ ...prev, [prov]: !prev[prov] }))
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    >
                      {mostrarKey[prov] ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Resultado de prueba */}
                {testRes && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      testRes.ok
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testRes.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-tight">{testRes.mensaje}</span>
                  </div>
                )}
              </div>

              {/* Botonera de acciones */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleProbar(prov)}
                  disabled={probando === prov || (!formKeys[prov] && !estaConfigurado)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${probando === prov ? 'animate-spin text-indigo-600' : ''}`}
                  />
                  <span>{probando === prov ? 'Probando...' : 'Probar Conexión'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {confBD && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(confBD.id, prov)}
                      disabled={guardando === prov}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Eliminar credencial de base de datos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {estaConfigurado && !esPredeterminado && (
                    <button
                      type="button"
                      onClick={() => handleEstablecerPredeterminado(prov)}
                      disabled={guardando === prov}
                      className="px-2.5 py-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs font-semibold rounded-xl transition cursor-pointer"
                      title="Establecer como IA predeterminada para todos los análisis"
                    >
                      Hacer Predeterminado
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleGuardar(prov)}
                    disabled={guardando === prov}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{guardando === prov ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tarjeta del Motor Local Offline */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-4">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <Cpu className="w-6 h-6 text-slate-700" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 text-sm">Respaldo Automático 100% Offline (Siempre Activo)</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
              Garantía de Cero Caídas
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Si no configuras ninguna API externa, no tienes conexión a internet o se agotan los créditos de Gemini/Grok/Claude/OpenAI, el sistema realiza automáticamente el análisis léxico y de dinámicas usando el motor heurístico local integrado sin emitir ningún error.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IAConfigPage;
