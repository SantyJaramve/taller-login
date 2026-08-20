import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, User } from 'lucide-react';

interface Kitchen {
  id: number;
  kitchen_number: string;
  status_display: string;
  status_color: string;
  type_display: string;
  beneficiary_name: string;
  beneficiary_address: string;
  beneficiary_zone: string;
  carpenter_name: string;
  assigned_at: string;
  created_at: string;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AgendaPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => { loadKitchens(); }, []);

  const loadKitchens = async () => {
    try {
      const response = await api.get<{ data: Kitchen[] }>('/kitchens?limit=100', token!);
      setKitchens(response.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];
  for (let i = 0; i < firstDay; i++) {
    const d = new Date(year, month, -(firstDay - i - 1));
    calendarDays.push({ day: d.getDate(), isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ day: i, isCurrentMonth: true, dateStr: d.toISOString().split('T')[0] });
  }

  const kitchensByDate: Record<string, Kitchen[]> = {};
  kitchens.forEach(k => {
    const dateStr = k.assigned_at ? k.assigned_at.split('T')[0] : k.created_at.split('T')[0];
    if (!kitchensByDate[dateStr]) kitchensByDate[dateStr] = [];
    kitchensByDate[dateStr].push(k);
  });

  const selectedKitchens = selectedDate ? (kitchensByDate[selectedDate] || []) : [];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Calendario de instalaciones</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date(year, month - 1))}>
              <ChevronLeft size={18} />
            </button>
            <h3 className="card-title" style={{ minWidth: '160px', textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date(year, month + 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '0.5rem 0' }}>
                  {d}
                </div>
              ))}
              {calendarDays.map((d, idx) => {
                const count = (kitchensByDate[d.dateStr] || []).length;
                const today = new Date().toISOString().split('T')[0];
                const isSelected = selectedDate === d.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => d.isCurrentMonth && setSelectedDate(d.dateStr)}
                    style={{
                      textAlign: 'center',
                      padding: '0.5rem 0.25rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: d.isCurrentMonth ? 'pointer' : 'default',
                      opacity: d.isCurrentMonth ? 1 : 0.3,
                      background: isSelected ? 'var(--accent)' : d.dateStr === today ? 'var(--accent-light)' : 'transparent',
                      color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: d.dateStr === today || isSelected ? 600 : 400 }}>{d.day}</div>
                    {count > 0 && (
                      <div style={{
                        fontSize: '0.6rem',
                        marginTop: '1px',
                        color: isSelected ? 'var(--text-inverse)' : 'var(--accent)',
                        fontWeight: 600,
                      }}>
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
                : 'Seleccionar fecha'}
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {!selectedDate ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <CalendarDays size={40} />
                <p>Seleccione una fecha en el calendario</p>
              </div>
            ) : selectedKitchens.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>Sin instalaciones programadas</p>
              </div>
            ) : (
              selectedKitchens.map(k => (
                <div
                  key={k.id}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid var(--border-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/cocinas/${k.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="kitchen-number">{k.kitchen_number}</span>
                    <span className="badge" style={{ background: `${k.status_color}15`, color: k.status_color, fontSize: '0.7rem' }}>
                      {k.status_display}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>{k.type_display}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <User size={11} /> {k.beneficiary_name}
                  </div>
                  {k.carpenter_name && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                      <User size={11} /> {k.carpenter_name}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
