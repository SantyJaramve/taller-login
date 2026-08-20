// =============================================================================
// CONTROLADOR DE COCINAS - CocinasApp
// =============================================================================
// Funciones: getKitchens, getKitchenById, createKitchen, updateKitchenStatus,
//            updateKitchen, addObservation, uploadEvidence, validateEvidence,
//            generateWhatsAppMessage, getKitchensStats
// =============================================================================

import { Response } from 'express';
import db from '../db/database';
import { AuthRequest } from '../types';

export async function getKitchens(req: AuthRequest, res: Response): Promise<void> {
  const { status, type, zone, carpenter, search, page = '1', limit = '20' } = req.query;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (status) { where += ' AND ks.name = ?'; params.push(status); }
  if (type) { where += ' AND kt.id = ?'; params.push(type); }
  if (zone) { where += ' AND b.zone = ?'; params.push(zone); }
  if (carpenter) { where += ' AND c.id = ?'; params.push(carpenter); }
  if (search) {
    where += ' AND (k.kitchen_number LIKE ? OR b.full_name LIKE ? OR b.address LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const countResult = await db.prepare(`
    SELECT COUNT(*) as total
    FROM kitchens k
    LEFT JOIN kitchen_statuses ks ON k.status_id = ks.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    LEFT JOIN carpenters c ON k.assigned_carpenter_id = c.id
    ${where}
  `).get(...params) as any;

  const kitchens = await db.prepare(`
    SELECT k.*,
      ks.name as status_name, ks.display_name as status_display, ks.color as status_color, ks.category as status_category,
      kt.name as type_name, kt.display_name as type_display, kt.code as type_code, kt.category as type_category,
      b.full_name as beneficiary_name, b.phone as beneficiary_phone, b.whatsapp as beneficiary_whatsapp,
      b.address as beneficiary_address, b.zone as beneficiary_zone, b.neighborhood as beneficiary_neighborhood,
      c.full_name as carpenter_name, c.phone as carpenter_phone, c.status as carpenter_status,
      u.full_name as created_by_name,
      u2.full_name as assigned_by_name
    FROM kitchens k
    LEFT JOIN kitchen_statuses ks ON k.status_id = ks.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    LEFT JOIN carpenters c ON k.assigned_carpenter_id = c.id
    LEFT JOIN users u ON k.created_by = u.id
    LEFT JOIN users u2 ON k.assigned_by = u2.id
    ${where}
    ORDER BY k.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  res.json({
    data: kitchens,
    total: countResult.total,
    page: parseInt(page as string),
    totalPages: Math.ceil(countResult.total / parseInt(limit as string)),
  });
}

export async function getKitchenById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const kitchen = await db.prepare(`
    SELECT k.*,
      ks.name as status_name, ks.display_name as status_display, ks.color as status_color, ks.category as status_category,
      kt.name as type_name, kt.display_name as type_display, kt.code as type_code,
      kt.category as type_category, kt.subcategory as type_subcategory,
      b.full_name as beneficiary_name, b.phone as beneficiary_phone, b.whatsapp as beneficiary_whatsapp,
      b.address as beneficiary_address, b.zone as beneficiary_zone, b.neighborhood as beneficiary_neighborhood,
      b.notes as beneficiary_notes,
      c.full_name as carpenter_name, c.phone as carpenter_phone, c.whatsapp as carpenter_whatsapp,
      c.status as carpenter_status,
      u.full_name as created_by_name,
      u2.full_name as assigned_by_name
    FROM kitchens k
    LEFT JOIN kitchen_statuses ks ON k.status_id = ks.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    LEFT JOIN carpenters c ON k.assigned_carpenter_id = c.id
    LEFT JOIN users u ON k.created_by = u.id
    LEFT JOIN users u2 ON k.assigned_by = u2.id
    WHERE k.id = ?
  `).get(id);

  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const history = await db.prepare(`
    SELECT ksh.*, ks.display_name as status_name, ks.color as status_color, u.full_name as changed_by_name
    FROM kitchen_status_history ksh
    LEFT JOIN kitchen_statuses ks ON ksh.new_status_id = ks.id
    LEFT JOIN users u ON ksh.changed_by = u.id
    WHERE ksh.kitchen_id = ?
    ORDER BY ksh.changed_at ASC
  `).all(id);

  const observations = await db.prepare(`
    SELECT o.*, u.full_name as user_name
    FROM observations o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.entity_type = 'kitchen' AND o.entity_id = ?
    ORDER BY o.created_at DESC
  `).all(id);

  const evidenceList = await db.prepare(`
    SELECT e.*, u.full_name as uploaded_by_name, u2.full_name as validated_by_name
    FROM evidence e
    LEFT JOIN users u ON e.uploaded_by = u.id
    LEFT JOIN users u2 ON e.validated_by = u2.id
    WHERE e.kitchen_id = ?
    ORDER BY e.created_at DESC
  `).all(id);

  res.json({ ...kitchen, history, observations, evidence: evidenceList });
}

export async function createKitchen(req: AuthRequest, res: Response): Promise<void> {
  const { kitchen_type_id, beneficiary_name, beneficiary_phone, beneficiary_whatsapp,
    beneficiary_address, beneficiary_zone, beneficiary_neighborhood, beneficiary_notes, notes } = req.body;

  if (!kitchen_type_id || !beneficiary_name || !beneficiary_address) {
    res.status(400).json({ error: 'Tipo de cocina, nombre del beneficiario y direccion son requeridos' });
    return;
  }

  const pendingStatus = await db.prepare('SELECT id FROM kitchen_statuses WHERE name = ?').get('pending') as any;

  const benefResult = await db.prepare(
    'INSERT INTO beneficiaries (full_name, phone, whatsapp, address, zone, neighborhood, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(beneficiary_name, beneficiary_phone || null, beneficiary_whatsapp || null, beneficiary_address,
    beneficiary_zone || null, beneficiary_neighborhood || null, beneficiary_notes || null);

  const lastKitchen = await db.prepare('SELECT kitchen_number FROM kitchens ORDER BY id DESC LIMIT 1').get() as any;
  let nextNum = 10480;
  if (lastKitchen) {
    const num = parseInt(lastKitchen.kitchen_number.replace('KC-', ''));
    nextNum = num + 1;
  }

  const result = await db.prepare(
    'INSERT INTO kitchens (kitchen_number, kitchen_type_id, beneficiary_id, status_id, created_by, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(`KC-${nextNum}`, kitchen_type_id, benefResult.lastInsertRowid, pendingStatus.id, req.user!.userId, notes || null);

  await db.prepare(
    'INSERT INTO kitchen_status_history (kitchen_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?)'
  ).run(result.lastInsertRowid, pendingStatus.id, req.user!.userId, 'Cocina creada');

  res.status(201).json({ id: result.lastInsertRowid, kitchen_number: `KC-${nextNum}` });
}

export async function updateKitchenStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status_name, notes } = req.body;

  if (!status_name) {
    res.status(400).json({ error: 'El estado es requerido' });
    return;
  }

  const kitchen = await db.prepare('SELECT * FROM kitchens WHERE id = ?').get(id) as any;
  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const newStatus = await db.prepare('SELECT id FROM kitchen_statuses WHERE name = ?').get(status_name) as any;
  if (!newStatus) {
    res.status(400).json({ error: 'Estado invalido' });
    return;
  }

  await db.prepare(`UPDATE kitchens SET status_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(newStatus.id, id);

  await db.prepare(
    'INSERT INTO kitchen_status_history (kitchen_id, old_status_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(id, kitchen.status_id, newStatus.id, req.user!.userId, notes || null);

  if (status_name === 'completed') {
    await db.prepare(`UPDATE kitchens SET completed_at = datetime('now') WHERE id = ?`).run(id);
  }

  res.json({ message: 'Estado actualizado exitosamente' });
}

export async function updateKitchen(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const updates = req.body;

  const kitchen = await db.prepare('SELECT * FROM kitchens WHERE id = ?').get(id);
  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  if (updates.notes !== undefined) {
    await db.prepare(`UPDATE kitchens SET notes = ?, updated_at = datetime('now') WHERE id = ?`).run(updates.notes, id);
  }

  if (updates.whatsapp_message_sent !== undefined) {
    await db.prepare(`UPDATE kitchens SET whatsapp_message_sent = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(updates.whatsapp_message_sent ? 1 : 0, id);
  }

  res.json({ message: 'Cocina actualizada exitosamente' });
}

export async function addObservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'El contenido de la observacion es requerido' });
    return;
  }

  const result = await db.prepare(
    'INSERT INTO observations (entity_type, entity_id, user_id, content) VALUES (?, ?, ?, ?)'
  ).run('kitchen', id, req.user!.userId, content);

  res.status(201).json({ id: result.lastInsertRowid });
}

export async function uploadEvidence(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'La imagen es requerida' });
    return;
  }

  const imageUrl = `/uploads/${file.filename}`;

  const result = await db.prepare(
    'INSERT INTO evidence (kitchen_id, image_url, uploaded_by, notes) VALUES (?, ?, ?, ?)'
  ).run(id, imageUrl, req.user!.userId, req.body.notes || null);

  res.status(201).json({ id: result.lastInsertRowid, image_url: imageUrl });
}

export async function validateEvidence(req: AuthRequest, res: Response): Promise<void> {
  const { evidenceId } = req.params;
  const { validated } = req.body;

  await db.prepare(`UPDATE evidence SET validated = ?, validated_by = ?, validated_at = datetime('now') WHERE id = ?`)
    .run(validated ? 1 : 0, req.user!.userId, evidenceId);

  res.json({ message: 'Evidencia actualizada' });
}

export async function generateWhatsAppMessage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const kitchen = await db.prepare(`
    SELECT k.*, kt.display_name as type_display,
      b.full_name as beneficiary_name, b.phone as beneficiary_phone, b.address as beneficiary_address,
      b.zone as beneficiary_zone, b.neighborhood as beneficiary_neighborhood,
      c.full_name as carpenter_name
    FROM kitchens k
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    LEFT JOIN carpenters c ON k.assigned_carpenter_id = c.id
    WHERE k.id = ?
  `).get(id) as any;

  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const message = `Hola ${kitchen.carpenter_name || 'Carpintero'}, se le ha asignado una instalacion:

* Cocina: ${kitchen.kitchen_number}
* Tipo: ${kitchen.type_display}
* Beneficiario: ${kitchen.beneficiary_name}
* Direccion: ${kitchen.beneficiary_address}
* Zona: ${kitchen.beneficiary_zone || 'N/A'}
* Barrio: ${kitchen.beneficiary_neighborhood || 'N/A'}
* Telefono beneficiario: ${kitchen.beneficiary_phone || 'N/A'}

${kitchen.notes ? `Observaciones: ${kitchen.notes}` : ''}

Por favor confirmar disponibilidad. Gracias.`;

  const whatsappUrl = `https://wa.me/${kitchen.carpenter_whatsapp || ''}?text=${encodeURIComponent(message)}`;

  res.json({ message, whatsapp_url: whatsappUrl });
}

export async function getKitchensStats(req: AuthRequest, res: Response): Promise<void> {
  const total = await db.prepare('SELECT COUNT(*) as count FROM kitchens').get() as any;

  const byStatus = await db.prepare(`
    SELECT ks.name, ks.display_name, ks.color, ks.category, COUNT(k.id) as count
    FROM kitchen_statuses ks
    LEFT JOIN kitchens k ON k.status_id = ks.id
    GROUP BY ks.id
    ORDER BY ks.sort_order
  `).all();

  const byType = await db.prepare(`
    SELECT kt.display_name, kt.code, COUNT(k.id) as count
    FROM kitchen_types kt
    LEFT JOIN kitchens k ON k.kitchen_type_id = kt.id
    GROUP BY kt.id
  `).all();

  const byZone = await db.prepare(`
    SELECT b.zone, COUNT(k.id) as count
    FROM kitchens k
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    WHERE b.zone IS NOT NULL
    GROUP BY b.zone
    ORDER BY count DESC
  `).all();

  const recentActivity = await db.prepare(`
    SELECT ksh.*, k.kitchen_number, ks.display_name as status_name, u.full_name as changed_by_name
    FROM kitchen_status_history ksh
    JOIN kitchens k ON ksh.kitchen_id = k.id
    LEFT JOIN kitchen_statuses ks ON ksh.new_status_id = ks.id
    LEFT JOIN users u ON ksh.changed_by = u.id
    ORDER BY ksh.changed_at DESC
    LIMIT 10
  `).all();

  const uncontacted = await db.prepare(`SELECT COUNT(*) as count FROM kitchens WHERE status_id = 1`).get() as any;
  const awaitingConfirmation = await db.prepare(`SELECT COUNT(*) as count FROM kitchens WHERE status_id = 2`).get() as any;
  const noCarpenter = await db.prepare(`SELECT COUNT(*) as count FROM kitchens WHERE status_id IN (3, 4) AND assigned_carpenter_id IS NULL`).get() as any;
  const pendingResponse = await db.prepare(`SELECT COUNT(*) as count FROM kitchens WHERE status_id = 5`).get() as any;
  const pendingEvidence = await db.prepare(`SELECT COUNT(*) as count FROM kitchens WHERE status_id = 9`).get() as any;
  const pendingValidation = await db.prepare(`SELECT COUNT(*) as count FROM evidence WHERE validated = 0`).get() as any;

  res.json({
    total: total.count,
    byStatus,
    byType,
    byZone,
    recentActivity,
    pendingAttention: {
      uncontacted: uncontacted.count,
      awaitingConfirmation: awaitingConfirmation.count,
      noCarpenter: noCarpenter.count,
      pendingResponse: pendingResponse.count,
      pendingEvidence: pendingEvidence.count,
      pendingValidation: pendingValidation.count,
    },
  });
}
