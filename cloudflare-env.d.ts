declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Chaîne de connexion Neon (essais locaux via `.dev.vars`). Absente = D1. */
    DATABASE_URL?: string;
    /** Essais uniquement : "1" ouvre le QR hors horaire (exige aussi DATABASE_URL). */
    COMFRAT_TEST_CHECKIN_OPEN?: string;
    /** Propriétaires : e-mails séparés par des virgules (vous + 1 secours). */
    COMFRAT_OWNER_EMAILS?: string;
    /** Ancien réglage (un seul e-mail), toujours accepté. */
    COMFRAT_OWNER_EMAIL?: string;
    /** Défini par Vercel ("1") : le site tourne sur Vercel, sans D1 ni connexion ChatGPT. */
    VERCEL?: string;
    /** Vercel uniquement : phrase secrète du propriétaire (16 caractères minimum), saisie sur /signin-with-chatgpt. */
    COMFRAT_OWNER_SECRET?: string;
  }
}
