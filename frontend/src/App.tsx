import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { RolPersonal } from './types';
import { useContext } from 'react';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

// Pages
import LoginPage from './pages/auth/LoginPage';
import ActivarCuentaPage from './pages/auth/ActivarCuentaPage';
import EmpresasListPage from './pages/empresas/EmpresasListPage';
import EmpresaFormPage from './pages/empresas/EmpresaFormPage';
import PersonalListPage from './pages/personal/PersonalListPage';
import PersonalFormPage from './pages/personal/PersonalFormPage';
import ProyectosListPage from './pages/proyectos/ProyectosListPage';
import ProyectoFormPage from './pages/proyectos/ProyectoFormPage';
import ProyectoDetallePage from './pages/proyectos/ProyectoDetallePage';
import TareasListPage from './pages/tareas/TareasListPage';
import TareaFormPage from './pages/tareas/TareaFormPage';
import TareaConfirmacionPage from './pages/tareas/TareaConfirmacionPage';
import ReunionesListPage from './pages/reuniones/ReunionesListPage';
import ReunionFormPage from './pages/reuniones/ReunionFormPage';
import FinanciacionListPage from './pages/financiacion/FinanciacionListPage';
import FinanciacionFormPage from './pages/financiacion/FinanciacionFormPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import AuditoriaPage from './pages/auditoria/AuditoriaPage';
import ReunionesCalendarPage from './pages/reuniones/ReunionesCalendarPage';
import EmailConfigPage from './pages/configuracion/EmailConfigPage';
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';
import ProyectoKanbanPage from './pages/proyectos/ProyectoKanbanPage';

const RootRedirect = () => {
  const { user } = useContext(AuthContext)!;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === RolPersonal.RRHH) return <Navigate to="/empresas" replace />;
  if (user.rol === RolPersonal.GERENTE) return <Navigate to="/tablero" replace />;
  if (user.rol === RolPersonal.EMPLEADO) return <Navigate to="/proyectos" replace />;
  return <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activar-cuenta" element={<ActivarCuentaPage />} />
      <Route path="/tareas/confirmar/:id" element={<TareaConfirmacionPage />} />
      <Route path="/tareas/:id/confirmar" element={<TareaConfirmacionPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<RootRedirect />} />
          
          <Route element={<ProtectedRoute allowedRoles={[RolPersonal.GERENTE]} />}>
            <Route path="/tablero" element={<DashboardPage />} />
          </Route>

          {/* Rutas de trabajo accesibles para todo el personal (RRHH, GERENTE, EMPLEADO) */}
          <Route element={<ProtectedRoute allowedRoles={[RolPersonal.RRHH, RolPersonal.GERENTE, RolPersonal.EMPLEADO]} />}>
            <Route path="/proyectos" element={<ProyectosListPage />} />
            <Route path="/proyectos/:id" element={<ProyectoDetallePage />} />
            <Route path="/proyectos/:id/kanban" element={<ProyectoKanbanPage />} />
            <Route path="/reuniones" element={<ReunionesListPage />} />
            <Route path="/calendario" element={<ReunionesCalendarPage />} />
            <Route path="/reuniones/calendario" element={<ReunionesCalendarPage />} />
            <Route path="/tareas" element={<TareasListPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
          </Route>

          {/* Rutas directivas y administrativas (RRHH y GERENTE) */}
          <Route element={<ProtectedRoute allowedRoles={[RolPersonal.RRHH, RolPersonal.GERENTE]} />}>
            <Route path="/empresas" element={<EmpresasListPage />} />
            <Route path="/reuniones/nueva" element={<ReunionFormPage />} />
            <Route path="/reuniones/:id/editar" element={<ReunionFormPage />} />
            <Route path="/financiacion" element={<FinanciacionListPage />} />
            <Route path="/tareas/:id/editar" element={<TareaFormPage />} />
            <Route path="/configuracion/email" element={<Navigate to="/configuracion?tab=correo" replace />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[RolPersonal.RRHH]} />}>
            <Route path="/empresas/nueva" element={<EmpresaFormPage />} />
            <Route path="/empresas/:id/editar" element={<EmpresaFormPage />} />
            
            <Route path="/personal" element={<PersonalListPage />} />
            <Route path="/personal/nuevo" element={<PersonalFormPage />} />
            <Route path="/personal/:id/editar" element={<PersonalFormPage />} />
            
            <Route path="/proyectos/nuevo" element={<ProyectoFormPage />} />
            <Route path="/proyectos/:id/editar" element={<ProyectoFormPage />} />
            
            <Route path="/tareas/nueva" element={<TareaFormPage />} />
            
            <Route path="/financiacion/nueva" element={<FinanciacionFormPage />} />
            <Route path="/financiacion/:id/editar" element={<FinanciacionFormPage />} />
            
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrandingProvider>
            <Router>
              <AppRoutes />
            </Router>
          </BrandingProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
