import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { personalApi } from '../../api/personal';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmailConfigPage from './EmailConfigPage';
import IAConfigPage from './IAConfigPage';
import {
  Settings,
  Sun,
  Moon,
  BookOpen,
  Phone,
  Mail,
  User,
  Shield,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  Sparkles,
  Upload,
  RotateCcw,
  Building2,
  Eye,
  EyeOff,
  Activity,
  Lock,
  KeyRound,
  Bot,
} from 'lucide-react';
import { RolPersonal } from '../../types';
import { useBranding } from '../../contexts/BrandingContext';

export default function ConfiguracionPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { appName, appLogo, updateBranding, resetBranding } = useBranding();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (tabParam && ['perfil', 'seguridad', 'correo', 'ia', 'identidad', 'apariencia'].includes(tabParam)) {
      return tabParam;
    }
    return 'perfil';
  });

  useEffect(() => {
    if (tabParam && ['perfil', 'seguridad', 'correo', 'ia', 'identidad', 'apariencia'].includes(tabParam)) {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Form states perfil
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [rol, setRol] = useState('');

  // Estados para Cambio de Contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPasswordNuevo, setShowPasswordNuevo] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Estados locales para Identidad / Branding
  const [nuevoNombreApp, setNuevoNombreApp] = useState(appName);
  const [nuevoLogoApp, setNuevoLogoApp] = useState<string | null>(appLogo);
  const [logoFileError, setLogoFileError] = useState<string | null>(null);

  useEffect(() => {
    setNuevoNombreApp(appName);
    setNuevoLogoApp(appLogo);
  }, [appName, appLogo]);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        setLoading(true);
        const data = await personalApi.getMiPerfil();
        setNombre(data.nombre || user?.nombre || '');
        setApellido(data.apellido || user?.apellido || '');
        setEmail(data.email || user?.email || '');
        setTelefono(data.telefono || user?.telefono || '');
        setCargo(data.cargo || user?.cargo || 'Miembro del Equipo');
        setRol(data.rol || user?.rol || '');
      } catch (error) {
        if (user) {
          setNombre(user.nombre || '');
          setApellido(user.apellido || '');
          setEmail(user.email || '');
          setTelefono(user.telefono || '');
          setCargo(user.cargo || 'Miembro del Equipo');
          setRol(user.rol || '');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [user]);

  const handleGuardarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);

    try {
      const res = await personalApi.updateMiPerfil({
        nombre,
        apellido,
        email,
        telefono,
      });

      if (res.user) {
        updateUser(res.user);
      } else {
        updateUser({ nombre, apellido, email, telefono });
      }

      setMensaje({
        tipo: 'exito',
        texto: res.mensaje || '¡Tus medios de contacto y datos de perfil han sido actualizados exitosamente!',
      });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Error al actualizar los medios de contacto. Verifique los datos e intente nuevamente.';
      setMensaje({ tipo: 'error', texto: errorMsg });
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePassword(null);

    if (!passwordActual || !passwordNuevo || !passwordConfirm) {
      setMensajePassword({
        tipo: 'error',
        texto: 'Por favor complete todos los campos de contraseña.',
      });
      return;
    }

    if (passwordNuevo.length < 6) {
      setMensajePassword({
        tipo: 'error',
        texto: 'La nueva contraseña debe tener al menos 6 caracteres por seguridad.',
      });
      return;
    }

    if (passwordNuevo !== passwordConfirm) {
      setMensajePassword({
        tipo: 'error',
        texto: 'La nueva contraseña y su confirmación no coinciden.',
      });
      return;
    }

    if (passwordActual === passwordNuevo) {
      setMensajePassword({
        tipo: 'error',
        texto: 'La nueva contraseña no puede ser idéntica a la contraseña actual.',
      });
      return;
    }

    try {
      setCambiandoPassword(true);
      const res = await personalApi.cambiarPassword({
        password_actual: passwordActual,
        password_nuevo: passwordNuevo,
        password_confirm: passwordConfirm,
      });

      setMensajePassword({
        tipo: 'exito',
        texto: res.mensaje || '¡Tu contraseña ha sido actualizada exitosamente! Úsala en tu próximo inicio de sesión.',
      });
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirm('');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'No se pudo actualizar la contraseña. Verifique que la contraseña actual sea la correcta.';
      setMensajePassword({ tipo: 'error', texto: errorMsg });
    } finally {
      setCambiandoPassword(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoFileError('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setLogoFileError('La imagen seleccionada supera los 1.5 MB permitidos.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNuevoLogoApp(result);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarIdentidad = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    updateBranding({
      appName: nuevoNombreApp.trim() || 'Gestor de Proyectos',
      appLogo: nuevoLogoApp,
    });
    setMensaje({
      tipo: 'exito',
      texto: '¡Identidad de la aplicación (nombre y logo) guardada exitosamente!',
    });
  };

  const handleRestablecerIdentidad = () => {
    if (window.confirm('¿Deseas restablecer el nombre y logo a los valores predeterminados del sistema?')) {
      resetBranding();
      setNuevoNombreApp('Gestor de Proyectos');
      setNuevoLogoApp(null);
      setLogoFileError(null);
      setMensaje({
        tipo: 'exito',
        texto: 'Se ha restablecido la identidad original por defecto.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  const isManagerOrHR = user?.rol === RolPersonal.RRHH || user?.rol === RolPersonal.GERENTE;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary-600" />
          <span>Configuración del Sistema</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra tu perfil, cambia tu contraseña, ajusta servidores de correo y personaliza la identidad y tema visual.
        </p>
      </div>

      {/* Pestañas de Navegación de Configuración */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2 pb-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Mi Perfil y Contacto</span>
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'seguridad'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Seguridad y Contraseña</span>
        </button>

        {isManagerOrHR && (
          <button
            onClick={() => setActiveTab('correo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'correo'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Servidor de Correo (SMTP)</span>
          </button>
        )}

        {isManagerOrHR && (
          <button
            onClick={() => setActiveTab('ia')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'ia'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Inteligencia Artificial (APIs)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('identidad')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'identidad'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Identidad y Logotipo</span>
        </button>

        <button
          onClick={() => setActiveTab('apariencia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'apariencia'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Apariencia Visual</span>
        </button>
      </div>

      {/* Alerta de notificación general */}
      {mensaje && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border shadow-xs transition-all ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{mensaje.texto}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 1: MI PERFIL Y CONTACTO                                 */}
      {/* ============================================================== */}
      {activeTab === 'perfil' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              <span>Medios de Contacto y Datos de Perfil</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mantén tus canales de contacto actualizados para recibir asignaciones, minutas y recordatorios del equipo.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleGuardarContacto} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nombre
                  </label>
                  <div className="relative">
                    <Input
                      value={nombre}
                      onChange={(e: any) => setNombre(e.target.value)}
                      required
                      placeholder="Tu nombre"
                      className="pl-9"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Apellido
                  </label>
                  <div className="relative">
                    <Input
                      value={apellido}
                      onChange={(e: any) => setApellido(e.target.value)}
                      placeholder="Tu apellido"
                      className="pl-9"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Correo Electrónico (Medio de Contacto Principal)
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      required
                      placeholder="ejemplo@empresa.com"
                      className="pl-9"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Utilizado para inicio de sesión y notificaciones de reuniones/tareas.
                  </span>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Teléfono / Móvil de Contacto
                  </label>
                  <div className="relative">
                    <Input
                      type="tel"
                      value={telefono}
                      onChange={(e: any) => setTelefono(e.target.value)}
                      placeholder="+54 9 11 1234-5678"
                      className="pl-9"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Para llamadas rápidas o coordinación de urgencias en proyectos.
                  </span>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Cargo / Especialidad
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium">{cargo || 'No especificado'}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Definido institucionalmente por Recursos Humanos.
                  </span>
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Rol en el Sistema
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    <Shield className="w-4 h-4 text-primary-500 shrink-0" />
                    <Badge variant={rol === 'RRHH' ? 'danger' : rol === 'GERENTE' ? 'warning' : 'info'}>
                      {rol === 'RRHH' ? 'Recursos Humanos' : rol === 'GERENTE' ? 'Gerencia' : 'Empleado'}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Determina los módulos de acceso y permisos operativos.
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button type="submit" variant="primary" disabled={guardando} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>{guardando ? 'Guardando...' : 'Guardar Medios de Contacto'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Acceso rápido a cambio de contraseña */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">¿Deseas cambiar tu contraseña de cuenta?</h4>
                <p className="text-xs text-gray-600">Puedes actualizar tus credenciales de acceso de forma segura en cualquier momento.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setActiveTab('seguridad')}
              className="text-xs font-semibold shrink-0 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cambiar Contraseña</span>
            </Button>
          </div>

          {/* Enlace para gestión de nómina para directivos */}
          {isManagerOrHR && (
            <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-primary-400 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Gestión de Personal e Invitaciones</h3>
                  <p className="text-xs text-gray-500">Invitar miembros, aprobar registros y administrar nómina de empleados.</p>
                </div>
              </div>
              <Link to="/personal">
                <Button variant="secondary" size="sm" className="flex items-center gap-1">
                  <span>Ir a Personal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: SEGURIDAD Y CAMBIO DE CONTRASEÑA                    */}
      {/* ============================================================== */}
      {activeTab === 'seguridad' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>Seguridad y Contraseña de la Cuenta</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Actualiza tu clave de acceso. Se requerirá la contraseña actual para verificar tu identidad antes de aplicar el cambio.
            </p>
          </div>

          {/* Alerta de cambio de contraseña */}
          {mensajePassword && (
            <div
              className={`p-4 rounded-xl text-sm flex items-center gap-3 border shadow-xs transition-all ${
                mensajePassword.tipo === 'exito'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {mensajePassword.tipo === 'exito' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{mensajePassword.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <form onSubmit={handleCambiarPassword} className="space-y-5">
                  {/* Contraseña Actual */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Contraseña Actual
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswordActual ? 'text' : 'password'}
                        value={passwordActual}
                        onChange={(e: any) => setPasswordActual(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordActual(!showPasswordActual)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        title={showPasswordActual ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPasswordActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Ingresa la contraseña con la que inicias sesión actualmente.
                    </span>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswordNuevo ? 'text' : 'password'}
                        value={passwordNuevo}
                        onChange={(e: any) => setPasswordNuevo(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordNuevo(!showPasswordNuevo)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        title={showPasswordNuevo ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPasswordNuevo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswordConfirm ? 'text' : 'password'}
                        value={passwordConfirm}
                        onChange={(e: any) => setPasswordConfirm(e.target.value)}
                        required
                        placeholder="Repite la nueva contraseña"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        title={showPasswordConfirm ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={cambiandoPassword}
                      className="flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{cambiandoPassword ? 'Actualizando...' : 'Actualizar mi Contraseña'}</span>
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Panel lateral de seguridad */}
            <div className="space-y-4">
              <Card className="p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Políticas de Seguridad</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Longitud mínima requerida: <strong>6 caracteres</strong>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Se recomienda mezclar letras mayúsculas, minúsculas y números.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Cifrado unidireccional estándar: <strong>PBKDF2-SHA256</strong> (Django Auth).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>La contraseña no se almacena en texto plano en ningún registro ni base de datos.</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: SERVIDOR DE CORREO SMTP (INTEGRADA DIRECTAMENTE)     */}
      {/* ============================================================== */}
      {activeTab === 'correo' && isManagerOrHR && (
        <section className="space-y-4">
          <EmailConfigPage embedded={true} />
        </section>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA IA: APIS DE IA (GEMINI, GROK, CLAUDE, OPENAI)          */}
      {/* ============================================================== */}
      {activeTab === 'ia' && isManagerOrHR && (
        <section className="space-y-4">
          <IAConfigPage />
        </section>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 4: IDENTIDAD Y LOGOTIPO                                */}
      {/* ============================================================== */}
      {activeTab === 'identidad' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Identidad de la Aplicación (Nombre y Logotipo)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Personaliza el nombre institucional de la plataforma y el logotipo visual visible en la barra lateral, cabecera y acceso.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleGuardarIdentidad} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controles de edición */}
                <div className="space-y-5">
                  {/* Nombre de la Aplicación */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Nombre de la Aplicación
                    </label>
                    <Input
                      value={nuevoNombreApp}
                      onChange={(e: any) => setNuevoNombreApp(e.target.value)}
                      required
                      placeholder="Ej. Gestor de Proyectos"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Se reflejará en el menú lateral, en la barra superior y en la pestaña del navegador.
                    </span>
                  </div>

                  {/* Logotipo de la Aplicación */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Logotipo Personalizado
                    </label>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        <span>Subir Imagen de Logo</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoFileChange}
                        />
                      </label>

                      {nuevoLogoApp && (
                        <button
                          type="button"
                          onClick={() => setNuevoLogoApp(null)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                        >
                          Quitar logo personalizado (usar ícono por defecto)
                        </button>
                      )}
                    </div>

                    {logoFileError && (
                      <p className="text-xs text-rose-600 mt-1.5 font-medium">{logoFileError}</p>
                    )}
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Formatos recomendados: PNG o SVG transparente (máximo 1.5 MB).
                    </span>
                  </div>
                </div>

                {/* Vista Previa en Vivo */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      <Eye className="w-3.5 h-3.5 text-primary-600" />
                      <span>Vista Previa en Vivo</span>
                    </div>

                    {/* Previsualización en Menú Lateral */}
                    <div className="mb-4">
                      <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Barra Lateral (Fondo Oscuro):</div>
                      <div className="bg-slate-900 text-white rounded-lg p-3 flex items-center gap-3 border border-slate-800 shadow-inner">
                        {nuevoLogoApp ? (
                          <img
                            src={nuevoLogoApp}
                            alt="Logo Preview"
                            className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-primary-400" />
                          </div>
                        )}
                        <span className="font-bold text-base truncate">{nuevoNombreApp || 'Gestor de Proyectos'}</span>
                      </div>
                    </div>

                    {/* Previsualización en Encabezado */}
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Cabecera Superior (Fondo Claro):</div>
                      <div className="bg-white rounded-lg p-3 flex items-center gap-2.5 border border-gray-200 shadow-xs">
                        {nuevoLogoApp && (
                          <img
                            src={nuevoLogoApp}
                            alt="Logo Preview Header"
                            className="w-6 h-6 rounded object-contain border border-gray-200 p-0.5"
                          />
                        )}
                        <span className="font-semibold text-gray-800 text-sm truncate">{nuevoNombreApp || 'Gestor de Proyectos'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                    <span>Los cambios se guardan y reflejan inmediatamente en toda la plataforma.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRestablecerIdentidad}
                  className="flex items-center gap-1.5 text-xs text-gray-600 w-full sm:w-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Identidad por Defecto</span>
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  className="flex items-center gap-2 w-full sm:w-auto cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Identidad</span>
                </Button>
              </div>
            </form>
          </Card>
        </section>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 5: APARIENCIA VISUAL                                   */}
      {/* ============================================================== */}
      {activeTab === 'apariencia' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Modo de Pantalla y Apariencia</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Elige el ambiente visual más adecuado para tu comodidad y descanso ocular durante la jornada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Opción: Claro */}
            <div
              onClick={() => setTheme('claro')}
              className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative flex flex-col justify-between ${
                theme === 'claro'
                  ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white shadow-xs hover:shadow-sm'
              }`}
            >
              {theme === 'claro' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 text-primary-800 border border-primary-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Activo
                </span>
              )}
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <Sun className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Modo Claro</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Diseño nítido y de alto contraste con fondo blanco limpio. Ideal para entornos bien iluminados y uso diurno.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-100 border border-gray-300"></span>
                <span className="w-4 h-4 rounded-full bg-white border border-gray-300"></span>
                <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                <span className="text-[11px] text-gray-400 ml-auto">Estándar</span>
              </div>
            </div>

            {/* Opción: Oscuro */}
            <div
              onClick={() => setTheme('oscuro')}
              className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative flex flex-col justify-between ${
                theme === 'oscuro'
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900 text-white shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white shadow-xs hover:shadow-sm'
              }`}
            >
              {theme === 'oscuro' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Activo
                </span>
              )}
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center mb-3 border border-indigo-700/50">
                  <Moon className="w-5 h-5" />
                </div>
                <h3 className={`font-bold text-base ${theme === 'oscuro' ? 'text-white' : 'text-gray-900'}`}>
                  Modo Oscuro
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${theme === 'oscuro' ? 'text-slate-300' : 'text-gray-500'}`}>
                  Paleta nocturna profunda que reduce el deslumbramiento y cuida la vista en ambientes oscuros.
                </p>
              </div>
              <div className={`mt-4 pt-3 flex items-center gap-1.5 border-t ${theme === 'oscuro' ? 'border-slate-800' : 'border-gray-100'}`}>
                <span className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700"></span>
                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700"></span>
                <span className="w-4 h-4 rounded-full bg-indigo-500"></span>
                <span className={`text-[11px] ml-auto ${theme === 'oscuro' ? 'text-slate-400' : 'text-gray-400'}`}>
                  Nocturno
                </span>
              </div>
            </div>

            {/* Opción: Lectura */}
            <div
              onClick={() => setTheme('lectura')}
              className={`cursor-pointer rounded-2xl border-2 p-5 transition-all relative flex flex-col justify-between ${
                theme === 'lectura'
                  ? 'border-amber-600 ring-2 ring-amber-600/20 bg-[#fdfaf4] shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white shadow-xs hover:shadow-sm'
              }`}
            >
              {theme === 'lectura' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Activo
                </span>
              )}
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3 border border-amber-200">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#382b20] text-base">Modo Lectura</h3>
                <p className="text-xs text-[#786452] mt-1 leading-relaxed">
                  Tono sepia suave tipo papel. Reduce la emisión de luz azul y alivia la fatiga visual al revisar minutas y proyectos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#f5ede1] border border-[#dcceb6]"></span>
                <span className="w-4 h-4 rounded-full bg-[#fdfaf4] border border-[#dcceb6]"></span>
                <span className="w-4 h-4 rounded-full bg-[#c2652b]"></span>
                <span className="text-[11px] text-[#9c8a77] ml-auto">Sepia Confort</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
