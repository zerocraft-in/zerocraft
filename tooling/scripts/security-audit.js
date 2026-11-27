import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "apps", "admin", "src");
const apiRoot = path.join(appRoot, "app", "api");
const migrationRoot = path.join(root, "supabase", "migrations");

function filesUnder(directory, suffix) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(fullPath, suffix));
    else if (entry.name.endsWith(suffix)) result.push(fullPath);
  }
  return result;
}

const failures = [];
const routeFiles = filesUnder(apiRoot, "route.ts");
for (const file of routeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  const isPublicHealth = /[\\/]api[\\/](health|ready)[\\/]route\.ts$/.test(file);
  if (!isPublicHealth && !/require(User|Organization|Permission|Roles)/.test(source)) {
    failures.push(`${relative}: protected route has no server authorization helper`);
  }
  if (/searchParams\.get\(["']organization_id|x-organization-id/.test(source)) {
    failures.push(`${relative}: trusts a client organization selector`);
  }
}

const actionRoot = path.join(appRoot, "app");
for (const file of filesUnder(actionRoot, "actions.ts")) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  if (!source.includes('"use server"') && !source.includes("'use server'")) continue;
  const isAuthAction = /[\\/]app[\\/]\(auth\)[\\/](onboarding|accept-invite)[\\/]actions\.ts$/.test(file);
  const isOwnProfileAction = /[\\/]profile-actions\.ts$/.test(file);
  if (!isAuthAction && !isOwnProfileAction && !/require(User|Organization|Permission|Roles)/.test(source)) {
    failures.push(`${relative}: server action has no server authorization helper`);
  }
}

for (const file of [
  path.join(appRoot, "lib", "supabase", "admin.ts"),
  path.join(appRoot, "lib", "supabase", "service.ts"),
]) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes('import "server-only"')) {
    failures.push(`${path.relative(root, file)}: privileged client lacks server-only guard`);
  }
}

const migrationText = filesUnder(migrationRoot, ".sql")
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const tables = [
  ...migrationText.matchAll(/create table(?: if not exists)?\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi),
].map((match) => match[1]);
for (const table of new Set(tables)) {
  const enabled = new RegExp(`alter table(?: if not exists)?\\s+(?:public\\.)?${table}\\s+enable row level security`, "i").test(migrationText);
  if (!enabled) failures.push(`public.${table}: no migration enables row level security`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Security audit passed: ${routeFiles.length} API routes, ${filesUnder(actionRoot, "actions.ts").length} action modules, and ${new Set(tables).size} tables inspected.`);
