import {clearOwnerCookie} from '../owner-session';

export const dynamic = 'force-dynamic';

/**
 * Vercel : ferme la session propriétaire puis revient à la page demandée.
 * (Sur OpenAI Sites, la plateforme traite elle-même cette adresse avant le site.)
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const back = url.searchParams.get('return_to') || '/';
  const safe = back.startsWith('/') && !back.startsWith('//') ? back : '/';
  return new Response(null, {status: 303, headers: {Location: safe, 'Set-Cookie': clearOwnerCookie(url.protocol === 'https:'), 'Cache-Control': 'no-store'}});
}
