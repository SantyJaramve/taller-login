// =============================================================================
// PAGINA DE LOGIN - CocinasApp
// =============================================================================
// Vistas: login, register, forgot-password, reset-password
// Features: saludo dinamico, recordar sesion, validacion en tiempo real,
//           indicador de seguridad de contrasena, modo oscuro, recuperacion
//           de contrasena, bloqueo por intentos fallidos.
// =============================================================================

import { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { ChefHat, AlertCircle, UserPlus, Eye, EyeOff, ArrowLeft, Shield, CheckCircle, Clock } from 'lucide-react';
import '../styles/login.css';

// --- Datos de respuesta del login ---
interface AuthData {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    role_display_name: string;
  };
}

// --- Saludo segun hora del dia ---
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Débil', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Regular', color: '#F59E0B' };
  if (score <= 3) return { score, label: 'Buena', color: '#3B82F6' };
  if (score <= 4) return { score, label: 'Fuerte', color: '#10B981' };
  return { score, label: 'Muy fuerte', color: '#059669' };
}

type LoginView = 'login' | 'register' | 'forgot' | 'reset';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function LoginPage() {
  // --- Estado de la vista actual ---
  const [view, setView] = useState<LoginView>('login');

  // --- Estado del formulario de login ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<AuthData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { completeLogin } = useAuth();
  const { showToast } = useToast();

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // --- Estado del formulario de registro ---
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // --- Estado del formulario de recuperacion de contrasena ---
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // --- Validacion en tiempo real ---
  const loginErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (touched.username && !username.trim()) errs.username = 'El usuario es requerido';
    if (touched.password && !password) errs.password = 'La contraseña es requerida';
    return errs;
  }, [username, password, touched]);

  const regErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (touched.regFullName && !regFullName.trim()) errs.regFullName = 'El nombre es requerido';
    if (touched.regFullName && regFullName.trim().length > 0 && regFullName.trim().length < 3) errs.regFullName = 'Mínimo 3 caracteres';
    if (touched.regEmail && !regEmail.trim()) errs.regEmail = 'El correo es requerido';
    if (touched.regEmail && regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) errs.regEmail = 'Formato de correo inválido';
    if (touched.regUsername && !regUsername.trim()) errs.regUsername = 'El usuario es requerido';
    if (touched.regUsername && regUsername.trim().length > 0 && regUsername.trim().length < 4) errs.regUsername = 'Mínimo 4 caracteres';
    if (touched.regPassword && regPassword.length > 0 && regPassword.length < 6) errs.regPassword = 'Mínimo 6 caracteres';
    if (touched.regConfirm && regConfirm && regPassword !== regConfirm) errs.regConfirm = 'Las contraseñas no coinciden';
    return errs;
  }, [regFullName, regEmail, regUsername, regPassword, regConfirm, touched]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const passwordStrength = useMemo(() => getPasswordStrength(regPassword), [regPassword]);

  const handleVideoEnd = useCallback(() => {
    if (pendingAuth) {
      completeLogin(pendingAuth.token, pendingAuth.user);
    }
  }, [pendingAuth, completeLogin]);

  // --- Handlers de提交 ---

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ username: true, password: true });

    if (!username.trim() || !password) {
      setError('Complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<AuthData>('/auth/login', { username, password, remember_me: rememberMe });
      setPendingAuth(response);
      setIsExiting(true);
      setTimeout(() => {
        setVideoActive(true);
        setTimeout(() => {
          videoRef.current?.play().catch(() => {
            handleVideoEnd();
          });
        }, 100);
      }, 200);
    } catch (err: any) {
      const msg = err.message || 'Credenciales inválidas';
      if (msg.includes('bloqueada')) {
        setError(msg);
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const validateRegister = (): string | null => {
    if (!regFullName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword || !regConfirm) {
      return 'Todos los campos son obligatorios';
    }
    if (regFullName.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) return 'El formato del correo no es válido';
    if (regUsername.trim().length < 4) return 'El usuario debe tener al menos 4 caracteres';
    if (regPassword.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (regPassword !== regConfirm) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const validationError = validateRegister();
    if (validationError) {
      setRegError(validationError);
      return;
    }

    setRegLoading(true);
    try {
      await api.post('/auth/register', {
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        username: regUsername.trim(),
        password: regPassword,
        confirm_password: regConfirm,
      });
      setRegSuccess('Registro exitoso. Ahora puede iniciar sesión.');
      showToast('Cuenta creada exitosamente', 'success');
      setRegFullName('');
      setRegEmail('');
      setRegUsername('');
      setRegPassword('');
      setRegConfirm('');
      setTouched({});
      setTimeout(() => {
        setView('login');
        setRegSuccess('');
      }, 2000);
    } catch (err: any) {
      setRegError(err.message || 'Error al registrar');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('El correo electrónico es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError('El formato del correo no es válido');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post<{ message: string; reset_token?: string }>('/auth/forgot-password', { email: forgotEmail.trim() });
      if (res.reset_token) {
        setResetToken(res.reset_token);
        setView('reset');
        showToast('Token de recuperación generado', 'info');
      } else {
        setForgotSuccess(res.message);
        showToast(res.message, 'info');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error al procesar la solicitud');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetPasswordVal) {
      setResetError('La contraseña es requerida');
      return;
    }
    if (resetPasswordVal.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', { token: resetToken, password: resetPasswordVal });
      setResetSuccess(res.message);
      showToast('Contraseña actualizada exitosamente', 'success');
      setTimeout(() => {
        setView('login');
        setResetToken('');
        setResetPasswordVal('');
        setResetSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  const resetAllForms = () => {
    setError('');
    setRegError('');
    setRegSuccess('');
    setForgotError('');
    setForgotSuccess('');
    setResetError('');
    setResetSuccess('');
    setTouched({});
  };

  // --- JSX: 4 vistas (login, register, forgot, reset) ---
  return (
    <div className="login-page">
      <div className="login-bg">
        <img src="/fondol.jpeg" alt="" />
      </div>

      {videoActive && (
        <div className="login-video-layer">
          <video
            ref={videoRef}
            src="/anil.mp4"
            className="login-video"
            muted
            playsInline
            onEnded={handleVideoEnd}
          />
        </div>
      )}

      <div className={`login-card-wrapper ${isExiting ? 'login-card-wrapper--exit' : ''}`}>
        {view === 'login' && (
          <>
            <div className="login-glass">
              <div className="login-logo">
                <div className="login-logo-icon">
                  <ChefHat size={20} />
                </div>
                <span className="login-logo-text">CocinasApp</span>
              </div>

              <h1 className="login-title">{getGreeting()}</h1>
              <p className="login-subtitle">Ingrese sus credenciales para acceder</p>

              {error && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <form className="login-form" onSubmit={handleLoginSubmit}>
                <div className="input-group">
                  <label htmlFor="username">Usuario o correo electrónico</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => handleBlur('username')}
                    required
                    autoComplete="username"
                    disabled={isExiting}
                    className={loginErrors.username ? 'input-error' : ''}
                  />
                  {loginErrors.username && <span className="input-error-msg">{loginErrors.username}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="password">Contraseña</label>
                  <div className="input-password-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ingrese su contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      required
                      autoComplete="current-password"
                      disabled={isExiting}
                      className={loginErrors.password ? 'input-error' : ''}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginErrors.password && <span className="input-error-msg">{loginErrors.password}</span>}
                </div>

                <div className="login-options">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isExiting}
                    />
                    <span>Recordar sesión</span>
                  </label>
                  <button
                    type="button"
                    className="login-forgot-btn"
                    onClick={() => { resetAllForms(); setView('forgot'); }}
                    disabled={isExiting}
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>

                <button type="submit" className="login-btn" disabled={loading || isExiting}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <button
                type="button"
                className="login-switch-btn"
                onClick={() => { resetAllForms(); setView('register'); }}
                disabled={isExiting}
              >
                <UserPlus size={15} />
                ¿No tienes cuenta? Registrarse
              </button>

              <div className="login-credentials">
                <div className="login-credentials-title">Credenciales de prueba</div>
                <p>
                  Admin: admin / admin123<br />
                  Supervisor: supervisor1 / super123<br />
                  Carpintero: registrar nueva cuenta
                </p>
              </div>
            </div>

            <div className="login-footer">
              CocinasApp — Gestión Integral de Instalaciones
            </div>
          </>
        )}

        {view === 'register' && (
          <>
            <div className="login-glass">
              <div className="login-logo">
                <div className="login-logo-icon">
                  <UserPlus size={20} />
                </div>
                <span className="login-logo-text">CocinasApp</span>
              </div>

              <h1 className="login-title">Crear cuenta</h1>
              <p className="login-subtitle">Regístrate como carpintero</p>

              {regError && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div className="login-success">
                  <CheckCircle size={15} />
                  {regSuccess}
                </div>
              )}

              <form className="login-form" onSubmit={handleRegisterSubmit}>
                <div className="input-group">
                  <label htmlFor="regFullName">Nombre completo</label>
                  <input
                    id="regFullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    onBlur={() => handleBlur('regFullName')}
                    autoComplete="name"
                    className={regErrors.regFullName ? 'input-error' : ''}
                  />
                  {regErrors.regFullName && <span className="input-error-msg">{regErrors.regFullName}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="regEmail">Correo electrónico</label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    onBlur={() => handleBlur('regEmail')}
                    autoComplete="email"
                    className={regErrors.regEmail ? 'input-error' : ''}
                  />
                  {regErrors.regEmail && <span className="input-error-msg">{regErrors.regEmail}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="regUsername">Usuario</label>
                  <input
                    id="regUsername"
                    type="text"
                    placeholder="juanperez"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    onBlur={() => handleBlur('regUsername')}
                    autoComplete="username"
                    className={regErrors.regUsername ? 'input-error' : ''}
                  />
                  {regErrors.regUsername && <span className="input-error-msg">{regErrors.regUsername}</span>}
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="regPassword">Contraseña</label>
                    <div className="input-password-wrapper">
                      <input
                        id="regPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        onBlur={() => handleBlur('regPassword')}
                        autoComplete="new-password"
                        className={regErrors.regPassword ? 'input-error' : ''}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        tabIndex={-1}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {regErrors.regPassword && <span className="input-error-msg">{regErrors.regPassword}</span>}

                    {regPassword && (
                      <div className="password-strength">
                        <div className="password-strength-bar">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className="password-strength-segment"
                              style={{
                                background: i <= passwordStrength.score ? passwordStrength.color : 'rgba(255,255,255,0.1)',
                              }}
                            />
                          ))}
                        </div>
                        <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="regConfirm">Confirmar contraseña</label>
                    <div className="input-password-wrapper">
                      <input
                        id="regConfirm"
                        type={showRegConfirm ? 'text' : 'password'}
                        placeholder="Repita la contraseña"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        onBlur={() => handleBlur('regConfirm')}
                        autoComplete="new-password"
                        className={regErrors.regConfirm ? 'input-error' : ''}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowRegConfirm(!showRegConfirm)}
                        tabIndex={-1}
                      >
                        {showRegConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {regErrors.regConfirm && <span className="input-error-msg">{regErrors.regConfirm}</span>}
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={regLoading}>
                  {regLoading ? 'Registrando...' : 'Registrarse'}
                </button>
              </form>

              <button
                type="button"
                className="login-switch-btn"
                onClick={() => { resetAllForms(); setView('login'); }}
              >
                <ArrowLeft size={15} />
                ¿Ya tienes cuenta? Iniciar sesión
              </button>
            </div>

            <div className="login-footer">
              CocinasApp — Gestión Integral de Instalaciones
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="login-glass">
              <div className="login-logo">
                <div className="login-logo-icon">
                  <Shield size={20} />
                </div>
                <span className="login-logo-text">CocinasApp</span>
              </div>

              <h1 className="login-title">Recuperar contraseña</h1>
              <p className="login-subtitle">Ingrese su correo electrónico para recibir un token de recuperación</p>

              {forgotError && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="login-success">
                  <CheckCircle size={15} />
                  {forgotSuccess}
                </div>
              )}

              <form className="login-form" onSubmit={handleForgotSubmit}>
                <div className="input-group">
                  <label htmlFor="forgotEmail">Correo electrónico</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>

              <button
                type="button"
                className="login-switch-btn"
                onClick={() => { resetAllForms(); setView('login'); }}
              >
                <ArrowLeft size={15} />
                Volver al inicio de sesión
              </button>
            </div>

            <div className="login-footer">
              CocinasApp — Gestión Integral de Instalaciones
            </div>
          </>
        )}

        {view === 'reset' && (
          <>
            <div className="login-glass">
              <div className="login-logo">
                <div className="login-logo-icon">
                  <Shield size={20} />
                </div>
                <span className="login-logo-text">CocinasApp</span>
              </div>

              <h1 className="login-title">Nueva contraseña</h1>
              <p className="login-subtitle">Ingrese su nueva contraseña</p>

              {resetError && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="login-success">
                  <CheckCircle size={15} />
                  {resetSuccess}
                </div>
              )}

              <form className="login-form" onSubmit={handleResetSubmit}>
                <div className="input-group">
                  <label htmlFor="resetPassword">Nueva contraseña</label>
                  <div className="input-password-wrapper">
                    <input
                      id="resetPassword"
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      tabIndex={-1}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {resetPasswordVal && (
                    <div className="password-strength">
                      <div className="password-strength-bar">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className="password-strength-segment"
                            style={{
                              background: i <= getPasswordStrength(resetPasswordVal).score
                                ? getPasswordStrength(resetPasswordVal).color
                                : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="password-strength-label"
                        style={{ color: getPasswordStrength(resetPasswordVal).color }}
                      >
                        {getPasswordStrength(resetPasswordVal).label}
                      </span>
                    </div>
                  )}
                </div>

                <button type="submit" className="login-btn" disabled={resetLoading}>
                  {resetLoading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>

              <button
                type="button"
                className="login-switch-btn"
                onClick={() => { resetAllForms(); setView('login'); }}
              >
                <ArrowLeft size={15} />
                Volver al inicio de sesión
              </button>
            </div>

            <div className="login-footer">
              CocinasApp — Gestión Integral de Instalaciones
            </div>
          </>
        )}
      </div>
    </div>
  );
}
