import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface MyStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  rejected: number;
  completion_rate: number;
}

interface Kitchen {
  id: number;
  kitchen_number: string;
  status_display: string;
  status_color: string;
  status_category: string;
  type_display: string;
  beneficiary_name: string;
  beneficiary_address: string;
  created_at: string;
}

export default function CarpenterDashboardPage() {
  const [stats, setStats] = useState<MyStats | null>(null);
  const [recentKitchens, setRecentKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, kitchensData] = await Promise.all([
          api.get<MyStats>('/carpenters/me/stats'),
          api.get<Kitchen[]>('/carpenters/me/assignments'),
        ]);
        setStats(statsData);
        setRecentKitchens(kitchensData.slice(0, 5));
      } catch (err) {
        console.error('Error loading carpenter data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="page-loading">Cargando...</div>;
  }

  return (
    <div className="carpenter-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Trabajo</h1>
          <p className="page-subtitle">Resumen de tus asignaciones y actividad</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
              <ClipboardList size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Asignadas</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#EA580C' }}>
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pendientes</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333EA' }}>
              <AlertTriangle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.inProgress}</span>
              <span className="stat-label">En Progreso</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A' }}>
              <CheckCircle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">Completadas</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488' }}>
              <TrendingUp size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.completion_rate}%</span>
              <span className="stat-label">Tasa de Éxito</span>
            </div>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Asignaciones Recientes</h2>
          <button
            className="btn-link"
            onClick={() => navigate('/mi-trabajo/asignaciones')}
          >
            Ver todas
          </button>
        </div>

        {recentKitchens.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={40} style={{ opacity: 0.3 }} />
            <p>No tienes asignaciones todavía</p>
          </div>
        ) : (
          <div className="kitchen-list">
            {recentKitchens.map(kitchen => (
              <div
                key={kitchen.id}
                className="kitchen-list-item"
                onClick={() => navigate(`/mi-trabajo/cocinas/${kitchen.id}`)}
              >
                <div className="kitchen-item-main">
                  <span className="kitchen-item-number">{kitchen.kitchen_number}</span>
                  <span className="kitchen-item-type">{kitchen.type_display}</span>
                </div>
                <div className="kitchen-item-secondary">
                  <span className="kitchen-item-beneficiary">{kitchen.beneficiary_name}</span>
                  <span className="kitchen-item-address">{kitchen.beneficiary_address}</span>
                </div>
                <div className="kitchen-item-status">
                  <span
                    className="status-badge"
                    style={{ background: kitchen.status_color + '20', color: kitchen.status_color }}
                  >
                    {kitchen.status_display}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
