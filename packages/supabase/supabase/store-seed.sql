-- Zerocraft commerce demo data.
-- Apply after admin-mvp.sql and studio-store-catalog.sql.
-- Every row has a stable id/slug so this file is safe to run more than once.

insert into public.store_categories (id, name, slug, description, image_url, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'Digital products', 'digital-products', 'Templates, systems and downloadable resources.', '', true),
  ('10000000-0000-4000-8000-000000000002', 'Brand systems', 'brand-systems', 'Identity tools for ambitious teams.', '', true),
  ('10000000-0000-4000-8000-000000000003', 'Studio goods', 'studio-goods', 'Small-batch objects from the Zerocraft studio.', '', true),
  ('10000000-0000-4000-8000-000000000004', 'Limited edition', 'limited-edition', 'Numbered releases and one-off experiments.', '', true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, is_active = excluded.is_active, updated_at = now();

insert into public.store_products (id, category_id, title, slug, description, product_type, status, sku, price, compare_at_price, currency, stock, image_url)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Signal UI Kit', 'signal-ui-kit', 'A high-fidelity interface kit for modern product teams.', 'digital', 'active', 'ZC-SIGNAL-001', 149, 199, 'USD', null, ''),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Framer Motion Pack', 'framer-motion-pack', 'Motion presets and interaction recipes for Framer projects.', 'digital', 'active', 'ZC-MOTION-002', 89, 120, 'USD', null, ''),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Identity Blueprint', 'identity-blueprint', 'A practical brand strategy and identity workbook.', 'digital', 'active', 'ZC-BRAND-003', 249, 299, 'USD', null, ''),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Zerocraft Field Notes', 'zerocraft-field-notes', 'A linen-bound notebook for ideas, systems and sketches.', 'physical', 'active', 'ZC-NOTES-004', 32, 40, 'USD', 18, ''),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Studio Cap', 'studio-cap', 'Structured six-panel cap with embroidered mark.', 'physical', 'active', 'ZC-CAP-005', 48, 60, 'USD', 7, ''),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'Grid Poster', 'grid-poster', 'Archival print from the Zerocraft grid studies.', 'physical', 'active', 'ZC-POSTER-006', 72, 90, 'USD', 3, ''),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000004', 'Foundations Print', 'foundations-print', 'Signed and numbered studio print, edition of 50.', 'physical', 'active', 'ZC-PRINT-007', 180, 240, 'USD', 0, ''),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'Studio Strategy Session', 'studio-strategy-session', 'A focused 90-minute session for product and brand direction.', 'digital', 'active', 'ZC-SESSION-008', 450, null, 'USD', null, '')
on conflict (slug) do update set title = excluded.title, price = excluded.price, compare_at_price = excluded.compare_at_price, stock = excluded.stock, status = excluded.status, updated_at = now();

insert into public.store_orders (id, order_number, customer_name, customer_email, customer_phone, shipping_address, items, delivery_method, coupon_code, subtotal, discount, shipping_fee, tax, total, currency, status, payment_status, payment_method, created_at, updated_at)
values
  ('30000000-0000-4000-8000-000000000001', 'ZC-1042', 'Maya Chen', 'maya.chen@example.com', '+1 555 010 1042', '{"city":"Austin","country":"US"}', '[{"title":"Signal UI Kit","quantity":1,"price":149}]', 'standard', null, 149, 0, 0, 13.41, 162.41, 'USD', 'completed', 'paid', 'cod', now() - interval '2 days', now() - interval '2 days'),
  ('30000000-0000-4000-8000-000000000002', 'ZC-1041', 'Noah Williams', 'noah.williams@example.com', '+1 555 010 1041', '{"city":"Portland","country":"US"}', '[{"title":"Zerocraft Field Notes","quantity":2,"price":32}]', 'express', null, 64, 0, 12, 6.84, 82.84, 'USD', 'shipped', 'paid', 'cod', now() - interval '5 days', now() - interval '5 days'),
  ('30000000-0000-4000-8000-000000000003', 'ZC-1040', 'Sofia Martinez', 'sofia.martinez@example.com', '+1 555 010 1040', '{"city":"Miami","country":"US"}', '[{"title":"Identity Blueprint","quantity":1,"price":249}]', 'standard', 'WELCOME10', 249, 24.90, 0, 20.17, 244.27, 'USD', 'completed', 'paid', 'cod', now() - interval '8 days', now() - interval '8 days'),
  ('30000000-0000-4000-8000-000000000004', 'ZC-1039', 'Ethan Brooks', 'ethan.brooks@example.com', '+1 555 010 1039', '{"city":"Chicago","country":"US"}', '[{"title":"Studio Cap","quantity":1,"price":48},{"title":"Grid Poster","quantity":1,"price":72}]', 'express', null, 120, 0, 14, 12.06, 146.06, 'USD', 'fulfilling', 'paid', 'cod', now() - interval '12 days', now() - interval '12 days'),
  ('30000000-0000-4000-8000-000000000005', 'ZC-1038', 'Olivia Parker', 'olivia.parker@example.com', '+1 555 010 1038', '{"city":"Denver","country":"US"}', '[{"title":"Framer Motion Pack","quantity":1,"price":89}]', 'standard', null, 89, 0, 0, 8.01, 97.01, 'USD', 'completed', 'paid', 'cod', now() - interval '17 days', now() - interval '17 days'),
  ('30000000-0000-4000-8000-000000000006', 'ZC-1037', 'Liam Carter', 'liam.carter@example.com', '+1 555 010 1037', '{"city":"Seattle","country":"US"}', '[{"title":"Foundations Print","quantity":1,"price":180}]', 'overnight', null, 180, 0, 24, 18.36, 222.36, 'USD', 'shipped', 'paid', 'cod', now() - interval '23 days', now() - interval '23 days'),
  ('30000000-0000-4000-8000-000000000007', 'ZC-1036', 'Ava Thompson', 'ava.thompson@example.com', '+1 555 010 1036', '{"city":"Boston","country":"US"}', '[{"title":"Signal UI Kit","quantity":1,"price":149},{"title":"Framer Motion Pack","quantity":1,"price":89}]', 'standard', null, 238, 0, 0, 21.42, 259.42, 'USD', 'completed', 'paid', 'cod', now() - interval '31 days', now() - interval '31 days'),
  ('30000000-0000-4000-8000-000000000008', 'ZC-1035', 'James Wilson', 'james.wilson@example.com', '+1 555 010 1035', '{"city":"New York","country":"US"}', '[{"title":"Studio Strategy Session","quantity":1,"price":450}]', 'standard', null, 450, 0, 0, 40.50, 490.50, 'USD', 'confirmed', 'paid', 'cod', now() - interval '42 days', now() - interval '42 days'),
  ('30000000-0000-4000-8000-000000000009', 'ZC-1034', 'Isabella Garcia', 'isabella.garcia@example.com', '+1 555 010 1034', '{"city":"Los Angeles","country":"US"}', '[{"title":"Grid Poster","quantity":2,"price":72}]', 'standard', null, 144, 0, 0, 12.96, 156.96, 'USD', 'completed', 'paid', 'cod', now() - interval '58 days', now() - interval '58 days'),
  ('30000000-0000-4000-8000-000000000010', 'ZC-1033', 'Henry Davis', 'henry.davis@example.com', '+1 555 010 1033', '{"city":"San Francisco","country":"US"}', '[{"title":"Identity Blueprint","quantity":1,"price":249},{"title":"Zerocraft Field Notes","quantity":1,"price":32}]', 'express', null, 281, 0, 12, 26.37, 319.37, 'USD', 'completed', 'paid', 'cod', now() - interval '74 days', now() - interval '74 days')
on conflict (order_number) do update set total = excluded.total, status = excluded.status, payment_status = excluded.payment_status, items = excluded.items, updated_at = now();
