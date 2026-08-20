import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ClipboardList, Search, Filter } from 'lucide-react';

interface Kitchen {
  id: number;
  kitchen_number: string;
  status_name: string;
  status_display: string;
  status_color: string;
  status_category: string;
  type_display: string;
  type_code: string;
  beneficiary_name: string;
  beneficiary_address: string;
  beneficiary_phone: string;
  beneficiary_zone: string;
  created_at: string;
}

export default function CarpenterAssignmentsPage() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [filtered, setFiltered] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await api.get<Kitchen[]>('/carpenters/me/assignments');
        setKitchens(data);
        setFiltered(data);
      } catch (err) {
        console.error('Error loading assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  useEffect(() => {
    let result = kitchens;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(k =>
        k.kitchen_number.toLowerCase().includes(s) ||
        k.beneficiary_name.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      result = result.filter(k => k.status_category === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, kitchens]);

  if (loading) {
    return <div className="page-loading">Cargando asignaciones...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis Asignaciones</h1>
          <p className="page-subtitle">{kitchens.length} cocina{kitchens.length !== 1 ? 's' : ''} asignada{kitchens.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por número o beneficiario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={40} style={{ opacity: 0.3 }} />
          <p>{kitchens.length === 0 ? 'No tienes asignaciones' : 'No se encontraron resultados'}</p>
        </div>
      ) : (
        <div className="assignments-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>Beneficiario</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(kitchen => (
                <tr key={kitchen.id} className="clickable-row" onClick={() => navigate(`/mi-trabajo/cocinas/${kitchen.id}`)}>
                  <td><strong>{kitchen.kitchen_number}</strong></td>
                  <td>{kitchen.type_display}</td>
                  <td>
                    <div>{kitchen.beneficiary_name}</div>
                    <div className="text-secondary">{kitchen.beneficiary_address}</div>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ background: kitchen.status_color + '20', color: kitchen.status_color }}
                    >
                      {kitchen.status_display}
                    </span>
                  </td>
                  <td>
                    <button className="btn-sm">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
