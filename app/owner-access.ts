import {getChatGPTUser} from './chatgpt-auth';
import {env} from 'cloudflare:workers';
import {db} from '../db/raw';
export async function ownerAccess(){
 const user=await getChatGPTUser();const owner=await db().prepare("SELECT value FROM settings WHERE key='owner'").first<{value:string}>();
 const email=(env as Cloudflare.Env&{COMFRAT_OWNER_EMAIL?:string}).COMFRAT_OWNER_EMAIL?.trim().toLowerCase();
 const authorized=!!user&&(owner?.value===user.userId||!!email&&user.email.trim().toLowerCase()===email);
 return {authorized,status:!user?'sign_in_required':authorized?'owner':'different_account',user};
}
