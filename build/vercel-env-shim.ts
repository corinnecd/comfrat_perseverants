/**
 * Remplace le module `cloudflare:workers` quand le site est construit pour Vercel.
 * Sur Vercel, il n'y a ni D1 ni « bindings » Cloudflare : `env` lit simplement les variables
 * d'environnement du projet Vercel (DATABASE_URL, COMFRAT_OWNER_EMAILS, COMFRAT_OWNER_SECRET…).
 * La base utilisée est donc toujours Neon (voir db/raw.ts).
 */
export const env = new Proxy({} as Record<string, unknown>, {
  get: (_target, key) => (typeof key === 'string' ? process.env[key] : undefined),
  has: (_target, key) => typeof key === 'string' && key in process.env,
});
