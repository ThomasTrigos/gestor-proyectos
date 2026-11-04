import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../contexts/BrandingContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RolPersonal } from '../../types';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  CheckSquare,
  Calendar,
  CalendarDays,
  DollarSign,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const { appName, appLogo } = useBranding();
  const { sidebarCollapsed, toggleSidebar } = useTheme();

  if (!user) return null;

  const isRRHH = user.rol === RolPersonal.RRHH;
  const isGerente = user.rol === RolPersonal.GERENTE;
  const isManagerOrHR = isRRHH || isGerente;

  return (
    <aside
      className={`bg-slate-900 text-white min-h-screen flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
        sidebarCollapsed
          ? 'w-[72px] min-w-[72px] max-w-[72px]'
          : 'w-[250px] min-w-[250px] max-w-[250px]'
      }`}
    >
      {/* Top Header / Logo & Collapse Button */}
      {sidebarCollapsed ? (
        <div className="p-3 flex flex-col items-center justify-center border-b border-slate-800 gap-2">
          {appLogo ? (
            <img
              src={appLogo}
              alt={appName}
              title={appName}
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20 shadow-xs cursor-pointer"
              onClick={toggleSidebar}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center cursor-pointer"
              title={appName}
              onClick={toggleSidebar}
            >
              <Activity className="w-5 h-5 text-primary-400" />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            title="Expandir barra lateral"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-center justify-between border-b border-slate-800 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            {appLogo ? (
              <img
                src={appLogo}
                alt="Logo"
                className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 shrink-0 border border-white/20 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
            )}
            <span className="truncate text-base font-bold" title={appName}>{appName}</span>
          </div>
          <button
            onClick={toggleSidebar}
            title="Colapsar barra lateral"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      {/* Navigation links */}
      <nav className={`flex-1 py-3 flex flex-col gap-1 overflow-y-auto ${sidebarCollapsed ? 'px-2 items-center' : 'px-3'}`}>
        {isGerente && (
          <NavLink
            to="/tablero"
            title="Tablero"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
              } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <LayoutDashboard size={20} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Tablero</span>}
          </NavLink>
        )}

        {isManagerOrHR && (
          <NavLink
            to="/empresas"
            title="Empresas"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
              } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <Building2 size={20} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Empresas</span>}
          </NavLink>
        )}

        <NavLink
          to="/proyectos"
          title="Proyectos"
          className={({ isActive }) =>
            `flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
            } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
          }
        >
          <Briefcase size={20} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Proyectos</span>}
        </NavLink>

        <NavLink
          to="/calendario"
          title="Calendario"
          className={({ isActive }) =>
            `flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
            } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
          }
        >
          <CalendarDays size={20} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Calendario</span>}
        </NavLink>

        <NavLink
          to="/reuniones"
          title="Reuniones"
          className={({ isActive }) =>
            `flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
            } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
          }
        >
          <Calendar size={20} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Reuniones</span>}
        </NavLink>

        {isManagerOrHR && (
          <NavLink
            to="/financiacion"
            title="Financiación"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
              } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <DollarSign size={20} className="shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Financiación</span>}
          </NavLink>
        )}

        <NavLink
          to="/tareas"
          title={isRRHH ? 'Tareas Asignadas' : 'Tareas'}
          className={({ isActive }) =>
            `flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
            } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
          }
        >
          <CheckSquare size={20} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">{isRRHH ? 'Tareas Asignadas' : 'Tareas'}</span>}
        </NavLink>

        {isRRHH && (
          <>
            <NavLink
              to="/personal"
              title="Personal"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-colors ${
                  sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
                } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Users size={20} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Personal</span>}
            </NavLink>
            <NavLink
              to="/auditoria"
              title="Auditoría"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-colors ${
                  sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11' : 'gap-3 p-2.5 text-sm font-medium w-full'
                } ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Activity size={20} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">Auditoría</span>}
            </NavLink>
          </>
        )}

        {/* Apartado de Configuración y Alternancia de Colapso al fondo */}
        <div className="mt-auto pt-3 border-t border-slate-800 flex flex-col gap-1 w-full">
          <NavLink
            to="/configuracion"
            title="Configuración"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                sidebarCollapsed ? 'justify-center p-2.5 w-11 h-11 mx-auto' : 'gap-3 p-2.5 text-sm font-medium w-full'
              } ${
                isActive ? 'bg-primary-600 font-semibold text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`
            }
          >
            <Settings size={20} className="shrink-0" />
            {!sidebarCollapsed && <span>Configuración</span>}
          </NavLink>

          {!sidebarCollapsed ? (
            <button
              onClick={toggleSidebar}
              title="Colapsar barra lateral"
              className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer w-full"
            >
              <PanelLeftClose size={18} className="shrink-0" />
              <span>Colapsar menú</span>
            </button>
          ) : (
            <button
              onClick={toggleSidebar}
              title="Expandir barra lateral"
              className="flex items-center justify-center p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer w-11 h-11 mx-auto"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>
      </nav>
    </aside>
  );
};
