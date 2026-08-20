// =============================================================================
// DATABASE ASYNC WRAPPER - CocinasApp
// =============================================================================
// Wrapper async compatible con serverless (Netlify Functions).
// Soporta Turso/libSQL en produccion y archivo local en desarrollo.
// API similar a better-sqlite3 pero con async/await.
// =============================================================================

import { createClient, Client } from '@libsql/client';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/cocinas.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
    client = createClient({ url, authToken });
  }
  return client;
}

// --- Interfaz para resultado de INSERT/UPDATE/DELETE ---
export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

// --- Interfaz para prepared statement async ---
interface Prepared {
  get(...args: any[]): Promise<any>;
  all(...args: any[]): Promise<any[]>;
  run(...args: any[]): Promise<RunResult>;
}

// --- Objeto db con API similar a better-sqlite3 ---
export const db = {
  prepare(sql: string): Prepared {
    const c = getClient();
    return {
      async get(...args: any[]) {
        const result = await c.execute({ sql, args });
        return result.rows[0] || undefined;
      },
      async all(...args: any[]) {
        const result = await c.execute({ sql, args });
        return result.rows;
      },
      async run(...args: any[]) {
        const result = await c.execute({ sql, args });
        return {
          lastInsertRowid: Number(result.lastInsertRowid),
          changes: result.rowsAffected,
        };
      },
    };
  },

  async exec(sql: string): Promise<void> {
    const c = getClient();
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await c.execute(stmt);
    }
  },

  async pragma(pragma: string): Promise<void> {
    const c = getClient();
    try {
      await c.execute(`PRAGMA ${pragma}`);
    } catch {
      // Ignorar errores de pragma en Turso
    }
  },
};

export default db;
