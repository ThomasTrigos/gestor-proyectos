import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, RefreshCw, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { invitacionesApi } from '../../api/invitaciones';

export const ActivarCuentaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [registroExitoso, setRegistroExitoso] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setErrorValidacion('No se proporcionó ningún token de invitación en el enlace.');
      return;
    }
    validarToken();
  }, [token]);

  const validarToken = async () => {
    try {
      setValidating(true);
      setErrorValidacion(null);
      const res = await invitacionesApi.validar(token!);
      if (res.valido) {
        setTokenInfo(res);
      } else {
        setErrorValidacion(res.error || 'La invitación no es válida.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'El enlace de invitación no es válido o ya ha expirado.';
      setErrorValidacion(msg);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorSubmit('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorSubmit('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setErrorSubmit(null);

    try {
      const res = await invitacionesApi.completar({
        token: token!,
        password,
        password_confirm: passwordConfirm,
      });

      if (res.ok) {
        setRegistroExitoso(res.mensaje);
      } else {
        setErrorSubmit(res.mensaje || 'Error al completar el registro.');
      }
    } catch (err: any) {
      setErrorSubmit(err.response?.data?.error || err.response?.data?.detail || 'Error al procesar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Verificando invitación...</h2>
          <p className="text-sm text-gray-500 mt-2">Por favor espera un instante mientras validamos tu enlace.</p>
        </div>
      </div>
    );
  }

  if (errorValidacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-rose-100 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Enlace no disponible</h2>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{errorValidacion}</p>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Ir al inicio de sesión <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-emerald-100 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <UserCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Registro Completado!</h2>
          <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-xl text-sm mt-4 text-left leading-relaxed">
            {registroExitoso}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            El equipo de Recursos Humanos ha recibido tu solicitud. Te recomendamos guardar tus datos de acceso para ingresar una vez que tu cuenta sea aprobada.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition"
            >
              Ir a la Pantalla de Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
        {/* Banner de Invitación */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Válido por {tokenInfo?.horas_restantes ?? 48} horas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activa tu Cuenta</h1>
          <p className="text-sm text-gray-600 mt-1">
            Hola <strong className="text-gray-800">{tokenInfo?.nombre} {tokenInfo?.apellido}</strong>, has sido invitado como <strong className="text-indigo-600">{tokenInfo?.cargo}</strong> ({tokenInfo?.rol_display}).
          </p>
        </div>

        {errorSubmit && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <span>{errorSubmit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Correo Electrónico (Asignado)
            </label>
            <input
              type="email"
              disabled
              value={tokenInfo?.email || ''}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              Crea tu Contraseña de Acceso
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confirma tu Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activando cuenta...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Establecer Contraseña y Registrarme</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-gray-500 hover:text-indigo-600">
            ¿Ya tienes una cuenta activa? Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ActivarCuentaPage;
