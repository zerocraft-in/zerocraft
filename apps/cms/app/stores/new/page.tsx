import { ownerPage } from '@/lib/platform/page-access';
import { PlatformShell } from '@/components/platform/platform-shell';
import { CreateStoreForm } from '@/components/platform/create-store-form';
export default async function NewStore(){await ownerPage();return <PlatformShell><h1 className="mb-6 text-xl font-semibold">Create your store</h1><CreateStoreForm /></PlatformShell>;}
