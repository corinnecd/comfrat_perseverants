import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../../db/raw';
import {accessSetupComplete,checkPassword,createAccessSession,getAccessRole,revokeAccessSession,setPasswordHashes,loginRateLimited,recordLoginAttempt,type AccessRole} from '../../access-auth';

export const dynamic='force-dynamic';
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function isOwnerSetupUser(){const user=await getChatGPTUser();if(!user)return false;const owner=await db().prepare("SELECT value FROM settings WHERE key='owner'").first<{value:string}>();return owner?.value===user.userId;}
export async function GET(req:Request){try{const complete=await accessSetupComplete();const role=complete?await getAccessRole(req):null;return json({setupRequired:!complete,role,canSetup:!complete&&await isOwnerSetupUser()});}catch(e){console.error(e);return json({error:'Accès temporairement indisponible.'},503);}}
export async function POST(req:Request){try{if(req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});const body=await req.json() as any;
  if(body.action==='logout')return json({ok:true},200,{'Set-Cookie':await revokeAccessSession(req)});
  if(body.action==='setup'){
    if(await accessSetupComplete())return json({error:'Les accès ont déjà été configurés.'},409);
    if(!await isOwnerSetupUser())return json({error:'Connectez-vous avec le compte responsable du site pour créer les accès.'},403);
    if(typeof body.teamPassword!=='string'||typeof body.leaderPassword!=='string'||body.teamPassword.length<12||body.leaderPassword.length<12)return json({error:'Choisissez deux mots de passe d’au moins 12 caractères.'},400);
    if(body.teamPassword===body.leaderPassword)return json({error:'Choisissez deux mots de passe différents pour séparer les profils.'},400);
    await setPasswordHashes(body.teamPassword,body.leaderPassword);const cookie=await createAccessSession('leader',req);return json({ok:true,role:'leader'},200,{'Set-Cookie':cookie});
  }
  if(body.action==='login'){
    const role=body.role as AccessRole;if(role!=='team'&&role!=='leader')return json({error:'Choisissez un profil.'},400);
    if(await loginRateLimited(req))return json({error:'Trop de tentatives. Réessayez dans 15 minutes.'},429);
    const valid=typeof body.password==='string'&&body.password.length<=256&&await checkPassword(role,body.password);await recordLoginAttempt(req,!!valid);
    if(!valid)return json({error:'Mot de passe incorrect.'},401);
    const cookie=await createAccessSession(role,req);return json({ok:true,role},200,{'Set-Cookie':cookie});
  }
  return json({error:'Action inconnue.'},400);
}catch(e){console.error(e);return json({error:'Connexion impossible. Réessayez.'},503);}}
