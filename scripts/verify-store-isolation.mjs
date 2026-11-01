import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isSafeReturnPath } from '../apps/cms/lib/domains.ts';
import { storeConnections, connectionForHost, getSupabasePublicConfig } from '../packages/supabase/src/config.ts';
const stores = [
 {id:'one',name:'Store one',adminOrigin:'https://one.admin.example.com',storefrontOrigin:'https://one.example.com',url:'https://one.supabase.co',key:'sb_publishable_one'},
 {id:'two',name:'Store two',adminOrigin:'https://two.admin.example.com',storefrontOrigin:'https://two.example.com',url:'https://two.supabase.co',key:'sb_publishable_two'},
];
process.env.NEXT_PUBLIC_STORE_CONNECTIONS = JSON.stringify(stores);
assert.equal(storeConnections().length,2);
assert.equal(getSupabasePublicConfig('one.admin.example.com').storeId,'one');
assert.equal(getSupabasePublicConfig('two.example.com').url,'https://two.supabase.co');
assert.equal(getSupabasePublicConfig('ONE.ADMIN.EXAMPLE.COM').key,'sb_publishable_one');
assert.throws(()=>getSupabasePublicConfig('attacker.example.com'),/not assigned/);
assert.throws(()=>getSupabasePublicConfig('one.admin.example.com.attacker.test'),/not assigned/);
assert.throws(()=>getSupabasePublicConfig(''),/not assigned/);
const concurrent = await Promise.all(Array.from({length:100},async(_,i)=>getSupabasePublicConfig(i%2 ? 'one.example.com':'two.example.com').storeId));
assert(concurrent.every((id,i)=>id===(i%2?'one':'two')));
for (const field of ['id','url','adminOrigin','storefrontOrigin']) {
 const duplicate = structuredClone(stores); duplicate[1][field]=duplicate[0][field];
 process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify(duplicate);assert.throws(()=>storeConnections(),/unique/);
}
for (const key of ['sb_secret_do_not_expose',`a.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.b`]) {
 const bad=structuredClone(stores);bad[0].key=key;process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify(bad);assert.throws(()=>storeConnections());
}
const exposed=structuredClone(stores);exposed[0].serviceRoleKey='secret';process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify(exposed);assert.throws(()=>storeConnections(),/public/);
const alias=structuredClone(stores);alias[1].adminAliases=[alias[0].adminOrigin];process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify(alias);assert.throws(()=>storeConnections(),/unique/);
const bad=structuredClone(stores);bad[0].adminOrigin='http://unsecured.example.com';process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify(bad);assert.throws(()=>storeConnections(),/HTTPS/);
process.env.NEXT_PUBLIC_STORE_CONNECTIONS=JSON.stringify([{...stores[0],adminOrigin:'http://localhost:3002',storefrontOrigin:'http://localhost:3001'}]);
assert.equal(connectionForHost('localhost:3002').id,'one');
delete process.env.NEXT_PUBLIC_STORE_CONNECTIONS;
process.env.NEXT_PUBLIC_SUPABASE_URL='https://legacy.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_legacy';
assert.equal(getSupabasePublicConfig().url,'https://legacy.supabase.co');
const service=fs.readFileSync(new URL('../packages/supabase/src/store-server.ts',import.meta.url),'utf8');
assert(service.includes('secrets[config.storeId]?.serviceRoleKey'));
assert(service.includes('else serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY'));
assert(!fs.existsSync(new URL('../apps/studio/',import.meta.url)));
console.log('Multi-store isolation: host routing, parallel request isolation, secret-key rejection, duplicate project/host rejection, HTTPS, and legacy compatibility passed.');

for (const value of ["https://evil.test","//evil.test",String.raw`/\evil.test`,"/safe\nheader"]) assert.equal(isSafeReturnPath(value),"/store");
assert.equal(isSafeReturnPath("/store/orders?id=1"),"/store/orders?id=1");
