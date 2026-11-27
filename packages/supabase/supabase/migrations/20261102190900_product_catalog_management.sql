alter table public.products
  add column if not exists vendor text not null default '',
  add column if not exists merchandise_type text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists sales_channels text[] not null default '{online_store}',
  add column if not exists catalogs text[] not null default '{General}',
  add column if not exists is_listed boolean not null default true;
alter table public.products add constraint products_known_channels check (sales_channels <@ array['online_store','point_of_sale']::text[]);

-- Metadata-only bulk writes never rewrite variants, prices, or inventory.
create or replace function public.manage_product_selection(p_ids uuid[], p_action text, p_values text[] default '{}', p_edits jsonb default '[]')
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare affected integer; edit jsonb; target uuid;
begin
  if not public.has_permission('catalog.manage') then raise exception 'Catalog management permission required' using errcode='42501'; end if;
  if cardinality(p_ids) < 1 or cardinality(p_ids) > 500 then raise exception 'Select between 1 and 500 products'; end if;
  perform 1 from public.products where id=any(p_ids) order by id for update;
  if (select count(*) from public.products where id=any(p_ids) and deleted_at is null) <> cardinality(p_ids) then raise exception 'Selection changed. Reload and select available products.'; end if;
  if p_action='status' then
    if cardinality(p_values)<>1 or p_values[1] not in ('active','draft','archived') then raise exception 'Invalid status'; end if;
    if p_values[1]='active' and exists(select 1 from public.products p where p.id=any(p_ids) and (p.rights_status='review_required' or not exists(select 1 from public.categories c join public.subcategories s on s.category_id=c.id where c.id=p.category_id and s.id=p.subcategory_id and c.is_active and s.is_active and c.deleted_at is null and s.deleted_at is null))) then raise exception 'Active products require approved rights and an active category and subcategory'; end if;
    update public.products set status=p_values[1],updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action='delete' then
    update public.products set deleted_from_status=status,status='archived',deleted_at=now(),purge_after=now()+interval '15 days',updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action in ('unlist','list') then
    update public.products set is_listed=(p_action='list'),updated_at=now(),write_version=write_version+1 where id=any(p_ids);
  elsif p_action in ('add_tags','remove_tags','include_channels','exclude_channels','include_catalogs','exclude_catalogs') then
    if cardinality(p_values)<1 or cardinality(p_values)>50 or exists(select 1 from unnest(p_values) v where length(trim(v))=0 or length(v)>100) then raise exception 'Choose 1–50 values up to 100 characters'; end if;
    if p_action in ('include_channels','exclude_channels') and not p_values <@ array['online_store','point_of_sale']::text[] then raise exception 'Invalid sales channel'; end if;
    update public.products p set
      tags=case when p_action='add_tags' then array(select distinct v from unnest(p.tags||p_values) v order by v) when p_action='remove_tags' then array(select v from unnest(p.tags) v where not v=any(p_values)) else p.tags end,
      sales_channels=case when p_action='include_channels' then array(select distinct v from unnest(p.sales_channels||p_values) v order by v) when p_action='exclude_channels' then array(select v from unnest(p.sales_channels) v where not v=any(p_values)) else p.sales_channels end,
      catalogs=case when p_action='include_catalogs' then array(select distinct v from unnest(p.catalogs||p_values) v order by v) when p_action='exclude_catalogs' then array(select v from unnest(p.catalogs) v where not v=any(p_values)) else p.catalogs end,
      updated_at=now(),write_version=write_version+1 where p.id=any(p_ids);
  elsif p_action in ('add_collections','remove_collections') then
    if cardinality(p_values)<1 or exists(select 1 from unnest(p_values) v where not exists(select 1 from public.collections c where c.id::text=v)) then raise exception 'Choose existing collections'; end if;
    if p_action='add_collections' then
      insert into public.collection_products(collection_id,product_id) select v::uuid,p from unnest(p_values) v cross join unnest(p_ids) p on conflict do nothing;
    else delete from public.collection_products where product_id=any(p_ids) and collection_id::text=any(p_values); end if;
  elsif p_action='edit' then
    if jsonb_typeof(p_edits)<>'array' or jsonb_array_length(p_edits)<>cardinality(p_ids) then raise exception 'Provide one edit per selected product'; end if;
    for edit in select * from jsonb_array_elements(p_edits) loop
      target:=(edit->>'id')::uuid;
      if not target=any(p_ids) or length(trim(coalesce(edit->>'title','')))=0 or length(edit->>'title')>255 or length(coalesce(edit->>'vendor',''))>100 or length(coalesce(edit->>'merchandise_type',''))>100 then raise exception 'Check product titles, vendors, and product types'; end if;
      update public.products set title=trim(edit->>'title'),vendor=trim(coalesce(edit->>'vendor','')),merchandise_type=trim(coalesce(edit->>'merchandise_type','')),updated_at=now(),write_version=write_version+1 where id=target;
    end loop;
  else raise exception 'Unknown product action'; end if;
  affected:=cardinality(p_ids);
  insert into public.audit_logs(actor_id,action,entity_type,metadata) values(auth.uid(),'catalog.bulk_'||p_action,'product',jsonb_build_object('product_ids',p_ids,'values',p_values,'count',affected));
  return affected;
end $$;
revoke all on function public.manage_product_selection(uuid[],text,text[],jsonb) from public,anon;
grant execute on function public.manage_product_selection(uuid[],text,text[],jsonb) to authenticated;

create or replace function public.product_inventory_analytics(p_days integer default 30, p_currency text default 'INR')
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.has_permission('catalog.read') then raise exception 'Catalog access required' using errcode='42501'; end if;
 if p_days not in (1,7,30) then raise exception 'Invalid analytics period'; end if;
 with stock as (
  select p.id,p.title,p.product_type,case when p.product_type='digital' then null
   when exists(select 1 from public.variants v where v.product_id=p.id and v.is_active) then
    (select sum(coalesce((select sum(greatest(0,l.on_hand-l.reserved)) from public.inventory_levels l where l.variant_id=v.id),v.stock,0)) from public.variants v where v.product_id=p.id and v.is_active)
   else p.stock end::numeric as available
  from public.products p where p.deleted_at is null
 ), sold as (
  select oi.product_id,sum(oi.quantity)::numeric units,sum(oi.quantity*coalesce(oi.unit_price_minor,oi.unit_price_paise))/100.0 revenue
  from public.order_items oi join public.orders o on o.id=oi.order_id
  where o.payment_status='paid' and o.status not in ('cancelled','refunded') and o.created_at >= (date_trunc('day',now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') - (p_days-1)*interval '1 day'
   and coalesce(oi.currency_code,oi.currency)=p_currency group by oi.product_id
 ), ranked as (
 select s.*,coalesce(d.units,0) units,coalesce(d.revenue,0) revenue,
 coalesce(sum(d.revenue) over(order by d.revenue desc nulls last,s.id rows between unbounded preceding and 1 preceding),0)/nullif(sum(d.revenue) over(),0) share
 from stock s left join sold d on d.product_id=s.id
 ), detail as (
 select *,case when share<0.8 then 'A' when share<0.95 then 'B' else 'C' end grade,
 case when available is not null and available+units>0 then round(100*units/(available+units),2) end sell_through,
 case when available is not null and units>0 then round(available/(units/p_days),1) end days_remaining from ranked
 ) select jsonb_build_object('days',p_days,'currency',p_currency,'sellThrough',round(avg(sell_through),2),'daysRemaining',round(avg(days_remaining),1),'cRevenue',coalesce(sum(revenue) filter(where grade='C'),0),'products',coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'stock',available,'units',units,'revenue',revenue,'grade',grade,'sellThrough',sell_through,'daysRemaining',days_remaining)),'[]')) into result from detail;
 return result;
end $$;
revoke all on function public.product_inventory_analytics(integer,text) from public,anon;
grant execute on function public.product_inventory_analytics(integer,text) to authenticated;
notify pgrst,'reload schema';
