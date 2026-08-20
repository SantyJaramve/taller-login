import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, ChefHat } from 'lucide-react';

interface KitchenType {
  id: number;
  display_name: string;
  code: string;
  category: string;
  subcategory: string;
}

export default function CreateKitchenPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [kitchenTypes, setKitchenTypes] = useState<KitchenType[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    kitchen_type_id: '',
    beneficiary_name: '',
    beneficiary_phone: '',
    beneficiary_whatsapp: '',
    beneficiary_address: '',
    beneficiary_zone: '',
    beneficiary_neighborhood: '',
    beneficiary_notes: '',
    notes: '',
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const types = await api.get<KitchenType[]>('/kitchens?limit=1', token!);
      // We'll use the kitchen_types from the API
      setKitchenTypes([
        { id: 1, display_name: 'Inferior Básico', code: 'INF_BAS', category: 'inferior', subcategory: 'basico' },
        { id: 2, display_name: 'Inferior Especial', code: 'INF_ESP', category: 'inferior', subcategory: 'especial' },
        { id: 3, display_name: 'Superior Básico', code: 'SUP_BAS', category: 'superior', subcategory: 'basico' },
        { id: 4, display_name: 'Superior Especial', code: 'SUP_ESP', category: 'superior', subcategory: 'especial' },
        { id: 5, display_name: 'Inf + Sup Básico', code: 'INF_SUP_BAS', category: 'inferior_superior', subcategory: 'basico' },
        { id: 6, display_name: 'Inf + Sup Especial', code: 'INF_SUP_ESP', category: 'inferior_superior', subcategory: 'especial' },
      ]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.post<{ id: number; kitchen_number: string }>('/kitchens', {
        kitchen_type_id: parseInt(formData.kitchen_type_id),
        beneficiary_name: formData.beneficiary_name,
        beneficiary_phone: formData.beneficiary_phone || undefined,
        beneficiary_whatsapp: formData.beneficiary_whatsapp || undefined,
        beneficiary_address: formData.beneficiary_address,
        beneficiary_zone: formData.beneficiary_zone || undefined,
        beneficiary_neighborhood: formData.beneficiary_neighborhood || undefined,
        beneficiary_notes: formData.beneficiary_notes || undefined,
        notes: formData.notes || undefined,
      }, token!);

      navigate(`/cocinas/${result.id}`);
    } catch (error: any) {
      alert(error.message || 'Error al crear cocina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/cocinas')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Nueva cocina</h1>
            <p className="page-subtitle">Registrar una nueva cocina de interés social</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <h3 className="card-title">Tipo de instalación</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="input-group">
                <label>Tipo de cocina *</label>
                <select name="kitchen_type_id" value={formData.kitchen_type_id} onChange={handleChange} required>
                  <option value="">Seleccionar tipo</option>
                  <optgroup label="Mueble inferior">
                    <option value="1">Inferior Básico</option>
                    <option value="2">Inferior Especial</option>
                  </optgroup>
                  <optgroup label="Mueble superior">
                    <option value="3">Superior Básico</option>
                    <option value="4">Superior Especial</option>
                  </optgroup>
                  <optgroup label="Inferior + Superior">
                    <option value="5">Inf + Sup Básico</option>
                    <option value="6">Inf + Sup Especial</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <h3 className="card-title">Información del beneficiario</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="input-group">
                <label>Nombre completo *</label>
                <input name="beneficiary_name" value={formData.beneficiary_name} onChange={handleChange} required placeholder="Nombre del beneficiario" />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input name="beneficiary_phone" value={formData.beneficiary_phone} onChange={handleChange} placeholder="Número de teléfono" />
              </div>
              <div className="input-group">
                <label>WhatsApp</label>
                <input name="beneficiary_whatsapp" value={formData.beneficiary_whatsapp} onChange={handleChange} placeholder="Número de WhatsApp" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>Dirección *</label>
                <input name="beneficiary_address" value={formData.beneficiary_address} onChange={handleChange} required placeholder="Dirección completa" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="input-group">
                <label>Zona / Comuna</label>
                <input name="beneficiary_zone" value={formData.beneficiary_zone} onChange={handleChange} placeholder="Ej: Comuna 4" />
              </div>
              <div className="input-group">
                <label>Barrio</label>
                <input name="beneficiary_neighborhood" value={formData.beneficiary_neighborhood} onChange={handleChange} placeholder="Nombre del barrio" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="input-group">
                <label>Notas del beneficiario</label>
                <textarea name="beneficiary_notes" value={formData.beneficiary_notes} onChange={handleChange} placeholder="Información adicional del beneficiario" rows={2} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <h3 className="card-title">Observaciones</h3>
          </div>
          <div className="card-body">
            <div className="input-group">
              <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Observaciones internas sobre esta cocina" rows={3} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/cocinas')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <ChefHat size={16} /> {loading ? 'Creando...' : 'Crear cocina'}
          </button>
        </div>
      </form>
    </div>
  );
}
