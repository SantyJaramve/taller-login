// =============================================================================
// CONTROLADOR DE AUTENTICACION - CocinasApp
// =============================================================================
// Funciones: login, register, forgotPassword, resetPassword, getProfile,
//            getUsers, createUser, updateUser, getLoginHistory
// =============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/database';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const TOKEN_EXPIRY = '24h';
const REMEMBER_ME_EXPIRY = '30d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function getLockoutKey(username: string, ip: string): string {
  return `${username}:${ip}`;
}

function isLockedOut(username: string, ip: string): { locked: boolean; remainingMinutes: number } {
  const key = getLockoutKey(username, ip);
  const record = failedAttempts.get(key);
  if (!record) return { locked: false, remainingMinutes: 0 };
  if (Date.now() > record.lockedUntil) {
    failedAttempts.delete(key);
    return { locked: false, remainingMinutes: 0 };
  }
  const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60000);
  return { locked: true, remainingMinutes: remaining };
}

function recordFailedAttempt(username: string, ip: string): void {
  const key = getLockoutKey(username, ip);
  const record = failedAttempts.get(key);
  if (record) {
    record.count++;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
    }
  } else {
    failedAttempts.set(key, { count: 1, lockedUntil: 0 });
  }
}

function clearFailedAttempts(username: string, ip: string): void {
  const key = getLockoutKey(username, ip);
  failedAttempts.delete(key);
}

async function logLoginAttempt(userId: number | null, username: string, success: boolean, ip: string, userAgent: string, failureReason?: string): Promise<void> {
  await db.prepare(
    'INSERT INTO login_history (user_id, username_attempted, success, ip_address, user_agent, failure_reason) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, username, success ? 1 : 0, ip, userAgent, failureReason || null);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

// =============================================================================
// REGISTRO DE USUARIO
// =============================================================================

export async function register(req: Request, res: Response): Promise<void> {
  const { full_name, email, username, password, confirm_password } = req.body;

  if (!full_name || !email || !username || !password || !confirm_password) {
    res.status(400).json({ error: 'Todos los campos son requeridos' });
    return;
  }

  if (full_name.trim().length < 3) {
    res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'El formato del correo electronico no es valido' });
    return;
  }

  if (username.trim().length < 4) {
    res.status(400).json({ error: 'El usuario debe tener al menos 4 caracteres' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
    return;
  }

  if (password !== confirm_password) {
    res.status(400).json({ error: 'Las contrasenas no coinciden' });
    return;
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
  if (existing) {
    res.status(409).json({ error: 'El usuario o correo electronico ya esta registrado' });
    return;
  }

  const carpinteroRole = await db.prepare('SELECT id FROM roles WHERE name = ?').get('carpintero') as any;
  if (!carpinteroRole) {
    res.status(500).json({ error: 'Error de configuracion del sistema' });
    return;
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const userResult = await db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)'
  ).run(username.trim(), email.trim(), password_hash, full_name.trim(), carpinteroRole.id);

  await db.prepare(
    'INSERT INTO carpenters (full_name, email, user_id, status) VALUES (?, ?, ?, ?)'
  ).run(full_name.trim(), email.trim(), userResult.lastInsertRowid, 'available');

  res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesion.' });
}

// =============================================================================
// INICIO DE SESION
// =============================================================================

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, remember_me } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!username || !password) {
    res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    return;
  }

  const lockStatus = isLockedOut(username, ip);
  if (lockStatus.locked) {
    await logLoginAttempt(null, username, false, ip, userAgent, 'Cuenta bloqueada temporalmente');
    res.status(423).json({
      error: `Cuenta bloqueada temporalmente. Intente de nuevo en ${lockStatus.remainingMinutes} minuto(s).`,
      locked: true,
      remainingMinutes: lockStatus.remainingMinutes,
    });
    return;
  }

  const user = await db.prepare(`
    SELECT u.*, r.name as role_name, r.display_name as role_display_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username) as any;

  if (!user) {
    recordFailedAttempt(username, ip);
    await logLoginAttempt(null, username, false, ip, userAgent, 'Usuario no encontrado');
    res.status(401).json({ error: 'Credenciales invalidas' });
    return;
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    recordFailedAttempt(username, ip);
    await logLoginAttempt(user.id, username, false, ip, userAgent, 'Contrasena incorrecta');
    res.status(401).json({ error: 'Credenciales invalidas' });
    return;
  }

  clearFailedAttempts(username, ip);

  const expiry = remember_me ? REMEMBER_ME_EXPIRY : TOKEN_EXPIRY;
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role_name },
    JWT_SECRET,
    { expiresIn: expiry }
  );

  await db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(
    user.id, 'login', 'user', user.id, ip, userAgent
  );

  await logLoginAttempt(user.id, username, true, ip, userAgent);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role_name,
      role_display_name: user.role_display_name,
    },
    remember_me: !!remember_me,
  });
}

// =============================================================================
// RECUPERACION DE CONTRASENA
// =============================================================================

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'El correo electronico es requerido' });
    return;
  }

  const user = await db.prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1').get(email) as any;

  if (user) {
    await db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);
  }

  if (!user) {
    res.json({ message: 'Si el correo esta registrado, recibira un enlace de recuperacion.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, token, expiresAt);

  res.json({
    message: 'Si el correo esta registrado, recibira un enlace de recuperacion.',
    reset_token: token,
    expires_at: expiresAt,
  });
}

// =============================================================================
// RESTABLECER CONTRASENA
// =============================================================================

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: 'Token y contrasena son requeridos' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
    return;
  }

  const resetRecord = await db.prepare(
    'SELECT * FROM password_resets WHERE token = ? AND used = 0'
  ).get(token) as any;

  if (!resetRecord) {
    res.status(400).json({ error: 'Token invalido o ya utilizado' });
    return;
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    res.status(400).json({ error: 'El token ha expirado. Solicite uno nuevo.' });
    return;
  }

  const password_hash = bcrypt.hashSync(password, 10);
  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(password_hash, resetRecord.user_id);

  await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

  clearFailedAttempts('', '');

  res.json({ message: 'Contrasena actualizada exitosamente. Ahora puede iniciar sesion.' });
}

// =============================================================================
// HISTORIAL DE ACCESOS
// =============================================================================

export async function getLoginHistory(req: AuthRequest, res: Response): Promise<void> {
  const { userId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let where = '';
  const params: any[] = [];

  if (userId) {
    where = 'WHERE lh.user_id = ?';
    params.push(userId);
  } else if (req.user?.role === 'admin') {
    where = '';
  } else {
    where = 'WHERE lh.user_id = ?';
    params.push(req.user!.userId);
  }

  const total = await db.prepare(`SELECT COUNT(*) as count FROM login_history lh ${where}`).get(...params) as any;

  const history = await db.prepare(`
    SELECT lh.*, u.full_name as user_full_name
    FROM login_history lh
    LEFT JOIN users u ON lh.user_id = u.id
    ${where}
    ORDER BY lh.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    data: history,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  });
}

// =============================================================================
// GESTION DE USUARIOS (admin)
// =============================================================================

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const user = await db.prepare(`
    SELECT u.id, u.username, u.email, u.full_name, r.name as role_name, r.display_name as role_display_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(req.user.userId) as any;

  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json(user);
}

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  const users = await db.prepare(`
    SELECT u.id, u.username, u.email, u.full_name, r.name as role_name, r.display_name as role_display_name, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.full_name
  `).all();

  res.json(users);
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const { username, email, password, full_name, role_id } = req.body;

  if (!username || !email || !password || !full_name || !role_id) {
    res.status(400).json({ error: 'Todos los campos son requeridos' });
    return;
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    res.status(409).json({ error: 'El usuario o email ya existe' });
    return;
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email, password_hash, full_name, role_id);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Usuario creado exitosamente' });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { full_name, email, role_id, is_active } = req.body;

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  await db.prepare(`UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), role_id = COALESCE(?, role_id), is_active = COALESCE(?, is_active), updated_at = datetime('now') WHERE id = ?`)
    .run(full_name, email, role_id, is_active, id);

  res.json({ message: 'Usuario actualizado exitosamente' });
}
