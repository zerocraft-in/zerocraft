-- Restore active legacy products to the public catalog by completing their
-- taxonomy. This migration is intentionally slug-scoped and idempotent.

insert into public.store_subcategories (
  category_id,
  name,
  slug,
  description,
  sort_order,
  is_active
)
select
  category.id,
  'Tamil Cinema Art',
  'tamil-cinema-art',
  'Tamil cinema-inspired poster and art-print editions.',
  10,
  true
from public.store_categories category
where category.slug = 'tamil-movie-posters'
on conflict (category_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update public.store_products product
set
  subcategory_id = subcategory.id,
  updated_at = now()
from public.store_categories category
join public.store_subcategories subcategory
  on subcategory.category_id = category.id
 and subcategory.slug = 'tamil-cinema-art'
where category.slug = 'tamil-movie-posters'
  and product.category_id = category.id
  and product.status = 'active'
  and product.slug in (
    'vikram-agent-redline-art-print',
    'jailer-tiger-code-art-print',
    'kaithi-midnight-route-art-print',
    '96-rain-and-memory-art-print',
    'vaaranam-aayiram-road-song-art-print'
  )
  and product.subcategory_id is null;

with assignments(product_slug, subcategory_slug) as (
  values
    ('zerolines-core-oversized-tee', 'oversized-tees'),
    ('tamil-form-type-tee', 'tamil-culture'),
    ('redline-club-tee', 'typography-tees'),
    ('night-shift-graphic-tee', 'cinema-tees'),
    ('colour-study-oversized-tee', 'oversized-tees')
)
update public.store_products product
set
  subcategory_id = subcategory.id,
  updated_at = now()
from assignments assignment
join public.store_categories category
  on category.slug = 't-shirts'
join public.store_subcategories subcategory
  on subcategory.category_id = category.id
 and subcategory.slug = assignment.subcategory_slug
where product.slug = assignment.product_slug
  and product.category_id = category.id
  and product.status = 'active'
  and product.subcategory_id is null;

do $$
declare
  unresolved_count integer;
begin
  select count(*) into unresolved_count
  from public.store_products
  where status = 'active'
    and slug in (
      'vikram-agent-redline-art-print',
      'jailer-tiger-code-art-print',
      'kaithi-midnight-route-art-print',
      '96-rain-and-memory-art-print',
      'vaaranam-aayiram-road-song-art-print',
      'zerolines-core-oversized-tee',
      'tamil-form-type-tee',
      'redline-club-tee',
      'night-shift-graphic-tee',
      'colour-study-oversized-tee'
    )
    and subcategory_id is null;

  if unresolved_count > 0 then
    raise exception 'Storefront taxonomy backfill left % active products unresolved', unresolved_count;
  end if;
end
$$;
