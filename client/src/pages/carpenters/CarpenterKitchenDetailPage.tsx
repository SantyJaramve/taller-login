import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, MapPin, Phone, Clock, Save, MessageSquare } from 'lucide-react';

interface KitchenDetail {
  id: number;
  kitchen_number: string;
  status_name: string;
  status_display: string;
  status_color: string;
  type_display: string;
  type_code: string;
  beneficiary_name: string;
  beneficiary_phone: string;
  beneficiary_address: string;
  beneficiary_zone: string;
  beneficiary_neighborhood: string;
  carpenter_name: string;
  notes: string;
  created_at: string;
  assigned_at: string;
  history: HistoryEntry[];
  observations: Observation[];
}

interface HistoryEntry {
  id: number;
  old_status_id: number | null;
  new_status_id: number;
  status_name: string;
  status_color: string;
  changed_by_name: string;
  changed_at: string;
  notes: string;
}

interface Observation {
  id: number;
  content: string;
  user_name: string;
  created_at: string;
}

interface StatusOption {
  id: number;
  name: string;
  display_name: string;
  color: string;
  category: string;
}

export default function CarpenterKitchenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kitchen, setKitchen] = useState<KitchenDetail | null>(null);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newObservation, setNewObservation] = useState('');
  const [sendingObs, setSendingObs] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const kitchenData = await api.get<KitchenDetail>(`/kitchens/${id}`);
        setKitchen(kitchenData);
        setSelectedStatus(kitchenData.status_name);

        const statsData = await api.get<any>('/kitchens/stats');
        if (statsData.byStatus) {
          setStatuses(statsData.byStatus.map((s: any) => ({
            id: 0,
            name: s.name,
            display_name: s.display_name,
            color: s.color,
            category: s.category,
          })));
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleStatusChange = async () => {
    if (!kitchen || selectedStatus === kitchen.status_name) return;
    setSaving(true);
    try {
      await api.patch(`/kitchens/${id}/status`, {
        status_name: selectedStatus,
        notes: statusNotes || null,
      });
      const updated = await api.get<KitchenDetail>(`/kitchens/${id}`);
      setKitchen(updated);
      setSelectedStatus(updated.status_name);
      setStatusNotes('');
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    setSendingObs(true);
    try {
      await api.post(`/kitchens/${id}/observations`, { content: newObservation.trim() });
      const updated = await api.get<KitchenDetail>(`/kitchens/${id}`);
      setKitchen(updated);
      setNewObservation('');
    } catch (err: any) {
      alert(err.message || 'Error al agregar observación');
    } finally {
      setSendingObs(false);
    }
  };

  const generateWhatsApp = () => {
    if (!kitchen) return;
    const phone = kitchen.beneficiary_phone?.replace(/\D/g, '') || '';
    const message = `Hola, soy ${kitchen.carpenter_name}. Le informo sobre su cocina ${kitchen.kitchen_number}: ${kitchen.status_display}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return <div className="page-loading">Cargando detalle...</div>;
  }

  if (!kitchen) {
    return <div className="page-loading">Cocina no encontrada</div>;
  }

  const statusHasChanged = selectedStatus !== kitchen.status_name;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{kitchen.kitchen_number}</h1>
            <p className="page-subtitle">{kitchen.type_display}</p>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="section-card">
            <h2 className="section-title">Estado Actual</h2>
            <div className="current-status">
              <span
                className="status-badge-lg"
                style={{ background: kitchen.status_color + '20', color: kitchen.status_color }}
              >
                {kitchen.status_display}
              </span>
            </div>

            <div className="status-change-form">
              <label className="form-label">Cambiar estado</label>
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statuses.length > 0 ? (
                  statuses.map((s: any) => (
                    <option key={s.name} value={s.name}>{s.display_name}</option>
                  ))
                ) : (
                  <option value={kitchen.status_name}>{kitchen.status_display}</option>
                )}
              </select>

              {statusHasChanged && (
                <>
                  <textarea
                    className="form-textarea"
                    placeholder="Notas sobre el cambio de estado (opcional)"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={2}
                  />
                  <button className="btn-primary" onClick={handleStatusChange} disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Cambio'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Historial</h2>
            </div>
            <div className="timeline">
              {kitchen.history.map(entry => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: entry.status_color }} />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-status" style={{ color: entry.status_color }}>
                        {entry.status_name}
                      </span>
                      <span className="timeline-date">
                        {new Date(entry.changed_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <div className="timeline-meta">
                      por {entry.changed_by_name}
                    </div>
                    {entry.notes && (
                      <div className="timeline-notes">{entry.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Observaciones</h2>
            </div>
            <div className="observation-form">
              <textarea
                className="form-textarea"
                placeholder="Agregar una observación..."
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                rows={2}
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleAddObservation}
                disabled={sendingObs || !newObservation.trim()}
              >
                <MessageSquare size={14} />
                {sendingObs ? 'Enviando...' : 'Agregar'}
              </button>
            </div>
            {kitchen.observations.length === 0 ? (
              <p className="text-secondary" style={{ padding: '0.5rem 0' }}>Sin observaciones</p>
            ) : (
              <div className="observations-list">
                {kitchen.observations.map(obs => (
                  <div key={obs.id} className="observation-item">
                    <div className="observation-header">
                      <span className="observation-author">{obs.user_name}</span>
                      <span className="observation-date">
                        {new Date(obs.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <p className="observation-text">{obs.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="section-card">
            <h2 className="section-title">Información del Beneficiario</h2>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Nombre</span>
                <span className="info-value">{kitchen.beneficiary_name}</span>
              </div>
              <div className="info-item">
                <MapPin size={14} />
                <span className="info-value">{kitchen.beneficiary_address}</span>
              </div>
              {kitchen.beneficiary_zone && (
                <div className="info-item">
                  <span className="info-label">Zona</span>
                  <span className="info-value">{kitchen.beneficiary_zone}</span>
                </div>
              )}
              {kitchen.beneficiary_neighborhood && (
                <div className="info-item">
                  <span className="info-label">Barrio</span>
                  <span className="info-value">{kitchen.beneficiary_neighborhood}</span>
                </div>
              )}
              {kitchen.beneficiary_phone && (
                <div className="info-item">
                  <Phone size={14} />
                  <span className="info-value">{kitchen.beneficiary_phone}</span>
                </div>
              )}
            </div>
            {kitchen.beneficiary_phone && (
              <button className="btn-whatsapp" onClick={generateWhatsApp}>
                Enviar WhatsApp
              </button>
            )}
          </div>

          <div className="section-card">
            <h2 className="section-title">Detalles</h2>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Creada</span>
                <span className="info-value">
                  <Clock size={14} />
                  {new Date(kitchen.created_at).toLocaleDateString('es-CO')}
                </span>
              </div>
              {kitchen.assigned_at && (
                <div className="info-item">
                  <span className="info-label">Asignada</span>
                  <span className="info-value">
                    <Clock size={14} />
                    {new Date(kitchen.assigned_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
