import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Users, Plus, Search, Eye, MapPin, Phone, Wrench } from 'lucide-react';

interface Carpenter {
  id: number;
  full_name: string;
  phone: string;
  whatsapp: string;
  status: string;
  max_capacity: number;
  current_load: number;
  zones: string;
  capable_types: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'var(--success)' },
  busy: { label: 'Ocupado', color: 'var(--warning)' },
  inactive: { label: 'Inactivo', color: 'var(--text-tertiary)' },
};

export default function CarpentersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [carpenters, setCarpenters] = useState<Carpenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadCarpenters();
  }, [statusFilter]);

  const loadCarpenters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const data = await api.get<Carpenter[]>(`/carpenters?${params.toString()}`, token!);
      setCarpenters(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => loadCarpenters();

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Carpinteros</h1>
          <p className="page-subtitle">{carpenters.length} carpinteros registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/carpinteros/nuevo')}>
          <Plus size={16} /> Nuevo carpintero
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-bar">
            <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="available">Disponibles</option>
              <option value="busy">Ocupados</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Carpintero</th>
                <th>Estado</th>
                <th>Capacidad</th>
                <th>Zonas</th>
                <th>Tipos</th>
                <th>Contacto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : carpenters.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Users size={40} />
                      <p>No se encontraron carpinteros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                carpenters.map(c => {
                  const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.inactive;
                  const capacityPercent = c.max_capacity > 0 ? (c.current_load / c.max_capacity) * 100 : 0;

                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/carpinteros/${c.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {c.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{c.full_name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${statusInfo.color}15`, color: statusInfo.color }}>
                          <span className="status-dot" style={{ background: statusInfo.color }} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.825rem' }}>{c.current_load} / {c.max_capacity}</div>
                          <div style={{ width: '80px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{
                              width: `${Math.min(capacityPercent, 100)}%`,
                              height: '100%',
                              background: capacityPercent >= 80 ? 'var(--danger)' : capacityPercent >= 50 ? 'var(--warning)' : 'var(--success)',
                              borderRadius: '2px',
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '150px' }}>
                          {(c.zones || '').split(',').slice(0, 2).map((zone, i) => (
                            <span key={i} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                              {zone.trim()}
                            </span>
                          ))}
                          {(c.zones || '').split(',').length > 2 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>+{(c.zones || '').split(',').length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                          {(c.capable_types || '').split(',').slice(0, 2).map((type, i) => (
                            <span key={i} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                              {type.trim()}
                            </span>
                          ))}
                          {(c.capable_types || '').split(',').length > 2 && (
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>+{(c.capable_types || '').split(',').length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{c.phone || '—'}</span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/carpinteros/${c.id}`); }}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
