-- Split read and write policies so read-only staff access remains useful while
-- mutations stay permission-gated.
drop policy if exists "Permission manage clients" on public.clients;
create policy "Permission read clients" on public.clients for select to authenticated
  using (public.studio_has_permission('clients.read') or public.studio_has_permission('clients.manage'));
create policy "Permission write clients" on public.clients for insert to authenticated
  with check (public.studio_has_permission('clients.manage'));
create policy "Permission update clients" on public.clients for update to authenticated
  using (public.studio_has_permission('clients.manage')) with check (public.studio_has_permission('clients.manage'));
create policy "Permission delete clients" on public.clients for delete to authenticated
  using (public.studio_has_permission('clients.manage'));

drop policy if exists "Permission manage appointments" on public.appointments;
create policy "Permission read appointments" on public.appointments for select to authenticated
  using (public.studio_has_permission('appointments.read') or public.studio_has_permission('appointments.manage'));
create policy "Permission write appointments" on public.appointments for insert to authenticated
  with check (public.studio_has_permission('appointments.manage'));
create policy "Permission update appointments" on public.appointments for update to authenticated
  using (public.studio_has_permission('appointments.manage')) with check (public.studio_has_permission('appointments.manage'));
create policy "Permission delete appointments" on public.appointments for delete to authenticated
  using (public.studio_has_permission('appointments.manage'));

drop policy if exists "Permission manage notifications" on public.notifications;
create policy "Permission read notifications" on public.notifications for select to authenticated
  using (public.studio_has_permission('notifications.read') and recipient_id = (select auth.uid()));
create policy "Permission create notifications" on public.notifications for insert to authenticated
  with check (public.studio_has_permission('notifications.manage'));
create policy "Permission update own notifications" on public.notifications for update to authenticated
  using (public.studio_has_permission('notifications.read') and recipient_id = (select auth.uid()))
  with check (public.studio_has_permission('notifications.read') and recipient_id = (select auth.uid()));
create policy "Permission manage notifications" on public.notifications for update to authenticated
  using (public.studio_has_permission('notifications.manage')) with check (public.studio_has_permission('notifications.manage'));
create policy "Permission delete notifications" on public.notifications for delete to authenticated
  using (public.studio_has_permission('notifications.manage'));

drop policy if exists "Studio manage inventory locations" on public.store_inventory_locations;
create policy "Permission read inventory locations" on public.store_inventory_locations for select to authenticated
  using (public.studio_has_permission('inventory.read') or public.studio_has_permission('inventory.manage'));
create policy "Permission write inventory locations" on public.store_inventory_locations for insert to authenticated
  with check (public.studio_has_permission('inventory.manage'));
create policy "Permission update inventory locations" on public.store_inventory_locations for update to authenticated
  using (public.studio_has_permission('inventory.manage')) with check (public.studio_has_permission('inventory.manage'));
create policy "Permission delete inventory locations" on public.store_inventory_locations for delete to authenticated
  using (public.studio_has_permission('inventory.manage'));

drop policy if exists "Studio manage inventory levels" on public.store_inventory_levels;
create policy "Permission read inventory levels" on public.store_inventory_levels for select to authenticated
  using (public.studio_has_permission('inventory.read') or public.studio_has_permission('inventory.manage'));
create policy "Permission write inventory levels" on public.store_inventory_levels for insert to authenticated
  with check (public.studio_has_permission('inventory.manage'));
create policy "Permission update inventory levels" on public.store_inventory_levels for update to authenticated
  using (public.studio_has_permission('inventory.manage')) with check (public.studio_has_permission('inventory.manage'));
create policy "Permission delete inventory levels" on public.store_inventory_levels for delete to authenticated
  using (public.studio_has_permission('inventory.manage'));

drop policy if exists "Studio manage inventory movements" on public.store_inventory_movements;
create policy "Permission read inventory movements" on public.store_inventory_movements for select to authenticated
  using (public.studio_has_permission('inventory.read') or public.studio_has_permission('inventory.manage'));
create policy "Permission write inventory movements" on public.store_inventory_movements for insert to authenticated
  with check (public.studio_has_permission('inventory.manage'));

drop policy if exists "Studio manage inventory transfers" on public.store_inventory_transfers;
create policy "Permission manage inventory transfers" on public.store_inventory_transfers for all to authenticated
  using (public.studio_has_permission('inventory.manage')) with check (public.studio_has_permission('inventory.manage'));
drop policy if exists "Studio manage inventory transfer items" on public.store_inventory_transfer_items;
create policy "Permission manage inventory transfer items" on public.store_inventory_transfer_items for all to authenticated
  using (public.studio_has_permission('inventory.manage')) with check (public.studio_has_permission('inventory.manage'));
