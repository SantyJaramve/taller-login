import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
  const carpenter = await prisma.carpenter.findFirst({
    where: { userId: req.user!.userId, isActive: 1 },
    include: {
      carpenterZones: true,
      carpenterTypes: { include: { kitchenType: true } },
    },
  });

  if (!carpenter) {
    res.status(404).json({ error: 'Perfil de carpintero no encontrado' });
    return;
  }

  res.json({
    ...carpenter,
    zones: carpenter.carpenterZones.map((z) => z.zone),
    capable_types: carpenter.carpenterTypes.map((t) => t.kitchenType.displayName),
  });
}

export async function getMyAssignments(req: AuthRequest, res: Response): Promise<void> {
  const carpenter = await prisma.carpenter.findFirst({ where: { userId: req.user!.userId } });
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const kitchens = await prisma.kitchen.findMany({
    where: { assignedCarpenterId: carpenter.id },
    include: {
      status: true,
      kitchenType: true,
      beneficiary: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    kitchens.map((k) => ({
      ...k,
      status_name: k.status.name,
      status_display: k.status.displayName,
      status_color: k.status.color,
      status_category: k.status.category,
      type_name: k.kitchenType.name,
      type_display: k.kitchenType.displayName,
      type_code: k.kitchenType.code,
      beneficiary_name: k.beneficiary?.fullName,
      beneficiary_phone: k.beneficiary?.phone,
      beneficiary_whatsapp: k.beneficiary?.whatsapp,
      beneficiary_address: k.beneficiary?.address,
      beneficiary_zone: k.beneficiary?.zone,
      beneficiary_neighborhood: k.beneficiary?.neighborhood,
    }))
  );
}

export async function getMyStats(req: AuthRequest, res: Response): Promise<void> {
  const carpenter = await prisma.carpenter.findFirst({ where: { userId: req.user!.userId } });
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const [total, completed, inProgress, pending, rejected] = await Promise.all([
    prisma.kitchen.count({ where: { assignedCarpenterId: carpenter.id } }),
    prisma.kitchen.count({
      where: { assignedCarpenterId: carpenter.id, status: { name: 'completed' } },
    }),
    prisma.kitchen.count({
      where: { assignedCarpenterId: carpenter.id, status: { name: { in: ['installing', 'evidence_received'] } } },
    }),
    prisma.kitchen.count({
      where: { assignedCarpenterId: carpenter.id, status: { name: { notIn: ['completed', 'rejected'] } } },
    }),
    prisma.assignment.count({ where: { carpenterId: carpenter.id, status: 'rejected' } }),
  ]);

  res.json({
    total,
    completed,
    inProgress,
    pending,
    rejected,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  });
}

export async function getCarpenters(req: AuthRequest, res: Response): Promise<void> {
  const { status, zone, type, search } = req.query;

  const where: any = { isActive: 1 };
  if (status) where.status = status as string;
  if (search) where.fullName = { contains: search as string, mode: 'insensitive' };

  if (zone) {
    where.carpenterZones = { some: { zone: zone as string } };
  }

  if (type) {
    where.carpenterTypes = { some: { kitchenTypeId: parseInt(type as string) } };
  }

  const carpenters = await prisma.carpenter.findMany({
    where,
    include: {
      carpenterZones: true,
      carpenterTypes: { include: { kitchenType: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  res.json(
    carpenters.map((c) => ({
      ...c,
      zones: c.carpenterZones.map((z) => z.zone),
      capable_types: c.carpenterTypes.map((t) => t.kitchenType.displayName),
    }))
  );
}

export async function getCarpenterById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const carpenter = await prisma.carpenter.findUnique({
    where: { id: parseInt(id) },
    include: {
      carpenterZones: true,
      carpenterTypes: { include: { kitchenType: true } },
    },
  });

  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  const [installations, observations, statsTotal, statsCompleted, statsRejected, statsAccepted, statsPending] = await Promise.all([
    prisma.kitchen.findMany({
      where: { assignedCarpenterId: carpenter.id },
      include: { status: true, kitchenType: true, beneficiary: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.observation.findMany({
      where: { entityType: 'carpenter', entityId: carpenter.id },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.kitchen.count({ where: { assignedCarpenterId: carpenter.id } }),
    prisma.kitchen.count({ where: { assignedCarpenterId: carpenter.id, status: { name: 'completed' } } }),
    prisma.assignment.count({ where: { carpenterId: carpenter.id, status: 'rejected' } }),
    prisma.assignment.count({ where: { carpenterId: carpenter.id, status: 'accepted' } }),
    prisma.kitchen.count({
      where: { assignedCarpenterId: carpenter.id, status: { name: { notIn: ['completed', 'rejected'] } } },
    }),
  ]);

  res.json({
    ...carpenter,
    zones: carpenter.carpenterZones.map((z) => z.zone),
    types: carpenter.carpenterTypes.map((t) => ({ id: t.kitchenType.id, display_name: t.kitchenType.displayName, code: t.kitchenType.code })),
    installations: installations.map((k) => ({
      ...k,
      status_display: k.status.displayName,
      status_color: k.status.color,
      type_display: k.kitchenType.displayName,
      beneficiary_name: k.beneficiary?.fullName,
      beneficiary_address: k.beneficiary?.address,
    })),
    observations: observations.map((o) => ({ ...o, user_name: o.user.fullName })),
    stats: {
      total: statsTotal,
      completed: statsCompleted,
      rejected: statsRejected,
      accepted: statsAccepted,
      pending: statsPending,
      completion_rate: statsTotal > 0 ? Math.round((statsCompleted / statsTotal) * 100) : 0,
      rejection_rate: statsTotal > 0 ? Math.round((statsRejected / statsTotal) * 100) : 0,
    },
  });
}

export async function createCarpenter(req: AuthRequest, res: Response): Promise<void> {
  const { full_name, phone, whatsapp, email, max_capacity, zones, types, notes } = req.body;

  if (!full_name) {
    res.status(400).json({ error: 'El nombre es requerido' });
    return;
  }

  const carpenter = await prisma.carpenter.create({
    data: {
      fullName: full_name,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      maxCapacity: max_capacity || 3,
      notes: notes || null,
    },
  });

  if (zones && Array.isArray(zones)) {
    await prisma.carpenterZone.createMany({
      data: zones.map((zone: string) => ({ carpenterId: carpenter.id, zone })),
    });
  }

  if (types && Array.isArray(types)) {
    await prisma.carpenterType.createMany({
      data: types.map((typeId: number) => ({ carpenterId: carpenter.id, kitchenTypeId: typeId })),
    });
  }

  res.status(201).json({ id: carpenter.id });
}

export async function updateCarpenter(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { full_name, phone, whatsapp, email, status, max_capacity, notes, zones, types } = req.body;

  const carpenter = await prisma.carpenter.findUnique({ where: { id: parseInt(id) } });
  if (!carpenter) {
    res.status(404).json({ error: 'Carpintero no encontrado' });
    return;
  }

  await prisma.carpenter.update({
    where: { id: parseInt(id) },
    data: {
      ...(full_name && { fullName: full_name }),
      ...(phone !== undefined && { phone }),
      ...(whatsapp !== undefined && { whatsapp }),
      ...(email !== undefined && { email }),
      ...(status && { status }),
      ...(max_capacity && { maxCapacity: max_capacity }),
      ...(notes !== undefined && { notes }),
    },
  });

  if (zones && Array.isArray(zones)) {
    await prisma.carpenterZone.deleteMany({ where: { carpenterId: parseInt(id) } });
    await prisma.carpenterZone.createMany({
      data: zones.map((zone: string) => ({ carpenterId: parseInt(id), zone })),
    });
  }

  if (types && Array.isArray(types)) {
    await prisma.carpenterType.deleteMany({ where: { carpenterId: parseInt(id) } });
    await prisma.carpenterType.createMany({
      data: types.map((typeId: number) => ({ carpenterId: parseInt(id), kitchenTypeId: typeId })),
    });
  }

  res.json({ message: 'Carpintero actualizado exitosamente' });
}

export async function addCarpenterObservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'El contenido es requerido' });
    return;
  }

  const obs = await prisma.observation.create({
    data: { entityType: 'carpenter', entityId: parseInt(id), userId: req.user!.userId, content },
  });

  res.status(201).json({ id: obs.id });
}

export async function getCarpentersStats(_req: AuthRequest, res: Response): Promise<void> {
  const [total, available, busy, inactive] = await Promise.all([
    prisma.carpenter.count({ where: { isActive: 1 } }),
    prisma.carpenter.count({ where: { isActive: 1, status: 'available' } }),
    prisma.carpenter.count({ where: { isActive: 1, status: 'busy' } }),
    prisma.carpenter.count({ where: { isActive: 1, status: 'inactive' } }),
  ]);

  res.json({ total, available, busy, inactive });
}
