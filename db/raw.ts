import { env } from 'cloudflare:workers';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Accès à la base de données.
 *
 * - Si la variable `DATABASE_URL` est définie (fichier local `.dev.vars` pendant
 *   les essais), les requêtes passent par Neon (PostgreSQL) via un adaptateur
 *   qui imite l'API Cloudflare D1.
 * - Sinon, l'application utilise D1 exactement comme avant. C'est le cas en
 *   production tant que rien n'est configuré.
 *
 * Le reste du code continue d'appeler `db().prepare(...).bind(...).first()`,
 * `.all()`, `.run()` et `db().batch([...])` sans modification.
 */
export function db(): D1Database {
  const url = (env as Cloudflare.Env).DATABASE_URL?.trim();
  if (url) return neonAsD1(url);
  if (!env.DB) throw new Error('Base indisponible');
  return env.DB;
}

/** Indique quelle base est utilisée (utile pour les vérifications locales). */
export function dbKind(): 'neon' | 'd1' {
  return (env as Cloudflare.Env).DATABASE_URL?.trim() ? 'neon' : 'd1';
}

// ---------------------------------------------------------------------------
// Adaptateur Neon → interface D1
// ---------------------------------------------------------------------------

let cached: { url: string; adapter: D1Database } | null = null;

function neonAsD1(url: string): D1Database {
  if (cached?.url === url) return cached.adapter;
  const sql: Sql = neon(url, { fullResults: true });
  const adapter = {
    prepare: (query: string) => new NeonStatement(sql, query, []),
    batch: async (statements: NeonStatement[]) => {
      const results = await sql.transaction(
        statements.map((s) => sql.query(s.text, s.params)),
      );
      return results.map((r) => toD1Result(r.rows, r.rowCount));
    },
    exec: () => {
      throw new Error('exec() non pris en charge avec Neon');
    },
    dump: () => {
      throw new Error('dump() non pris en charge avec Neon');
    },
    withSession: () => {
      throw new Error('withSession() non pris en charge avec Neon');
    },
  };
  cached = { url, adapter: adapter as unknown as D1Database };
  return cached.adapter;
}

type Sql = NeonQueryFunction<false, true>;

class NeonStatement {
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

  private exec() {
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
    return toD1Result(rows as T[], rowCount);
  }

  async run<T = Record<string, unknown>>() {
    const { rows, rowCount } = await this.exec();
    return toD1Result(rows as T[], rowCount);
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const { rows } = await this.exec();
    return (rows as Record<string, unknown>[]).map((r) => Object.values(r) as T);
  }
}

function toD1Result<T>(rows: T[], rowCount: number | null) {
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

/** Vrai si l'erreur vient d'une contrainte d'unicité (SQLite/D1 ou PostgreSQL/Neon). */
export function isUniqueViolation(error: unknown): boolean {
  const text = String((error as {message?: string})?.message ?? error);
  const code = (error as {code?: string})?.code;
  return code === '23505' || /UNIQUE|duplicate key/i.test(text);
}
