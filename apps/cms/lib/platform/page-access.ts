import { redirect } from 'next/navigation';
import { platformUser, storeMember, PlatformError } from './server';

export async function ownerPage() {
  try { return await platformUser(); }
  catch (error) { if (error instanceof PlatformError && error.status === 401) redirect('/login?next=%2Fstores'); throw error; }
}
export async function storePage(id: string) {
  const {client}=await ownerPage();
  const {data}=await client.from('stores').select('id').eq('slug',id).maybeSingle();
  if(!data)throw new PlatformError('Store not found.',404);
  return storeMember(data.id);
}
