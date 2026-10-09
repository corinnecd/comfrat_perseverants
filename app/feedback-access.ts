import {db} from '../db/raw';

const COOKIE='comfrat_feedback_access';
const CODE_ITERATIONS=310000;
let migration:Promise<void>|null=null;

function bytesToBase64(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function base64ToBytes(value:string){return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}
async function digest(value:string){return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}

export async function ensureSimpleAccess(){
  if(!migration)migration=(async()=>{
    const d=db();
    const done=await d.prepare("SELECT value FROM settings WHERE key='simple_access_migration_v1'").first<{value:string}>();
    if(!done){
      await d.prepare('DROP TABLE IF EXISTS app_access_sessions').run();
      await d.prepare('DROP TABLE IF EXISTS app_access_login_attempts').run();
      await d.prepare("DELETE FROM settings WHERE key IN ('access_team_password','access_leader_password')").run();
      await d.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('simple_access_migration_v1','1')").run();
    }
    await d.prepare(`CREATE TABLE IF NOT EXISTS feedback_access_sessions(token_hash TEXT PRIMARY KEY NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`).run();
    await d.prepare(`CREATE TABLE IF NOT EXISTS feedback_access_attempts(ip_hash TEXT PRIMARY KEY NOT NULL,window_start TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0)`).run();
  })().catch(error=>{migration=null;throw error;});
  await migration;
}

async function codeHash(code:string){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:CODE_ITERATIONS},key,256);return `pbkdf2$${CODE_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;}
async function verifyCode(code:string,stored:string){try{const [scheme,iterations,saltText,hashText]=stored.split('$');if(scheme!=='pbkdf2')return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveBits']);const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:base64ToBytes(saltText),iterations:Number(iterations)},key,256));const expected=base64ToBytes(hashText);if(bits.length!==expected.length)return false;let diff=0;for(let i=0;i<bits.length;i++)diff|=bits[i]^expected[i];return diff===0;}catch{return false;}}
export async function feedbackCodeExists(){return !!(await db().prepare("SELECT value FROM settings WHERE key='feedback_access_code'").first<{value:string}>());}
export async function saveFeedbackCode(code:string){const hash=await codeHash(code);await db().prepare("INSERT INTO settings(key,value) VALUES('feedback_access_code',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(hash).run();}
export async function verifyFeedbackCode(code:string){const row=await db().prepare("SELECT value FROM settings WHERE key='feedback_access_code'").first<{value:string}>();return row?verifyCode(code,row.value):false;}
function sessionToken(req:Request){const prefix=COOKIE+'=';return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)||null;}
function sessionCookie(token:string,req:Request,maxAge=7200){const secure=new URL(req.url).protocol==='https:'?'; Secure':'';return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}
export async function grantFeedbackAccess(req:Request){await ensureSimpleAccess();const token=crypto.randomUUID()+crypto.randomUUID(),now=new Date();await db().prepare('INSERT INTO feedback_access_sessions(token_hash,expires_at,created_at) VALUES(?,?,?)').bind(await digest(token),new Date(now.getTime()+2*60*60*1000).toISOString(),now.toISOString()).run();return sessionCookie(token,req);}
export async function hasFeedbackAccess(req:Request){await ensureSimpleAccess();const token=sessionToken(req);if(!token)return false;const row=await db().prepare('SELECT expires_at FROM feedback_access_sessions WHERE token_hash=?').bind(await digest(token)).first<{expires_at:string}>();return !!row&&Date.parse(row.expires_at)>Date.now();}
export async function revokeFeedbackAccess(req:Request){const token=sessionToken(req);if(token){await ensureSimpleAccess();await db().prepare('DELETE FROM feedback_access_sessions WHERE token_hash=?').bind(await digest(token)).run();}return sessionCookie('',req,0);}
async function ipHash(req:Request){return digest(req.headers.get('cf-connecting-ip')||'unknown');}
export async function codeAttemptsLimited(req:Request){await ensureSimpleAccess();const row=await db().prepare('SELECT window_start,attempts FROM feedback_access_attempts WHERE ip_hash=?').bind(await ipHash(req)).first<{window_start:string,attempts:number}>();return !!row&&Date.now()-Date.parse(row.window_start)<15*60*1000&&row.attempts>=8;}
export async function recordCodeAttempt(req:Request,success:boolean){await ensureSimpleAccess();const hash=await ipHash(req);if(success){await db().prepare('DELETE FROM feedback_access_attempts WHERE ip_hash=?').bind(hash).run();return;}const now=new Date().toISOString(),cutoff=new Date(Date.now()-15*60*1000).toISOString();await db().prepare(`INSERT INTO feedback_access_attempts(ip_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END`).bind(hash,now,cutoff,cutoff).run();}
