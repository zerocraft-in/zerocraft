insert into public.studio_permissions (key, label, description, group_name, sort_order) values
  ('system_health.read', 'View system health', 'View infrastructure, database, storage, SMTP, and automation health.', 'System', 150),
  ('system_health.manage', 'Run system diagnostics', 'Run on-demand read-only system diagnostics and record the result.', 'System', 151)
on conflict (key) do update set label = excluded.label, description = excluded.description, group_name = excluded.group_name, sort_order = excluded.sort_order;

insert into public.studio_role_permissions (role, permission_key, allowed) values
  ('admin', 'system_health.read', true),
  ('admin', 'system_health.manage', true),
  ('manager', 'system_health.read', true),
  ('manager', 'system_health.manage', true)
on conflict (role, permission_key) do update set allowed = excluded.allowed, updated_at = now();
