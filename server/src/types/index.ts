// =============================================================================
// TYPES - CocinasApp
// =============================================================================
// Definiciones de tipos TypeScript para el backend.
// Incluye: payloads JWT, request autenticado, roles y permisos.
// =============================================================================

import { Request } from 'express';

// --- Payload JWT ---
export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

// --- Request con usuario autenticado ---
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// --- Roles del sistema ---
export type RoleName = 'admin' | 'supervisor' | 'employee' | 'carpintero';

// --- Matriz de permisos por rol ---
export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'kitchens:read', 'kitchens:write', 'kitchens:delete',
    'carpenters:read', 'carpenters:write', 'carpenters:delete',
    'assignments:read', 'assignments:write',
    'evidence:read', 'evidence:write', 'evidence:validate',
    'reports:read',
    'config:read', 'config:write',
    'audit:read',
  ],
  supervisor: [
    'kitchens:read', 'kitchens:write',
    'carpenters:read', 'carpenters:write',
    'assignments:read', 'assignments:write',
    'evidence:read', 'evidence:write', 'evidence:validate',
    'reports:read',
    'observations:read', 'observations:write',
  ],
  employee: [
    'kitchens:read', 'kitchens:write',
    'carpenters:read',
    'assignments:read',
    'evidence:read',
    'observations:read', 'observations:write',
  ],
  carpintero: [
    'kitchens:read', 'kitchens:write',
    'assignments:read',
    'observations:read', 'observations:write',
  ],
};
