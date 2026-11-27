-- Legacy catalog rows may have major-unit prices but no paise columns.
-- Preserve their displayed prices while making transactional checkout compatible.
update public.store_products
set price_paise = round(price * 100)::bigint
where price_paise is null
  and upper(coalesce(currency_code, currency, 'INR')) = 'INR'
  and price is not null;

update public.store_products
set compare_at_price_paise = round(compare_at_price * 100)::bigint
where compare_at_price_paise is null
  and upper(coalesce(currency_code, currency, 'INR')) = 'INR'
  and compare_at_price is not null;

update public.store_product_variants
set price_paise = round(price * 100)::bigint
where price_paise is null
  and upper(coalesce(currency_code, 'INR')) = 'INR'
  and price is not null;
