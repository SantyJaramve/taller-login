// =============================================================================
// SERVIDOR PRINCIPAL - CocinasApp
// =============================================================================
// Arranca Express en modo local (desarrollo).
// En produccion, netlify/functions/api.js usa app.ts directamente.
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { initializeDatabase } from './db/schema';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3001');

(async () => {
  try {
    await initializeDatabase();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
})();
