// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@zerocraft/components/ui/button';
import { Input } from '@zerocraft/components/ui/input';
export function MediaConnectionForm({storeId}:{storeId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[showSecrets,setShowSecrets]=useState(false),[existing,setExisting]=useState<Record<string,string>|null>(null);
 useEffect(()=>{fetch(`/api/platform/stores/${storeId}/media`,{cache:'no-store'}).then(r=>r.json()).then(v=>setExisting(v.connection)).catch(()=>{});},[storeId]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=event.currentTarget;try{const response=await fetch(`/api/platform/stores/${storeId}/media`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error);form.reset();window.location.reload();}catch(e){setError(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}}
 return <details className="mt-3 rounded-lg border bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Connect an existing R2 bucket</summary><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
 {([{name:'accountId',label:'Cloudflare account ID'},{name:'bucket',label:'Bucket name'},{name:'publicBaseUrl',label:'Public media URL',type:'url'},{name:'accessKeyId',label:'Access key ID',type:'text'},{name:'secretAccessKey',label:'Secret access key',type:'password'}] as const).map(field=><label key={field.name} className="text-xs font-medium">{field.label}<span className="relative mt-1 block"><Input className="pr-16" name={field.name} defaultValue={existing?.[field.name]||''} placeholder={field.name==='secretAccessKey'&&existing?.secretConfigured?'Configured — enter only to replace':''} type={field.type==='password'&&!showSecrets?'password':field.type==='password'?'text':field.type} required={!existing&&field.name!=='secretAccessKey'} autoComplete="off" disabled={busy}/>{field.type==='password'&&<button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground underline" onClick={()=>setShowSecrets(value=>!value)}>{showSecrets?'Hide':'Show'}</button>}</span></label>)}
 <p className="text-xs text-muted-foreground sm:col-span-2">Credentials are encrypted on the server. This store uses its own object prefix. We verify upload, read, and delete access before saving.</p>
 {error&&<p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}<div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy?'Verifying storage…':'Verify and install Media Manager'}</Button></div>
 </form></details>;
}
