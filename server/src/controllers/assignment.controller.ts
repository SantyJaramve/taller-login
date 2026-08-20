// =============================================================================
// CONTROLADOR DE ASIGNACIONES - CocinasApp
// =============================================================================
// Funciones: getCandidates, createAssignment, respondAssignment, getAssignments
// =============================================================================

import { Response } from 'express';
import db from '../db/schema';
import { AuthRequest } from '../types';

export function getCandidates(req: AuthRequest, res: Response): void {
  const { kitchenId } = req.params;

  const kitchen = db.prepare(`
    SELECT k.*, kt.category as type_category, kt.subcategory as type_subcategory,
      b.zone as beneficiary_zone
    FROM kitchens k
    JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    WHERE k.id = ?
  `).get(kitchenId) as any;

  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const typeCategory = kitchen.type_category;
  const beneficiaryZone = kitchen.beneficiary_zone;

  const candidates = db.prepare(`
    SELECT c.*,
      GROUP_CONCAT(DISTINCT cz.zone) as zones,
      GROUP_CONCAT(DISTINCT ct.kitchen_type_id) as type_ids,
      (SELECT COUNT(*) FROM kitchens WHERE assigned_carpenter_id = c.id AND status_id NOT IN (SELECT id FROM kitchen_statuses WHERE name IN ('completed', 'rejected'))) as active_installations,
      (SELECT COUNT(*) FROM assignments WHERE carpenter_id = c.id AND status = 'rejected') as total_rejections,
      (SELECT COUNT(*) FROM assignments WHERE carpenter_id = c.id AND status = 'accepted') as total_acceptances,
      (SELECT COUNT(*) FROM kitchens WHERE assigned_carpenter_id = c.id) as total_assignments
    FROM carpenters c
    LEFT JOIN carpenter_zones cz ON c.id = cz.carpenter_id
    LEFT JOIN carpenter_types ct ON c.id = ct.carpenter_id
    WHERE c.is_active = 1 AND c.status != 'inactive'
    GROUP BY c.id
  `).all();

  const scored = candidates.map((candidate: any) => {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    const typeIds = candidate.type_ids ? candidate.type_ids.split(',').map(Number) : [];
    const compatible = typeIds.includes(kitchen.kitchen_type_id);
    if (compatible) {
      score += 30;
      reasons.push('Tipo compatible');
    } else {
      warnings.push('Tipo no compatible');
    }

    const zones = candidate.zones ? candidate.zones.split(',') : [];
    const zoneMatch = beneficiaryZone && zones.includes(beneficiaryZone);
    if (zoneMatch) {
      score += 25;
      reasons.push('Zona compatible');
    } else if (!beneficiaryZone) {
      score += 10;
    }

    if (candidate.status === 'available') {
      score += 20;
      reasons.push('Disponible');
    } else if (candidate.status === 'busy') {
      score += 5;
      warnings.push('Ocupado actualmente');
    }

    const availableCapacity = candidate.max_capacity - candidate.active_installations;
    if (availableCapacity > 0) {
      score += 15;
      reasons.push(`${availableCapacity} cupos disponibles`);
    } else {
      score -= 20;
      warnings.push('Sin capacidad disponible');
    }

    if (candidate.total_assignments > 0) {
      const completionRate = ((candidate.total_acceptances / candidate.total_assignments) * 100);
      if (completionRate >= 80) {
        score += 10;
        reasons.push('Buen historial');
      } else if (completionRate < 50) {
        score -= 10;
        warnings.push('Historial de rechazos elevado');
      }
    } else {
      score += 5;
      reasons.push('Sin historial previo');
    }

    return {
      ...candidate,
      available_capacity: availableCapacity,
      score,
      reasons,
      warnings,
      recommended: score >= 60,
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);

  res.json({
    kitchen: {
      id: kitchen.id,
      kitchen_number: kitchen.kitchen_number,
      type_display: kitchen.type_name,
      beneficiary_zone: beneficiaryZone,
    },
    candidates: scored,
    recommended: scored.length > 0 && scored[0].score >= 60 ? scored[0] : null,
  });
}

export function createAssignment(req: AuthRequest, res: Response): void {
  const { kitchen_id, carpenter_id, notes } = req.body;

  if (!kitchen_id || !carpenter_id) {
    res.status(400).json({ error: 'Cocina y carpintero son requeridos' });
    return;
  }

  const kitchen = db.prepare('SELECT * FROM kitchens WHERE id = ?').get(kitchen_id) as any;
  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const carpenter = db.prepare('SELECT * FROM carpenters WHERE id = ?').get(carpenter_id) as any;
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const carpenterContactedStatus = db.prepare("SELECT id FROM kitchen_statuses WHERE name = 'carpenter_contacted'").get() as any;
  const pendingResponseStatus = db.prepare("SELECT id FROM kitchen_statuses WHERE name = 'pending_response'").get() as any;

  db.prepare(
    'INSERT INTO assignments (kitchen_id, carpenter_id, assigned_by, notes) VALUES (?, ?, ?, ?)'
  ).run(kitchen_id, carpenter_id, req.user!.userId, notes || null);

  db.prepare(`UPDATE kitchens SET assigned_carpenter_id = ?, assigned_by = ?, assigned_at = datetime('now') WHERE id = ?`)
    .run(carpenter_id, req.user!.userId, kitchen_id);

  if (kitchen.status_id < pendingResponseStatus.id) {
    db.prepare('UPDATE kitchens SET status_id = ? WHERE id = ?')
      .run(pendingResponseStatus.id, kitchen_id);

    db.prepare(
      'INSERT INTO kitchen_status_history (kitchen_id, old_status_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(kitchen_id, kitchen.status_id, pendingResponseStatus.id, req.user!.userId, `Carpintero ${carpenter.full_name} contactado`);
  }

  res.status(201).json({ message: 'Asignación creada exitosamente' });
}

export function respondAssignment(req: AuthRequest, res: Response): void {
  const { kitchenId } = req.params;
  const { accepted, notes } = req.body;

  const assignment = db.prepare(
    "SELECT a.*, c.full_name as carpenter_name FROM assignments a JOIN carpenters c ON a.carpenter_id = c.id WHERE a.kitchen_id = ? AND a.status = 'pending' ORDER BY a.created_at DESC LIMIT 1"
  ).get(kitchenId) as any;

  if (!assignment) {
    res.status(404).json({ error: 'No hay asignación pendiente para esta cocina' });
    return;
  }

  const newStatus = accepted ? 'accepted' : 'rejected';
  db.prepare(`UPDATE assignments SET status = ?, response_at = datetime('now'), notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`)
    .run(newStatus, notes || null, assignment.id);

  const assignedStatus = db.prepare("SELECT id FROM kitchen_statuses WHERE name = 'assigned'").get() as any;
  const rejectedStatus = db.prepare("SELECT id FROM kitchen_statuses WHERE name = 'rejected'").get() as any;

  const kitchen = db.prepare('SELECT * FROM kitchens WHERE id = ?').get(kitchenId) as any;

  if (accepted) {
    db.prepare('UPDATE kitchens SET status_id = ? WHERE id = ?').run(assignedStatus.id, kitchenId);

    db.prepare(
      'INSERT INTO kitchen_status_history (kitchen_id, old_status_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(kitchenId, kitchen.status_id, assignedStatus.id, req.user!.userId, `Carpintero ${assignment.carpenter_name} aceptó`);

    const carpenter = db.prepare('SELECT * FROM carpenters WHERE id = ?').get(assignment.carpenter_id) as any;
    if (carpenter) {
      db.prepare('UPDATE carpenters SET current_load = current_load + 1, status = CASE WHEN current_load + 1 >= max_capacity THEN "busy" ELSE status END WHERE id = ?')
        .run(assignment.carpenter_id);
    }
  } else {
    db.prepare('UPDATE kitchens SET status_id = ?, assigned_carpenter_id = NULL, assigned_by = NULL WHERE id = ?')
      .run(rejectedStatus.id, kitchenId);

    db.prepare(
      'INSERT INTO kitchen_status_history (kitchen_id, old_status_id, new_status_id, changed_by, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(kitchenId, kitchen.status_id, rejectedStatus.id, req.user!.userId, `Carpintero ${assignment.carpenter_name} rechazó`);
  }

  res.json({ message: accepted ? 'Asignación aceptada' : 'Asignación rechazada' });
}

export function getAssignments(req: AuthRequest, res: Response): void {
  const { status, carpenter, page = '1', limit = '20' } = req.query;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (status) { where += ' AND a.status = ?'; params.push(status); }
  if (carpenter) { where += ' AND a.carpenter_id = ?'; params.push(carpenter); }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const countResult = db.prepare(`SELECT COUNT(*) as count FROM assignments a ${where}`).get(...params) as any;

  const assignments = db.prepare(`
    SELECT a.*,
      k.kitchen_number, kt.display_name as kitchen_type,
      b.full_name as beneficiary_name, b.zone as beneficiary_zone,
      c.full_name as carpenter_name, c.phone as carpenter_phone,
      u.full_name as assigned_by_name
    FROM assignments a
    JOIN kitchens k ON a.kitchen_id = k.id
    LEFT JOIN kitchen_types kt ON k.kitchen_type_id = kt.id
    LEFT JOIN beneficiaries b ON k.beneficiary_id = b.id
    JOIN carpenters c ON a.carpenter_id = c.id
    LEFT JOIN users u ON a.assigned_by = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  res.json({
    data: assignments,
    total: countResult.count,
    page: parseInt(page as string),
    totalPages: Math.ceil(countResult.count / parseInt(limit as string)),
  });
}
