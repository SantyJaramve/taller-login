// =============================================================================
// BASE DE DATOS - CocinasApp
// =============================================================================
// SQLite con better-sqlite3. Tablas: roles, users, kitchen_types,
// kitchen_statuses, carpenters, carpenter_types, carpenter_zones,
// beneficiaries, kitchens, kitchen_status_history, assignments,
// evidence, observations, audit_log, password_resets, login_history.
// =============================================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || './data/cocinas.db';

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: InstanceType<typeof Database> = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS kitchen_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('inferior', 'superior', 'inferior_superior')),
      subcategory TEXT NOT NULL CHECK(subcategory IN ('basico', 'especial')),
      display_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6B7280',
      sort_order INTEGER NOT NULL DEFAULT 0,
      category TEXT CHECK(category IN ('pending', 'in_progress', 'completed', 'rejected')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carpenters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'busy', 'inactive')),
      max_capacity INTEGER DEFAULT 3,
      current_load INTEGER DEFAULT 0,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS carpenter_types (
      carpenter_id INTEGER NOT NULL,
      kitchen_type_id INTEGER NOT NULL,
      PRIMARY KEY (carpenter_id, kitchen_type_id),
      FOREIGN KEY (carpenter_id) REFERENCES carpenters(id) ON DELETE CASCADE,
      FOREIGN KEY (kitchen_type_id) REFERENCES kitchen_types(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carpenter_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carpenter_id INTEGER NOT NULL,
      zone TEXT NOT NULL,
      FOREIGN KEY (carpenter_id) REFERENCES carpenters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      address TEXT NOT NULL,
      zone TEXT,
      neighborhood TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kitchen_number TEXT UNIQUE,
      kitchen_type_id INTEGER NOT NULL,
      beneficiary_id INTEGER,
      status_id INTEGER NOT NULL,
      assigned_carpenter_id INTEGER,
      created_by INTEGER NOT NULL,
      assigned_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      assigned_at TEXT,
      installation_date TEXT,
      completed_at TEXT,
      whatsapp_message_sent INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (kitchen_type_id) REFERENCES kitchen_types(id),
      FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
      FOREIGN KEY (status_id) REFERENCES kitchen_statuses(id),
      FOREIGN KEY (assigned_carpenter_id) REFERENCES carpenters(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS kitchen_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kitchen_id INTEGER NOT NULL,
      old_status_id INTEGER,
      new_status_id INTEGER NOT NULL,
      changed_by INTEGER NOT NULL,
      changed_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      FOREIGN KEY (old_status_id) REFERENCES kitchen_statuses(id),
      FOREIGN KEY (new_status_id) REFERENCES kitchen_statuses(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kitchen_id INTEGER NOT NULL,
      carpenter_id INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled')),
      response_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id),
      FOREIGN KEY (carpenter_id) REFERENCES carpenters(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kitchen_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL,
      validated INTEGER DEFAULT 0,
      validated_by INTEGER,
      validated_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (validated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('kitchen', 'carpenter', 'beneficiary', 'assignment')),
      entity_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username_attempted TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      ip_address TEXT,
      user_agent TEXT,
      failure_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_kitchens_status ON kitchens(status_id);
    CREATE INDEX IF NOT EXISTS idx_kitchens_carpenter ON kitchens(assigned_carpenter_id);
    CREATE INDEX IF NOT EXISTS idx_kitchens_type ON kitchens(kitchen_type_id);
    CREATE INDEX IF NOT EXISTS idx_kitchen_history_kitchen ON kitchen_status_history(kitchen_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_kitchen ON assignments(kitchen_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_carpenter ON assignments(carpenter_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
    CREATE INDEX IF NOT EXISTS idx_evidence_kitchen ON evidence(kitchen_id);
    CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_carpenters_status ON carpenters(status);
    CREATE INDEX IF NOT EXISTS idx_beneficiaries_zone ON beneficiaries(zone);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);
  `);

  migrate();
  seedData();
}

function migrate(): void {
  const carpenterColumns = db.prepare("PRAGMA table_info(carpenters)").all() as any[];
  const hasUserId = carpenterColumns.some((c: any) => c.name === 'user_id');
  if (!hasUserId) {
    db.exec("ALTER TABLE carpenters ADD COLUMN user_id INTEGER REFERENCES users(id)");
  }

  const carpinteroRole = db.prepare("SELECT id FROM roles WHERE name = 'carpintero'").get();
  if (!carpinteroRole) {
    db.prepare("INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)").run('carpintero', 'Carpintero', 'Acceso limitado a sus asignaciones');
  }

  const auditColumns = db.prepare("PRAGMA table_info(audit_log)").all() as any[];
  const hasUserAgent = auditColumns.some((c: any) => c.name === 'user_agent');
  if (!hasUserAgent) {
    db.exec("ALTER TABLE audit_log ADD COLUMN user_agent TEXT");
  }
}

function seedData(): void {
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as any;
  if (roleCount.count > 0) return;

  const insertRole = db.prepare('INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)');
  insertRole.run('admin', 'Administrador', 'Acceso completo al sistema');
  insertRole.run('supervisor', 'Supervisor', 'Orientado a la operación');
  insertRole.run('employee', 'Empleado', 'Orientado a la gestión diaria');
  insertRole.run('carpintero', 'Carpintero', 'Acceso limitado a sus asignaciones');

  const statuses = [
    { name: 'pending', display_name: 'Pendiente', color: '#D97706', sort_order: 1, category: 'pending' },
    { name: 'beneficiary_contacted', display_name: 'Beneficiario Contactado', color: '#2563EB', sort_order: 2, category: 'in_progress' },
    { name: 'availability_confirmed', display_name: 'Disponibilidad Confirmada', color: '#7C3AED', sort_order: 3, category: 'in_progress' },
    { name: 'carpenter_contacted', display_name: 'Carpintero Contactado', color: '#0891B2', sort_order: 4, category: 'in_progress' },
    { name: 'pending_response', display_name: 'Pendiente de Respuesta', color: '#EA580C', sort_order: 5, category: 'in_progress' },
    { name: 'assigned', display_name: 'Asignada', color: '#16A34A', sort_order: 6, category: 'in_progress' },
    { name: 'info_sent', display_name: 'Información Enviada', color: '#4F46E5', sort_order: 7, category: 'in_progress' },
    { name: 'installing', display_name: 'En Instalación', color: '#9333EA', sort_order: 8, category: 'in_progress' },
    { name: 'evidence_received', display_name: 'Evidencia Recibida', color: '#0D9488', sort_order: 9, category: 'in_progress' },
    { name: 'completed', display_name: 'Finalizada', color: '#15803D', sort_order: 10, category: 'completed' },
    { name: 'rejected', display_name: 'Rechazada', color: '#DC2626', sort_order: 11, category: 'rejected' },
  ];

  const insertStatus = db.prepare(
    'INSERT INTO kitchen_statuses (name, display_name, color, sort_order, category) VALUES (?, ?, ?, ?, ?)'
  );
  for (const s of statuses) {
    insertStatus.run(s.name, s.display_name, s.color, s.sort_order, s.category);
  }

  const kitchenTypes = [
    { name: 'Inferior Básico', code: 'INF_BAS', category: 'inferior', subcategory: 'basico', display_name: 'Inferior Básico' },
    { name: 'Inferior Especial', code: 'INF_ESP', category: 'inferior', subcategory: 'especial', display_name: 'Inferior Especial' },
    { name: 'Superior Básico', code: 'SUP_BAS', category: 'superior', subcategory: 'basico', display_name: 'Superior Básico' },
    { name: 'Superior Especial', code: 'SUP_ESP', category: 'superior', subcategory: 'especial', display_name: 'Superior Especial' },
    { name: 'Inferior + Superior Básico', code: 'INF_SUP_BAS', category: 'inferior_superior', subcategory: 'basico', display_name: 'Inf + Sup Básico' },
    { name: 'Inferior + Superior Especial', code: 'INF_SUP_ESP', category: 'inferior_superior', subcategory: 'especial', display_name: 'Inf + Sup Especial' },
  ];

  const insertType = db.prepare(
    'INSERT INTO kitchen_types (name, code, category, subcategory, display_name) VALUES (?, ?, ?, ?, ?)'
  );
  for (const t of kitchenTypes) {
    insertType.run(t.name, t.code, t.category, t.subcategory, t.display_name);
  }

  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)'
  ).run('admin', 'admin@cocinas.com', passwordHash, 'Administrador General', 1);

  const supervisorHash = bcrypt.hashSync('super123', 10);
  db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)'
  ).run('supervisor1', 'supervisor@cocinas.com', supervisorHash, 'Carlos Supervisor', 2);

  const employeeHash = bcrypt.hashSync('emp123', 10);
  db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)'
  ).run('empleado1', 'empleado@cocinas.com', employeeHash, 'María Empleada', 3);

  seedCarpenters();
  seedKitchens();
}

function seedCarpenters(): void {
  const carpenters = [
    { name: 'Carlos Rodríguez', phone: '3101234567', whatsapp: '573101234567', status: 'available', max: 3, current: 1, zones: ['Comuna 1', 'Comuna 2', 'Comuna 3'] },
    { name: 'Andrés Gómez', phone: '3112345678', whatsapp: '573112345678', status: 'available', max: 3, current: 2, zones: ['Comuna 4', 'Comuna 5'] },
    { name: 'Juan Pérez', phone: '3123456789', whatsapp: '573123456789', status: 'busy', max: 2, current: 2, zones: ['Comuna 6', 'Comuna 7'] },
    { name: 'Luis Martínez', phone: '3134567890', whatsapp: '573134567890', status: 'available', max: 4, current: 0, zones: ['Comuna 1', 'Comuna 4', 'Comuna 6'] },
    { name: 'Pedro Sánchez', phone: '3145678901', whatsapp: '573145678901', status: 'inactive', max: 3, current: 0, zones: ['Comuna 2', 'Comuna 3'] },
    { name: 'Roberto López', phone: '3156789012', whatsapp: '573156789012', status: 'available', max: 3, current: 1, zones: ['Comuna 5', 'Comuna 7'] },
  ];

  const insertCarpenter = db.prepare(
    'INSERT INTO carpenters (full_name, phone, whatsapp, status, max_capacity, current_load) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertZone = db.prepare('INSERT INTO carpenter_zones (carpenter_id, zone) VALUES (?, ?)');
  const insertTypeRel = db.prepare('INSERT INTO carpenter_types (carpenter_id, kitchen_type_id) VALUES (?, ?)');

  const typeIds = [1, 2, 3, 4, 5, 6];

  for (const c of carpenters) {
    const result = insertCarpenter.run(c.name, c.phone, c.whatsapp, c.status, c.max, c.current);
    const carpenterId = result.lastInsertRowid;
    for (const zone of c.zones) {
      insertZone.run(carpenterId, zone);
    }
    const typesToAssign = c.name === 'Carlos Rodríguez' ? [1, 2, 5, 6] :
                          c.name === 'Andrés Gómez' ? [3, 4, 5, 6] :
                          c.name === 'Juan Pérez' ? [1, 2, 3, 4] :
                          c.name === 'Luis Martínez' ? [1, 2, 3, 4, 5, 6] :
                          [1, 2, 3, 4, 5, 6];
    for (const tid of typesToAssign) {
      insertTypeRel.run(carpenterId, tid);
    }
  }
}

function seedKitchens(): void {
  const beneficiaries = [
    { name: 'María Fernanda López', phone: '3201112233', address: 'Calle 45 #12-34', zone: 'Comuna 1', neighborhood: 'Manila' },
    { name: 'Pedro José Martínez', phone: '3212223344', address: 'Carrera 80 #45-67', zone: 'Comuna 4', neighborhood: 'San Diego' },
    { name: 'Ana Lucía Ramírez', phone: '3223334455', address: 'Diagonal 78 #23-45', zone: 'Comuna 6', neighborhood: 'Villanueva' },
    { name: 'Carlos Andrés Mejía', phone: '3234445566', address: 'Calle 10 #56-78', zone: 'Comuna 2', neighborhood: 'Estación' },
    { name: 'Laura Valentina Restrepo', phone: '3245556677', address: 'Avenida 34 #89-12', zone: 'Comuna 5', neighborhood: 'Belén' },
    { name: 'Jorge Luis Ospina', phone: '3256667788', address: 'Carrera 52 #34-56', zone: 'Comuna 7', neighborhood: 'Robledo' },
    { name: 'Sandra Milena Cardona', phone: '3267778899', address: 'Calle 67 #12-90', zone: 'Comuna 3', neighborhood: 'Aranjuez' },
    { name: 'Diego Alejandro Vélez', phone: '3278889900', address: 'Transversal 23 #45-67', zone: 'Comuna 1', neighborhood: 'San Fernando' },
    { name: 'Valentina García Hurtado', phone: '3289990011', address: 'Carrera 43 #78-90', zone: 'Comuna 4', neighborhood: 'Manila' },
    { name: 'Andrés Felipe Moreno', phone: '3290001122', address: 'Calle 34 #56-12', zone: 'Comuna 6', neighborhood: 'Castilla' },
  ];

  const insertBen = db.prepare(
    'INSERT INTO beneficiaries (full_name, phone, whatsapp, address, zone, neighborhood) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertKitchen = db.prepare(
    'INSERT INTO kitchens (kitchen_number, kitchen_type_id, beneficiary_id, status_id, created_by, assigned_carpenter_id, assigned_by, assigned_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const insertHistory = db.prepare(
    'INSERT INTO kitchen_status_history (kitchen_id, old_status_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?, ?)'
  );

  const insertAssignment = db.prepare(
    'INSERT INTO assignments (kitchen_id, carpenter_id, assigned_by, status, notes) VALUES (?, ?, ?, ?, ?)'
  );

  const kitchenConfigs = [
    { type: 1, status: 10, carpenter: 1, assignedBy: 2, beneficiary: 0, notes: 'Instalación completada exitosamente' },
    { type: 5, status: 9, carpenter: 1, assignedBy: 2, beneficiary: 1, notes: 'Evidencia pendiente de validación' },
    { type: 2, status: 8, carpenter: 2, assignedBy: 2, beneficiary: 2, notes: 'En proceso de instalación' },
    { type: 4, status: 6, carpenter: 3, assignedBy: 2, beneficiary: 3, notes: 'Carpintero aceptó la asignación' },
    { type: 6, status: 5, carpenter: 2, assignedBy: 2, beneficiary: 4, notes: 'Esperando respuesta del carpintero' },
    { type: 3, status: 4, carpenter: null as any, assignedBy: null as any, beneficiary: 5, notes: '' },
    { type: 1, status: 3, carpenter: null as any, assignedBy: null as any, beneficiary: 6, notes: 'Disponibilidad confirmada' },
    { type: 5, status: 2, carpenter: null as any, assignedBy: null as any, beneficiary: 7, notes: '' },
    { type: 2, status: 1, carpenter: null as any, assignedBy: null as any, beneficiary: 8, notes: '' },
    { type: 6, status: 11, carpenter: 4, assignedBy: 2, beneficiary: 9, notes: 'Carpintero rechazó por disponibilidad' },
    { type: 4, status: 1, carpenter: null as any, assignedBy: null as any, beneficiary: 0, notes: '' },
    { type: 3, status: 7, carpenter: 6, assignedBy: 2, beneficiary: 1, notes: 'Información enviada por WhatsApp' },
  ];

  let kitchenNum = 10480;

  for (const config of kitchenConfigs) {
    const benefResult = insertBen.run(
      beneficiaries[config.beneficiary].name,
      beneficiaries[config.beneficiary].phone,
      beneficiaries[config.beneficiary].phone,
      beneficiaries[config.beneficiary].address,
      beneficiaries[config.beneficiary].zone,
      beneficiaries[config.beneficiary].neighborhood
    );

    const result = insertKitchen.run(
      `KC-${kitchenNum}`,
      config.type,
      benefResult.lastInsertRowid,
      config.status,
      1,
      config.carpenter,
      config.assignedBy,
      config.assignedBy ? new Date().toISOString() : null,
      config.notes
    );

    const kitchenId = result.lastInsertRowid;
    insertHistory.run(kitchenId, null, config.status, 1, config.notes || 'Cocina creada');

    if (config.carpenter && config.status >= 6) {
      insertAssignment.run(kitchenId, config.carpenter, config.assignedBy || 1, 'accepted', 'Asignación aceptada');
    }

    kitchenNum++;
  }
}

export default db;
