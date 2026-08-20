import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { BarChart3, TrendingUp, ChefHat, Users, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface KitchenStats {
  byStatus: Array<{ display_name: string; color: string; count: number }>;
  byType: Array<{ display_name: string; count: number }>;
  byZone: Array<{ zone: string; count: number }>;
  total: number;
}

interface CarpenterStats {
  total: number;
  available: number;
  busy: number;
  inactive: number;
}

const COLORS = ['#A08B6E', '#2563EB', '#7C3AED', '#0891B2', '#EA580C', '#16A34A', '#4F46E5', '#9333EA', '#0D9488', '#DC2626'];

export default function ReportsPage() {
  const { token } = useAuth();
  const [kitchenStats, setKitchenStats] = useState<KitchenStats | null>(null);
  const [carpenterStats, setCarpenterStats] = useState<CarpenterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [k, c] = await Promise.all([
        api.get<KitchenStats>('/kitchens/stats', token!),
        api.get<CarpenterStats>('/carpenters/stats', token!),
      ]);
      setKitchenStats(k);
      setCarpenterStats(c);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="empty-state"><p>Cargando reportes...</p></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Indicadores y análisis operativo</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cocinas por estado</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kitchenStats?.byStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="display_name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(kitchenStats?.byStatus || []).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cocinas por tipo</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kitchenStats?.byType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="display_name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Cocinas por zona</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kitchenStats?.byZone || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="zone" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}
                />
                <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Estado de carpinteros</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Disponibles', value: carpenterStats?.available || 0 },
                    { name: 'Ocupados', value: carpenterStats?.busy || 0 },
                    { name: 'Inactivos', value: carpenterStats?.inactive || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill="var(--success)" />
                  <Cell fill="var(--warning)" />
                  <Cell fill="var(--text-tertiary)" />
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <span className="status-dot" style={{ background: 'var(--success)' }} /> Disponibles: {carpenterStats?.available}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <span className="status-dot" style={{ background: 'var(--warning)' }} /> Ocupados: {carpenterStats?.busy}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <span className="status-dot" style={{ background: 'var(--text-tertiary)' }} /> Inactivos: {carpenterStats?.inactive}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
