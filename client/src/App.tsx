// =============================================================================
// APP PRINCIPAL - CocinasApp (Frontend)
// =============================================================================
// Configuracion de rutas, proveedores de contexto y componentes de proteccion.
// Rutas: /login, /mi-trabajo/*, /* (dashboard admin)
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import KitchensPage from './pages/kitchens/KitchensPage';
import KitchenDetailPage from './pages/kitchens/KitchenDetailPage';
import CreateKitchenPage from './pages/kitchens/CreateKitchenPage';
import CarpentersPage from './pages/carpenters/CarpentersPage';
import CarpenterDetailPage from './pages/carpenters/CarpenterDetailPage';
import CarpenterDashboardPage from './pages/carpenters/CarpenterDashboardPage';
import CarpenterAssignmentsPage from './pages/carpenters/CarpenterAssignmentsPage';
import CarpenterKitchenDetailPage from './pages/carpenters/CarpenterKitchenDetailPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import AgendaPage from './pages/AgendaPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/UsersPage';

// --- Ruta protegida: solo usuarios autenticados ---
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// --- Ruta publica: redirige si ya esta autenticado ---
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCarpintero } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  return <Navigate to={isCarpintero ? '/mi-trabajo' : '/'} replace />;
}

// --- Ruta exclusiva para carpinteros ---
function CarpinteroRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCarpintero } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCarpintero) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// --- Definicion de rutas ---
function AppRoutes() {
  const { isCarpintero } = useAuth();
  return (
    <Routes>
      {/* Ruta publica: login */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Rutas del portal de carpintero */}
      <Route path="/mi-trabajo" element={<CarpinteroRoute><Layout /></CarpinteroRoute>}>
        <Route index element={<CarpenterDashboardPage />} />
        <Route path="asignaciones" element={<CarpenterAssignmentsPage />} />
        <Route path="cocinas/:id" element={<CarpenterKitchenDetailPage />} />
      </Route>

      {/* Rutas del dashboard admin/supervisor/employee */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="cocinas" element={<KitchensPage />} />
        <Route path="cocinas/nueva" element={<CreateKitchenPage />} />
        <Route path="cocinas/:id" element={<KitchenDetailPage />} />
        <Route path="carpinteros" element={<CarpentersPage />} />
        <Route path="carpinteros/nuevo" element={<CarpentersPage />} />
        <Route path="carpinteros/:id" element={<CarpenterDetailPage />} />
        <Route path="asignaciones" element={<AssignmentsPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="usuarios" element={<UsersPage />} />
      </Route>

      {/* Redireccion por defecto */}
      <Route path="*" element={<Navigate to={isCarpintero ? '/mi-trabajo' : '/'} replace />} />
    </Routes>
  );
}

// --- Proveedor de la aplicacion ---
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
