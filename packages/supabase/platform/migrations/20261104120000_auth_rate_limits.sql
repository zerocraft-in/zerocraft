-- Shared, atomic throttling for platform email OTP requests.
-- Identifiers are HMACed by the application and are never stored in plaintext.
create table if not exists platform_private.auth_rate_limits (
  bucket text not null check (bucket in ('otp_email_send', 'otp_ip_send', 'otp_email_verify', 'otp_ip_verify')),
  identifier_hash text not null check (identifier_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (bucket, identifier_hash)
);

revoke all on platform_private.auth_rate_limits from public, anon, authenticated;
grant all on platform_private.auth_rate_limits to service_role;

create or replace function public.consume_platform_auth_rate_limit(
  p_bucket text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     or p_bucket not in ('otp_email_send', 'otp_ip_send', 'otp_email_verify', 'otp_ip_verify')
     or p_identifier_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid auth rate limit request' using errcode = '42501';
  end if;

  insert into platform_private.auth_rate_limits as limits
    (bucket, identifier_hash, window_started_at, request_count)
  values (p_bucket, p_identifier_hash, now(), 1)
  on conflict (bucket, identifier_hash) do update
    set window_started_at = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
          else limits.window_started_at
        end,
        request_count = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
          else limits.request_count + 1
        end
  returning request_count into v_count;

  -- Opportunistic bounded retention keeps abandoned identifiers from accumulating forever.
  delete from platform_private.auth_rate_limits
  where ctid in (
    select ctid from platform_private.auth_rate_limits
    where window_started_at < now() - interval '1 day'
    limit 100
  );

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_platform_auth_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_platform_auth_rate_limit(text, text, integer, integer) to service_role;
notify pgrst, 'reload schema';
