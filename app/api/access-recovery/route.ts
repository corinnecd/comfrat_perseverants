import {ownerAccess} from '../../owner-access';
import {replaceAccessCode} from '../../feedback-access';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const owner=await ownerAccess();return json({authorized:owner.authorized,status:owner.status});}catch(error){console.error(error);return json({error:'Vérification indisponible. Réessayez.'},503);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Requête refusée.'},403);
 if(!(await ownerAccess()).authorized)return json({error:'Seul le propriétaire peut modifier les codes.'},403);
 const body=await req.json() as {target?:string;code?:string;confirmation?:string};
 if(body.target!=='team'&&body.target!=='feedback')return json({error:'Choisissez le code à modifier.'},400);
 if(typeof body.code!=='string'||body.code.length<8||body.code.length>64)return json({error:'Choisissez un code de 8 à 64 caractères.'},400);
 if(body.code!==body.confirmation)return json({error:'Les deux codes ne correspondent pas.'},400);
 await replaceAccessCode(body.target,body.code);return json({ok:true});
 }catch(error){console.error(error);return json({error:'Modification impossible. Réessayez.'},503);}}
