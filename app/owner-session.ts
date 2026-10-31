import {appEnv} from './env';

/**
 * Connexion du propriétaire (création et modification des codes d'accès).
 * Le propriétaire saisit une phrase secrète (COMFRAT_OWNER_SECRET, réglée dans Vercel, jamais dans le code).
 * Une fois la phrase vérifiée, un cookie signé (HttpOnly, 12 h) le reconnaît.
 */
export const OWNER_COOKIE = 'comfrat_owner';
const MAX_AGE = 12 * 3600;

function secret() {
  const s = appEnv().COMFRAT_OWNER_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}
export const ownerSecretConfigured = () => !!secret();

async function hmac(key: string, data: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérifie la phrase secrète saisie (comparaison à durée constante sur les empreintes). */
export async function checkOwnerSecret(input: unknown) {
  const s = secret();
  if (!s || typeof input !== 'string' || input.length > 200) return false;
  return sameText(await hmac(s, 'check:' + input), await hmac(s, 'check:' + s));
}

export async function ownerCookie(secure: boolean) {
  const s = secret();
  if (!s) throw new Error('COMFRAT_OWNER_SECRET manquant');
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${OWNER_COOKIE}=${exp}.${await hmac(s, 'owner:' + exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`;
}
export const clearOwnerCookie = (secure: boolean) => `${OWNER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

/** Vrai si l'en-tête Cookie contient une session propriétaire valide et non expirée. */
export async function ownerCookieValid(cookieHeader: string | null) {
  const s = secret();
  const raw = cookieHeader?.split(';').map((x) => x.trim()).find((x) => x.startsWith(OWNER_COOKIE + '='))?.slice(OWNER_COOKIE.length + 1);
  if (!s || !raw) return false;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return sameText(sig, await hmac(s, 'owner:' + exp));
}
