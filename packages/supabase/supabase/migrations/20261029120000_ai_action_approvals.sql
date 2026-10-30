-- Approval-gated AI actions. AI can prepare work, but only an authorized
-- Studio operator can approve and execute it.

create table if not exists public.studio_ai_action_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in ('archive_product', 'update_order_status', 'send_invoice')),
  title text not null,
  description text not null default '',
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'executing', 'executed', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  requested_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text not null default '',
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  executed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists studio_ai_actions_status_idx
  on public.studio_ai_action_requests(status, requested_at desc);
create index if not exists studio_ai_actions_requested_by_idx
  on public.studio_ai_action_requests(requested_by, requested_at desc);

alter table public.studio_ai_action_requests enable row level security;
drop policy if exists "AI actions read" on public.studio_ai_action_requests;
drop policy if exists "AI actions create" on public.studio_ai_action_requests;
drop policy if exists "AI actions manage" on public.studio_ai_action_requests;
create policy "AI actions read"
  on public.studio_ai_action_requests for select to authenticated
  using (requested_by = (select auth.uid()) or public.studio_has_permission('automations.manage'));
create policy "AI actions create"
  on public.studio_ai_action_requests for insert to authenticated
  with check (requested_by = (select auth.uid()) and public.studio_has_permission('automations.read'));
create policy "AI actions manage"
  on public.studio_ai_action_requests for update to authenticated
  using (public.studio_has_permission('automations.manage'))
  with check (public.studio_has_permission('automations.manage'));

grant select, insert, update on public.studio_ai_action_requests to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.studio_ai_action_requests;
exception when duplicate_object then
  null;
end $$;
