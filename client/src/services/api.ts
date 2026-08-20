// =============================================================================
// SERVICIO API - CocinasApp
// =============================================================================
// Cliente HTTP centralizado para todas las llamadas al backend.
// Auto-lee token de localStorage. Redirige a /login en 401.
// =============================================================================

// --- URL base de la API (configurable por variable de entorno) ---
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// --- Obtener token almacenado ---
function getStoredToken(): string | null {
  return localStorage.getItem('token');
}

// --- Opciones de fetch con token opcional ---
interface FetchOptions extends RequestInit {
  token?: string;
}

// --- Funcion base de peticiones HTTP ---
async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token: explicitToken, ...fetchOptions } = options;
  const storedToken = explicitToken || getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // --- Si el token expiro, limpiar y redirigir ---
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesion expirada');
  }

  // --- Manejar errores del servidor ---
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error del servidor');
  }

  return response.json();
}

// --- API exportada con metodos HTTP ---
export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, body: any, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token }),

  put: <T>(endpoint: string, body: any, token?: string) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token }),

  patch: <T>(endpoint: string, body: any, token?: string) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),

  // --- Subir archivos (FormData, sin Content-Type automatico) ---
  upload: async <T>(endpoint: string, formData: FormData, token?: string): Promise<T> => {
    const storedToken = token || getStoredToken();
    const headers: Record<string, string> = {};
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error al subir archivo' }));
      throw new Error(error.error || 'Error del servidor');
    }
    return response.json();
  },
};

export default api;
