import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Send, CheckCircle2, AlertCircle, RefreshCw, Key, Server, HelpCircle, ExternalLink } from 'lucide-react';
import { emailConfigApi } from '../../api/emailConfig';
import { ConfiguracionEmail } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const PROVEEDOR_PRESETS: Record<string, { host: string; port: number; use_tls: boolean; use_ssl: boolean; help: string; link?: string }> = {
  GMAIL: {
    host: 'smtp.gmail.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'Para Gmail se requiere una "Contraseña de Aplicación" de 16 caracteres (creada en Seguridad > Verificación en 2 pasos de tu cuenta Google). No uses tu contraseña personal habitual.',
    link: 'https://myaccount.google.com/apppasswords'
  },
  OUTLOOK: {
    host: 'smtp.office365.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'Para Outlook / Office 365, usa tu correo corporativo y contraseña (o contraseña de aplicación si tienes 2FA activado).'
  },
  SENDGRID: {
    host: 'smtp.sendgrid.net',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'El usuario en SendGrid siempre debe ser "apikey" y la contraseña es tu API Key generada.'
  },
  BREVO: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'En Brevo: Ve a tu perfil (arriba a la derecha) > SMTP & API > pestaña "SMTP". Copia tu usuario y genera una clave SMTP.',
    link: 'https://app.brevo.com/settings/keys/smtp'
  },
  MAILJET: {
    host: 'in-v3.mailjet.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'Usa tu API Key como usuario y Secret Key como contraseña.'
  },
  OTRO: {
    host: '',
    port: 587,
    use_tls: true,
    use_ssl: false,
    help: 'Configura manualmente el host SMTP y puerto de tu proveedor de correo.'
  }
};

export interface EmailConfigPageProps {
  embedded?: boolean;
}

export const EmailConfigPage: React.FC<EmailConfigPageProps> = ({ embedded = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ConfiguracionEmail>({
    proveedor: 'BREVO',
    host: 'smtp-relay.brevo.com',
    port: 587,
    usuario: '',
    password: '',
    tiene_password: false,
    use_tls: true,
    use_ssl: false,
    remitente_default: 'Gestor de Proyectos <noreply@empresa.com>',
    activo: true
  });

  const [emailDestinoPrueba, setEmailDestinoPrueba] = useState('');

  useEffect(() => {
    cargarConfiguracion();
    if (user?.email) {
      setEmailDestinoPrueba(user.email);
    }
  }, [user]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const activa = await emailConfigApi.getActiva();
      if (activa) {
        setFormData({
          ...activa,
          password: '' // la contraseña nunca viaja desde el backend
        });
      }
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value as ConfiguracionEmail['proveedor'];
    const preset = PROVEEDOR_PRESETS[prov] || PROVEEDOR_PRESETS.OTRO;
    setFormData(prev => ({
      ...prev,
      proveedor: prov,
      host: preset.host || prev.host,
      port: preset.port,
      use_tls: preset.use_tls,
      use_ssl: preset.use_ssl
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);
    setSaving(true);

    try {
      const dataToSave = { ...formData };
      if (!dataToSave.password) {
        delete dataToSave.password; // no sobreescribir si está vacío
      }
      const guardada = await emailConfigApi.guardar(dataToSave);
      setFormData({
        ...guardada,
        password: ''
      });
      setMensajeExito('✅ Configuración de correo guardada con éxito. Las credenciales fueron cifradas con AES-Fernet.');
    } catch (err: any) {
      setMensajeError(err.response?.data?.error || err.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleProbarConexion = async () => {
    if (!emailDestinoPrueba) {
      setMensajeError('Por favor especifica un correo destinatario para la prueba.');
      return;
    }

    setMensajeExito(null);
    setMensajeError(null);
    setTesting(true);

    try {
      const res = await emailConfigApi.probar({
        email_destino: emailDestinoPrueba,
        config_id: formData.id,
        proveedor: formData.proveedor,
        host: formData.host,
        port: Number(formData.port),
        usuario: formData.usuario,
        password: formData.password || undefined,
        use_tls: formData.use_tls,
        use_ssl: formData.use_ssl,
        remitente_default: formData.remitente_default
      });

      if (res.ok) {
        setMensajeExito(res.mensaje || `¡Correo de prueba enviado con éxito a ${emailDestinoPrueba}! Revisa tu bandeja de entrada.`);
      } else {
        setMensajeError(res.error || 'Ocurrió un error al enviar el correo de prueba.');
      }
    } catch (err: any) {
      const detalle = err.response?.data?.error || err.message || 'Fallo de conexión SMTP.';
      setMensajeError(`❌ ${detalle}`);
    } finally {
      setTesting(false);
    }
  };

  const currentPreset = PROVEEDOR_PRESETS[formData.proveedor] || PROVEEDOR_PRESETS.OTRO;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Cargando configuración de correo...</span>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>
      {/* Header (solo cuando es vista independiente) */}
      {!embedded && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración de Correo SMTP Real</h1>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              Conecta tu cuenta de email para enviar notificaciones reales, asignaciones de tareas y enlaces de invitación.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cifrado Fernet AES-128 activo</span>
          </div>
        </div>
      )}

      {/* Alertas */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{mensajeExito}</div>
        </div>
      )}

      {mensajeError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-sm font-medium">{mensajeError}</div>
        </div>
      )}

      {/* Guía Rápida Brevo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              ★
            </span>
            <h3 className="text-sm font-bold text-gray-900">
              Solución Recomendada sin Bloqueos: Brevo (300 emails/día gratis)
            </h3>
          </div>
          <a
            href="https://app.brevo.com/settings/keys/smtp"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-50 shadow-xs"
          >
            Abrir Brevo SMTP <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          Dado que Google restringió las contraseñas de aplicaciones en muchas cuentas, <strong>Brevo (ex-Sendinblue)</strong> es la alternativa más directa y libre de restricciones:
        </p>
        <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside bg-white/80 p-3 rounded-lg border border-blue-100">
          <li>Crea una cuenta gratis en <a href="https://www.brevo.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">brevo.com</a> (sin tarjeta de crédito).</li>
          <li>En tu panel de Brevo, ve a <strong>SMTP & API</strong> ➔ pestaña <strong>SMTP</strong> (o usa el botón de arriba).</li>
          <li>Copia tu <strong>Login SMTP</strong> y haz clic en <strong>Generar una nueva clave SMTP</strong>.</li>
          <li>Pega el usuario y la clave abajo, pulsa <strong>Guardar Configuración</strong> y listo.</li>
        </ol>
      </div>

      {/* Formulario */}
      <form onSubmit={handleGuardar} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Parámetros del Servidor SMTP
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor de Correo
              </label>
              <select
                name="proveedor"
                value={formData.proveedor}
                onChange={handleProveedorChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              >
                <option value="BREVO">Brevo / Sendinblue (Recomendado - 300 envíos/día gratis)</option>
                <option value="GMAIL">Google Gmail (Requiere Contraseña de Aplicación)</option>
                <option value="OUTLOOK">Microsoft Outlook / Office 365</option>
                <option value="SENDGRID">SendGrid</option>
                <option value="MAILJET">Mailjet</option>
                <option value="OTRO">Servidor SMTP Personalizado</option>
              </select>
            </div>

            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servidor Host SMTP
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                required
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
            </div>

            {/* Puerto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Puerto SMTP
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
            </div>

            {/* Usuario / Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.proveedor === 'BREVO' ? 'Usuario / Login SMTP (Proporcionado por Brevo)' : 'Usuario / Email de Autenticación'}
              </label>
              <input
                type="text"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                required
                placeholder={formData.proveedor === 'BREVO' ? 'bc796f001@smtp-brevo.com' : 'tucorreo@gmail.com'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
              {formData.proveedor === 'BREVO' && (
                <p className="text-[11px] text-gray-500 mt-1">
                  En Brevo es el identificador generado (ej: <code className="bg-gray-100 px-1 rounded text-indigo-700">bc796f001@smtp-brevo.com</code>). <strong>NO</strong> pongas tu correo de Gmail aquí.
                </p>
              )}
            </div>

            {/* Contraseña / App Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-500" />
                  Contraseña de Aplicación / API Key (Se guardará cifrada)
                </span>
                {formData.tiene_password && (
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    🔒 Contraseña ya configurada y cifrada
                  </span>
                )}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={formData.tiene_password ? '●●●●●●●● (Dejar vacío para no modificar)' : 'Ingresa la contraseña de aplicación'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />
                <span>{currentPreset.help}</span>
                {currentPreset.link && (
                  <a
                    href={currentPreset.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-indigo-600 hover:underline font-semibold ml-1 shrink-0"
                  >
                    {formData.proveedor === 'BREVO'
                      ? 'Obtener Clave SMTP en Brevo'
                      : formData.proveedor === 'GMAIL'
                      ? 'Crear contraseña en Google'
                      : 'Abrir configuración del proveedor'}{' '}
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                )}
              </p>
            </div>

            {/* Remitente Default */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Remitente Visible
              </label>
              <input
                type="text"
                name="remitente_default"
                value={formData.remitente_default}
                onChange={handleChange}
                placeholder="Gestor de Proyectos <tu-email-de-brevo@gmail.com>"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                <strong>Clave para Brevo:</strong> La dirección de correo debe coincidir con el email con el que creaste tu cuenta en Brevo (ej: <code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-700">Gestor de Proyectos &lt;tu-email@gmail.com&gt;</code>). Si dejas <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-600">noreply@empresa.com</code>, Brevo bloqueará el envío por no ser un dominio verificado.
              </p>
            </div>

            {/* Protocolos de Seguridad */}
            <div className="flex items-center gap-6 md:col-span-2 pt-2">
              <label className="inline-flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_tls"
                  checked={formData.use_tls}
                  onChange={handleChange}
                  className="rounded text-indigo-600 focus:ring-indigo-500 mr-2 h-4 w-4"
                />
                Utilizar TLS (STARTTLS - Recomendado en puerto 587)
              </label>

              <label className="inline-flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="use_ssl"
                  checked={formData.use_ssl}
                  onChange={handleChange}
                  className="rounded text-indigo-600 focus:ring-indigo-500 mr-2 h-4 w-4"
                />
                Utilizar SSL directo (Puerto 465)
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Sección de Prueba en Vivo */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-600" />
          Probar Envío de Correo Real
        </h2>
        <p className="text-sm text-gray-600">
          Envía un email real de prueba para confirmar que los datos SMTP ingresados son aceptados por el servidor y que el correo llega sin ser bloqueado.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="email"
            value={emailDestinoPrueba}
            onChange={(e) => setEmailDestinoPrueba(e.target.value)}
            placeholder="Introduce tu correo de prueba (ej: tu-email@gmail.com)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
          <button
            type="button"
            onClick={handleProbarConexion}
            disabled={testing || !emailDestinoPrueba}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm shrink-0"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Enviando prueba...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Correo de Prueba</span>
              </>
            )}
          </button>
        </div>

        {(emailDestinoPrueba.endsWith('@empresa.com') || emailDestinoPrueba.endsWith('@gestor.com')) && (
          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Aviso sobre la casilla de prueba:</strong> Estás probando con una dirección ficticia del sistema demo (<code>{emailDestinoPrueba}</code>). Para verificar que el correo llega a tu bandeja de entrada real, escribe tu dirección personal (por ejemplo, tu cuenta de Gmail).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfigPage;
