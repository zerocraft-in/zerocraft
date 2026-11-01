import { createHash,randomBytes } from 'node:crypto';
import { isSameOrigin } from '@/lib/request-origin';
import { storeMember,platformService,platformResponse,PlatformError,seal,step,audit } from '@/lib/platform/server';
import { oauthConfig,management } from '@/lib/platform/supabase-oauth';
export async function GET(_request:Request,{params}:{params:Promise<{storeId:string}>}){
 try{const {storeId}=await params;await storeMember(storeId,true);const rows=await management(storeId,'/projects');if(!Array.isArray(rows))throw new PlatformError('Invalid project response.',502);return Response.json({projects:rows.map(p=>({id:p.id,name:p.name,region:p.region,status:p.status}))},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return platformResponse(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{storeId:string}>}){
 try{
  if(!isSameOrigin(request))throw new PlatformError('Invalid request origin.',403);
  const {storeId}=await params;const {user}=await storeMember(storeId,true);const body=await request.json().catch(()=>({}));
  if(body.action==='select'&&typeof body.projectId==='string'){const project=await management(storeId,`/projects/${encodeURIComponent(body.projectId)}`);if(!project||project.id!==body.projectId)throw new PlatformError('Selected Supabase project was not found.',404);const {error}=await platformService().from('connections').upsert({store_id:storeId,provider:'supabase',project_ref:project.id,status:'ready',details:{name:project.name,region:project.region,status:project.status},verified_at:new Date().toISOString()},{onConflict:'store_id,provider'});if(error)throw new PlatformError('Supabase project could not be linked.',503);await step(storeId,'database','ready',{projectRef:project.id,name:project.name});await audit(storeId,user.id,'supabase.project.selected',{projectRef:project.id});return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});}
  if(body.action==='catalog'){const {data:connection}=await platformService().from('connections').select('project_ref,status').eq('store_id',storeId).eq('provider','supabase').maybeSingle();if(!connection?.project_ref||connection.status!=='ready')throw new PlatformError('Select a Supabase project first.',409);const project=await management(storeId,`/projects/${encodeURIComponent(connection.project_ref)}`);await step(storeId,'catalog','ready',{projectRef:connection.project_ref,sampleCatalog:body.sampleCatalog===true,verifiedStatus:project.status});await audit(storeId,user.id,'catalog.schema.verified',{projectRef:connection.project_ref,sampleCatalog:body.sampleCatalog===true});return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});}
  if(body.action==='disconnect'){await platformService().from('connections').delete().eq('store_id',storeId).eq('provider','supabase');await platformService().from('oauth_grants').delete().eq('store_id',storeId).eq('provider','supabase');await step(storeId,'database','pending',{});await step(storeId,'catalog','pending',{});await audit(storeId,user.id,'supabase.disconnected',{});return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});}
  const config=oauthConfig();
  const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
  const {error}=await platformService().from('oauth_attempts').insert({store_id:storeId,user_id:user.id,provider:'supabase',state_hash:createHash('sha256').update(state).digest('hex'),encrypted_verifier:seal({verifier},`${storeId}:supabase:attempt`),expires_at:new Date(Date.now()+10*60000).toISOString()});
  if(error)throw new PlatformError('Authorization could not be started.',503);
  const url=new URL('https://api.supabase.com/v1/oauth/authorize');url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
  return Response.json({url:url.toString()},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return platformResponse(e);}
}
