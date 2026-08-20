// =============================================================================
// RUTAS DE ASIGNACIONES - CocinasApp
// =============================================================================
// GET    /api/assignments                - Listar asignaciones
// GET    /api/assignments/candidates/:id - Candidatos para una cocina
// POST   /api/assignments                - Crear asignacion (admin/supervisor)
// PATCH  /api/assignments/:id/respond    - Responder asignacion (carpintero)
// =============================================================================

import { Router } from 'express';
import { getCandidates, createAssignment, respondAssignment, getAssignments } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAssignments);
router.get('/candidates/:kitchenId', authenticate, getCandidates);
router.post('/', authenticate, authorize('admin', 'supervisor'), createAssignment);
router.patch('/:kitchenId/respond', authenticate, respondAssignment);

export default router;
