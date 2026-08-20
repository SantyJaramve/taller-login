// =============================================================================
// LAYOUT PRINCIPAL - CocinasApp
// =============================================================================
// Sidebar condicional (carpintero vs admin) + topbar + contenido.
// Incluye: navegacion, toggle de tema, cerrar sesion.
// =============================================================================

import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, ChefHat, Users, GitBranch,
  CalendarDays, BarChart3, LogOut, Sun, Moon,
  Menu, X, Shield, ClipboardList, Hammer
} from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin, isCarpintero } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- Items de navegacion para carpinteros ---
  const carpinteroNav = [
    { to: '/mi-trabajo', icon: LayoutDashboard, label: 'Mi Trabajo' },
    { to: '/mi-trabajo/asignaciones', icon: ClipboardList, label: 'Mis Asignaciones' },
  ];

  // --- Items de navegacion para admin/supervisor/employee ---
  const adminNav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'inicio' },
    { to: '/cocinas', icon: ChefHat, label: 'Cocinas', section: 'operacion' },
    { to: '/carpinteros', icon: Users, label: 'Carpinteros', section: 'operacion' },
    { to: '/asignaciones', icon: GitBranch, label: 'Asignaciones', section: 'operacion' },
    { to: '/agenda', icon: CalendarDays, label: 'Agenda', section: 'operacion' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes', section: 'reportes' },
    ...(isAdmin ? [{ to: '/usuarios', icon: Shield, label: 'Usuarios', section: 'admin' }] : []),
  ];

  const navItems = isCarpintero ? carpinteroNav : adminNav;

  const isActive = (path: string) => {
    if (path === '/' || path === '/mi-trabajo') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {isCarpintero ? <Hammer size={18} /> : <ChefHat size={18} />}
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">CocinasApp</span>
            <span className="sidebar-brand-sub">
              {isCarpintero ? 'Portal del Carpintero' : 'Gestion Integral'}
            </span>
          </div>
        </div>

        {/* Navegacion */}
        <nav className="sidebar-nav">
          {isCarpintero ? (
            <div className="sidebar-section">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  end={item.to === '/mi-trabajo'}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ) : (
            ['inicio', 'operacion', 'reportes', 'admin'].map(section => {
              const sectionItems = navItems.filter((i: any) => i.section === section);
              if (sectionItems.length === 0) return null;
              if (section === 'admin' && !isAdmin) return null;

              const sectionLabel = section === 'inicio' ? '' :
                section === 'operacion' ? 'Operacion' :
                section === 'reportes' ? 'Analisis' : 'Administracion';

              return (
                <div key={section} className="sidebar-section">
                  {sectionLabel && <div className="sidebar-section-title">{sectionLabel}</div>}
                  {sectionItems.map((item: any) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                      end={item.to === '/'}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              );
            })
          )}
        </nav>

        {/* Footer del sidebar: usuario + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout}>
            <div className="sidebar-avatar">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-role">{user?.role_display_name}</div>
            </div>
            <LogOut size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
