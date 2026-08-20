import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, Phone, MapPin, Clock, CheckCircle, XCircle, TrendingUp, Plus } from 'lucide-react';

interface CarpenterDetail {
  id: number;
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  status: string;
  max_capacity: number;
  current_load: number;
  notes: string;
  created_at: string;
  zones: string[];
  types: Array<{ id: number; display_name: string; code: string }>;
  installations: Array<{
    id: number;
    kitchen_number: string;
    status_display: string;
    status_color: string;
    type_display: string;
    beneficiary_name: string;
    beneficiary_address: string;
  }>;
  observations: Array<{
    id: number;
    content: string;
    user_name: string;
    created_at: string;
  }>;
  stats: {
    total: number;
    completed: number;
    rejected: number;
    accepted: number;
    pending: number;
    completion_rate: number;
    rejection_rate: number;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'var(--success)' },
  busy: { label: 'Ocupado', color: 'var(--warning)' },
  inactive: { label: 'Inactivo', color: 'var(--text-tertiary)' },
};

export default function CarpenterDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [carpenter, setCarpenter] = useState<CarpenterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newObservation, setNewObservation] = useState('');

  useEffect(() => { loadCarpenter(); }, [id]);

  const loadCarpenter = async () => {
    try {
      const data = await api.get<CarpenterDetail>(`/carpenters/${id}`, token!);
      setCarpenter(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    try {
      await api.post(`/carpenters/${id}/observations`, { content: newObservation }, token!);
      setNewObservation('');
      loadCarpenter();
    } catch (error) { console.error(error); }
  };

  if (loading) return <div className="empty-state"><p>Cargando carpintero...</p></div>;
  if (!carpenter) return <div className="empty-state"><p>Carpintero no encontrado</p></div>;

  const statusInfo = STATUS_MAP[carpenter.status] || STATUS_MAP.inactive;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/carpinteros')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title">{carpenter.full_name}</h1>
              <span className="badge" style={{ background: `${statusInfo.color}15`, color: statusInfo.color }}>
                <span className="status-dot" style={{ background: statusInfo.color }} />
                {statusInfo.label}
              </span>
            </div>
            <p className="page-subtitle">Detalle del carpintero y su historial</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{carpenter.stats.total}</div>
          <div className="stat-label">Total asignadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{carpenter.stats.completed}</div>
          <div className="stat-label">Finalizadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--info)' }}>{carpenter.stats.accepted}</div>
          <div className="stat-label">Aceptadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{carpenter.stats.rejected}</div>
          <div className="stat-label">Rechazadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{carpenter.stats.completion_rate}%</div>
          <div className="stat-label">Tasa de cumplimiento</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Información</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={15} style={{ color: 'var(--text-tertiary)' }} />
                  <span>{carpenter.phone || 'Sin teléfono'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={15} style={{ color: 'var(--text-tertiary)' }} />
                  <span>WhatsApp: {carpenter.whatsapp || 'N/A'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <MapPin size={15} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {carpenter.zones.map((z, i) => (
                        <span key={i} className="badge badge-neutral">{z}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>Capacidad</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                    <div style={{
                      width: `${Math.min((carpenter.current_load / carpenter.max_capacity) * 100, 100)}%`,
                      height: '100%',
                      background: carpenter.current_load >= carpenter.max_capacity ? 'var(--danger)' : 'var(--success)',
                      borderRadius: '4px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{carpenter.current_load} / {carpenter.max_capacity}</span>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>Tipos de cocina</div>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {carpenter.types.map(t => (
                    <span key={t.id} className="badge badge-info">{t.display_name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Instalaciones ({carpenter.installations.length})</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              {carpenter.installations.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}><p>Sin instalaciones registradas</p></div>
              ) : (
                carpenter.installations.map(inst => (
                  <div
                    key={inst.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.65rem 1.25rem', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-secondary)',
                    }}
                    onClick={() => navigate(`/cocinas/${inst.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="kitchen-number">{inst.kitchen_number}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem' }}>{inst.type_display}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{inst.beneficiary_name}</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: `${inst.status_color}15`, color: inst.status_color, fontSize: '0.7rem' }}>
                      {inst.status_display}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Observaciones</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {carpenter.observations.map(obs => (
                <div key={obs.id} style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{obs.content}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    {obs.user_name} · {new Date(obs.created_at).toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  placeholder="Agregar observación..."
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddObservation()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddObservation} disabled={!newObservation.trim()}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
