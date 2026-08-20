import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

export async function getCandidates(req: AuthRequest, res: Response): Promise<void> {
  const { kitchenId } = req.params;

  const kitchen = await prisma.kitchen.findUnique({
    where: { id: parseInt(kitchenId) },
    include: { kitchenType: true, beneficiary: true },
  });

  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const beneficiaryZone = kitchen.beneficiary?.zone;

  const candidates = await prisma.carpenter.findMany({
    where: { isActive: 1, status: { not: 'inactive' } },
    include: {
      carpenterZones: true,
      carpenterTypes: true,
      kitchens: {
        where: { status: { name: { notIn: ['completed', 'rejected'] } } },
        select: { id: true },
      },
      assignments: { select: { status: true } },
    },
  });

  const scored = candidates.map((candidate) => {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    const typeIds = candidate.carpenterTypes.map((t) => t.kitchenTypeId);
    const compatible = typeIds.includes(kitchen.kitchenTypeId);
    if (compatible) {
      score += 30;
      reasons.push('Tipo compatible');
    } else {
      warnings.push('Tipo no compatible');
    }

    const zones = candidate.carpenterZones.map((z) => z.zone);
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

    const activeInstallations = candidate.kitchens.length;
    const availableCapacity = candidate.maxCapacity - activeInstallations;
    if (availableCapacity > 0) {
      score += 15;
      reasons.push(`${availableCapacity} cupos disponibles`);
    } else {
      score -= 20;
      warnings.push('Sin capacidad disponible');
    }

    const totalAssignments = candidate.assignments.length;
    const totalAcceptances = candidate.assignments.filter((a) => a.status === 'accepted').length;
    const totalRejections = candidate.assignments.filter((a) => a.status === 'rejected').length;

    if (totalAssignments > 0) {
      const completionRate = (totalAcceptances / totalAssignments) * 100;
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
      id: candidate.id,
      full_name: candidate.fullName,
      phone: candidate.phone,
      whatsapp: candidate.whatsapp,
      email: candidate.email,
      status: candidate.status,
      max_capacity: candidate.maxCapacity,
      zones: zones.join(', ') || null,
      active_installations: activeInstallations,
      total_rejections: totalRejections,
      total_acceptances: totalAcceptances,
      total_assignments: totalAssignments,
      available_capacity: availableCapacity,
      score,
      reasons,
      warnings,
      recommended: score >= 60,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  res.json({
    kitchen: {
      id: kitchen.id,
      kitchen_number: kitchen.kitchenNumber,
      type_display: kitchen.kitchenType.displayName,
      beneficiary_zone: beneficiaryZone,
    },
    candidates: scored,
    recommended: scored.length > 0 && scored[0].score >= 60 ? scored[0] : null,
  });
}

export async function createAssignment(req: AuthRequest, res: Response): Promise<void> {
  const { kitchen_id, carpenter_id, notes } = req.body;

  if (!kitchen_id || !carpenter_id) {
    res.status(400).json({ error: 'Cocina y carpintero son requeridos' });
    return;
  }

  const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchen_id } });
  if (!kitchen) {
    res.status(404).json({ error: 'Cocina no encontrada' });
    return;
  }

  const carpenter = await prisma.carpenter.findUnique({ where: { id: carpenter_id } });
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const pendingResponseStatus = await prisma.kitchenStatus.findFirst({ where: { name: 'pending_response' } });

  await prisma.assignment.create({
    data: { kitchenId: kitchen_id, carpenterId: carpenter_id, assignedBy: req.user!.userId, notes: notes || null },
  });

  await prisma.kitchen.update({
    where: { id: kitchen_id },
    data: { assignedCarpenterId: carpenter_id, assignedBy: req.user!.userId, assignedAt: new Date() },
  });

  if (pendingResponseStatus && kitchen.statusId < pendingResponseStatus.id) {
    const oldStatusId = kitchen.statusId;

    await prisma.kitchen.update({
      where: { id: kitchen_id },
      data: { statusId: pendingResponseStatus.id },
    });

    await prisma.kitchenStatusHistory.create({
      data: {
        kitchenId: kitchen_id,
        oldStatusId,
        newStatusId: pendingResponseStatus.id,
        changedBy: req.user!.userId,
        notes: `Carpintero ${carpenter.fullName} contactado`,
      },
    });
  }

  res.status(201).json({ message: 'Asignacion creada exitosamente' });
}

export async function respondAssignment(req: AuthRequest, res: Response): Promise<void> {
  const { kitchenId } = req.params;
  const { accepted, notes } = req.body;

  const assignment = await prisma.assignment.findFirst({
    where: { kitchenId: parseInt(kitchenId), status: 'pending' },
    include: { carpenter: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!assignment) {
    res.status(404).json({ error: 'No hay asignacion pendiente para esta cocina' });
    return;
  }

  const newStatus = accepted ? 'accepted' : 'rejected';
  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: newStatus, responseAt: new Date(), notes: notes || undefined },
  });

  const assignedStatus = await prisma.kitchenStatus.findFirst({ where: { name: 'assigned' } });
  const rejectedStatus = await prisma.kitchenStatus.findFirst({ where: { name: 'rejected' } });

  const kitchen = await prisma.kitchen.findUnique({ where: { id: parseInt(kitchenId) } });

  if (accepted && assignedStatus && kitchen) {
    await prisma.kitchen.update({
      where: { id: parseInt(kitchenId) },
      data: { statusId: assignedStatus.id },
    });

    await prisma.kitchenStatusHistory.create({
      data: {
        kitchenId: parseInt(kitchenId),
        oldStatusId: kitchen.statusId,
        newStatusId: assignedStatus.id,
        changedBy: req.user!.userId,
        notes: `Carpintero ${assignment.carpenter.fullName} acepto`,
      },
    });

    const carpenter = await prisma.carpenter.findUnique({ where: { id: assignment.carpenterId } });
    if (carpenter) {
      const newLoad = carpenter.currentLoad + 1;
      await prisma.carpenter.update({
        where: { id: assignment.carpenterId },
        data: {
          currentLoad: newLoad,
          ...(newLoad >= carpenter.maxCapacity ? { status: 'busy' } : {}),
        },
      });
    }
  } else if (!accepted && rejectedStatus && kitchen) {
    await prisma.kitchen.update({
      where: { id: parseInt(kitchenId) },
      data: { statusId: rejectedStatus.id, assignedCarpenterId: null, assignedBy: null },
    });

    await prisma.kitchenStatusHistory.create({
      data: {
        kitchenId: parseInt(kitchenId),
        oldStatusId: kitchen.statusId,
        newStatusId: rejectedStatus.id,
        changedBy: req.user!.userId,
        notes: `Carpintero ${assignment.carpenter.fullName} rechazo`,
      },
    });
  }

  res.json({ message: accepted ? 'Asignacion aceptada' : 'Asignacion rechazada' });
}

export async function getAssignments(req: AuthRequest, res: Response): Promise<void> {
  const { status, carpenter, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = status as string;
  if (carpenter) where.carpenterId = parseInt(carpenter as string);

  const [data, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: {
        kitchen: { include: { kitchenType: true, beneficiary: true } },
        carpenter: true,
        assigner: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.assignment.count({ where }),
  ]);

  res.json({
    data: data.map((a) => ({
      ...a,
      kitchen_number: a.kitchen.kitchenNumber,
      kitchen_type: a.kitchen.kitchenType.displayName,
      beneficiary_name: a.kitchen.beneficiary?.fullName,
      beneficiary_zone: a.kitchen.beneficiary?.zone,
      carpenter_name: a.carpenter.fullName,
      carpenter_phone: a.carpenter.phone,
      assigned_by_name: a.assigner.fullName,
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
}
