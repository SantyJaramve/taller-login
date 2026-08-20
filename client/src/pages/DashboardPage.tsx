import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  ChefHat, Users, Clock, AlertTriangle, CheckCircle,
  Camera, ArrowRight, TrendingUp, Ban
} from 'lucide-react';

interface KitchenStats {
  total: number;
  byStatus: Array<{ name: string; display_name: string; color: string; category: string; count: number }>;
  byType: Array<{ display_name: string; code: string; count: number }>;
  byZone: Array<{ zone: string; count: number }>;
  recentActivity: Array<{
    id: number; kitchen_number: string; status_name: string; changed_by_name: string;
    changed_at: string; notes: string;
  }>;
  pendingAttention: {
    uncontacted: number;
    awaitingConfirmation: number;
    noCarpenter: number;
    pendingResponse: number;
    pendingEvidence: number;
    pendingValidation: number;
  };
}

interface CarpenterStats {
  total: number;
  available: number;
  busy: number;
  inactive: number;
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [kitchenStats, setKitchenStats] = useState<KitchenStats | null>(null);
  const [carpenterStats, setCarpenterStats] = useState<CarpenterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [kStats, cStats] = await Promise.all([
        api.get<KitchenStats>('/kitchens/stats', token!),
        api.get<CarpenterStats>('/carpenters/stats', token!),
      ]);
      setKitchenStats(kStats);
      setCarpenterStats(cStats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="empty-state"><p>Cargando panel de control...</p></div>;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.full_name?.split(' ')[0] || 'Usuario';
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 18) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
  };

  const pending = kitchenStats?.pendingAttention;
  const totalPending = pending ? pending.uncontacted + pending.awaitingConfirmation + pending.noCarpenter + pending.pendingResponse : 0;
  const totalInProgress = kitchenStats?.byStatus.filter(s => s.category === 'in_progress').reduce((acc, s) => acc + s.count, 0) || 0;
  const totalCompleted = kitchenStats?.byStatus.find(s => s.name === 'completed')?.count || 0;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">{getGreeting()}</h1>
          <p className="page-subtitle">Panel de control operativo</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="stat-card" onClick={() => navigate('/cocinas?status=pending')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">{kitchenStats?.total || 0}</div>
            <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <ChefHat size={16} />
            </div>
          </div>
          <div className="stat-label">Total cocinas</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/cocinas?status=pending')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{totalPending}</div>
            <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-label">Pendientes</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/cocinas?status=assigned')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value" style={{ color: 'var(--info)' }}>{totalInProgress}</div>
            <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="stat-label">En proceso</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/cocinas?status=completed')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{totalCompleted}</div>
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="stat-label">Finalizadas</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/carpinteros?status=available')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">{carpenterStats?.available || 0}</div>
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="stat-label">Carpinteros disponibles</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Atención prioritaria</h3>
          </div>
          <div className="card-body" style={{ padding: '0.5rem 0' }}>
            {[
              { label: 'Beneficiarios no contactados', count: pending?.uncontacted || 0, color: 'var(--warning)', filter: 'pending' },
              { label: 'Pendientes de confirmar disponibilidad', count: pending?.awaitingConfirmation || 0, color: 'var(--info)', filter: 'beneficiary_contacted' },
              { label: 'Sin carpintero asignado', count: pending?.noCarpenter || 0, color: 'var(--danger)', filter: 'availability_confirmed' },
              { label: 'Esperando respuesta del carpintero', count: pending?.pendingResponse || 0, color: 'var(--accent)', filter: 'pending_response' },
              { label: 'Instalaciones pendientes de evidencia', count: pending?.pendingEvidence || 0, color: 'var(--info)', filter: 'evidence_received' },
              { label: 'Evidencias pendientes de validación', count: pending?.pendingValidation || 0, color: 'var(--warning)', filter: '' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.65rem 1.25rem', cursor: 'pointer',
                  borderBottom: idx < 5 ? '1px solid var(--border-secondary)' : 'none',
                  transition: 'background 0.1s',
                }}
                onClick={() => item.filter && navigate(`/cocinas?status=${item.filter}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="status-dot" style={{ background: item.color }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: item.count > 0 ? item.color : 'var(--text-tertiary)' }}>
                    {item.count}
                  </span>
                  {item.count > 0 && <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Actividad reciente</h3>
          </div>
          <div className="card-body" style={{ padding: '0.5rem 0' }}>
            {(kitchenStats?.recentActivity || []).map((activity, idx) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.65rem 1.25rem',
                  borderBottom: idx < (kitchenStats?.recentActivity.length || 0) - 1 ? '1px solid var(--border-secondary)' : 'none',
                }}
              >
                <span className="kitchen-number" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {activity.kitchen_number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                    {activity.status_name}
                    {activity.notes && <span style={{ color: 'var(--text-tertiary)' }}> — {activity.notes}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {activity.changed_by_name} · {new Date(activity.changed_at).toLocaleDateString('es-CO')}
                  </div>
                </div>
              </div>
            ))}
            {(!kitchenStats?.recentActivity || kitchenStats.recentActivity.length === 0) && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>Sin actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header">
          <h3 className="card-title">Cocinas por estado</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {(kitchenStats?.byStatus || []).map(status => (
              <div
                key={status.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: status.count > 0 ? `${status.color}10` : 'transparent',
                  border: `1px solid ${status.count > 0 ? `${status.color}30` : 'var(--border-secondary)'}`,
                }}
                onClick={() => navigate(`/cocinas?status=${status.name}`)}
              >
                <span className="status-dot" style={{ background: status.color }} />
                <span style={{ fontSize: '0.825rem', flex: 1, color: 'var(--text-secondary)' }}>{status.display_name}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: status.count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {status.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
