import {headers} from 'next/headers';
import {ownerCookieValid, ownerSecretConfigured} from './owner-session';

/** Propriétaire connecté (phrase secrète vérifiée) : seul compte autorisé à créer ou modifier les codes. */
export type OwnerUser = {userId: 'owner'; email: string};

export async function getOwnerUser(): Promise<OwnerUser | null> {
  const h = await headers();
  return (await ownerCookieValid(h.get('cookie'))) ? {userId: 'owner', email: 'propriétaire'} : null;
}

export async function ownerAccess() {
  const user = await getOwnerUser();
  const status = !ownerSecretConfigured() ? 'owner_not_configured' : user ? 'owner' : 'sign_in_required';
  return {authorized: !!user, status, user};
}

export const OWNER_SIGN_IN = '/connexion-proprietaire';
export const OWNER_SIGN_OUT = '/deconnexion-proprietaire';
