-- Approved Zerocraft Store starter products.
-- Run only after store-catalog-taxonomy-seed.sql.
-- Original Zerocraft concepts only; no film names, celebrity endorsements,
-- franchise assets, or unapproved artwork are included.

with products(category_slug, subcategory_slug, title, slug, description, sku, price, compare_at_price, stock, product_type, design_origin, rights_status) as (
  values
    ('posters','minimal-typography','Frame of Mind Poster','frame-of-mind-poster','An original type-led composition about the rituals of watching, collecting and remembering stories.','ZC-POSTER-FRAME-MIND',799,999,24,'physical','original_zerocraft','not_applicable'),
    ('posters','tamil-cinema','Southbound Light Poster','southbound-light-poster','An original Tamil-culture-inspired composition built from rhythm, light and handwritten movement.','ZC-POSTER-SOUTHBOUND',899,1099,20,'physical','original_zerocraft','not_applicable'),
    ('posters','vintage-retro','Midnight Matinee Poster','midnight-matinee-poster','A retro cinema-night study with original lettering, grain and colour blocking.','ZC-POSTER-MIDNIGHT',849,1049,18,'physical','original_zerocraft','not_applicable'),
    ('photo-frames','minimal-frames','The Quiet Frame','the-quiet-frame','A minimal frame system for a favourite still, memory or personal photograph.','ZC-FRAME-QUIET',1499,1799,12,'physical','original_zerocraft','not_applicable'),
    ('photo-frames','collage-frames','Scene Notes Collage Frame','scene-notes-collage-frame','A multi-image layout for building a personal visual diary.','ZC-FRAME-SCENE-NOTES',1899,2299,10,'physical','original_zerocraft','not_applicable'),
    ('t-shirts','typography-tees','Cut To Feeling Tee','cut-to-feeling-tee','Original typography for the feeling that stays after the credits.','ZC-TEE-CUT-FEELING',1299,1599,30,'physical','original_zerocraft','not_applicable'),
    ('t-shirts','tamil-culture','Oru Frame Tee','oru-frame-tee','A compact original Tamil-language graphic about holding on to one frame.','ZC-TEE-ORU-FRAME',1399,1699,30,'physical','original_zerocraft','not_applicable'),
    ('t-shirts','oversized-tees','After The Credits Oversized Tee','after-the-credits-tee','A relaxed oversized tee with an original post-screen ritual graphic.','ZC-TEE-AFTER-CREDITS',1499,1799,26,'physical','original_zerocraft','not_applicable'),
    ('sweatshirts-hoodies','minimal-logo','Zerocraft Signal Hoodie','zerocraft-signal-hoodie','A heavyweight hoodie with a restrained original Zerocraft signal mark.','ZC-HOODIE-SIGNAL',2499,2999,16,'physical','original_zerocraft','not_applicable'),
    ('art-prints','abstract-art','Colour Between Scenes Print','colour-between-scenes-print','An abstract original print exploring the pause between one scene and the next.','ZC-PRINT-COLOUR-SCENES',999,1299,20,'physical','original_zerocraft','not_applicable'),
    ('accessories','tote-bags','The Matinee Tote','matinee-tote','A durable everyday tote with an original cinema-culture mark system.','ZC-TOTE-MATINEE',699,899,28,'physical','original_zerocraft','not_applicable'),
    ('accessories','stickers','Zerocraft Scene Markers','zerocraft-scene-markers','A small set of original stickers for notebooks, cases and creative workspaces.','ZC-STICKERS-SCENE',299,399,40,'physical','original_zerocraft','not_applicable')
)
insert into public.store_products (
  category_id, subcategory_id, title, slug, description, product_type, status,
  sku, price, compare_at_price, currency, currency_code, price_paise,
  compare_at_price_paise, stock, image_url, design_origin, rights_status
)
select c.id, s.id, p.title, p.slug, p.description, p.product_type, 'active',
  p.sku, p.price, p.compare_at_price, 'INR', 'INR', p.price * 100,
  p.compare_at_price * 100, p.stock,
  case
    when p.category_slug = 'posters' then '/images/products/catalog/poster-frame-of-mind.png'
    when p.category_slug = 'photo-frames' then '/images/products/catalog/photo-frame-quiet.png'
    when p.category_slug = 't-shirts' then '/images/products/catalog/tee-cut-to-feeling.png'
    when p.category_slug = 'sweatshirts-hoodies' then '/images/products/catalog/hoodie-signal.png'
    when p.category_slug = 'art-prints' then '/images/products/catalog/print-colour-scenes.png'
    when p.category_slug = 'accessories' then '/images/products/catalog/tote-matinee.png'
    else '/og-image.jpg'
  end,
  p.design_origin, p.rights_status
from products p
join public.store_categories c on c.slug = p.category_slug and c.is_active
join public.store_subcategories s on s.category_id = c.id and s.slug = p.subcategory_slug and s.is_active
on conflict (slug) do update set
  category_id = excluded.category_id,
  subcategory_id = excluded.subcategory_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  sku = excluded.sku,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  currency = excluded.currency,
  currency_code = excluded.currency_code,
  price_paise = excluded.price_paise,
  compare_at_price_paise = excluded.compare_at_price_paise,
  stock = excluded.stock,
  image_url = excluded.image_url,
  design_origin = excluded.design_origin,
  rights_status = excluded.rights_status,
  updated_at = now();

with variants(product_slug, label, sku, options, price, stock) as (
  values
    ('frame-of-mind-poster','A4 / Matte','ZC-POSTER-FRAME-MIND-A4-MATTE','{"paper":"Matte","dimension":"A4"}'::jsonb,799,24),
    ('frame-of-mind-poster','A3 / Matte','ZC-POSTER-FRAME-MIND-A3-MATTE','{"paper":"Matte","dimension":"A3"}'::jsonb,999,24),
    ('southbound-light-poster','A4 / Matte','ZC-POSTER-SOUTHBOUND-A4-MATTE','{"paper":"Matte","dimension":"A4"}'::jsonb,899,20),
    ('southbound-light-poster','A3 / Matte','ZC-POSTER-SOUTHBOUND-A3-MATTE','{"paper":"Matte","dimension":"A3"}'::jsonb,1099,20),
    ('the-quiet-frame','8x10 / Oak','ZC-FRAME-QUIET-8X10-OAK','{"dimension":"8x10","finish":"Oak"}'::jsonb,1499,12),
    ('the-quiet-frame','12x18 / Black','ZC-FRAME-QUIET-12X18-BLACK','{"dimension":"12x18","finish":"Black"}'::jsonb,1799,12),
    ('cut-to-feeling-tee','M / Coal','ZC-TEE-CUT-FEELING-M-COAL','{"size":"M","color":"Coal"}'::jsonb,1299,30),
    ('cut-to-feeling-tee','L / Coal','ZC-TEE-CUT-FEELING-L-COAL','{"size":"L","color":"Coal"}'::jsonb,1299,30),
    ('oru-frame-tee','M / Bone','ZC-TEE-ORU-FRAME-M-BONE','{"size":"M","color":"Bone"}'::jsonb,1399,30),
    ('oru-frame-tee','L / Bone','ZC-TEE-ORU-FRAME-L-BONE','{"size":"L","color":"Bone"}'::jsonb,1399,30),
    ('after-the-credits-tee','M / Black','ZC-TEE-AFTER-CREDITS-M-BLACK','{"size":"M","color":"Black"}'::jsonb,1499,26),
    ('after-the-credits-tee','XL / Black','ZC-TEE-AFTER-CREDITS-XL-BLACK','{"size":"XL","color":"Black"}'::jsonb,1499,26),
    ('zerocraft-signal-hoodie','M / Black','ZC-HOODIE-SIGNAL-M-BLACK','{"size":"M","color":"Black"}'::jsonb,2499,16),
    ('zerocraft-signal-hoodie','L / Black','ZC-HOODIE-SIGNAL-L-BLACK','{"size":"L","color":"Black"}'::jsonb,2499,16),
    ('colour-between-scenes-print','A4 / Archival','ZC-PRINT-COLOUR-SCENES-A4','{"paper":"Archival","dimension":"A4"}'::jsonb,999,20),
    ('colour-between-scenes-print','A3 / Archival','ZC-PRINT-COLOUR-SCENES-A3','{"paper":"Archival","dimension":"A3"}'::jsonb,1299,20),
    ('matinee-tote','Standard / Natural','ZC-TOTE-MATINEE-STANDARD-NATURAL','{"size":"Standard","color":"Natural"}'::jsonb,699,28),
    ('zerocraft-scene-markers','Standard / Set of 6','ZC-STICKERS-SCENE-SET-6','{"size":"Standard","pack":"Set of 6"}'::jsonb,299,40)
)
insert into public.store_product_variants (
  product_id, label, sku, options, price, price_paise, currency_code, stock, is_active
)
select p.id, v.label, v.sku, v.options, v.price, v.price * 100, 'INR', v.stock, true
from variants v
join public.store_products p on p.slug = v.product_slug
on conflict (sku) do update set
  product_id = excluded.product_id,
  label = excluded.label,
  options = excluded.options,
  price = excluded.price,
  price_paise = excluded.price_paise,
  currency_code = excluded.currency_code,
  stock = excluded.stock,
  is_active = excluded.is_active,
  updated_at = now();
