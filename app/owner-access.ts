import {getChatGPTUser, type ChatGPTUser} from './chatgpt-auth';
import {env} from 'cloudflare:workers';
import {db} from '../db/raw';
import {VERCEL_OWNER_ID} from './owner-session';

/**
 * E-mails autorisés comme propriétaires (création et modification des codes d'accès).
 * Configuration, jamais dans le code :
 *   COMFRAT_OWNER_EMAILS=proprietaire@exemple.fr,secours@exemple.fr   (recommandé : 2 au maximum)
 *   COMFRAT_OWNER_EMAIL=proprietaire@exemple.fr                       (ancien réglage, toujours accepté)
 */
export function ownerEmails(): string[] {
  const e = env as Cloudflare.Env;
  return [e.COMFRAT_OWNER_EMAILS, e.COMFRAT_OWNER_EMAIL]
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.split(/[,;\s]+/))
    .map((v) => v.trim().toLowerCase())
    .filter((v, i, all) => v.includes('@') && all.indexOf(v) === i);
}

/** Vrai si ce compte connecté est le propriétaire enregistré ou figure dans la liste des e-mails propriétaires. */
export function isOwner(user: ChatGPTUser | null, ownerId?: string | null): boolean {
  if (!user) return false;
  // Session propriétaire Vercel : déjà vérifiée par la phrase secrète (cookie signé).
  if (user.userId === VERCEL_OWNER_ID) return true;
  if (ownerId && ownerId === user.userId) return true;
  return ownerEmails().includes(user.email.trim().toLowerCase());
}

export async function storedOwnerId() {
  return (await db().prepare("SELECT value FROM settings WHERE key='owner'").first<{value: string}>())?.value ?? null;
}

export async function ownerAccess() {
  const user = await getChatGPTUser();
  const authorized = isOwner(user, await storedOwnerId());
  return {authorized, status: !user ? 'sign_in_required' : authorized ? 'owner' : 'different_account', user};
}
