import {checkOwnerSecret, ownerCookie, ownerSecretConfigured, vercelMode} from '../../owner-session';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});

/** Vercel uniquement : vérifie la phrase secrète du propriétaire et ouvre une session de 12 h. */
export async function POST(req: Request) {
  try {
    if (!vercelMode()) return json({error: 'Sur cet hébergement, connectez-vous avec votre compte ChatGPT.'}, 404);
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    if (!ownerSecretConfigured()) return json({error: 'La phrase secrète du propriétaire n’est pas encore réglée dans Vercel (COMFRAT_OWNER_SECRET).'}, 503);
    const body = (await req.json()) as {secret?: unknown};
    if (!(await checkOwnerSecret(body.secret))) {
      await new Promise((r) => setTimeout(r, 800));
      return json({error: 'Phrase secrète incorrecte.'}, 401);
    }
    return json({ok: true}, 200, {'Set-Cookie': await ownerCookie(new URL(req.url).protocol === 'https:')});
  } catch (e) {
    console.error(e);
    return json({error: 'Connexion impossible. Réessayez.'}, 503);
  }
}
