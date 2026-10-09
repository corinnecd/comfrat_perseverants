import {db} from '../../../../db/raw';
import {ensureFeedbackTable} from '../../../checkin-feedback';

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(req:Request){
  try{
    if(req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});
    const b=await req.json() as any;
    if(typeof b.token!=='string'||typeof b.day!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.day))return json({error:'Votre présence n’a pas pu être retrouvée.'},400);
    if(typeof b.prayerRequested!=='boolean'||typeof b.testimonyRequested!=='boolean')return json({error:'Veuillez répondre aux deux questions.'},400);
    const prayerText=typeof b.prayerText==='string'?b.prayerText.trim():'';
    const testimonyText=typeof b.testimonyText==='string'?b.testimonyText.trim():'';
    if(prayerText.length>2000||testimonyText.length>3000)return json({error:'Votre message est trop long.'},400);
    if((b.prayerRequested&&!prayerText)||(b.testimonyRequested&&!testimonyText))return json({error:'Ajoutez votre message ou sélectionnez « Non ».'},400);
    const d=db();
    const person=await d.prepare('SELECT id FROM people WHERE token=?').bind(b.token).first<{id:string}>();
    if(!person)return json({error:'Votre QR personnel a changé. Demandez de l’aide à l’accueil.'},401);
    const attendance=await d.prepare('SELECT person FROM attendance WHERE person=? AND day=?').bind(person.id,b.day).first<{person:string}>();
    if(!attendance)return json({error:'Confirmez d’abord votre présence pour cette rencontre.'},403);
    await ensureFeedbackTable();
    await d.prepare(`INSERT INTO checkin_feedback(person,day,prayer_requested,prayer_text,testimony_requested,testimony_text,created)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(person,day) DO UPDATE SET prayer_requested=excluded.prayer_requested,prayer_text=excluded.prayer_text,testimony_requested=excluded.testimony_requested,testimony_text=excluded.testimony_text,created=excluded.created`)
      .bind(person.id,b.day,b.prayerRequested?1:0,prayerText,b.testimonyRequested?1:0,testimonyText,new Date().toISOString()).run();
    return json({ok:true});
  }catch(e){console.error(e);return json({error:'Impossible d’enregistrer votre partage. Réessayez.'},503);}
}
