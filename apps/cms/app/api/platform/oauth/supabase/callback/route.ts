import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { platformUser,platformService,PlatformError,platformResponse,storeMember,unseal,audit } from '@/lib/platform/server';
import { oauthConfig,exchange,saveGrant } from '@/lib/platform/supabase-oauth';
export async function GET(request:Request){
 try{
  const config=oauthConfig();const {user}=await platformUser();const url=new URL(request.url);const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  if(!state||state.length>128||!code||code.length>4096)throw new PlatformError('Authorization was cancelled or is invalid.');
  const service=platformService();const {data:attempt,error}=await service.from('oauth_attempts').select('id,store_id,encrypted_verifier').eq('state_hash',createHash('sha256').update(state).digest('hex')).eq('user_id',user.id).eq('provider','supabase').is('consumed_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!attempt)throw new PlatformError('Authorization expired. Connect again.',400);
  await storeMember(attempt.store_id,true);
  const {data:claimed,error:claimError}=await service.from('oauth_attempts').update({consumed_at:new Date().toISOString()}).eq('id',attempt.id).is('consumed_at',null).select('id').maybeSingle();
  if(claimError||!claimed)throw new PlatformError('Authorization has already been used.');
  const {verifier}=unseal<{verifier:string}>(attempt.encrypted_verifier,`${attempt.store_id}:supabase:attempt`);
  const grant=await exchange({grant_type:'authorization_code',code,redirect_uri:config.redirectUri,code_verifier:verifier});await saveGrant(attempt.store_id,grant);await audit(attempt.store_id,user.id,'supabase.authorized');
  const response=NextResponse.redirect(new URL(`/store/${attempt.store_id}/setup?supabase=authorized`,config.origin));response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch(e){return platformResponse(e);}
}
