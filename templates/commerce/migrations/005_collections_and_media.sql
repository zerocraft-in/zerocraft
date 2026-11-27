-- ============================================================================
-- Zerocraft Commerce Template — 005_collections_and_media
-- Collections, media metadata/references, and metafields.
--
-- Binary media is never stored in PostgreSQL. This schema stores R2 object
-- metadata and typed references only.
-- ============================================================================

begin;

create table if not exists public.media (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  r2_key text not null check (char_length(trim(r2_key)) between 1 and 1024),
  name text not null check (char_length(trim(name)) between 1 and 255),
  content_type text null check (content_type is null or char_length(content_type) <= 200),
  size_bytes bigint not null check (size_bytes >= 0),
  url text not null check (char_length(trim(url)) between 1 and 2048),
  alt text null check (alt is null or char_length(alt) <= 255),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  checksum_sha256 text null check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_by_central_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_id_store_key unique (id, store_id),
  constraint media_store_key_key unique (store_id, r2_key)
);

comment on table public.media is
  'Metadata for objects in Cloudflare R2 or another object store. Never stores binary bytes or object-store credentials.';
comment on column public.media.r2_key is
  'Object key, normally scoped as store/<store_id>/<uuid>-<filename>.';

create index if not exists media_store_created_idx on public.media(store_id, created_at desc);
create index if not exists media_store_name_idx on public.media(store_id, name);

drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null,
  media_id uuid not null,
  alt text null check (alt is null or char_length(alt) <= 255),
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_product_media_key unique (product_id, media_id),
  constraint product_images_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete cascade,
  constraint product_images_media_fk
    foreign key (media_id, store_id)
    references public.media(id, store_id)
    on delete restrict
);

create index if not exists product_images_product_position_idx
  on public.product_images(product_id, position);

drop trigger if exists product_images_set_updated_at on public.product_images;
create trigger product_images_set_updated_at
  before update on public.product_images
  for each row execute function public.set_updated_at();

create table if not exists public.product_image_variants (
  product_image_id uuid not null references public.product_images(id) on delete cascade,
  variant_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  primary key (product_image_id, variant_id),
  constraint product_image_variants_variant_fk
    foreign key (variant_id, store_id)
    references public.variants(id, store_id)
    on delete cascade
);

create table if not exists public.media_references (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  media_id uuid not null,
  owner_type text not null
    check (owner_type in ('product', 'variant', 'collection', 'store', 'customer')),
  owner_id uuid not null,
  namespace text not null default 'default' check (char_length(namespace) <= 32),
  created_at timestamptz not null default now(),
  constraint media_references_media_fk
    foreign key (media_id, store_id)
    references public.media(id, store_id)
    on delete cascade,
  constraint media_references_owner_key
    unique (media_id, owner_type, owner_id, namespace)
);

create index if not exists media_references_owner_idx
  on public.media_references(store_id, owner_type, owner_id);

create table if not exists public.collections (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  handle text not null check (handle ~ '^[a-z0-9-]+$' and char_length(handle) <= 255),
  description text null,
  image_media_id uuid null,
  sort_order text not null default 'manual'
    check (sort_order in (
      'manual', 'best-selling', 'title-ascending', 'title-descending',
      'price-ascending', 'price-descending', 'created-descending', 'created-ascending'
    )),
  published_at timestamptz null,
  published_scope text not null default 'web' check (published_scope in ('web', 'global')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_id_store_key unique (id, store_id),
  constraint collections_store_handle_key unique (store_id, handle),
  constraint collections_image_fk
    foreign key (image_media_id, store_id)
    references public.media(id, store_id)
    on delete set null
);

create index if not exists collections_store_handle_idx on public.collections(store_id, handle);

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create table if not exists public.collection_products (
  collection_id uuid not null,
  product_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id),
  constraint collection_products_collection_fk
    foreign key (collection_id, store_id)
    references public.collections(id, store_id)
    on delete cascade,
  constraint collection_products_product_fk
    foreign key (product_id, store_id)
    references public.products(id, store_id)
    on delete cascade
);

create index if not exists collection_products_product_idx
  on public.collection_products(product_id, store_id);

create table if not exists public.metafields (
  id uuid not null default gen_random_uuid() primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_type text not null
    check (owner_type in ('product', 'variant', 'collection', 'store', 'customer', 'order')),
  owner_id uuid not null,
  namespace text not null check (char_length(namespace) between 1 and 32),
  key text not null check (char_length(key) between 1 and 64),
  type text not null
    check (type in (
      'string', 'integer', 'number', 'boolean', 'json', 'date', 'date_time',
      'url', 'color', 'rating', 'dimension', 'volume', 'weight',
      'multi_line_text', 'single_line_text', 'file_reference', 'page_reference',
      'product_reference', 'variant_reference', 'collection_reference'
    )),
  value jsonb not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint metafields_owner_key
    unique (store_id, owner_type, owner_id, namespace, key)
);

create index if not exists metafields_owner_idx
  on public.metafields(store_id, owner_type, owner_id);

drop trigger if exists metafields_set_updated_at on public.metafields;
create trigger metafields_set_updated_at
  before update on public.metafields
  for each row execute function public.set_updated_at();

-- RLS and grants are created in 015.

commit;
