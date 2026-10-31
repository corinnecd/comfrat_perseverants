import {db} from '../../../db/raw';
import {appEnv} from '../../env';
import {ownerSecretConfigured} from '../../owner-session';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic de configuration, sans aucun secret : la base Neon répond-elle ?
 * La phrase secrète du propriétaire est-elle réglée ?
 */
export async function GET() {
  let base: 'ok' | 'DATABASE_URL manquante' | 'connexion impossible' = 'ok';
  if (!appEnv().DATABASE_URL?.trim()) base = 'DATABASE_URL manquante';
  else {
    try { await db().prepare('SELECT COUNT(*) AS n FROM settings').first(); }
    catch (e) { console.error(e); base = 'connexion impossible'; }
  }
  return Response.json({
    base,
    phraseSecreteProprietaire: ownerSecretConfigured() ? 'réglée' : 'manquante (COMFRAT_OWNER_SECRET, 16 caractères minimum)',
    qrEssaiOuvert: appEnv().COMFRAT_TEST_CHECKIN_OPEN?.trim() === '1',
  }, {headers: {'Cache-Control': 'no-store'}});
}
