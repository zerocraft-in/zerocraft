import { storePage } from '@/lib/platform/page-access';
import { PlatformShell } from '@/components/platform/platform-shell';
import { SetupWizard } from '@/components/platform/setup-wizard';
export default async function SetupPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {store,member,client}=await storePage(slug);const canonicalId=store.id;
 const [{data:steps,error},{data:connections},{data:features}]=await Promise.all([
  client.from('setup_steps').select('key,status').eq('store_id',canonicalId),
  client.from('connections').select('provider,status').eq('store_id',canonicalId),
  client.from('features').select('key,enabled').eq('store_id',canonicalId),
 ]);
 if(error)throw new Error('Setup progress could not be loaded.');
 return <PlatformShell name={store.name}><SetupWizard storeId={canonicalId} storeSlug={store.slug} name={store.name} steps={steps||[]} connections={connections||[]} features={features||[]} canManage={['owner','manager'].includes(member.role)} supabaseConfigured={Boolean(process.env.SUPABASE_OAUTH_CLIENT_ID&&process.env.SUPABASE_OAUTH_CLIENT_SECRET)} cloudflareConfigured={Boolean(process.env.CLOUDFLARE_OAUTH_CLIENT_ID&&process.env.CLOUDFLARE_OAUTH_CLIENT_SECRET)} /></PlatformShell>;
}
