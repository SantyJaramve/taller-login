import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  ChefHat, Plus, Search, Filter, Eye, MessageSquare,
  ChevronDown
} from 'lucide-react';

interface Kitchen {
  id: number;
  kitchen_number: string;
  status_name: string;
  status_display: string;
  status_color: string;
  status_category: string;
  type_name: string;
  type_display: string;
  type_code: string;
  beneficiary_name: string;
  beneficiary_phone: string;
  beneficiary_address: string;
  beneficiary_zone: string;
  beneficiary_neighborhood: string;
  carpenter_name: string;
  carpenter_status: string;
  assigned_at: string;
  created_at: string;
  completed_at: string;
}

interface KitchenType {
  id: number;
  display_name: string;
  code: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'beneficiary_contacted', label: 'Beneficiario Contactado' },
  { value: 'availability_confirmed', label: 'Disponibilidad Confirmada' },
  { value: 'carpenter_contacted', label: 'Carpintero Contactado' },
  { value: 'pending_response', label: 'Pendiente de Respuesta' },
  { value: 'assigned', label: 'Asignada' },
  { value: 'info_sent', label: 'Información Enviada' },
  { value: 'installing', label: 'En Instalación' },
  { value: 'evidence_received', label: 'Evidencia Recibida' },
  { value: 'completed', label: 'Finalizada' },
  { value: 'rejected', label: 'Rechazada' },
];

export default function KitchensPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [kitchenTypes, setKitchenTypes] = useState<KitchenType[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  useEffect(() => {
    loadKitchens();
  }, [status, type, page]);

  const loadKitchens = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', '15');

      const response = await api.get<{ data: Kitchen[]; total: number; totalPages: number }>(
        `/kitchens?${params.toString()}`, token!
      );
      setKitchens(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error loading kitchens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadKitchens();
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cocinas</h1>
          <p className="page-subtitle">{total} cocinas registradas</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/cocinas/nueva')}>
          <Plus size={16} /> Nueva cocina
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-bar">
            <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                placeholder="Buscar por número, beneficiario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className="btn btn-outline btn-sm" onClick={handleSearch}>
              <Search size={14} /> Buscar
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cocina</th>
                <th>Tipo</th>
                <th>Beneficiario</th>
                <th>Estado</th>
                <th>Carpintero</th>
                <th>Zona</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                    Cargando...
                  </td>
                </tr>
              ) : kitchens.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <ChefHat size={40} />
                      <p>No se encontraron cocinas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                kitchens.map(kitchen => (
                  <tr key={kitchen.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cocinas/${kitchen.id}`)}>
                    <td>
                      <span className="kitchen-number">{kitchen.kitchen_number}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem' }}>{kitchen.type_display}</span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{kitchen.beneficiary_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{kitchen.beneficiary_address}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: `${kitchen.status_color}15`,
                        color: kitchen.status_color,
                      }}>
                        <span className="status-dot" style={{ background: kitchen.status_color }} />
                        {kitchen.status_display}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: kitchen.carpenter_name ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {kitchen.carpenter_name || 'Sin asignar'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem' }}>{kitchen.beneficiary_zone || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {new Date(kitchen.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cocinas/${kitchen.id}`); }}
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid var(--border-secondary)' }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </button>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Página {page} de {totalPages}
            </span>
            <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
