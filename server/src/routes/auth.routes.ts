// =============================================================================
// RUTAS DE AUTENTICACION - CocinasApp
// =============================================================================
// POST   /api/auth/login           - Iniciar sesion
// POST   /api/auth/register        - Registrar carpintero (publico)
// POST   /api/auth/forgot-password  - Solicitar recuperacion de contrasena
// POST   /api/auth/reset-password   - Restablecer contrasena con token
// GET    /api/auth/profile          - Obtener perfil del usuario autenticado
// GET    /api/auth/users            - Listar usuarios (admin)
// POST   /api/auth/users            - Crear usuario (admin)
// PUT    /api/auth/users/:id        - Actualizar usuario (admin)
// GET    /api/auth/login-history    - Historial de accesos
// =============================================================================

import { Router } from 'express';
import {
  login, register, getProfile, getUsers, createUser, updateUser,
  forgotPassword, resetPassword, getLoginHistory
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// --- Rutas publicas ---
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// --- Rutas autenticadas ---
router.get('/profile', authenticate, getProfile);
router.get('/login-history', authenticate, getLoginHistory);

// --- Rutas solo admin ---
router.get('/users', authenticate, authorize('admin'), getUsers);
router.post('/users', authenticate, authorize('admin'), createUser);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);

export default router;
