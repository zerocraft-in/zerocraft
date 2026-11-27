alter table public.products
  drop constraint store_products_inr_only,
  add constraint products_currency_amount_check check (
    currency = currency_code and (
      (currency = 'INR' and price_paise is not distinct from round(price * 100)::bigint
       and compare_at_price_paise is not distinct from round(compare_at_price * 100)::bigint)
      or (currency = 'USD' and price_paise is null and compare_at_price_paise is null)
    )
  );

alter table public.variants
  drop constraint store_product_variants_inr_only,
  add constraint variants_currency_amount_check check (
    (currency_code = 'INR' and price_paise is not distinct from round(price * 100)::bigint)
    or (currency_code = 'USD' and price_paise is null)
  );
