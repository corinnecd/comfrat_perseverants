export const dynamic = 'force-dynamic';

/** « Ce n'est pas moi » : retire l'association entre cet appareil et une fiche (cookie comfrat_person). */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (req.headers.get('origin') !== url.origin) return new Response(null, {status: 403});
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return Response.json({ok: true}, {headers: {'Cache-Control': 'no-store', 'Set-Cookie': `comfrat_person=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`}});
}
