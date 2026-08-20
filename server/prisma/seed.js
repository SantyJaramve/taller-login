const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: creando datos iniciales...');

  // === ROLES ===
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', displayName: 'Administrador', description: 'Control total del sistema' } }),
    prisma.role.upsert({ where: { name: 'supervisor' }, update: {}, create: { name: 'supervisor', displayName: 'Supervisor', description: 'Supervisa operaciones y evidencia' } }),
    prisma.role.upsert({ where: { name: 'employee' }, update: {}, create: { name: 'employee', displayName: 'Empleado', description: 'Empleado general' } }),
    prisma.role.upsert({ where: { name: 'carpintero' }, update: {}, create: { name: 'carpintero', displayName: 'Carpintero', description: 'Instalador de cocinas' } }),
  ]);
  console.log(`  Roles: ${roles.length}`);

  // === KITCHEN TYPES ===
  const kitchenTypes = await Promise.all([
    prisma.kitchenType.upsert({ where: { code: 'INF_BAS' }, update: {}, create: { name: 'Inferior Basico', code: 'INF_BAS', category: 'inferior', subcategory: 'basico', displayName: 'Inferior Basico' } }),
    prisma.kitchenType.upsert({ where: { code: 'INF_ESP' }, update: {}, create: { name: 'Inferior Especial', code: 'INF_ESP', category: 'inferior', subcategory: 'especial', displayName: 'Inferior Especial' } }),
    prisma.kitchenType.upsert({ where: { code: 'SUP_BAS' }, update: {}, create: { name: 'Superior Basico', code: 'SUP_BAS', category: 'superior', subcategory: 'basico', displayName: 'Superior Basico' } }),
    prisma.kitchenType.upsert({ where: { code: 'SUP_ESP' }, update: {}, create: { name: 'Superior Especial', code: 'SUP_ESP', category: 'superior', subcategory: 'especial', displayName: 'Superior Especial' } }),
    prisma.kitchenType.upsert({ where: { code: 'INF_SUP_BAS' }, update: {}, create: { name: 'Inf + Sup Basico', code: 'INF_SUP_BAS', category: 'inferior_superior', subcategory: 'basico', displayName: 'Inf + Sup Basico' } }),
    prisma.kitchenType.upsert({ where: { code: 'INF_SUP_ESP' }, update: {}, create: { name: 'Inf + Sup Especial', code: 'INF_SUP_ESP', category: 'inferior_superior', subcategory: 'especial', displayName: 'Inf + Sup Especial' } }),
  ]);
  console.log(`  Kitchen Types: ${kitchenTypes.length}`);

  // === KITCHEN STATUSES ===
  const statuses = [
    { name: 'pending', displayName: 'Pendiente', color: '#F59E0B', sortOrder: 1, category: 'pendiente' },
    { name: 'beneficiary_contacted', displayName: 'Beneficiario Contactado', color: '#3B82F6', sortOrder: 2, category: 'en_proceso' },
    { name: 'availability_confirmed', displayName: 'Disponibilidad Confirmada', color: '#6366F1', sortOrder: 3, category: 'en_proceso' },
    { name: 'carpenter_contacted', displayName: 'Carpintero Contactado', color: '#8B5CF6', sortOrder: 4, category: 'en_proceso' },
    { name: 'pending_response', displayName: 'Pendiente de Respuesta', color: '#F97316', sortOrder: 5, category: 'en_proceso' },
    { name: 'assigned', displayName: 'Asignada', color: '#10B981', sortOrder: 6, category: 'en_proceso' },
    { name: 'info_sent', displayName: 'Informacion Enviada', color: '#06B6D4', sortOrder: 7, category: 'en_proceso' },
    { name: 'installing', displayName: 'En Instalacion', color: '#8B5CF6', sortOrder: 8, category: 'en_proceso' },
    { name: 'evidence_received', displayName: 'Evidencia Recibida', color: '#EC4899', sortOrder: 9, category: 'en_proceso' },
    { name: 'completed', displayName: 'Finalizada', color: '#22C55E', sortOrder: 10, category: 'completado' },
    { name: 'rejected', displayName: 'Rechazada', color: '#EF4444', sortOrder: 11, category: 'rechazado' },
  ];

  for (const s of statuses) {
    await prisma.kitchenStatus.upsert({ where: { name: s.name }, update: {}, create: s });
  }
  console.log(`  Kitchen Statuses: ${statuses.length}`);

  // === USUARIO ADMIN ===
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const adminRole = roles.find((r) => r.name === 'admin');

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@cocinas.com',
      passwordHash: adminPassword,
      fullName: 'Administrador',
      roleId: adminRole.id,
    },
  });
  console.log('  Usuario admin: admin / admin123');

  // === USUARIO SUPERVISOR ===
  const supPassword = bcrypt.hashSync('super123', 10);
  const supRole = roles.find((r) => r.name === 'supervisor');

  await prisma.user.upsert({
    where: { username: 'supervisor' },
    update: {},
    create: {
      username: 'supervisor',
      email: 'supervisor@cocinas.com',
      passwordHash: supPassword,
      fullName: 'Supervisor General',
      roleId: supRole.id,
    },
  });
  console.log('  Usuario supervisor: supervisor / super123');

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
