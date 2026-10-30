declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Chaîne de connexion Neon (essais locaux via `.dev.vars`). Absente = D1. */
    DATABASE_URL?: string;
  }
}
