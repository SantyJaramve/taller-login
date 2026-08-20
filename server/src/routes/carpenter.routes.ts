// =============================================================================
// RUTAS DE CARPINTEROS - CocinasApp
// =============================================================================
// GET    /api/carpenters/me/stats      - Estadisticas propias (carpintero)
// GET    /api/carpenters/me/assignments - Mis asignaciones (carpintero)
// GET    /api/carpenters/me            - Mi perfil (carpintero)
// GET    /api/carpenters/stats         - Estadisticas generales
// GET    /api/carpenters               - Listar carpinteros (con filtros)
// GET    /api/carpenters/:id           - Detalle de carpintero
// POST   /api/carpenters               - Crear carpintero (admin/supervisor)
// PUT    /api/carpenters/:id           - Actualizar carpintero (admin/supervisor)
// POST   /api/carpenters/:id/observations - Agregar observacion (admin/supervisor)
// =============================================================================

import { Router } from 'express';
import {
  getCarpenters, getCarpenterById, createCarpenter, updateCarpenter,
  addCarpenterObservation, getCarpentersStats,
  getMyProfile, getMyAssignments, getMyStats
} from '../controllers/carpenter.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// --- Rutas del carpintero autenticado (deben ir ANTES de /:id) ---
router.get('/me/stats', authenticate, getMyStats);
router.get('/me/assignments', authenticate, getMyAssignments);
router.get('/me', authenticate, getMyProfile);

// --- Rutas de lectura ---
router.get('/stats', authenticate, getCarpentersStats);
router.get('/', authenticate, getCarpenters);
router.get('/:id', authenticate, getCarpenterById);

// --- Rutas admin/supervisor ---
router.post('/', authenticate, authorize('admin', 'supervisor'), createCarpenter);
router.put('/:id', authenticate, authorize('admin', 'supervisor'), updateCarpenter);
router.post('/:id/observations', authenticate, authorize('admin', 'supervisor'), addCarpenterObservation);

export default router;
