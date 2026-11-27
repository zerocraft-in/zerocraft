import { isCurrencyCode } from "@/lib/currency";
import { audit, jsonBody, PlatformError, platformResponse, platformService, storeMember } from '@/lib/platform/server';
import { isSameOrigin } from '@/lib/request-origin';

const textFields = ['businessType', 'businessName', 'businessFirstName', 'businessLastName', 'businessCountry', 'businessEmail', 'businessPhone', 'contactEmail', 'phone', 'companyName', 'address', 'address2', 'city', 'state', 'postalCode', 'country', 'timezone', 'backupRegion', 'unitSystem', 'weightUnit', 'fulfillment', 'orderPrefix', 'orderSuffix'] as const;
const maxLengths: Record<(typeof textFields)[number], number> = {
  businessType: 24, businessName: 120, businessFirstName: 80, businessLastName: 80, businessCountry: 2, businessEmail: 200, businessPhone: 40,
  contactEmail: 200, phone: 40, companyName: 120, address: 240, address2: 240, city: 100, state: 100, postalCode: 24, country: 2, timezone: 80,
  backupRegion: 2, unitSystem: 16, weightUnit: 8, fulfillment: 16, orderPrefix: 12, orderSuffix: 12,
};

function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function PATCH(request: Request, context: { params: Promise<{ storeId: string }> }) {
  try {
    if (!isSameOrigin(request)) throw new PlatformError('Invalid request origin.', 403);
    const { storeId } = await context.params;
    const { user, store } = await storeMember(storeId, true);
    const body = await jsonBody(request);
    const settings = { ...(store.settings && typeof store.settings === 'object' ? store.settings : {}) } as Record<string, unknown>;
    const changed: string[] = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 100) throw new PlatformError('Store name must be between 1 and 100 characters.');
      if (name !== store.name) changed.push('name');
      store.name = name;
    }

    for (const key of textFields) {
      if (body[key] === undefined) continue;
      const value = String(body[key]).trim();
      if (value.length > maxLengths[key]) throw new PlatformError(`${key} is too long.`);
      if (key === 'businessType' && !['individual', 'company'].includes(value)) throw new PlatformError('Choose a valid business type.');
      if (['businessCountry', 'country', 'backupRegion'].includes(key) && value && !/^[A-Z]{2}$/.test(value)) throw new PlatformError('Choose a valid country.');
      if (['contactEmail', 'businessEmail'].includes(key) && value && !validEmail(value)) throw new PlatformError('Enter a valid email address.');
      if (key === 'unitSystem' && !['metric', 'imperial'].includes(value)) throw new PlatformError('Choose a valid unit system.');
      if (key === 'weightUnit' && !['kg', 'g', 'lb', 'oz'].includes(value)) throw new PlatformError('Choose a valid weight unit.');
      if (key === 'fulfillment' && !['manual', 'fulfill', 'gift-cards'].includes(value)) throw new PlatformError('Choose a valid fulfillment option.');
      if (key === 'timezone') { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); } catch { throw new PlatformError('Choose a valid time zone.'); } }
      if (settings[key] !== value) changed.push(key);
      settings[key] = value;
    }

    if (body.autoArchive !== undefined) {
      if (typeof body.autoArchive !== 'boolean') throw new PlatformError('Choose a valid order archive setting.');
      if (settings.autoArchive !== body.autoArchive) changed.push('autoArchive');
      settings.autoArchive = body.autoArchive;
    }

    if (body.currencyFormat !== undefined) {
      const value = body.currencyFormat;
      const fields = ['htmlWithCurrency', 'htmlWithoutCurrency', 'emailWithCurrency', 'emailWithoutCurrency'];
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PlatformError('Enter valid currency display formats.');
      const formats: Record<string, string> = {};
      for (const field of fields) {
        const template = String((value as Record<string, unknown>)[field] ?? '').trim();
        if (template.length > 100 || !template.includes('{{amount}}')) throw new PlatformError('Each currency format must include {{amount}} and be under 100 characters.');
        formats[field] = template;
      }
      const currentFormats = settings.currencyFormat && typeof settings.currencyFormat === 'object'
        ? settings.currencyFormat as Record<string, unknown>
        : {};
      if (fields.some((field) => currentFormats[field] !== formats[field])) changed.push('currencyFormat');
      settings.currencyFormat = formats;
    }

    if (body.currency !== undefined) {
      if (!isCurrencyCode(body.currency)) throw new PlatformError('Choose INR or USD.');
      if (body.currency !== settings.currency) {
        const savedFormats = { ...(settings.formatsByCurrency as Record<string, unknown> | undefined) };
        if (settings.currencyFormat) savedFormats[String(settings.currency || 'INR')] = settings.currencyFormat;
        settings.formatsByCurrency = savedFormats;
        settings.currencyFormat = savedFormats[body.currency] ?? null;
        settings.currency = body.currency;
        changed.push('currency');
      }
    }
    if (body.country !== undefined) settings.country = settings.country || body.country;

    if (changed.length === 0) return Response.json({ store: { ...store, settings } }, { headers: { 'Cache-Control': 'private, no-store' } });
    const { data, error } = await platformService().from('stores').update({ name: store.name, settings, updated_at: new Date().toISOString() }).eq('id', storeId).select('id,name,slug,status,settings,updated_at').single();
    if (error || !data) throw new PlatformError('Store settings could not be saved.', 503);
    await audit(storeId, user.id, 'store.settings.updated', { fields: [...new Set(changed)] });
    return Response.json({ store: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return platformResponse(error); }
}
