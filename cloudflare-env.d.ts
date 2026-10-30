declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Chaîne de connexion Neon (essais locaux via `.dev.vars`). Absente = D1. */
    DATABASE_URL?: string;
    /** Essais uniquement : "1" ouvre le QR hors horaire (exige aussi DATABASE_URL). */
    COMFRAT_TEST_CHECKIN_OPEN?: string;
  }
}
