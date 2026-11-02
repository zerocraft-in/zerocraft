create policy product_online_publication on public.products as restrictive for select to anon,authenticated
using (public.is_member() or (status='active' and deleted_at is null and sales_channels @> array['online_store']::text[]));
-- Keep checkout authoritative even when called with a service-role client.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.create_transactional_checkout(uuid,text,text,jsonb)'::regprocedure) into definition;
 if position('if not found or v_product.status <> ''active'' then' in definition)=0 then raise exception 'Review checkout validation before applying channel enforcement'; end if;
 definition:=replace(definition,'if not found or v_product.status <> ''active'' then','if not found or v_product.status <> ''active'' or v_product.deleted_at is not null or not (v_product.sales_channels @> array[''online_store'']::text[]) then');
 execute definition;
end $$;
notify pgrst,'reload schema';
