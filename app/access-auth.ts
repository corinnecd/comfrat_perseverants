import {db} from '../db/raw';

export type AccessRole='team'|'leader';
const COOKIE='comfrat_access';
const PASSWORD_ITERATIONS=310000;

export async function ensureAccessTables(){
  await db().prepare(`CREATE TABLE IF NOT EXISTS app_access_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    role TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await db().prepare(`CREATE TABLE IF NOT EXISTS app_access_login_attempts (
    ip_hash TEXT PRIMARY KEY NOT NULL,
    window_start TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  )`).run();
}

function bytesToBase64(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function base64ToBytes(value:string){return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}
async function digest(value:string){return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
async function passwordHash(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:PASSWORD_ITERATIONS},key,256);return `pbkdf2$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;}
async function verifyPassword(password:string,stored:string){try{const [scheme,iterations,saltText,hashText]=stored.split('$');if(scheme!=='pbkdf2')return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:base64ToBytes(saltText),iterations:Number(iterations)},key,256));const expected=base64ToBytes(hashText);if(bits.length!==expected.length)return false;let difference=0;for(let i=0;i<bits.length;i++)difference|=bits[i]^expected[i];return difference===0;}catch{return false;}}
function cookieToken(req:Request){const prefix=COOKIE+'=';return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)||null;}
function sessionCookie(token:string,req:Request,maxAge=43200){const secure=new URL(req.url).protocol==='https:'?'; Secure':'';return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}

export async function getAccessRole(req:Request):Promise<AccessRole|null>{
  const token=cookieToken(req);if(!token)return null;
  await ensureAccessTables();
  const row=await db().prepare('SELECT role,expires_at FROM app_access_sessions WHERE token_hash=?').bind(await digest(token)).first<{role:string,expires_at:string}>();
  if(!row||Date.parse(row.expires_at)<=Date.now()||(row.role!=='team'&&row.role!=='leader'))return null;
  return row.role;
}

export async function createAccessSession(role:AccessRole,req:Request){
  await ensureAccessTables();
  const token=crypto.randomUUID()+crypto.randomUUID();const now=new Date();const expires=new Date(now.getTime()+12*60*60*1000);
  await db().prepare('INSERT INTO app_access_sessions(token_hash,role,expires_at,created_at) VALUES(?,?,?,?)').bind(await digest(token),role,expires.toISOString(),now.toISOString()).run();
  return sessionCookie(token,req);
}

export async function revokeAccessSession(req:Request){const token=cookieToken(req);if(token){await ensureAccessTables();await db().prepare('DELETE FROM app_access_sessions WHERE token_hash=?').bind(await digest(token)).run();}return sessionCookie('',req,0);}

export async function savedPasswordHash(role:AccessRole){const key=role==='team'?'access_team_password':'access_leader_password';return (await db().prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>())?.value||null;}
export async function setPasswordHashes(team:string,leader:string){const d=db();await d.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('access_team_password',await passwordHash(team)).run();await d.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('access_leader_password',await passwordHash(leader)).run();}
export async function checkPassword(role:AccessRole,password:string){const hash=await savedPasswordHash(role);return hash?verifyPassword(password,hash):false;}
export async function accessSetupComplete(){return !!(await savedPasswordHash('team'))&&!!(await savedPasswordHash('leader'));}
export async function loginRateLimited(req:Request){await ensureAccessTables();const ipHash=await digest(req.headers.get('cf-connecting-ip')||'unknown');const row=await db().prepare('SELECT window_start,attempts FROM app_access_login_attempts WHERE ip_hash=?').bind(ipHash).first<{window_start:string,attempts:number}>();return !!row&&Date.now()-Date.parse(row.window_start)<15*60*1000&&row.attempts>=8;}
export async function recordLoginAttempt(req:Request,success:boolean){await ensureAccessTables();const ipHash=await digest(req.headers.get('cf-connecting-ip')||'unknown');if(success){await db().prepare('DELETE FROM app_access_login_attempts WHERE ip_hash=?').bind(ipHash).run();return;}const now=new Date().toISOString(),cutoff=new Date(Date.now()-15*60*1000).toISOString();await db().prepare(`INSERT INTO app_access_login_attempts(ip_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END`).bind(ipHash,now,cutoff,cutoff).run();}
