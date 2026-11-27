import { S3Client,PutObjectCommand,GetObjectCommand,ListObjectsV2Command,DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { isSameOrigin } from '@/lib/request-origin';
import { storeMember,PlatformError,jsonBody,platformResponse,platformService,seal,step,audit } from '@/lib/platform/server';
import { unseal } from '@/lib/platform/server';
export async function GET(_request:Request,{params}:{params:Promise<{storeId:string}>}){
 try{const {storeId}=await params;await storeMember(storeId,true);const {data,error}=await platformService().from('connections').select('status,encrypted_config,details,verified_at').eq('store_id',storeId).eq('provider','r2').maybeSingle();if(error)throw new PlatformError('Media connection could not be loaded.',503);if(!data)return Response.json({connection:null});const config=unseal<{accountId:string;bucket:string;accessKeyId:string;publicBaseUrl:string}>(data.encrypted_config,`${storeId}:r2:connection`);return Response.json({connection:{status:data.status,verifiedAt:data.verified_at,accountId:config.accountId,bucket:config.bucket,publicBaseUrl:config.publicBaseUrl,accessKeyId:`${config.accessKeyId.slice(0,4)}••••${config.accessKeyId.slice(-4)}`,secretConfigured:true}},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return platformResponse(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{storeId:string}>}){
 try{
  if(!isSameOrigin(request))throw new PlatformError('Invalid request origin.',403);
  const {storeId}=await params;const {user,store}=await storeMember(storeId,true);const body=await jsonBody(request);
  const accountId=String(body.accountId||'').trim(),bucket=String(body.bucket||'').trim(),accessKeyId=String(body.accessKeyId||'').trim(),secretAccessKey=String(body.secretAccessKey||'').trim();
  if(!/^[a-f0-9]{32}$/.test(accountId)||! /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)||accessKeyId.length<16||accessKeyId.length>200||secretAccessKey.length<32||secretAccessKey.length>300)throw new PlatformError('Enter valid R2 bucket credentials.');
  let publicUrl:URL;try{publicUrl=new URL(String(body.publicBaseUrl||''));if(publicUrl.protocol!=='https:'||publicUrl.username||publicUrl.password||publicUrl.search||publicUrl.hash)throw new Error();}catch{throw new PlatformError('Enter a valid HTTPS media URL.');}
  const prefix=`stores/${store.slug}`;
  const client=new S3Client({region:'auto',endpoint:`https://${accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey},maxAttempts:1});
  const key=`${prefix}/.verification/${randomUUID()}.txt`;let written=false,verified=false,listed=false;
  try{
   await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:'zerocraft-storage-check',ContentType:'text/plain'}),{abortSignal:AbortSignal.timeout(15000)});written=true;
   const read=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});
   verified=await read.Body?.transformToString()==='zerocraft-storage-check';
   const listing=await client.send(new ListObjectsV2Command({Bucket:bucket,Prefix:key,MaxKeys:1}),{abortSignal:AbortSignal.timeout(15000)});
   listed=(listing.Contents||[]).some(item=>item.Key===key);
  }catch{throw new PlatformError('R2 verification failed. Check bucket permissions and credentials.',422);}
  finally{try{if(written)await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});}catch{throw new PlatformError('R2 delete verification failed. Check object-delete permissions.',422);}finally{client.destroy();}}
  if(!verified||!listed)throw new PlatformError('R2 read and list verification failed. Grant object listing permission for the configured bucket.',422);
  const service=platformService();const now=new Date().toISOString();
  const {error}=await service.from('connections').upsert({store_id:storeId,provider:'r2',status:'ready',encrypted_config:seal({accountId,bucket,accessKeyId,secretAccessKey,publicBaseUrl:publicUrl.toString().replace(/\/$/,''),prefix},`${storeId}:r2:connection`),details:{bucket,prefix,publicBaseUrl:publicUrl.toString().replace(/\/$/,'')},verified_at:now,updated_at:now},{onConflict:'store_id,provider'});
  if(error)throw new PlatformError('R2 connection could not be saved.',503);
  const {error:installError}=await service.from('installations').upsert({store_id:storeId,app_id:'media-manager',version:'1.0.0',status:'ready',installed_by:user.id});
  if(installError)throw new PlatformError('Media Manager installation could not be saved.',503);
  await audit(storeId,user.id,'media.connected',{provider:'r2',prefix});await step(storeId,'media','ready',{provider:'r2',verified:true});
  return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return platformResponse(e);}
}
