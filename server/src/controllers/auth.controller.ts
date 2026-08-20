// =============================================================================
// CONTROLADOR DE AUTENTICACION - CocinasApp
// =============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const TOKEN_EXPIRY = '24h';
const REMEMBER_ME_EXPIRY = '30d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isLockedOut(username: string, ip: string): { locked: boolean; remainingMinutes: number } {
  const key = `${username}:${ip}`;
  const record = failedAttempts.get(key);
  if (!record) return { locked: false, remainingMinutes: 0 };
  if (Date.now() > record.lockedUntil) { failedAttempts.delete(key); return { locked: false, remainingMinutes: 0 }; }
  return { locked: true, remainingMinutes: Math.ceil((record.lockedUntil - Date.now()) / 60000) };
}

function recordFailedAttempt(username: string, ip: string): void {
  const key = `${username}:${ip}`;
  const record = failedAttempts.get(key);
  if (record) {
    record.count++;
    if (record.count >= MAX_FAILED_ATTEMPTS) record.lockedUntil = Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
  } else {
    failedAttempts.set(key, { count: 1, lockedUntil: 0 });
  }
}

function clearFailedAttempts(username: string, ip: string): void {
  failedAttempts.delete(`${username}:${ip}`);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// =============================================================================
// REGISTRO
// =============================================================================

export async function register(req: Request, res: Response): Promise<void> {
  const { full_name, email, username, password, confirm_password } = req.body;

  if (!full_name || !email || !username || !password || !confirm_password) {
    res.status(400).json({ error: 'Todos los campos son requeridos' }); return;
  }
  if (full_name.trim().length < 3) { res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'El formato del correo electronico no es valido' }); return; }
  if (username.trim().length < 4) { res.status(400).json({ error: 'El usuario debe tener al menos 4 caracteres' }); return; }
  if (password.length < 6) { res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' }); return; }
  if (password !== confirm_password) { res.status(400).json({ error: 'Las contrasenas no coinciden' }); return; }

  const existing = await prisma.user.findFirst({ where: { OR: [{ username: username.trim() }, { email: email.trim() }] } });
  if (existing) { res.status(409).json({ error: 'El usuario o correo electronico ya esta registrado' }); return; }

  const carpinteroRole = await prisma.role.findFirst({ where: { name: 'carpintero' } });
  if (!carpinteroRole) { res.status(500).json({ error: 'Error de configuracion del sistema' }); return; }

  const password_hash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({
    data: { username: username.trim(), email: email.trim(), passwordHash: password_hash, fullName: full_name.trim(), roleId: carpinteroRole.id }
  });

  await prisma.carpenter.create({
    data: { fullName: full_name.trim(), email: email.trim(), userId: user.id, status: 'available' }
  });

  res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesion.' });
}

// =============================================================================
// INICIO DE SESION
// =============================================================================

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, remember_me } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!username || !password) { res.status(400).json({ error: 'Usuario y contrasena son requeridos' }); return; }

  const lockStatus = isLockedOut(username, ip);
  if (lockStatus.locked) {
    res.status(423).json({ error: `Cuenta bloqueada temporalmente. Intente de nuevo en ${lockStatus.remainingMinutes} minuto(s).`, locked: true, remainingMinutes: lockStatus.remainingMinutes });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { username, isActive: 1 },
    include: { role: true }
  });

  if (!user) {
    recordFailedAttempt(username, ip);
    await prisma.loginHistory.create({ data: { usernameAttempted: username, success: 0, ipAddress: ip, userAgent, failureReason: 'Usuario no encontrado' } });
    res.status(401).json({ error: 'Credenciales invalidas' }); return;
  }

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    recordFailedAttempt(username, ip);
    await prisma.loginHistory.create({ data: { userId: user.id, usernameAttempted: username, success: 0, ipAddress: ip, userAgent, failureReason: 'Contrasena incorrecta' } });
    res.status(401).json({ error: 'Credenciales invalidas' }); return;
  }

  clearFailedAttempts(username, ip);

  const expiry = remember_me ? REMEMBER_ME_EXPIRY : TOKEN_EXPIRY;
  const token = jwt.sign({ userId: user.id, username: user.username, role: user.role.name }, JWT_SECRET, { expiresIn: expiry });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'login', entityType: 'user', entityId: user.id, ipAddress: ip, userAgent } });
  await prisma.loginHistory.create({ data: { userId: user.id, usernameAttempted: username, success: 1, ipAddress: ip, userAgent } });

  res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.fullName, role: user.role.name, role_display_name: user.role.displayName }, remember_me: !!remember_me });
}

// =============================================================================
// RECUPERACION DE CONTRASENA
// =============================================================================

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'El correo electronico es requerido' }); return; }

  const user = await prisma.user.findFirst({ where: { email, isActive: 1 } });
  if (user) {
    await prisma.passwordReset.updateMany({ where: { userId: user.id, used: 0 }, data: { used: 1 } });
  }

  if (!user) { res.json({ message: 'Si el correo esta registrado, recibira un enlace de recuperacion.' }); return; }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });
  res.json({ message: 'Si el correo esta registrado, recibira un enlace de recuperacion.', reset_token: token, expires_at: expiresAt.toISOString() });
}

// =============================================================================
// RESTABLECER CONTRASENA
// =============================================================================

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: 'Token y contrasena son requeridos' }); return; }
  if (password.length < 6) { res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' }); return; }

  const resetRecord = await prisma.passwordReset.findFirst({ where: { token, used: 0 } });
  if (!resetRecord) { res.status(400).json({ error: 'Token invalido o ya utilizado' }); return; }
  if (resetRecord.expiresAt < new Date()) { res.status(400).json({ error: 'El token ha expirado. Solicite uno nuevo.' }); return; }

  const password_hash = bcrypt.hashSync(password, 10);
  await prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: password_hash } });
  await prisma.passwordReset.update({ where: { id: resetRecord.id }, data: { used: 1 } });

  res.json({ message: 'Contrasena actualizada exitosamente. Ahora puede iniciar sesion.' });
}

// =============================================================================
// HISTORIAL DE ACCESOS
// =============================================================================

export async function getLoginHistory(req: AuthRequest, res: Response): Promise<void> {
  const { userId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (userId) where.userId = parseInt(userId as string);
  else if (req.user?.role !== 'admin') where.userId = req.user!.userId;

  const [data, total] = await Promise.all([
    prisma.loginHistory.findMany({ where, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.loginHistory.count({ where })
  ]);

  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

// =============================================================================
// GESTION DE USUARIOS
// =============================================================================

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'No autenticado' }); return; }
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, username: true, email: true, fullName: true, role: { select: { name: true, displayName: true } } } });
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json({ id: user.id, username: user.username, email: user.email, full_name: user.fullName, role_name: user.role.name, role_display_name: user.role.displayName });
}

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, fullName: true, role: { select: { name: true, displayName: true } }, isActive: true, createdAt: true }, orderBy: { fullName: 'asc' } });
  res.json(users.map((u: any) => ({ ...u, full_name: u.fullName, role_name: u.role.name, role_display_name: u.role.displayName })));
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const { username, email, password, full_name, role_id } = req.body;
  if (!username || !email || !password || !full_name || !role_id) { res.status(400).json({ error: 'Todos los campos son requeridos' }); return; }

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) { res.status(409).json({ error: 'El usuario o email ya existe' }); return; }

  const password_hash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({ data: { username, email, passwordHash: password_hash, fullName: full_name, roleId: role_id } });
  res.status(201).json({ id: user.id, message: 'Usuario creado exitosamente' });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { full_name, email, role_id, is_active } = req.body;

  const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  await prisma.user.update({ where: { id: parseInt(id) }, data: { ...(full_name && { fullName: full_name }), ...(email && { email }), ...(role_id && { roleId: role_id }), ...(is_active !== undefined && { isActive: is_active ? 1 : 0 }) } });
  res.json({ message: 'Usuario actualizado exitosamente' });
}
