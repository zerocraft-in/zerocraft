'use client';
import { currencyOptions } from "@/lib/currency";
import { useState } from 'react';
import { Button } from '@zerocraft/components/ui/button';
import { Input } from '@zerocraft/components/ui/input';
import { Card, CardContent } from '@zerocraft/components/ui/card';
export function CreateStoreForm(){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);try{const response=await fetch('/api/platform/stores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(form),starterCatalog:form.get('starterCatalog')==='on'})});const data=await response.json();if(!response.ok)throw new Error(data.error);window.location.assign(`/store/${data.id}/setup`);}catch(e){setError(e instanceof Error?e.message:'Store could not be created.');setBusy(false);}}
 return <Card><CardContent className="pt-6"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
 {([{name:'name',label:'Store name',placeholder:'My store',required:true},{name:'slug',label:'Store handle',placeholder:'my-store',pattern:'[a-z0-9]+(-[a-z0-9]+)*',required:true},{name:'contactEmail',label:'Contact email',type:'email',required:true},{name:'country',label:'Country code',defaultValue:'IN',pattern:'[A-Z]{2}'},{name:'timezone',label:'Time zone',defaultValue:'Asia/Kolkata'}] as const).map(field=><label key={field.name} className="text-sm font-medium">{field.label}<Input className="mt-2" {...field} maxLength={100} /></label>)}
 <label className="text-sm font-medium">Currency<select name="currency" defaultValue="INR" className="mt-2 block h-10 w-full rounded-md border bg-background px-3">{currencyOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
 <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="starterCatalog" defaultChecked />Add sample products and categories after database setup</label>
 {error&&<p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
 <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy?'Creating store…':'Create store'}</Button></div>
 </form></CardContent></Card>;
}

