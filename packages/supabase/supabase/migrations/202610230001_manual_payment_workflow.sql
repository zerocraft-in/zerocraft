-- ZEROCRAFT MANUAL PAYMENT WORKFLOW
-- Forward-only source migration. Review and apply in disposable Supabase first.
-- This migration stores no merchant secrets and never auto-confirms a payment.

alter table public.store_orders add column if not exists payment_attempt_id uuid;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.store_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ '(payment_method|payment_status)'
  loop
    execute format('alter table public.store_orders drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.store_orders
  add constraint store_orders_payment_method_check
  check (payment_method in ('cod', 'upi_qr', 'bank_transfer')),
  add constraint store_orders_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));

create table if not exists public.store_payment_methods (
  id uuid primary key default gen_random_uuid(),
  method_code text not null unique check (method_code in ('upi_qr', 'bank_transfer')),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  enabled boolean not null default false,
  merchant_name text not null default '',
  upi_vpa text not null default '',
  upi_qr_image_url text not null default '',
  bank_name text not null default '',
  bank_account_name text not null default '',
  bank_account_number text not null default '',
  bank_ifsc text not null default '',
  instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  method_code text not null check (method_code in ('upi_qr', 'bank_transfer')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null check (length(trim(idempotency_key)) between 1 and 128),
  status text not null default 'awaiting_customer'
    check (status in ('awaiting_customer', 'proof_submitted', 'paid', 'rejected', 'expired', 'cancelled')),
  provider_reference text not null default '',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, idempotency_key)
);

create table if not exists public.store_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references public.store_payment_attempts(id) on delete restrict,
  order_id uuid not null references public.store_orders(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  utr text not null check (utr ~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$'),
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz,
  evidence_path text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  unique (payment_attempt_id, utr)
);

do $$ begin
  alter table public.store_orders add constraint store_orders_payment_attempt_fk
    foreign key (payment_attempt_id) references public.store_payment_attempts(id) on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists store_payment_attempts_customer_idx on public.store_payment_attempts(customer_id, created_at desc);
create index if not exists store_payment_attempts_order_idx on public.store_payment_attempts(order_id, created_at desc);
create index if not exists store_payment_submissions_status_idx on public.store_payment_submissions(status, created_at desc);

alter table public.store_payment_methods enable row level security;
alter table public.store_payment_attempts enable row level security;
alter table public.store_payment_submissions enable row level security;

drop policy if exists "Public enabled payment methods" on public.store_payment_methods;
create policy "Public enabled payment methods" on public.store_payment_methods for select
  using (enabled = true);
drop policy if exists "Studio admins manage payment methods" on public.store_payment_methods;
create policy "Studio admins manage payment methods" on public.store_payment_methods for all to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

drop policy if exists "Customers read own payment attempts" on public.store_payment_attempts;
create policy "Customers read own payment attempts" on public.store_payment_attempts for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_studio_member());
drop policy if exists "Studio read payment attempts" on public.store_payment_attempts;
create policy "Studio read payment attempts" on public.store_payment_attempts for select to authenticated
  using (public.is_studio_member());

drop policy if exists "Customers read own payment submissions" on public.store_payment_submissions;
create policy "Customers read own payment submissions" on public.store_payment_submissions for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_studio_member());
drop policy if exists "Studio read payment submissions" on public.store_payment_submissions;
create policy "Studio read payment submissions" on public.store_payment_submissions for select to authenticated
  using (public.is_studio_member());

revoke all on public.store_payment_methods, public.store_payment_attempts, public.store_payment_submissions from anon, authenticated;
grant select on public.store_payment_methods to anon, authenticated;
grant select on public.store_payment_attempts, public.store_payment_submissions to authenticated;
grant all on public.store_payment_methods, public.store_payment_attempts, public.store_payment_submissions to service_role;

create or replace function public.prepare_manual_payment(
  p_order_id uuid, p_customer_id uuid, p_method_code text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order record; v_attempt record;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_method_code not in ('upi_qr', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: unsupported manual payment method';
  end if;
  select id, customer_id, total, currency, payment_status into v_order
    from public.store_orders where id = p_order_id for update;
  if not found or v_order.customer_id <> p_customer_id then
    raise exception using errcode = 'P0002', message = 'PAYMENT_INVALID: order unavailable';
  end if;
  select * into v_attempt from public.store_payment_attempts
    where order_id = p_order_id and idempotency_key = p_idempotency_key limit 1;
  if found then return jsonb_build_object('id', v_attempt.id, 'status', v_attempt.status, 'replayed', true); end if;
  insert into public.store_payment_attempts(order_id, customer_id, method_code, amount, currency, idempotency_key)
    values (v_order.id, p_customer_id, p_method_code, v_order.total, v_order.currency, p_idempotency_key)
    returning * into v_attempt;
  update public.store_orders set payment_method = p_method_code, payment_status = 'pending', payment_attempt_id = v_attempt.id, updated_at = now() where id = v_order.id;
  insert into public.store_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_customer_id, 'payment_attempt_created', 'store_payment_attempt', v_attempt.id, jsonb_build_object('order_id', v_order.id, 'method_code', p_method_code));
  return jsonb_build_object('id', v_attempt.id, 'status', v_attempt.status, 'replayed', false);
end;
$$;

create or replace function public.create_transactional_checkout_with_payment(
  p_customer_id uuid, p_idempotency_key text, p_request_fingerprint text,
  p_checkout jsonb, p_payment_method text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb; v_attempt jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_payment_method not in ('cod', 'upi_qr', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: unsupported payment method';
  end if;
  -- The underlying checkout function currently accepts COD as its settlement
  -- mode; manual methods are attached as a separate payment attempt below.
  -- This keeps order creation and payment verification states separate while
  -- allowing UPI/bank-transfer orders to be created safely.
  v_result := public.create_transactional_checkout(p_customer_id, p_idempotency_key, p_request_fingerprint, p_checkout || jsonb_build_object('paymentMethod', 'cod'));
  if p_payment_method <> 'cod' then
    v_attempt := public.prepare_manual_payment((v_result->>'order_id')::uuid, p_customer_id, p_payment_method, p_idempotency_key);
    v_result := v_result || jsonb_build_object('payment_attempt_id', v_attempt->>'id');
  end if;
  return v_result;
end;
$$;

create or replace function public.submit_manual_payment_utr(
  p_attempt_id uuid, p_order_id uuid, p_customer_id uuid, p_utr text,
  p_amount numeric, p_paid_at timestamptz, p_note text default ''
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt record; v_submission record;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'PAYMENT_INVALID: trusted server required';
  end if;
  if p_utr !~ '^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$' or p_amount < 0 then
    raise exception using errcode = '22023', message = 'PAYMENT_INVALID: UTR or amount is invalid';
  end if;
  select * into v_attempt from public.store_payment_attempts where id = p_attempt_id and order_id = p_order_id and customer_id = p_customer_id for update;
  if not found or v_attempt.status not in ('awaiting_customer', 'proof_submitted') then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: payment attempt is not open';
  end if;
  insert into public.store_payment_submissions(payment_attempt_id, order_id, customer_id, utr, amount, paid_at, note)
    values (p_attempt_id, p_order_id, p_customer_id, upper(trim(p_utr)), p_amount, p_paid_at, coalesce(p_note, ''))
    on conflict (payment_attempt_id, utr) do update set note = excluded.note
    returning * into v_submission;
  update public.store_payment_attempts set status = 'proof_submitted', updated_at = now() where id = p_attempt_id;
  insert into public.store_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_customer_id, 'payment_proof_submitted', 'store_payment_submission', v_submission.id, jsonb_build_object('order_id', p_order_id, 'utr', upper(trim(p_utr))));
  return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
end;
$$;

create or replace function public.verify_manual_payment(p_submission_id uuid, p_decision text, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_submission record; v_status text; v_payment_status text;
begin
  if not public.is_studio_admin() then raise exception using errcode = '42501', message = 'PAYMENT_FORBIDDEN: admin verification required'; end if;
  if p_decision not in ('approve', 'reject') then raise exception using errcode = '22023', message = 'PAYMENT_INVALID: decision is invalid'; end if;
  select * into v_submission from public.store_payment_submissions where id = p_submission_id for update;
  if not found or v_submission.status <> 'pending' then raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: submission is not pending'; end if;
  v_status := case when p_decision = 'approve' then 'paid' else 'rejected' end;
  v_payment_status := case when p_decision = 'approve' then 'paid' else 'unpaid' end;
  update public.store_payment_submissions set status = case when p_decision = 'approve' then 'approved' else 'rejected' end, reviewed_by = auth.uid(), reviewed_at = now(), review_note = coalesce(p_note, '') where id = p_submission_id;
  update public.store_payment_attempts set status = v_status, updated_at = now() where id = v_submission.payment_attempt_id;
  update public.store_orders set payment_status = v_payment_status, updated_at = now() where id = v_submission.order_id;
  insert into public.store_audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), case when p_decision = 'approve' then 'manual_payment_approved' else 'manual_payment_rejected' end, 'store_payment_submission', p_submission_id, jsonb_build_object('order_id', v_submission.order_id, 'attempt_id', v_submission.payment_attempt_id));
  return jsonb_build_object('id', p_submission_id, 'status', v_status, 'payment_status', v_payment_status);
end;
$$;

revoke all on function public.prepare_manual_payment(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_transactional_checkout_with_payment(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.submit_manual_payment_utr(uuid, uuid, uuid, text, numeric, timestamptz, text) from public, anon, authenticated;
revoke all on function public.verify_manual_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_manual_payment(uuid, uuid, text, text) to service_role;
grant execute on function public.create_transactional_checkout_with_payment(uuid, text, text, jsonb, text) to service_role;
grant execute on function public.submit_manual_payment_utr(uuid, uuid, uuid, text, numeric, timestamptz, text) to service_role;
grant execute on function public.verify_manual_payment(uuid, text, text) to authenticated;
