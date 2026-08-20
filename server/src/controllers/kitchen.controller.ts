// =============================================================================
// CONTROLADOR DE COCINAS - CocinasApp
// =============================================================================

import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

const kitchenInclude = {
  kitchenType: true,
  status: true,
  beneficiary: true,
  assignedCarpenter: true,
  creator: { select: { fullName: true } },
  assigner: { select: { fullName: true } },
};

function formatKitchen(k: any) {
  return {
    ...k,
    beneficiary_name: k.beneficiary?.fullName,
    beneficiary_phone: k.beneficiary?.phone,
    beneficiary_whatsapp: k.beneficiary?.whatsapp,
    beneficiary_address: k.beneficiary?.address,
    beneficiary_zone: k.beneficiary?.zone,
    beneficiary_neighborhood: k.beneficiary?.neighborhood,
    beneficiary_notes: k.beneficiary?.notes,
    carpenter_name: k.assignedCarpenter?.fullName,
    carpenter_phone: k.assignedCarpenter?.phone,
    carpenter_whatsapp: k.assignedCarpenter?.whatsapp,
    carpenter_status: k.assignedCarpenter?.status,
    status_name: k.status?.name,
    status_display: k.status?.displayName,
    status_color: k.status?.color,
    status_category: k.status?.category,
    type_name: k.kitchenType?.name,
    type_display: k.kitchenType?.displayName,
    type_code: k.kitchenType?.code,
    type_category: k.kitchenType?.category,
    type_subcategory: k.kitchenType?.subcategory,
    created_by_name: k.creator?.fullName,
    assigned_by_name: k.assigner?.fullName,
  };
}

export async function getKitchens(req: AuthRequest, res: Response): Promise<void> {
  const { status, type, zone, carpenter, search, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = { name: status as string };
  if (type) where.kitchenTypeId = parseInt(type as string);
  if (zone) where.beneficiary = { zone: zone as string };
  if (carpenter) where.assignedCarpenterId = parseInt(carpenter as string);
  if (search) {
    where.OR = [
      { kitchenNumber: { contains: search as string, mode: 'insensitive' } },
      { beneficiary: { fullName: { contains: search as string, mode: 'insensitive' } } },
      { beneficiary: { address: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.kitchen.findMany({ where, include: kitchenInclude, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
    prisma.kitchen.count({ where })
  ]);

  res.json({ data: data.map(formatKitchen), total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
}

export async function getKitchenById(req: AuthRequest, res: Response): Promise<void> {
  const kitchenId = parseInt(req.params.id);
  const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId }, include: { ...kitchenInclude, statusHistory: { include: { oldStatus: true, newStatus: true, changer: { select: { fullName: true } } }, orderBy: { changedAt: 'asc' } }, evidence: { include: { uploader: { select: { fullName: true } }, validator: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } } } });

  if (!kitchen) { res.status(404).json({ error: 'Cocina no encontrada' }); return; }

  const observations = await prisma.observation.findMany({ where: { entityType: 'kitchen', entityId: kitchenId }, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } });

  const k = formatKitchen(kitchen);
  res.json({
    ...k,
    history: kitchen.statusHistory.map((h: any) => ({ ...h, status_name: h.newStatus?.displayName, status_color: h.newStatus?.color, changed_by_name: h.changer?.fullName })),
    observations: observations.map((o) => ({ ...o, user_name: o.user.fullName })),
    evidence: kitchen.evidence.map((e: any) => ({ ...e, uploaded_by_name: e.uploader?.fullName, validated_by_name: e.validator?.fullName })),
  });
}

export async function createKitchen(req: AuthRequest, res: Response): Promise<void> {
  const { kitchen_type_id, beneficiary_name, beneficiary_phone, beneficiary_whatsapp, beneficiary_address, beneficiary_zone, beneficiary_neighborhood, beneficiary_notes, notes } = req.body;
  if (!kitchen_type_id || !beneficiary_name || !beneficiary_address) { res.status(400).json({ error: 'Tipo de cocina, nombre del beneficiario y direccion son requeridos' }); return; }

  const pendingStatus = await prisma.kitchenStatus.findFirst({ where: { name: 'pending' } });
  const lastKitchen = await prisma.kitchen.findFirst({ orderBy: { id: 'desc' }, select: { kitchenNumber: true } });
  let nextNum = 10480;
  if (lastKitchen?.kitchenNumber) nextNum = parseInt(lastKitchen.kitchenNumber.replace('KC-', '')) + 1;

  const beneficiary = await prisma.beneficiary.create({ data: { fullName: beneficiary_name, phone: beneficiary_phone || null, whatsapp: beneficiary_whatsapp || null, address: beneficiary_address, zone: beneficiary_zone || null, neighborhood: beneficiary_neighborhood || null, notes: beneficiary_notes || null } });

  const kitchen = await prisma.kitchen.create({ data: { kitchenNumber: `KC-${nextNum}`, kitchenTypeId: kitchen_type_id, beneficiaryId: beneficiary.id, statusId: pendingStatus!.id, createdBy: req.user!.userId, notes: notes || null } });

  await prisma.kitchenStatusHistory.create({ data: { kitchenId: kitchen.id, newStatusId: pendingStatus!.id, changedBy: req.user!.userId, notes: 'Cocina creada' } });

  res.status(201).json({ id: kitchen.id, kitchen_number: `KC-${nextNum}` });
}

export async function updateKitchenStatus(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status_name, notes } = req.body;
  if (!status_name) { res.status(400).json({ error: 'El estado es requerido' }); return; }

  const kitchen = await prisma.kitchen.findUnique({ where: { id: parseInt(id) } });
  if (!kitchen) { res.status(404).json({ error: 'Cocina no encontrada' }); return; }

  const newStatus = await prisma.kitchenStatus.findFirst({ where: { name: status_name } });
  if (!newStatus) { res.status(400).json({ error: 'Estado invalido' }); return; }

  const updateData: any = { statusId: newStatus.id };
  if (status_name === 'completed') updateData.completedAt = new Date();

  await prisma.kitchen.update({ where: { id: parseInt(id) }, data: updateData });
  await prisma.kitchenStatusHistory.create({ data: { kitchenId: parseInt(id), oldStatusId: kitchen.statusId, newStatusId: newStatus.id, changedBy: req.user!.userId, notes: notes || null } });

  res.json({ message: 'Estado actualizado exitosamente' });
}

export async function updateKitchen(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const updates = req.body;

  const kitchen = await prisma.kitchen.findUnique({ where: { id: parseInt(id) } });
  if (!kitchen) { res.status(404).json({ error: 'Cocina no encontrada' }); return; }

  const data: any = {};
  if (updates.notes !== undefined) data.notes = updates.notes;
  if (updates.whatsapp_message_sent !== undefined) data.whatsappMessageSent = updates.whatsapp_message_sent ? 1 : 0;

  await prisma.kitchen.update({ where: { id: parseInt(id) }, data });
  res.json({ message: 'Cocina actualizada exitosamente' });
}

export async function addObservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: 'El contenido de la observacion es requerido' }); return; }

  const obs = await prisma.observation.create({ data: { entityType: 'kitchen', entityId: parseInt(id), userId: req.user!.userId, content } });
  res.status(201).json({ id: obs.id });
}

export async function uploadEvidence(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (!req.file) { res.status(400).json({ error: 'La imagen es requerida' }); return; }

  const imageUrl = `/uploads/${req.file.filename}`;
  const ev = await prisma.evidence.create({ data: { kitchenId: parseInt(id), imageUrl, uploadedBy: req.user!.userId, notes: req.body.notes || null } });
  res.status(201).json({ id: ev.id, image_url: imageUrl });
}

export async function validateEvidence(req: AuthRequest, res: Response): Promise<void> {
  const { evidenceId } = req.params;
  const { validated } = req.body;
  await prisma.evidence.update({ where: { id: parseInt(evidenceId) }, data: { validated: validated ? 1 : 0, validatedBy: req.user!.userId, validatedAt: new Date() } });
  res.json({ message: 'Evidencia actualizada' });
}

export async function generateWhatsAppMessage(req: AuthRequest, res: Response): Promise<void> {
  const kitchen = await prisma.kitchen.findUnique({ where: { id: parseInt(req.params.id) }, include: { kitchenType: true, beneficiary: true, assignedCarpenter: true } });
  if (!kitchen) { res.status(404).json({ error: 'Cocina no encontrada' }); return; }

  const message = `Hola ${kitchen.assignedCarpenter?.fullName || 'Carpintero'}, se le ha asignado una instalacion:\n\n* Cocina: ${kitchen.kitchenNumber}\n* Tipo: ${kitchen.kitchenType.displayName}\n* Beneficiario: ${kitchen.beneficiary?.fullName}\n* Direccion: ${kitchen.beneficiary?.address}\n* Zona: ${kitchen.beneficiary?.zone || 'N/A'}\n* Barrio: ${kitchen.beneficiary?.neighborhood || 'N/A'}\n* Telefono: ${kitchen.beneficiary?.phone || 'N/A'}\n\n${kitchen.notes ? `Observaciones: ${kitchen.notes}` : ''}\n\nPor favor confirmar disponibilidad. Gracias.`;

  res.json({ message, whatsapp_url: `https://wa.me/${kitchen.assignedCarpenter?.whatsapp || ''}?text=${encodeURIComponent(message)}` });
}

export async function getKitchensStats(_req: AuthRequest, res: Response): Promise<void> {
  const [total, byStatus, byType, recentActivity] = await Promise.all([
    prisma.kitchen.count(),
    prisma.kitchenStatus.findMany({ include: { _count: { select: { kitchens: true } } }, orderBy: { sortOrder: 'asc' } }),
    prisma.kitchenType.findMany({ include: { _count: { select: { kitchens: true } } } }),
    prisma.kitchenStatusHistory.findMany({ take: 10, orderBy: { changedAt: 'desc' }, include: { kitchen: { select: { kitchenNumber: true } }, newStatus: { select: { displayName: true } }, changer: { select: { fullName: true } } } }),
  ]);

  const byZone = await prisma.beneficiary.groupBy({ by: ['zone'], _count: { id: true }, where: { zone: { not: null } }, orderBy: { _count: { id: 'desc' } } });

  const [uncontacted, awaitingConfirmation, noCarpenter, pendingResponse, pendingEvidence, pendingValidation] = await Promise.all([
    prisma.kitchen.count({ where: { status: { name: 'pending' } } }),
    prisma.kitchen.count({ where: { status: { name: 'beneficiary_contacted' } } }),
    prisma.kitchen.count({ where: { statusId: { in: [3, 4] }, assignedCarpenterId: null } }),
    prisma.kitchen.count({ where: { status: { name: 'pending_response' } } }),
    prisma.kitchen.count({ where: { status: { name: 'evidence_received' } } }),
    prisma.evidence.count({ where: { validated: 0 } }),
  ]);

  res.json({
    total,
    byStatus: byStatus.map((s: any) => ({ name: s.name, display_name: s.displayName, color: s.color, category: s.category, count: s._count.kitchens })),
    byType: byType.map((t: any) => ({ display_name: t.displayName, code: t.code, count: t._count.kitchens })),
    byZone: byZone.map((z: any) => ({ zone: z.zone, count: z._count.id })),
    recentActivity: recentActivity.map((h: any) => ({ ...h, kitchen_number: h.kitchen?.kitchenNumber, status_name: h.newStatus?.displayName, changed_by_name: h.changer?.fullName })),
    pendingAttention: { uncontacted, awaitingConfirmation, noCarpenter, pendingResponse, pendingEvidence, pendingValidation },
  });
}
