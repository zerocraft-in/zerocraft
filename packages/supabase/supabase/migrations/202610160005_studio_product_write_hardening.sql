-- ZEROCRAFT STUDIO
-- Phase 2.8B.3H-B: versioned atomic Studio product persistence foundation.
-- STATUS: UNAPPLIED. Local draft only; do not deploy without separate review.
--
-- RPC contract: studio_save_product_atomic_v2(action, product_id,
-- expected_version, product, variants, options) returns:
-- { product_id, version, variants:[{id,is_active}] }.
-- action is create|edit. Create uses null product_id/version. Edit requires the
-- current store_products.write_version. Product and variant JSON fields are
-- allowlisted below. Variant options are string or string[] values. Optional
-- options is [{name, option_values:[{value,swatch_hex}]}]. New physical
-- variants require inventory:[{location_id,on_hand,reserved,reorder_point}].
--
-- Normalized option tables are authoritative; legacy JSON options are a stable
-- compatibility mirror. INR requires integer paise matching the legacy major
-- unit; USD preserves legacy major units and rejects paise fields.
-- Existing inventory is never changed by this writer. Omitted variants are
-- archived only after reserved/pending fulfillment checks. Existing identifiers
-- and historical references are never deleted.
--
-- Lock order: product -> existing variants sorted by UUID -> inventory rows
-- sorted by (location_id,variant_id). This matches the checkout writer's order.

alter table public.store_products
  add column if not exists write_version bigint not null default 1;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_products_write_version_positive'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_write_version_positive check (write_version > 0);
  end if;
end
$migration$;

-- Optional migration 004 compatibility without a hard dependency on its table.
create or replace function public.studio_variant_has_active_reservations(p_variant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_has boolean := false;
begin
  if pg_catalog.to_regclass('public.store_inventory_reservations') is not null then
    execute $sql$
      select exists (
        select 1 from public.store_inventory_reservations
        where variant_id = $1 and status = 'reserved'
      )
    $sql$ into v_has using p_variant_id;
  end if;
  return v_has;
end;
$function$;

revoke all on function public.studio_variant_has_active_reservations(uuid)
  from public, anon, authenticated;

create or replace function public.studio_save_product_atomic_v2(
  p_action text,
  p_product_id uuid,
  p_expected_version bigint,
  p_product jsonb,
  p_variants jsonb,
  p_options jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_product_id uuid := p_product_id;
  v_expected_version bigint;
  v_new_version bigint;
  v_product record;
  v_row record;
  v_option record;
  v_value record;
  v_variant record;
  v_option_id uuid;
  v_option_value_id uuid;
  v_variant_id uuid;
  v_currency text;
  v_product_type text;
  v_product_price numeric;
  v_product_price_paise bigint;
  v_product_compare_paise bigint;
  v_variant_price numeric;
  v_variant_price_paise bigint;
  v_seen_ids uuid[] := '{}'::uuid[];
  v_seen_skus text[] := '{}'::text[];
  v_seen_combinations text[] := '{}'::text[];
  v_seen_option_names text[] := '{}'::text[];
  v_existing_ids uuid[] := '{}'::uuid[];
  v_seen_locations uuid[];
  v_normalized_options jsonb;
  v_option_name text;
  v_value_text text;
  v_signature text;
  v_value_list text[];
  v_existing boolean;
  v_inventory jsonb;
begin
  if not public.is_studio_member() then
    raise exception using errcode = '42501', message = 'FORBIDDEN: Studio access required.';
  end if;
  if p_action not in ('create', 'edit') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: action must be create or edit.';
  end if;
  if jsonb_typeof(p_product) <> 'object'
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_typeof(coalesce(p_options, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid JSON payload.';
  end if;
  if octet_length(p_product::text) > 20000
     or octet_length(p_variants::text) > 200000
     or octet_length(coalesce(p_options, '[]'::jsonb)::text) > 50000
     or jsonb_array_length(p_variants) > 60
     or jsonb_array_length(coalesce(p_options, '[]'::jsonb)) > 20 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: payload exceeds limits.';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_product) as key
    where key not in ('category_id','title','slug','description','product_type','status',
      'sku','price','compare_at_price','currency','currency_code','price_paise',
      'compare_at_price_paise','stock','image_url','collection_ids')
  ) then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported product field.';
  end if;
  for v_row in select value from jsonb_array_elements(p_variants) loop
    if jsonb_typeof(v_row.value) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_row.value) as key
         where key not in ('id','label','sku','options','price','price_paise','stock','is_active','inventory')
       )
       or (v_row.value ? 'id' and v_row.value->>'id' is not null and v_row.value->>'id' !~ '^[0-9a-fA-F-]{36}$')
       or (v_row.value ? 'inventory' and jsonb_typeof(v_row.value->'inventory') <> 'array') then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported or malformed variant field.';
    end if;
    for v_value in select value from jsonb_array_elements(coalesce(v_row.value->'inventory','[]'::jsonb)) loop
      if jsonb_typeof(v_value.value) <> 'object'
         or exists (
           select 1 from jsonb_object_keys(v_value.value) as key
           where key not in ('location_id','on_hand','reserved','reorder_point')
         )
         or v_value.value->>'location_id' is null
         or v_value.value->>'location_id' !~ '^[0-9a-fA-F-]{36}$' then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported or malformed inventory field.';
      end if;
    end loop;
  end loop;
  for v_row in select value from jsonb_array_elements(coalesce(p_options,'[]'::jsonb)) loop
    if jsonb_typeof(v_row.value) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_row.value) as key
         where key not in ('name','option_values','swatch_hex')
       ) then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported option field.';
    end if;
  end loop;

  if p_action = 'create' then
    if p_product_id is not null or p_expected_version is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: create identity/version must be null.';
    end if;
  else
    if p_product_id is null or p_expected_version is null or p_expected_version < 1 then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: edit requires expected_version.';
    end if;
    select * into v_product from public.store_products where id = p_product_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'NOT_FOUND: product not found.';
    end if;
    if v_product.write_version <> p_expected_version then
      raise exception using errcode = '40001', message = 'STALE_VERSION: product changed since load.';
    end if;
    v_expected_version := p_expected_version;
  end if;

  v_currency := upper(nullif(trim(coalesce(p_product->>'currency_code', p_product->>'currency')), ''));
  if v_currency not in ('INR','USD') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: unsupported currency.';
  end if;
  if p_product ? 'currency' and p_product ? 'currency_code'
     and upper(p_product->>'currency') <> upper(p_product->>'currency_code') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: contradictory currency fields.';
  end if;
  if p_product->>'title' is null or length(trim(p_product->>'title')) not between 1 and 180
     or p_product->>'slug' is null or p_product->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_product->>'sku' is null or length(trim(p_product->>'sku')) = 0
     or p_product->>'product_type' not in ('physical','digital')
     or p_product->>'status' not in ('draft','active','archived') then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid product fields.';
  end if;
  v_product_type := p_product->>'product_type';
  if p_product->>'price' is null or p_product->>'price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid product price.';
  end if;
  v_product_price := (p_product->>'price')::numeric;
  if v_product_price > 9999999999.99 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR: product price exceeds supported range.';
  end if;
  if v_currency = 'INR' then
    if p_product->>'price_paise' is null or p_product->>'price_paise' !~ '^[0-9]+$'
       or (p_product->>'price_paise')::numeric > 9223372036854775807
       or (p_product->>'price_paise')::numeric <> v_product_price * 100 then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: INR price must match integer paise.';
    end if;
    v_product_price_paise := (p_product->>'price_paise')::bigint;
    if p_product->>'compare_at_price_paise' is not null then
      if p_product->>'compare_at_price' is null
         or p_product->>'compare_at_price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$'
         or p_product->>'compare_at_price_paise' !~ '^[0-9]+$' then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid INR compare-at price.';
      end if;
      v_product_compare_paise := (p_product->>'compare_at_price_paise')::bigint;
      if v_product_compare_paise::numeric <> (p_product->>'compare_at_price')::numeric * 100
         or v_product_compare_paise < v_product_price_paise then
        raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid INR compare-at relationship.';
      end if;
    elsif p_product->>'compare_at_price' is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: INR compare-at paise is required.';
    end if;
  else
    if p_product->>'price_paise' is not null or p_product->>'compare_at_price_paise' is not null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: USD cannot contain paise fields.';
    end if;
    if p_product->>'compare_at_price' is not null
       and (p_product->>'compare_at_price' !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$'
         or (p_product->>'compare_at_price')::numeric < v_product_price) then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR: invalid USD compare-at relationship.';
    end if;
  end if;
  if p_product->>'category_id' is not null and p_product->>'category_id' <> ''
     and (p_product->>'category_id' !~ '^[0-9a-fA-F-]{36}$'
       or not exists (select 1 from public.store_categories where id = (p_product->>'category_id')::uuid)) then
    raise exception using errcode = '23503', message = 'VALIDATION_ERROR: category is invalid.';
  end if;

  if p_action = 'create' then
    insert into public.store_products(
      category_id,title,slug,description,product_type,status,sku,price,compare_at_price,
      currency,currency_code,price_paise,compare_at_price_paise,stock,image_url,write_version
    ) values (
      nullif(p_product->>'category_id','')::uuid,trim(p_product->>'title'),p_product->>'slug',
      coalesce(p_product->>'description',''),v_product_type,p_product->>'status',trim(p_product->>'sku'),
      v_product_price,nullif(p_product->>'compare_at_price','')::numeric,v_currency,v_currency,
      case when v_currency='INR' then v_product_price_paise end,
      case when v_currency='INR' then v_product_compare_paise end,
      nullif(p_product->>'stock','')::integer,coalesce(p_product->>'image_url',''),1
    ) returning id,write_version into v_product_id,v_new_version;
  else
    update public.store_products set
      category_id=nullif(p_product->>'category_id','')::uuid,title=trim(p_product->>'title'),slug=p_product->>'slug',
      description=coalesce(p_product->>'description',''),product_type=v_product_type,status=p_product->>'status',
      sku=trim(p_product->>'sku'),price=v_product_price,compare_at_price=nullif(p_product->>'compare_at_price','')::numeric,
      currency=v_currency,currency_code=v_currency,price_paise=case when v_currency='INR' then v_product_price_paise end,
      compare_at_price_paise=case when v_currency='INR' then v_product_compare_paise end,
      stock=nullif(p_product->>'stock','')::integer,image_url=coalesce(p_product->>'image_url',''),
      write_version=write_version+1,updated_at=now()
    where id=v_product_id and write_version=v_expected_version
    returning write_version into v_new_version;
    if not found then
      raise exception using errcode = '40001', message = 'STALE_VERSION: product changed during save.';
    end if;
  end if;

  -- Product -> variant -> inventory lock order.
  for v_row in select id from public.store_product_variants where product_id=v_product_id order by id for update loop
    v_existing_ids := array_append(v_existing_ids,v_row.id);
  end loop;
  for v_row in
    select il.location_id,il.variant_id from public.store_inventory_levels il
    join public.store_product_variants pv on pv.id=il.variant_id
    where pv.product_id=v_product_id order by il.location_id,il.variant_id for update of il
  loop null; end loop;

  -- Explicit option declarations. Variant payloads may also derive declarations
  -- for compatibility with the current Studio JSON shape.
  for v_option in select * from jsonb_to_recordset(coalesce(p_options,'[]'::jsonb)) as x(name text,option_values jsonb,swatch_hex text) loop
    v_option_name := case when lower(trim(v_option.name))='colour' then 'color' else lower(trim(v_option.name)) end;
    if v_option_name = any(v_seen_option_names)
       or length(v_option_name) not between 1 and 80
       or jsonb_typeof(v_option.option_values)<>'array' then
      raise exception using errcode='22023',message='VALIDATION_ERROR: invalid option definition.';
    end if;
    v_seen_option_names:=array_append(v_seen_option_names,v_option_name);
    select id into v_option_id from public.store_variant_options where product_id=v_product_id and lower(name)=v_option_name for update;
    if not found then
      insert into public.store_variant_options(product_id,name,sort_order) values(v_product_id,v_option_name,0) returning id into v_option_id;
    end if;
    for v_value in select value from jsonb_array_elements(v_option.option_values) loop
      if jsonb_typeof(v_value.value) <> 'string' then
        raise exception using errcode='22023',message='VALIDATION_ERROR: option values must be strings.';
      end if;
      v_value_text:=trim(v_value.value #>> '{}');
      if length(v_value_text) not between 1 and 120 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: invalid option value.';
      end if;
      if not exists(select 1 from public.store_variant_option_values where option_id=v_option_id and lower(value)=lower(v_value_text)) then
        insert into public.store_variant_option_values(option_id,value,swatch_hex,sort_order) values(v_option_id,v_value_text,v_option.swatch_hex,0);
      end if;
    end loop;
  end loop;

  for v_variant in select * from jsonb_to_recordset(p_variants) as x(
    id uuid,label text,sku text,options jsonb,price numeric,price_paise bigint,stock integer,is_active boolean,inventory jsonb
  ) loop
    v_existing := v_variant.id is not null;
    if v_existing then
      if v_variant.id=any(v_seen_ids) then
        raise exception using errcode='23505',message='CONFLICT: duplicate variant ID.';
      end if;
      if not(v_variant.id=any(v_existing_ids)) then
        raise exception using errcode='23503',message='INVALID_VARIANT: variant belongs to another product.';
      end if;
      v_seen_ids:=array_append(v_seen_ids,v_variant.id);
    end if;
    if v_variant.label is null or length(trim(v_variant.label)) not between 1 and 100
       or v_variant.sku is null or length(trim(v_variant.sku))=0 or v_variant.price is null or v_variant.price<0
       or (v_currency='INR' and v_variant.price_paise is null) or (v_currency='USD' and v_variant.price_paise is not null)
       or (v_variant.stock is not null and v_variant.stock<0) or jsonb_typeof(coalesce(v_variant.options,'{}'::jsonb))<>'object'
       or v_variant.price::text !~ '^(0|[0-9]+)(\.[0-9]{1,2})?$' then
      raise exception using errcode='22023',message='VALIDATION_ERROR: invalid variant payload.';
    end if;
    if trim(v_variant.sku)=any(v_seen_skus) then
      raise exception using errcode='23505',message='DUPLICATE_SKU: duplicate variant SKU.';
    end if;
    v_seen_skus:=array_append(v_seen_skus,trim(v_variant.sku));
    v_variant_price:=v_variant.price;
    if v_currency='INR' then
      if v_variant.price_paise<0 or v_variant.price_paise::numeric>9223372036854775807
         or v_variant.price_paise::numeric<>v_variant_price*100 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: invalid INR variant paise.';
      end if;
      v_variant_price_paise:=v_variant.price_paise;
    end if;
    if v_variant_price > 9999999999.99 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: variant price exceeds supported range.';
    end if;

    v_normalized_options:='{}'::jsonb; v_signature:='';
    for v_option in select key,value from jsonb_each(coalesce(v_variant.options,'{}'::jsonb)) order by lower(key),key loop
      v_option_name:=case when lower(trim(v_option.key))='colour' then 'color' else lower(trim(v_option.key)) end;
      if v_option_name=any(coalesce((select array_agg(key) from jsonb_object_keys(v_normalized_options) as key),'{}'::text[])) then
        raise exception using errcode='23505',message='CONFLICT: duplicate normalized option name.';
      end if;
      if jsonb_typeof(v_option.value)='array'
         and exists (select 1 from jsonb_array_elements(v_option.value) as item where jsonb_typeof(item.value) <> 'string') then
        raise exception using errcode='22023',message='VALIDATION_ERROR: option arrays must contain strings.';
      elsif jsonb_typeof(v_option.value)='array' then
        select array_agg(trim(value) order by lower(trim(value)),trim(value)) into v_value_list from jsonb_array_elements_text(v_option.value);
      elsif jsonb_typeof(v_option.value)='string' then
        v_value_list:=array[trim(v_option.value #>> '{}')];
      else
        raise exception using errcode='22023',message='VALIDATION_ERROR: option values must be strings or arrays.';
      end if;
      if v_value_list is null or array_length(v_value_list,1)<1 or array_length(v_value_list,1)>20
         or exists(select 1 from unnest(v_value_list) as a group by lower(a) having count(*)>1) then
        raise exception using errcode='23505',message='CONFLICT: duplicate or invalid option values.';
      end if;
      select id into v_option_id from public.store_variant_options where product_id=v_product_id and lower(name)=v_option_name for update;
      if not found then
        insert into public.store_variant_options(product_id,name,sort_order) values(v_product_id,v_option_name,0) returning id into v_option_id;
      end if;
      foreach v_value_text in array v_value_list loop
        if not exists(select 1 from public.store_variant_option_values where option_id=v_option_id and lower(value)=lower(v_value_text)) then
          insert into public.store_variant_option_values(option_id,value,sort_order) values(v_option_id,v_value_text,0) returning id into v_option_value_id;
        else
          select id into v_option_value_id from public.store_variant_option_values where option_id=v_option_id and lower(value)=lower(v_value_text) order by id limit 1;
        end if;
      end loop;
      v_normalized_options:=v_normalized_options||jsonb_build_object(v_option_name,case when jsonb_typeof(v_option.value)='array' then to_jsonb(v_value_list) else to_jsonb(v_value_list[1]) end);
      v_signature:=v_signature||v_option_name||'='||array_to_string(v_value_list,'|')||';';
    end loop;
    if v_signature=any(v_seen_combinations) then
      raise exception using errcode='23505',message='CONFLICT: duplicate variant option combination.';
    end if;
    v_seen_combinations:=array_append(v_seen_combinations,v_signature);

    if v_existing then
      if jsonb_array_length(coalesce(v_variant.inventory,'[]'::jsonb))>0 then
        raise exception using errcode='22023',message='VALIDATION_ERROR: existing inventory cannot be changed here.';
      end if;
      v_variant_id:=v_variant.id;
      update public.store_product_variants set label=trim(v_variant.label),sku=trim(v_variant.sku),options=v_normalized_options,
        price=v_variant_price,price_paise=case when v_currency='INR' then v_variant_price_paise end,currency_code=v_currency,
        stock=v_variant.stock,is_active=coalesce(v_variant.is_active,true),updated_at=now()
      where id=v_variant.id and product_id=v_product_id;
    else
      insert into public.store_product_variants(product_id,label,sku,options,price,price_paise,currency_code,stock,is_active)
      values(v_product_id,trim(v_variant.label),trim(v_variant.sku),v_normalized_options,v_variant_price,
        case when v_currency='INR' then v_variant_price_paise end,v_currency,v_variant.stock,coalesce(v_variant.is_active,true))
      returning id into v_variant_id;
      -- Preserve the Phase 3H-A new-ID seen-set fix.
      v_seen_ids:=array_append(v_seen_ids,v_variant_id);
    end if;

    delete from public.store_variant_values where variant_id=v_variant_id;
    for v_option in select key,value from jsonb_each(v_normalized_options) loop
      select id into v_option_id from public.store_variant_options where product_id=v_product_id and lower(name)=v_option.key;
      if jsonb_typeof(v_option.value)='array' then
        for v_value in select value from jsonb_array_elements_text(v_option.value) loop
          select id into v_option_value_id from public.store_variant_option_values where option_id=v_option_id and lower(value)=lower(trim(v_value.value)) order by id limit 1;
          insert into public.store_variant_values(variant_id,option_value_id) values(v_variant_id,v_option_value_id);
        end loop;
      else
        select id into v_option_value_id from public.store_variant_option_values where option_id=v_option_id and lower(value)=lower(trim(v_option.value #>> '{}')) order by id limit 1;
        insert into public.store_variant_values(variant_id,option_value_id) values(v_variant_id,v_option_value_id);
      end if;
    end loop;

    v_inventory:=coalesce(v_variant.inventory,'[]'::jsonb);
    if v_product_type='digital' and jsonb_array_length(v_inventory)>0 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: digital variants cannot receive inventory.';
    end if;
    if not v_existing and v_product_type='physical' and jsonb_array_length(v_inventory)<1 then
      raise exception using errcode='22023',message='VALIDATION_ERROR: new physical variants require inventory.';
    end if;
    if not v_existing then
      v_seen_locations:='{}'::uuid[];
      for v_row in select * from jsonb_to_recordset(v_inventory) as x(location_id uuid,on_hand integer,reserved integer,reorder_point integer) loop
        if v_row.location_id is null or v_row.location_id=any(v_seen_locations) or v_row.on_hand is null or v_row.on_hand<0
           or coalesce(v_row.reserved,0)<>0 or coalesce(v_row.reorder_point,0)<0
           or not exists(select 1 from public.store_inventory_locations where id=v_row.location_id) then
          raise exception using errcode='22023',message='VALIDATION_ERROR: invalid inventory initialization.';
        end if;
        v_seen_locations:=array_append(v_seen_locations,v_row.location_id);
        insert into public.store_inventory_levels(location_id,variant_id,on_hand,reserved,reorder_point)
        values(v_row.location_id,v_variant_id,v_row.on_hand,0,coalesce(v_row.reorder_point,0));
      end loop;
    end if;
  end loop;

  for v_row in select id from public.store_product_variants where product_id=v_product_id and not(id=any(v_seen_ids)) order by id for update loop
    if exists(select 1 from public.store_inventory_levels where variant_id=v_row.id and reserved>0)
       or public.studio_variant_has_active_reservations(v_row.id)
       or exists(select 1 from public.store_order_items oi join public.store_orders o on o.id=oi.order_id
                 where oi.variant_id=v_row.id and o.status in ('pending','confirmed','fulfilling')) then
      raise exception using errcode='40001',message='INVENTORY_RESERVED: variant cannot be archived while fulfillment is active.';
    end if;
    update public.store_product_variants set is_active=false,updated_at=now() where id=v_row.id;
  end loop;

  if p_product ? 'collection_ids' then
    if jsonb_typeof(p_product->'collection_ids')<>'array' or exists(
      select 1 from jsonb_array_elements_text(p_product->'collection_ids') as collection_id
      where collection_id !~ '^[0-9a-fA-F-]{36}$' or not exists(select 1 from public.store_collections where id=collection_id::uuid)
    ) then
      raise exception using errcode='23503',message='VALIDATION_ERROR: invalid collection.';
    end if;
    delete from public.store_collection_products where product_id=v_product_id;
    insert into public.store_collection_products(collection_id,product_id,sort_order)
    select collection_id::uuid,v_product_id,row_number() over()-1 from jsonb_array_elements_text(p_product->'collection_ids') as collection_id;
  end if;

  return jsonb_build_object('product_id',v_product_id,'version',v_new_version,
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'is_active',is_active) order by id)
      from public.store_product_variants where product_id=v_product_id),'[]'::jsonb));
exception when unique_violation then
  raise exception using errcode='23505',message='CONFLICT: duplicate slug, SKU, option, combination, or inventory key.';
end;
$function$;

revoke all on function public.studio_save_product_atomic_v2(text,uuid,bigint,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.studio_save_product_atomic_v2(text,uuid,bigint,jsonb,jsonb,jsonb) to authenticated;

comment on function public.studio_save_product_atomic_v2(text,uuid,bigint,jsonb,jsonb,jsonb)
  is 'Unapplied Studio-only atomic product writer v2; requires separate deployment review and application rollout.';

-- Existing CMS runtime is intentionally not wired to this unapplied function.
