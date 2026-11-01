import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const base=process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;
if(!url||!key||!base)throw new Error('Existing store media configuration is required.');
const headers={apikey:key,Authorization:`Bearer ${key}`};
const response=await fetch(`${url}/rest/v1/store_product_media?select=id,storage_path,public_url,alt_text&storage_path=like.r2%2F*`,{headers});
if(!response.ok)throw new Error(`Cannot read legacy media (${response.status}).`);
const rows=await response.json();const migrated=[];
for(const row of rows){
 const source=new URL(row.public_url);if(source.origin!==new URL(base).origin||source.protocol!=='https:')throw new Error('Legacy media URL is outside the configured R2 origin.');
 const extension=row.storage_path.split('.').at(-1).toLowerCase();const type=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'})[extension];if(!type)throw new Error('Unsupported legacy media format.');
 const download=await fetch(source);if(!download.ok)throw new Error(`Cannot download legacy media (${download.status}).`);
 const data=Buffer.from(await download.arrayBuffer());if(!data.length||data.length>10*1024*1024)throw new Error('Legacy image exceeds the media size limit.');
 const path=`library/${randomUUID()}.${extension==='jpeg'?'jpg':extension}`;
 const uploaded=await fetch(`${url}/storage/v1/object/product-media/${path}`,{method:'POST',headers:{...headers,'Content-Type':type,'x-upsert':'false'},body:data});
 if(!uploaded.ok)throw new Error(`Supabase rejected legacy image copy (${uploaded.status}).`);
 const publicUrl=`${url}/storage/v1/object/public/product-media/${path}`;
 const check=await fetch(publicUrl);if(!check.ok||Buffer.compare(Buffer.from(await check.arrayBuffer()),data)!==0)throw new Error('Copied media verification failed.');
 migrated.push({id:row.id,oldPath:row.storage_path,oldUrl:row.public_url,path,url:publicUrl,name:row.storage_path.split('/').at(-1),mimeType:type,size:data.length,altText:row.alt_text||''});
}
await writeFile('.local-backups/20261101-store-only/copied-legacy-media.json',JSON.stringify(migrated,null,2)+'\n',{flag:'wx'});
console.log(`Verified ${migrated.length} image copies in this store's Supabase Storage. Original R2 files retained.`);
