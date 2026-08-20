import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, Plus, X } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_name: string;
  role_display_name: string;
  is_active: number;
  created_at: string;
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', role_id: '3' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get<UserItem[]>('/auth/users', token!);
      setUsers(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', { ...form, role_id: parseInt(form.role_id) }, token!);
      setShowCreate(false);
      setForm({ username: '', email: '', password: '', full_name: '', role_id: '3' });
      loadUsers();
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de usuarios del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="sidebar-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                        {u.full_name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.username}</span>
                    </div>
                  </td>
                  <td>{u.full_name}</td>
                  <td style={{ fontSize: '0.825rem' }}>{u.email}</td>
                  <td>
                    <span className="badge badge-info">
                      <Shield size={11} /> {u.role_display_name}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {new Date(u.created_at).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo usuario</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="input-group">
                  <label>Nombre completo *</label>
                  <input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>Usuario *</label>
                    <input value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>Contraseña *</label>
                    <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label>Rol *</label>
                    <select value={form.role_id} onChange={(e) => setForm(p => ({ ...p, role_id: e.target.value }))}>
                      <option value="1">Administrador</option>
                      <option value="2">Supervisor</option>
                      <option value="3">Empleado</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
