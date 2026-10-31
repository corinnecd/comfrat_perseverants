/**
 * Variables d'environnement du site (réglées dans Vercel → Settings → Environment Variables,
 * et en local dans le fichier `.env.local`, jamais dans le code).
 */
export type AppEnv = {
  /** Chaîne de connexion Neon (PostgreSQL). Obligatoire. */
  DATABASE_URL?: string;
  /** Phrase secrète du propriétaire (16 caractères minimum) : création et modification des codes d'accès. */
  COMFRAT_OWNER_SECRET?: string;
  /** Essais uniquement : "1" ouvre le QR du dimanche à tout moment. Ne pas régler en production. */
  COMFRAT_TEST_CHECKIN_OPEN?: string;
};

export function appEnv(): AppEnv {
  return process.env as AppEnv;
}
