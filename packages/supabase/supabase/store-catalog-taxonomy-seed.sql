-- Zerocraft Store approved catalog taxonomy.
-- Seed only after reviewing the migration and confirming the target environment.
-- This file does not create products or modify orders, customers, inventory, carts,
-- checkout, payments, or historical records.

insert into public.store_categories (name, slug, description, image_url, is_active)
values
  ('Posters', 'posters', 'Curated cinema, culture and graphic poster editions.', '', true),
  ('Photo Frames', 'photo-frames', 'Framed memories and cinematic wall pieces.', '', true),
  ('T-Shirts', 't-shirts', 'Original cinema-culture and typography apparel.', '', true),
  ('Sweatshirts / Hoodies', 'sweatshirts-hoodies', 'Layered streetwear with a film-culture point of view.', '', true),
  ('Art Prints', 'art-prints', 'Original illustrations, music studies and abstract editions.', '', true),
  ('Accessories', 'accessories', 'Small-format objects for everyday cinema culture.', '', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

with taxonomy(category_slug, name, slug, description, sort_order) as (
  values
    ('posters','Tamil Cinema','tamil-cinema','Original Tamil cinema-inspired poster editions.',10),
    ('posters','Indian Cinema','indian-cinema','Original Indian cinema-inspired poster editions.',20),
    ('posters','International Cinema','international-cinema','Original global cinema-inspired poster editions.',30),
    ('posters','Actor / Actress','actor-actress','Portrait and character studies without endorsement claims.',40),
    ('posters','Director / Music','director-music','Original tributes to filmmaking and sound.',50),
    ('posters','Vintage / Retro','vintage-retro','Retro visual language and archival-inspired compositions.',60),
    ('posters','Minimal Typography','minimal-typography','Type-led poster compositions.',70),
    ('posters','Anime & Pop Culture','anime-pop-culture','Original pop-culture-inspired illustration work.',80),
    ('photo-frames','Movie Frames','movie-frames','Cinematic frame compositions using approved artwork only.',10),
    ('photo-frames','Couple Frames','couple-frames','Two-person and relationship-led frame designs.',20),
    ('photo-frames','Personalised Frames','personalised-frames','Customer-personalised frame products.',30),
    ('photo-frames','Minimal Frames','minimal-frames','Quiet, minimal frame compositions.',40),
    ('photo-frames','Collage Frames','collage-frames','Multi-image collage frame layouts.',50),
    ('t-shirts','Cinema Tees','cinema-tees','Original film-culture graphics for everyday wear.',10),
    ('t-shirts','Tamil Culture','tamil-culture','Original Tamil language and culture graphics.',20),
    ('t-shirts','Music Tees','music-tees','Original music-led apparel graphics.',30),
    ('t-shirts','Typography Tees','typography-tees','Type-led apparel editions.',40),
    ('t-shirts','Oversized Tees','oversized-tees','Relaxed-fit oversized apparel.',50),
    ('t-shirts','Limited Drops','limited-drops','Small-run apparel releases.',60),
    ('sweatshirts-hoodies','Film-inspired','film-inspired','Original film-culture graphics for layers.',10),
    ('sweatshirts-hoodies','Streetwear','streetwear','Streetwear-led graphic layers.',20),
    ('sweatshirts-hoodies','Minimal Logo','minimal-logo','Quiet logo and mark treatments.',30),
    ('sweatshirts-hoodies','Seasonal Drops','seasonal-drops','Seasonal limited releases.',40),
    ('art-prints','Film Art','film-art','Original cinema-inspired art prints.',10),
    ('art-prints','Illustrations','illustrations','Illustrated Zerocraft editions.',20),
    ('art-prints','Music Art','music-art','Original music-inspired art prints.',30),
    ('art-prints','Abstract Art','abstract-art','Abstract studies and compositions.',40),
    ('art-prints','Tamil Culture','tamil-culture-art','Original Tamil culture art prints.',50),
    ('accessories','Tote Bags','tote-bags','Everyday carry pieces with original graphics.',10),
    ('accessories','Stickers','stickers','Small-format original sticker sheets and singles.',20),
    ('accessories','Phone Cases','phone-cases','Original phone case graphics.',30),
    ('accessories','Badges','badges','Pins and badge-style accessories.',40),
    ('accessories','Keychains','keychains','Small keychain accessories.',50)
)
insert into public.store_subcategories (category_id, name, slug, description, sort_order, is_active)
select c.id, t.name, t.slug, t.description, t.sort_order, true
from taxonomy t
join public.store_categories c on c.slug = t.category_slug
on conflict (category_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- No legacy rows are deleted or archived here. Review and archive candidates manually.
