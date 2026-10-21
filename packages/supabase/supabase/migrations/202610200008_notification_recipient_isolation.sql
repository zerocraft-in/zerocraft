-- Keep recipient-specific in-app notifications private to their recipient.

drop policy if exists "Studio manage notifications" on public.notifications;
create policy "Studio manage notifications"
  on public.notifications for all to authenticated
  using (
    public.is_studio_member()
    and (recipient_id is null or recipient_id = (select auth.uid()))
  )
  with check (
    public.is_studio_member()
    and (recipient_id is null or recipient_id = (select auth.uid()))
  );
