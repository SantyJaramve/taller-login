import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  ArrowLeft, Clock, MapPin, Phone, User, ChefHat,
  MessageSquare, Camera, CheckCircle, AlertCircle,
  Send, Plus, Eye, Calendar
} from 'lucide-react';

interface KitchenDetail {
  id: number;
  kitchen_number: string;
  status_name: string;
  status_display: string;
  status_color: string;
  type_name: string;
  type_display: string;
  type_code: string;
  beneficiary_name: string;
  beneficiary_phone: string;
  beneficiary_whatsapp: string;
  beneficiary_address: string;
  beneficiary_zone: string;
  beneficiary_neighborhood: string;
  carpenter_name: string;
  carpenter_phone: string;
  carpenter_whatsapp: string;
  notes: string;
  created_at: string;
  assigned_at: string;
  completed_at: string;
  created_by_name: string;
  assigned_by_name: string;
  history: Array<{
    id: number;
    status_name: string;
    status_color: string;
    changed_by_name: string;
    changed_at: string;
    notes: string;
  }>;
  observations: Array<{
    id: number;
    content: string;
    user_name: string;
    created_at: string;
  }>;
  evidence: Array<{
    id: number;
    image_url: string;
    uploaded_by_name: string;
    validated: number;
    validated_by_name: string;
    notes: string;
    created_at: string;
  }>;
}

export default function KitchenDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [kitchen, setKitchen] = useState<KitchenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newObservation, setNewObservation] = useState('');
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  useEffect(() => {
    loadKitchen();
  }, [id]);

  const loadKitchen = async () => {
    try {
      const data = await api.get<KitchenDetail>(`/kitchens/${id}`, token!);
      setKitchen(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/kitchens/${id}/status`, { status_name: newStatus }, token!);
      setShowStatusChange(false);
      loadKitchen();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    try {
      await api.post(`/kitchens/${id}/observations`, { content: newObservation }, token!);
      setNewObservation('');
      loadKitchen();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleWhatsApp = async () => {
    try {
      const data = await api.get<{ whatsapp_url: string; message: string }>(
        `/kitchens/${id}/whatsapp`, token!
      );
      setWhatsappUrl(data.whatsapp_url);
      window.open(data.whatsapp_url, '_blank');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAssign = () => {
    navigate(`/asignaciones?kitchen=${id}`);
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      await api.upload(`/kitchens/${id}/evidence`, formData, token!);
      loadKitchen();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className="empty-state"><p>Cargando cocina...</p></div>;
  }

  if (!kitchen) {
    return <div className="empty-state"><p>Cocina no encontrada</p></div>;
  }

  const nextStatuses: Record<string, Array<{ name: string; label: string }>> = {
    pending: [{ name: 'beneficiary_contacted', label: 'Marcar como contactado' }],
    beneficiary_contacted: [{ name: 'availability_confirmed', label: 'Confirmar disponibilidad' }],
    availability_confirmed: [{ name: 'carpenter_contacted', label: 'Contactar carpintero' }],
    carpenter_contacted: [{ name: 'pending_response', label: 'Esperar respuesta' }],
    assigned: [{ name: 'info_sent', label: 'Enviar información' }],
    info_sent: [{ name: 'installing', label: 'Iniciar instalación' }],
    installing: [{ name: 'evidence_received', label: 'Recibir evidencia' }],
    evidence_received: [{ name: 'completed', label: 'Finalizar' }],
  };

  const availableTransitions = nextStatuses[kitchen.status_name] || [];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/cocinas')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title">{kitchen.kitchen_number}</h1>
              <span className="badge" style={{
                background: `${kitchen.status_color}15`,
                color: kitchen.status_color,
              }}>
                <span className="status-dot" style={{ background: kitchen.status_color }} />
                {kitchen.status_display}
              </span>
            </div>
            <p className="page-subtitle">{kitchen.type_display}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {kitchen.carpenter_name && (
            <button className="btn btn-success btn-sm" onClick={handleWhatsApp}>
              <MessageSquare size={14} /> WhatsApp
            </button>
          )}
          {!kitchen.carpenter_name && kitchen.status_name !== 'completed' && kitchen.status_name !== 'rejected' && (
            <button className="btn btn-primary btn-sm" onClick={handleAssign}>
              <User size={14} /> Asignar carpintero
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Beneficiario</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <User size={15} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{kitchen.beneficiary_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Phone size={15} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                  <div>
                    <div>{kitchen.beneficiary_phone || 'Sin teléfono'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', gridColumn: 'span 2' }}>
                  <MapPin size={15} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                  <div>
                    <div>{kitchen.beneficiary_address}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      {kitchen.beneficiary_zone}{kitchen.beneficiary_neighborhood ? ` · ${kitchen.beneficiary_neighborhood}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {kitchen.carpenter_name && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Carpintero asignado</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="sidebar-avatar" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
                    {kitchen.carpenter_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{kitchen.carpenter_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      {kitchen.carpenter_phone || 'Sin teléfono'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Línea de tiempo</h3>
            </div>
            <div className="card-body">
              <div className="timeline">
                {kitchen.history.map((item, idx) => (
                  <div key={item.id} className="timeline-item">
                    <div className="timeline-date">
                      {new Date(item.changed_at).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="timeline-content">
                      <span className="badge" style={{ background: `${item.status_color}15`, color: item.status_color, marginBottom: '2px' }}>
                        {item.status_name}
                      </span>
                      {item.notes && (
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="timeline-user">{item.changed_by_name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {kitchen.evidence.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Evidencia fotográfica</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {kitchen.evidence.map(ev => (
                    <div key={ev.id} style={{ position: 'relative' }}>
                      <img
                        src={ev.image_url}
                        alt="Evidencia"
                        style={{
                          width: '100%', height: '120px', objectFit: 'cover',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)',
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        {ev.uploaded_by_name} · {new Date(ev.created_at).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {availableTransitions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Avanzar estado</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableTransitions.map(t => (
                  <button key={t.name} className="btn btn-primary" onClick={() => handleStatusChange(t.name)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Observaciones</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kitchen.observations.map(obs => (
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

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Evidencia</h3>
            </div>
            <div className="card-body">
              <label className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={15} /> Subir fotografía
                <input type="file" accept="image/*" onChange={handleUploadEvidence} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <div style={{ marginBottom: '0.25rem' }}>Creada: {new Date(kitchen.created_at).toLocaleString('es-CO')}</div>
              {kitchen.assigned_at && <div style={{ marginBottom: '0.25rem' }}>Asignada: {new Date(kitchen.assigned_at).toLocaleString('es-CO')}</div>}
              {kitchen.completed_at && <div>Finalizada: {new Date(kitchen.completed_at).toLocaleString('es-CO')}</div>}
              <div style={{ marginTop: '0.25rem' }}>Creada por: {kitchen.created_by_name}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
