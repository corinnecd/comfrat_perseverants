import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { appEnv } from '../app/env';
import { SCHEMA } from './schema';

/**
 * Accès à la base de données Neon (PostgreSQL).
 *
 * Le code du site écrit ses requêtes avec des marqueurs `?` et appelle
 * `db().prepare(...).bind(...).first()`, `.all()`, `.run()` et `db().batch([...])`.
 * L'adaptateur ci-dessous traduit ces appels pour Neon.
 * La chaîne de connexion vient de la variable `DATABASE_URL` (Vercel ou `.env.local`).
 */
export function db(): Db {
  const url = appEnv().DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL manquante : réglez la chaîne de connexion Neon (Vercel ou .env.local).');
  return neonDb(url);
}

export type DbResult<T = Record<string, unknown>> = ReturnType<typeof toResult<T>>;
export type Db = {
  prepare: (query: string) => NeonStatement;
  batch: (statements: NeonStatement[]) => Promise<DbResult[]>;
};

// ---------------------------------------------------------------------------
// Adaptateur Neon
// ---------------------------------------------------------------------------

let cached: { url: string; adapter: Db } | null = null;

/**
 * Crée les tables manquantes au premier accès (instructions « IF NOT EXISTS », sans effet sur l'existant).
 * Une seule fois par instance du serveur ; en cas d'échec, on réessaiera à la requête suivante.
 */
function schemaReady(sql: Sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await sql.transaction(SCHEMA.map((q) => sql.query(q)));
      } catch (error) {
        // Deux instances qui créent les mêmes tables en même temps : la seconde peut échouer, on vérifie une fois de plus.
        await new Promise((r) => setTimeout(r, 300));
        await sql.transaction(SCHEMA.map((q) => sql.query(q))).catch(() => { throw error; });
      }
    })().catch((error) => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}
let schemaPromise: Promise<void> | null = null;

function neonDb(url: string): Db {
  if (cached?.url === url) return cached.adapter;
  const sql: Sql = neon(url, { fullResults: true });
  schemaPromise = null;
  const adapter = {
    prepare: (query: string) => new NeonStatement(sql, query, []),
    batch: async (statements: NeonStatement[]) => {
      await schemaReady(sql);
      const results = await sql.transaction(
        statements.map((s) => sql.query(s.text, s.params)),
      );
      return results.map((r) => toResult(r.rows as Record<string, unknown>[], r.rowCount));
    },
  };
  cached = { url, adapter };
  return cached.adapter;
}

type Sql = NeonQueryFunction<false, true>;

export class NeonStatement {
  readonly text: string;

  constructor(
    private readonly sql: Sql,
    private readonly original: string,
    readonly params: unknown[],
  ) {
    this.text = toPostgresPlaceholders(original);
  }

  bind(...values: unknown[]): NeonStatement {
    return new NeonStatement(
      this.sql,
      this.original,
      values.map((v) => (v === undefined ? null : v)),
    );
  }

  private async exec() {
    await schemaReady(this.sql);
    return this.sql.query(this.text, this.params);
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const { rows } = await this.exec();
    const row = (rows[0] as Record<string, unknown> | undefined) ?? null;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Record<string, unknown>>() {
    const { rows, rowCount } = await this.exec();
    return toResult(rows as T[], rowCount);
  }

  async run<T = Record<string, unknown>>() {
    const { rows, rowCount } = await this.exec();
    return toResult(rows as T[], rowCount);
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const { rows } = await this.exec();
    return (rows as Record<string, unknown>[]).map((r) => Object.values(r) as T);
  }
}

function toResult<T>(rows: T[], rowCount: number | null) {
  return {
    success: true as const,
    results: rows,
    meta: {
      changes: rowCount ?? 0,
      rows_read: rows.length,
      rows_written: rowCount ?? 0,
      last_row_id: 0,
      changed_db: (rowCount ?? 0) > 0,
      duration: 0,
      size_after: 0,
    },
  };
}

/**
 * Convertit les marqueurs SQLite (`?` et `?N`) en marqueurs PostgreSQL (`$N`),
 * sans toucher aux `?` situés dans des chaînes ('...') ou des identifiants ("...").
 */
export function toPostgresPlaceholders(query: string): string {
  let out = '';
  let next = 1;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < query.length; i++) {
    const c = query[i];
    if (quote) {
      out += c;
      if (c === quote) {
        if (query[i + 1] === quote) {
          out += query[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      out += c;
      continue;
    }
    if (c === '?') {
      let digits = '';
      while (/[0-9]/.test(query[i + 1] ?? '')) digits += query[++i];
      out += '$' + (digits || String(next++));
      continue;
    }
    out += c;
  }
  return out;
}

/** Vrai si l'erreur vient d'une contrainte d'unicité (PostgreSQL code 23505). */
export function isUniqueViolation(error: unknown): boolean {
  const text = String((error as {message?: string})?.message ?? error);
  const code = (error as {code?: string})?.code;
  return code === '23505' || /UNIQUE|duplicate key/i.test(text);
}
