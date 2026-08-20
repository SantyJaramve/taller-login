// =============================================================================
// RUTAS DE COCINAS - CocinasApp
// =============================================================================
// GET    /api/kitchens/stats           - Estadisticas generales
// GET    /api/kitchens                 - Listar cocinas (con filtros)
// GET    /api/kitchens/:id             - Detalle de cocina
// POST   /api/kitchens                 - Crear cocina
// PUT    /api/kitchens/:id             - Actualizar cocina
// PATCH  /api/kitchens/:id/status      - Cambiar estado
// POST   /api/kitchens/:id/observations - Agregar observacion
// POST   /api/kitchens/:id/evidence    - Subir evidencia (imagen)
// PATCH  /api/kitchens/evidence/:id/validate - Validar evidencia (admin/supervisor)
// GET    /api/kitchens/:id/whatsapp    - Generar mensaje WhatsApp
// =============================================================================

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getKitchens, getKitchenById, createKitchen, updateKitchenStatus,
  updateKitchen, addObservation, uploadEvidence, validateEvidence,
  generateWhatsAppMessage, getKitchensStats
} from '../controllers/kitchen.controller';
import { authenticate, authorize } from '../middleware/auth';

// --- Configuracion de multer: memoria para serverless ---
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imagenes'));
    }
  },
});

const router = Router();

// --- Rutas de lectura ---
router.get('/stats', authenticate, getKitchensStats);
router.get('/', authenticate, getKitchens);
router.get('/:id', authenticate, getKitchenById);
router.get('/:id/whatsapp', authenticate, generateWhatsAppMessage);

// --- Rutas de escritura ---
router.post('/', authenticate, createKitchen);
router.put('/:id', authenticate, updateKitchen);
router.patch('/:id/status', authenticate, updateKitchenStatus);
router.post('/:id/observations', authenticate, addObservation);
router.post('/:id/evidence', authenticate, upload.single('image'), uploadEvidence);

// --- Rutas admin/supervisor ---
router.patch('/evidence/:evidenceId/validate', authenticate, authorize('admin', 'supervisor'), validateEvidence);

export default router;
