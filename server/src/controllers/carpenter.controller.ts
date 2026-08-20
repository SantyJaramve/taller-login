// =============================================================================
// CONTROLADOR DE CARPINTEROS - CocinasApp
// =============================================================================
// Funciones: getMyProfile, getMyAssignments, getMyStats (portal carpintero)
//            getCarpenters, getCarpenterById, createCarpenter, updateCarpenter,
//            addCarpenterObservation, getCarpentersStats (admin/supervisor)
// =============================================================================

import { Response } from 'express';
import db from '../db/schema';
import { AuthRequest } from '../types';

export function getMyProfile(req: AuthRequest, res: Response): void {
  const carpenter = db.prepare(`
    SELECT c.*,
      GROUP_CONCAT(DISTINCT cz.zone) as zones,
      GROUP_CONCAT(DISTINCT kt.display_name) as capable_types
    FROM carpenters c
    LEFT JOIN carpenter_zones cz ON c.id = cz.carpenter_id
    LEFT JOIN carpenter_types ct ON c.id = ct.carpenter_id
    LEFT JOIN kitchen_types kt ON ct.kitchen_type_id = kt.id
    WHERE c.user_id = ? AND c.is_active = 1
    GROUP BY c.id
  `).get(req.user!.userId);

  if (!carpenter) {
    res.status(404).json({ error: 'Perfil de carpintero no encontrado' });
    return;
  }

  res.json(carpenter);
}

export function getMyAssignments(req: AuthRequest, res: Response): void {
  const carpenter = db.prepare('SELECT id FROM carpenters WHERE user_id = ?').get(req.user!.userId) as any;
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const kitchens = db.prepare(`
    SELECT k.*,
      ks.name as status_name, ks.display_name as status_display, ks.color as status_color, ks.category as status_category,
      kt.name as type_name, kt.display_name as type_display, kt.code as type_code,
      b.full_name as beneficiary_name, b.phone as beneficiary_phone, b.whatsapp as beneficiary_whatsapp,
      b.address as beneficiary_address, b.zone as beneficiary_zone, b.neighborhood as beneficiary_neighborhood
    FROM kitchens k
    LEFT JOIN kitchen_statuses ks ON k.status_id = ks.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    WHERE k.assigned_carpenter_id = ?
    ORDER BY k.created_at DESC
  `).all(carpenter.id);

  res.json(kitchens);
}

export function getMyStats(req: AuthRequest, res: Response): void {
  const carpenter = db.prepare('SELECT id FROM carpenters WHERE user_id = ?').get(req.user!.userId) as any;
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ?').get(carpenter.id) as any;
  const completed = db.prepare("SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ? AND status_id = (SELECT id FROM kitchen_statuses WHERE name = 'completed')").get(carpenter.id) as any;
  const inProgress = db.prepare("SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ? AND status_id = (SELECT id FROM kitchen_statuses WHERE name IN ('installing', 'evidence_received'))").get(carpenter.id) as any;
  const pending = db.prepare("SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ? AND status_id NOT IN (SELECT id FROM kitchen_statuses WHERE name IN ('completed', 'rejected'))").get(carpenter.id) as any;
  const rejected = db.prepare("SELECT COUNT(*) as count FROM assignments WHERE carpenter_id = ? AND status = 'rejected'").get(carpenter.id) as any;

  res.json({
    total: total.count,
    completed: completed.count,
    inProgress: inProgress.count,
    pending: pending.count,
    rejected: rejected.count,
    completion_rate: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0,
  });
}

export function getCarpenters(req: AuthRequest, res: Response): void {
  const { status, zone, type, search } = req.query;

  let where = 'WHERE c.is_active = 1';
  const params: any[] = [];

  if (status) { where += ' AND c.status = ?'; params.push(status); }
  if (zone) {
    where += ' AND c.id IN (SELECT carpenter_id FROM carpenter_zones WHERE zone = ?)';
    params.push(zone);
  }
  if (type) {
    where += ' AND c.id IN (SELECT carpenter_id FROM carpenter_types WHERE kitchen_type_id = ?)';
    params.push(type);
  }
  if (search) {
    where += ' AND c.full_name LIKE ?';
    params.push(`%${search}%`);
  }

  const carpenters = db.prepare(`
    SELECT c.*,
      GROUP_CONCAT(DISTINCT cz.zone) as zones,
      GROUP_CONCAT(DISTINCT kt.display_name) as capable_types
    FROM carpenters c
    LEFT JOIN carpenter_zones cz ON c.id = cz.carpenter_id
    LEFT JOIN carpenter_types ct ON c.id = ct.carpenter_id
    LEFT JOIN kitchen_types kt ON ct.kitchen_type_id = kt.id
    ${where}
    GROUP BY c.id
    ORDER BY c.full_name
  `).all(...params);

  res.json(carpenters);
}

export function getCarpenterById(req: AuthRequest, res: Response): void {
  const { id } = req.params;

  const carpenter = db.prepare(`
    SELECT c.*
    FROM carpenters c
    WHERE c.id = ?
  `).get(id);

  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const zones = db.prepare('SELECT zone FROM carpenter_zones WHERE carpenter_id = ?').all(id).map((r: any) => r.zone);
  const types = db.prepare(`
    SELECT kt.id, kt.display_name, kt.code
    FROM carpenter_types ct
    JOIN kitchen_types kt ON ct.kitchen_type_id = kt.id
    WHERE ct.carpenter_id = ?
  `).all(id);

  const installations = db.prepare(`
    SELECT k.*, ks.display_name as status_display, ks.color as status_color,
      kt.display_name as type_display, b.full_name as beneficiary_name, b.address as beneficiary_address
    FROM kitchens k
    LEFT JOIN kitchen_statuses ks ON k.status_id = ks.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    WHERE k.assigned_carpenter_id = ?
    ORDER BY k.created_at DESC
  `).all(id);

  const observations = db.prepare(`
    SELECT o.*, u.full_name as user_name
    FROM observations o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.entity_type = 'carpenter' AND o.entity_id = ?
    ORDER BY o.created_at DESC
  `).all(id);

  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ?').get(id) as any,
    completed: db.prepare("SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ? AND status_id = (SELECT id FROM kitchen_statuses WHERE name = 'completed')").get(id) as any,
    rejected: db.prepare("SELECT COUNT(*) as count FROM assignments WHERE carpenter_id = ? AND status = 'rejected'").get(id) as any,
    accepted: db.prepare("SELECT COUNT(*) as count FROM assignments WHERE carpenter_id = ? AND status = 'accepted'").get(id) as any,
    pending: db.prepare("SELECT COUNT(*) as count FROM kitchens WHERE assigned_carpenter_id = ? AND status_id NOT IN (SELECT id FROM kitchen_statuses WHERE name IN ('completed', 'rejected'))").get(id) as any,
  };

  res.json({
    ...(carpenter as any),
    zones,
    types,
    installations,
    observations,
    stats: {
      total: stats.total.count,
      completed: stats.completed.count,
      rejected: stats.rejected.count,
      accepted: stats.accepted.count,
      pending: stats.pending.count,
      completion_rate: stats.total.count > 0 ? Math.round((stats.completed.count / stats.total.count) * 100) : 0,
      rejection_rate: stats.total.count > 0 ? Math.round((stats.rejected.count / stats.total.count) * 100) : 0,
    },
  });
}

export function createCarpenter(req: AuthRequest, res: Response): void {
  const { full_name, phone, whatsapp, email, max_capacity, zones, types, notes } = req.body;

  if (!full_name) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO carpenters (full_name, phone, whatsapp, email, max_capacity, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(full_name, phone || null, whatsapp || null, email || null, max_capacity || 3, notes || null);

  const carpenterId = result.lastInsertRowid;

  if (zones && Array.isArray(zones)) {
    const insertZone = db.prepare('INSERT INTO carpenter_zones (carpenter_id, zone) VALUES (?, ?)');
    for (const zone of zones) {
      insertZone.run(carpenterId, zone);
    }
  }

  if (types && Array.isArray(types)) {
    const insertType = db.prepare('INSERT INTO carpenter_types (carpenter_id, kitchen_type_id) VALUES (?, ?)');
    for (const typeId of types) {
      insertType.run(carpenterId, typeId);
    }
  }

  res.status(201).json({ id: carpenterId });
}

export function updateCarpenter(req: AuthRequest, res: Response): void {
  const { id } = req.params;
  const { full_name, phone, whatsapp, email, status, max_capacity, notes, zones, types } = req.body;

  const carpenter = db.prepare('SELECT id FROM carpenters WHERE id = ?').get(id);
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  db.prepare(`
    UPDATE carpenters SET 
      full_name = COALESCE(?, full_name),
      phone = COALESCE(?, phone),
      whatsapp = COALESCE(?, whatsapp),
      email = COALESCE(?, email),
      status = COALESCE(?, status),
      max_capacity = COALESCE(?, max_capacity),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(full_name, phone, whatsapp, email, status, max_capacity, notes, id);

  if (zones && Array.isArray(zones)) {
    db.prepare('DELETE FROM carpenter_zones WHERE carpenter_id = ?').run(id);
    const insertZone = db.prepare('INSERT INTO carpenter_zones (carpenter_id, zone) VALUES (?, ?)');
    for (const zone of zones) {
      insertZone.run(id, zone);
    }
  }

  if (types && Array.isArray(types)) {
    db.prepare('DELETE FROM carpenter_types WHERE carpenter_id = ?').run(id);
    const insertType = db.prepare('INSERT INTO carpenter_types (carpenter_id, kitchen_type_id) VALUES (?, ?)');
    for (const typeId of types) {
      insertType.run(id, typeId);
    }
  }

  res.json({ message: 'Carpintero actualizado exitosamente' });
}

export function addCarpenterObservation(req: AuthRequest, res: Response): void {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'El contenido es requerido' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO observations (entity_type, entity_id, user_id, content) VALUES (?, ?, ?, ?)'
  ).run('carpenter', id, req.user!.userId, content);

  res.status(201).json({ id: result.lastInsertRowid });
}

export function getCarpentersStats(req: AuthRequest, res: Response): void {
  const total = db.prepare('SELECT COUNT(*) as count FROM carpenters WHERE is_active = 1').get() as any;
  const available = db.prepare("SELECT COUNT(*) as count FROM carpenters WHERE status = 'available' AND is_active = 1").get() as any;
  const busy = db.prepare("SELECT COUNT(*) as count FROM carpenters WHERE status = 'busy' AND is_active = 1").get() as any;
  const inactive = db.prepare("SELECT COUNT(*) as count FROM carpenters WHERE status = 'inactive' AND is_active = 1").get() as any;

  res.json({
    total: total.count,
    available: available.count,
    busy: busy.count,
    inactive: inactive.count,
  });
}
