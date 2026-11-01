import 'server-only';
import { PlatformError,platformService,unseal,seal } from './server';
export function oauthConfig(){
 const clientId=process.env.SUPABASE_OAUTH_CLIENT_ID,secret=process.env.SUPABASE_OAUTH_CLIENT_SECRET,origin=process.env.PLATFORM_ORIGIN;
 if(!clientId||!secret||!origin)throw new PlatformError('Supabase OAuth credentials are not configured.',503);
 const url=new URL(origin);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new PlatformError('Platform origin must use HTTPS.',503);
 return {clientId,secret,redirectUri:`${url.origin}/api/platform/oauth/supabase/callback`,origin:url.origin};
}
type Grant={access_token:string;refresh_token:string;expires_in:number};
export async function exchange(parameters:Record<string,string>):Promise<Grant>{
 const config=oauthConfig();const response=await fetch('https://api.supabase.com/v1/oauth/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(parameters),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new PlatformError('Supabase authorization failed. Connect again.',502);
 const result=await response.json();if(typeof result.access_token!=='string'||typeof result.refresh_token!=='string'||!Number.isFinite(result.expires_in)||result.expires_in<=0)throw new PlatformError('Supabase returned an invalid authorization response.',502);return result;
}
export async function saveGrant(storeId:string,grant:Grant){
 const {error}=await platformService().from('oauth_grants').upsert({store_id:storeId,provider:'supabase',encrypted_token:seal(grant,`${storeId}:supabase:grant`),expires_at:new Date(Date.now()+grant.expires_in*1000).toISOString()});
 if(error)throw new PlatformError('Supabase authorization could not be saved.',503);
}
export async function management(storeId:string,path:string){
 const {data,error}=await platformService().from('oauth_grants').select('encrypted_token,expires_at').eq('store_id',storeId).eq('provider','supabase').single();
 if(error||!data)throw new PlatformError('Connect Supabase first.',409);
 let grant=unseal<Grant>(data.encrypted_token,`${storeId}:supabase:grant`);
 if(new Date(data.expires_at).getTime()<Date.now()+60000){grant=await exchange({grant_type:'refresh_token',refresh_token:grant.refresh_token});await saveGrant(storeId,grant);}
 const response=await fetch(`https://api.supabase.com/v1${path}`,{headers:{Authorization:`Bearer ${grant.access_token}`},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new PlatformError(response.status===401?'Supabase access expired. Connect again.':'Supabase projects could not be loaded.',502);
 return response.json();
}
