import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const tables = ['blogs','works','reviews','clients','appointments','studio_leads','studio_lead_activities','studio_projects','studio_project_milestones'];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Backup requires the current project URL and server service key.');
const directory = new URL('../.local-backups/20261101-store-only/', import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = { project: new URL(url).host, createdAt: new Date().toISOString(), tables: {} };
for (const table of tables) {
  const rows = [];
  for (let offset = 0;; offset += 1000) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&order=id.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${offset}-${offset + 999}` } });
    if (!response.ok) throw new Error(`Backup ${table} failed (${response.status}). No deletion may proceed.`);
    const page = await response.json(); rows.push(...page); if (page.length < 1000) break;
  }
  const text = JSON.stringify(rows, null, 2) + '\n';
  const path = new URL(`${table}.json`, directory);
  await writeFile(path, text, { flag: 'wx' });
  const verified = await readFile(path, 'utf8');
  if (verified !== text || JSON.parse(verified).length !== rows.length) throw new Error('Backup verification failed.');
  manifest.tables[table] = { rows: rows.length, sha256: createHash('sha256').update(verified).digest('hex') };
}
await writeFile(new URL('data-manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(`Verified local backup: ${tables.length} tables, ${Object.values(manifest.tables).reduce((sum, item) => sum + item.rows, 0)} rows.`);
