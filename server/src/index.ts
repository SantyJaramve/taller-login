import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import prisma from './lib/prisma';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3001');

(async () => {
  try {
    await prisma.$connect();
    console.log('Base de datos conectada correctamente');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
})();
