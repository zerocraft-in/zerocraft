-- Notification history indexes and admin read/unread analytics.

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

create or replace function public.studio_get_notification_analytics()
returns table (
  user_id uuid,
  email text,
  full_name text,
  total_count bigint,
  unread_count bigint,
  read_count bigint,
  last_notification_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_studio_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  return query
    select p.id, p.email, p.full_name,
      count(n.id)::bigint,
      count(n.id) filter (where n.read = false)::bigint,
      count(n.id) filter (where n.read = true)::bigint,
      max(n.created_at)
    from public.profiles p
    left join public.notifications n on n.recipient_id = p.id
    where p.role::text in ('admin', 'manager', 'staff')
    group by p.id, p.email, p.full_name
    order by count(n.id) filter (where n.read = false) desc, p.email;
end;
$$;

revoke all on function public.studio_get_notification_analytics() from public;
grant execute on function public.studio_get_notification_analytics() to authenticated;
