import { audit, jsonBody, PlatformError, platformResponse, platformService, storeMember } from '@/lib/platform/server';
import { isSameOrigin } from '@/lib/request-origin';

export async function POST(request: Request, context: { params: Promise<{ storeId: string }> }) {
  try {
    if (!isSameOrigin(request)) throw new PlatformError('Invalid request origin.', 403);
    const { storeId } = await context.params;
    const { user, member, store } = await storeMember(storeId, true);
    if (member.role !== 'owner') throw new PlatformError('Only the store owner can request an ownership transfer.', 403);
    const body = await jsonBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new PlatformError('Enter a valid new owner email address.');
    if (email === user.email?.toLowerCase()) throw new PlatformError('Enter an email address different from the current owner.');
    const settings = { ...(store.settings && typeof store.settings === 'object' ? store.settings : {}) } as Record<string, unknown>;
    settings.transferRequest = { email, requestedAt: new Date().toISOString(), requestedBy: user.id, status: 'pending' };
    const { error } = await platformService().from('stores').update({ settings, updated_at: new Date().toISOString() }).eq('id', storeId);
    if (error) throw new PlatformError('The ownership transfer request could not be saved.', 503);
    await audit(storeId, user.id, 'store.transfer.requested', { status: 'pending' });
    return Response.json({ request: { email, status: 'pending' }, message: 'Request recorded. Ownership and access remain unchanged until an authorized handoff is completed.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return platformResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ storeId: string }> }) {
  try {
    if (!isSameOrigin(request)) throw new PlatformError('Invalid request origin.', 403);
    const { storeId } = await context.params;
    const { user, member, store } = await storeMember(storeId, true);
    if (member.role !== 'owner') throw new PlatformError('Only the store owner can cancel an ownership transfer request.', 403);
    const settings = { ...(store.settings && typeof store.settings === 'object' ? store.settings : {}) } as Record<string, unknown>;
    if (!settings.transferRequest) throw new PlatformError('There is no pending transfer request.');
    delete settings.transferRequest;
    const { error } = await platformService().from('stores').update({ settings, updated_at: new Date().toISOString() }).eq('id', storeId);
    if (error) throw new PlatformError('The ownership transfer request could not be cancelled.', 503);
    await audit(storeId, user.id, 'store.transfer.cancelled');
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return platformResponse(error); }
}
