// =============================================================================
// APP EXPRESS - CocinasApp
// =============================================================================
// Configuracion de Express: middlewares, rutas, error handler.
// Exportado como funcion para reutilizar en local y Netlify Functions.
// =============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes';
import kitchenRoutes from './routes/kitchen.routes';
import carpenterRoutes from './routes/carpenter.routes';
import assignmentRoutes from './routes/assignment.routes';

export function createApp(): express.Express {
  const app = express();

  // --- Strip Netlify Functions prefix (rewrite: /api/* -> /.netlify/functions/api/*) ---
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions')) {
      req.url = req.url.replace('/.netlify/functions', '') || '/';
    }
    next();
  });

  // --- Crear directorio de uploads si no existe ---
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // --- Middlewares globales ---
  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://cocinasapp.netlify.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(uploadsDir));

  // --- Rutas de la API ---
  app.use('/api/auth', authRoutes);
  app.use('/api/kitchens', kitchenRoutes);
  app.use('/api/carpenters', carpenterRoutes);
  app.use('/api/assignments', assignmentRoutes);

  // --- Health check ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Manejador global de errores ---
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
  });

  return app;
}
