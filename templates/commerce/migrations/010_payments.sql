-- ============================================================================
-- Zerocraft Commerce Template — 010_payments
-- Payment attempts, captures, and refunds.
--
-- SECURITY: no primary account numbers (PAN), CVV, expiry, or provider secret
-- keys may ever be stored here. Only provider references and tokenized method
-- metadata are permitted. Card data belongs to the payment provider.
-- ============================================================================

begin;

create table if not exists public.payments (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  provider text not null check (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_reference text null check (provider_reference is null or char_length(provider_reference) <= 255),
  idempotency_key text null check (idempotency_key is null or char_length(idempotency_key) <= 200),
  method text not null default 'unknown'
    check (method in (
      'card', 'upi', 'netbanking', 'wallet', 'cod', 'bank_transfer',
      'store_credit', 'gift_card', 'unknown'
    )),
  amount_paise bigint not null check (amount_paise >= 0),
  currency char(3) not null default 'INR',
  status text not null default 'pending'
    check (status in (
      'pending', 'authorized', 'captured', 'partially_refunded',
      'refunded', 'voided', 'failed', 'cancelled'
    )),
  captured_paise bigint not null default 0 check (captured_paise >= 0),
  refunded_paise bigint not null default 0 check (refunded_paise >= 0),
  error_code text null check (error_code is null or char_length(error_code) <= 64),
  error_message text null check (error_message is null or char_length(error_message) <= 500),
  authorized_at timestamptz null,
  captured_at timestamptz null,
  voided_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_id_store_key unique (id, store_id),
  constraint payments_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete cascade
);

create unique index if not exists payments_provider_reference_key
  on public.payments(provider, provider_reference) where provider_reference is not null;
create unique index if not exists payments_idempotency_key
  on public.payments(store_id, idempotency_key) where idempotency_key is not null;
create index if not exists payments_order_created_idx
  on public.payments(order_id, created_at desc);
create index if not exists payments_store_status_idx
  on public.payments(store_id, status);

-- Defensive guard: reject common card-data keys even inside free-form metadata.
create or replace function private.reject_card_data()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_metadata jsonb;
  v_key text;
begin
  v_metadata := coalesce(new.metadata, '{}'::jsonb);

  foreach v_key in array array['pan', 'card_number', 'cvv', 'cvc', 'card_cvv', 'expiry', 'exp_month', 'exp_year']
  loop
    if v_metadata ? v_key then
      raise exception 'card data must not be stored; use the payment provider token';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.reject_card_data() from public, anon;

drop trigger if exists payments_reject_card_data on public.payments;
create trigger payments_reject_card_data
  before insert or update of metadata on public.payments
  for each row execute function private.reject_card_data();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Refunds
-- ----------------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  payment_id uuid null,
  amount_paise bigint not null check (amount_paise > 0),
  currency char(3) not null default 'INR',
  reason text not null default 'other'
    check (reason in ('customer_request', 'damaged', 'wrong_item', 'fraud', 'other')),
  note text null check (note is null or char_length(note) <= 1000),
  provider_refund_reference text null check (provider_refund_reference is null or char_length(provider_refund_reference) <= 255),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_order_fk
    foreign key (order_id, store_id)
    references public.orders(id, store_id)
    on delete restrict,
  constraint refunds_payment_fk
    foreign key (payment_id, store_id)
    references public.payments(id, store_id)
    on delete set null
);

create index if not exists refunds_order_idx on public.refunds(order_id, created_at desc);

drop trigger if exists refunds_set_updated_at on public.refunds;
create trigger refunds_set_updated_at
  before update on public.refunds
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Provider event ledger (webhooks / polling), unique per provider event id.
-- ----------------------------------------------------------------------------
create table if not exists public.payment_events (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  payment_id uuid null,
  provider text not null check (provider ~ '^[a-z0-9_-]{2,32}$'),
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 100),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint payment_events_provider_event_key unique (provider, provider_event_id),
  constraint payment_events_payment_fk
    foreign key (payment_id, store_id)
    references public.payments(id, store_id)
    on delete set null
);

create index if not exists payment_events_payment_idx on public.payment_events(payment_id);

-- ----------------------------------------------------------------------------
-- Recompute order financial status after payment/refund changes.
-- ----------------------------------------------------------------------------
create or replace function private.recalculate_order_financials(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_paid bigint;
  v_refunded bigint;
  v_status text;
begin
  select total_paise, refunded_paise, financial_status
    into v_total, v_refunded, v_status
  from public.orders
  where id = p_order_id;

  if not found then
    return;
  end if;

  select coalesce(sum(captured_paise), 0)
    into v_paid
  from public.payments
  where order_id = p_order_id and status in ('captured', 'partially_refunded', 'refunded');

  if v_status in ('voided', 'expired') then
    return;
  end if;

  update public.orders
  set financial_status = case
        when v_refunded >= v_total and v_total > 0 then 'refunded'
        when v_refunded > 0 then 'partially_refunded'
        when v_paid >= v_total and v_total > 0 then 'paid'
        when v_paid > 0 then 'partially_paid'
        else 'pending'
      end,
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function private.recalculate_order_financials(uuid) from public, anon;
grant execute on function private.recalculate_order_financials(uuid) to authenticated, service_role;

-- RLS and grants are created in 015.

commit;
