import { getOrCreateActiveSession } from '../../../checkin-session';
export const dynamic = 'force-dynamic';
export async function GET(req:Request) {
  try {
    const session = await getOrCreateActiveSession();
    if (!session.active || !session.token) return Response.json({active:false,nextStartAt:session.nextStartAt},{headers:{'Cache-Control':'no-store'}});
    const url = new URL('/accueil',req.url); url.searchParams.set('session',session.token);
    return Response.json({active:true,token:session.token,meetingDay:session.meetingDay,startsAt:session.startsAt,expiresAt:session.expiresAt,url:url.toString()},{headers:{'Cache-Control':'no-store'}});
  } catch(e) { console.error(e); return Response.json({error:'QR indisponible pour le moment.'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
