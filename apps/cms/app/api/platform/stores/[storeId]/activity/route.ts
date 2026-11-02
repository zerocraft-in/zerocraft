import { PlatformError, platformResponse, platformService, storeMember } from '@/lib/platform/server';

export async function GET(request: Request, context: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await context.params;
    await storeMember(storeId, true);
    const service = platformService();
    const changesOnly = new URL(request.url).searchParams.get('type') === 'changes';
    let query = service.from('audit_logs').select('id,actor_id,action,metadata,created_at').eq('store_id', storeId);
    if (changesOnly) query = query.like('action', 'store.settings.%');
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new PlatformError('Store activity could not be loaded.', 503);
    const ids = [...new Set((data || []).map((item) => item.actor_id).filter(Boolean))];
    const { data: accounts } = ids.length ? await service.from('accounts').select('id,display_name').in('id', ids) : { data: [] };
    const names = new Map((accounts || []).map((account) => [account.id, account.display_name]));
    const activity = (data || []).map((item) => ({ id: item.id, action: item.action, metadata: item.metadata || {}, createdAt: item.created_at, actorName: names.get(item.actor_id) || 'Store member' }));
    return Response.json({ activity }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return platformResponse(error); }
}
