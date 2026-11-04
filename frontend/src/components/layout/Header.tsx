import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useBranding } from '../../contexts/BrandingContext';
import { LogOut, User, Sun, Moon, BookOpen, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, textSize, setTextSize, sidebarCollapsed, toggleSidebar } = useTheme();
  const { appName, appLogo } = useBranding();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    if (theme === 'claro') setTheme('oscuro');
    else if (theme === 'oscuro') setTheme('lectura');
    else setTheme('claro');
  };

  const toggleTextSize = () => {
    if (textSize === 'normal') setTextSize('grande');
    else if (textSize === 'grande') setTextSize('muy-grande');
    else setTextSize('normal');
  };

  const getTextSizeInfo = () => {
    if (textSize === 'muy-grande') return { label: 'Texto Extra Grande', short: 'A++' };
    if (textSize === 'grande') return { label: 'Texto Grande', short: 'A+' };
    return { label: 'Texto Estándar', short: 'A' };
  };

  const getThemeInfo = () => {
    if (theme === 'oscuro') return { label: 'Modo Oscuro', icon: Moon, next: 'Lectura' };
    if (theme === 'lectura') return { label: 'Modo Lectura', icon: BookOpen, next: 'Claro' };
    return { label: 'Modo Claro', icon: Sun, next: 'Oscuro' };
  };

  const themeInfo = getThemeInfo();
  const ThemeIcon = themeInfo.icon;
  const sizeInfo = getTextSizeInfo();

  return (
    <header className="bg-white border-b border-gray-200 h-[60px] min-h-[60px] max-h-[60px] flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors mr-1 cursor-pointer"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        {appLogo && (
          <img
            src={appLogo}
            alt="Logo"
            className="w-7 h-7 rounded-md object-contain border border-gray-200 p-0.5"
          />
        )}
        <h2 className="text-base font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-md" title={appName}>
          {appName}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {/* Selector rápido de tema */}
        <button
          onClick={toggleTheme}
          title={`Tema actual: ${themeInfo.label}. Clic para alternar a ${themeInfo.next}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-xs font-semibold transition-all hover:bg-gray-50 cursor-pointer"
        >
          <ThemeIcon className="w-4 h-4 text-primary-600" />
          <span className="hidden sm:inline">{themeInfo.label}</span>
        </button>

        {/* Selector de tamaño de texto */}
        <button
          onClick={toggleTextSize}
          title={`Tamaño actual: ${sizeInfo.label}. Clic para alternar (Grande / Extra Grande / Estándar)`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-xs font-semibold transition-all hover:bg-gray-50 cursor-pointer text-gray-700"
        >
          <span className="font-serif font-black text-primary-600 text-xs">{sizeInfo.short}</span>
          <span className="hidden md:inline">{sizeInfo.label}</span>
        </button>

        {/* Acceso a Configuración */}
        <Link
          to="/configuracion"
          title="Configuración de cuenta y preferencias"
          className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-primary-600 hover:bg-gray-50 transition-colors"
        >
          <Settings size={18} />
        </Link>

        {/* Datos del usuario */}
        <Link
          to="/configuracion"
          title="Ver y editar mi perfil"
          className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors pl-1"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-xs">
            {user?.nombre?.[0] || 'U'}
          </div>
          <span className="font-medium text-sm hidden md:inline">{user?.nombre}</span>
          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full font-semibold">
            {user?.rol}
          </span>
        </Link>

        {/* Botón Salir */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-semibold ml-2 cursor-pointer"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
