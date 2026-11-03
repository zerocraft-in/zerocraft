-- Remove public execution from authorization helpers and catalog mutation RPCs.
drop policy if exists "Published pages are public" on public.pages;
create policy "Published pages are public" on public.pages for select to public
  using (status = 'published');
drop policy if exists "RBAC pages read" on public.pages;
create policy "RBAC pages read" on public.pages for select to authenticated
  using (public.has_permission('content.read') or public.has_permission('content.manage'));

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated, service_role;
revoke all on function public.restore_store_category(uuid) from public, anon;
grant execute on function public.restore_store_category(uuid) to authenticated, service_role;
revoke all on function public.restore_store_subcategory(uuid) from public, anon;
grant execute on function public.restore_store_subcategory(uuid) to authenticated, service_role;
revoke all on function public.soft_delete_store_category(uuid) from public, anon;
grant execute on function public.soft_delete_store_category(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
