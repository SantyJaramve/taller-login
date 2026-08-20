// =============================================================================
// SERVIDOR PRINCIPAL - CocinasApp
// =============================================================================
// Configura Express, middlewares, rutas y arranca el servidor.
// Puerto: 3001 (por defecto).
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './db/schema';
import authRoutes from './routes/auth.routes';
import kitchenRoutes from './routes/kitchen.routes';
import carpenterRoutes from './routes/carpenter.routes';
import assignmentRoutes from './routes/assignment.routes';

// --- Inicializar Express ---
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

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

// --- Inicializar base de datos y arrancar servidor ---
try {
  initializeDatabase();
  console.log('Base de datos inicializada correctamente');
} catch (error) {
  console.error('Error al inicializar la base de datos:', error);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
