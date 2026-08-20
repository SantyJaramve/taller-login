import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { GitBranch, Star, Check, X, MessageSquare, User } from 'lucide-react';

interface Assignment {
  id: number;
  kitchen_number: string;
  kitchen_type: string;
  beneficiary_name: string;
  beneficiary_zone: string;
  carpenter_name: string;
  carpenter_phone: string;
  status: string;
  assigned_by_name: string;
  created_at: string;
  notes: string;
}

interface Candidate {
  id: number;
  full_name: string;
  status: string;
  available_capacity: number;
  max_capacity: number;
  active_installations: number;
  zones: string;
  score: number;
  reasons: string[];
  warnings: string[];
  recommended: boolean;
}

export default function AssignmentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedKitchenId, setSelectedKitchenId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCarpenterId, setSelectedCarpenterId] = useState<number | null>(null);

  useEffect(() => {
    const kitchenId = searchParams.get('kitchen');
    if (kitchenId) {
      setSelectedKitchenId(parseInt(kitchenId));
      setShowAssignModal(true);
      loadCandidates(parseInt(kitchenId));
    }
    loadAssignments();
  }, [statusFilter]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get<{ data: Assignment[] }>(`/assignments?${params.toString()}`, token!);
      setAssignments(response.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const loadCandidates = async (kitchenId: number) => {
    setLoadingCandidates(true);
    try {
      const data = await api.get<{ candidates: Candidate[] }>(`/assignments/candidates/${kitchenId}`, token!);
      setCandidates(data.candidates);
    } catch (error) { console.error(error); }
    finally { setLoadingCandidates(false); }
  };

  const handleAssign = async () => {
    if (!selectedKitchenId || !selectedCarpenterId) return;
    try {
      await api.post('/assignments', {
        kitchen_id: selectedKitchenId,
        carpenter_id: selectedCarpenterId,
      }, token!);
      setShowAssignModal(false);
      setSelectedKitchenId(null);
      setSelectedCarpenterId(null);
      loadAssignments();
    } catch (error: any) {
      alert(error.message || 'Error al asignar');
    }
  };

  const handleRespond = async (kitchenId: number, accepted: boolean) => {
    try {
      await api.patch(`/assignments/${kitchenId}/respond`, { accepted }, token!);
      loadAssignments();
    } catch (error: any) {
      alert(error.message || 'Error al responder');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Asignaciones</h1>
          <p className="page-subtitle">Centro de asignación y seguimiento</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAssignModal(true); setSelectedKitchenId(null); setCandidates([]); }}>
          <GitBranch size={16} /> Nueva asignación
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-bar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="accepted">Aceptadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cocina</th>
                <th>Tipo</th>
                <th>Beneficiario</th>
                <th>Carpintero</th>
                <th>Estado</th>
                <th>Asignado por</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <GitBranch size={40} />
                      <p>No hay asignaciones registradas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignments.map(a => (
                  <tr key={a.id}>
                    <td><span className="kitchen-number" style={{ cursor: 'pointer' }} onClick={() => navigate(`/cocinas/${a.kitchen_number}`)}>{a.kitchen_number}</span></td>
                    <td><span style={{ fontSize: '0.825rem' }}>{a.kitchen_type}</span></td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.beneficiary_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{a.beneficiary_zone}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="sidebar-avatar" style={{ width: '26px', height: '26px', fontSize: '0.65rem' }}>
                          {a.carpenter_name?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontSize: '0.85rem' }}>{a.carpenter_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${a.status === 'accepted' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {a.status === 'accepted' ? 'Aceptada' : a.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </td>
                    <td><span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{a.assigned_by_name}</span></td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{new Date(a.created_at).toLocaleDateString('es-CO')}</span></td>
                    <td>
                      {a.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleRespond(a.kitchen_number ? 0 : 0, true)}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRespond(a.kitchen_number ? 0 : 0, false)}>
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedKitchenId ? 'Seleccionar carpintero' : 'Nueva asignación'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {!selectedKitchenId ? (
                <div className="input-group">
                  <label>Primero seleccione una cocina desde la vista de cocinas</label>
                  <button className="btn btn-primary" onClick={() => { setShowAssignModal(false); navigate('/cocinas'); }}>
                    Ir a Cocinas
                  </button>
                </div>
              ) : loadingCandidates ? (
                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Buscando candidatos...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {candidates.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '0.75rem 1rem',
                        border: `2px solid ${selectedCarpenterId === c.id ? 'var(--accent)' : 'var(--border-secondary)'}`,
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        background: c.recommended ? 'var(--accent-light)' : 'transparent',
                      }}
                      onClick={() => setSelectedCarpenterId(c.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {c.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {c.full_name}
                              {c.recommended && <Star size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              Capacidad: {c.available_capacity} disponible(s) | {c.active_installations} en curso
                            </div>
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: c.score >= 60 ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                          {c.score} pts
                        </span>
                      </div>
                      {c.reasons.length > 0 && (
                        <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {c.reasons.map((r, i) => (
                            <span key={i} className="badge badge-success" style={{ fontSize: '0.65rem' }}>{r}</span>
                          ))}
                          {c.warnings.map((w, i) => (
                            <span key={i} className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{w}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedCarpenterId && (
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAssign}>
                  <User size={14} /> Asignar carpintero
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
