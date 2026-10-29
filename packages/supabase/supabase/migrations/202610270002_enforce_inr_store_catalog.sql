-- Zerocraft's storefront catalog is INR-only. Historical orders retain their
-- recorded currency; product and variant writes are constrained to INR.

update public.store_products
set
  currency = 'INR',
  currency_code = 'INR',
  price_paise = round(price * 100)::bigint,
  compare_at_price_paise = case
    when compare_at_price is null then null
    else round(compare_at_price * 100)::bigint
  end,
  updated_at = now()
where currency <> 'INR'
   or currency_code <> 'INR'
   or price_paise is distinct from round(price * 100)::bigint
   or compare_at_price_paise is distinct from case
     when compare_at_price is null then null
     else round(compare_at_price * 100)::bigint
   end;

update public.store_product_variants
set
  currency_code = 'INR',
  price_paise = round(price * 100)::bigint,
  updated_at = now()
where currency_code <> 'INR'
   or price_paise is distinct from round(price * 100)::bigint;

alter table public.store_products
  drop constraint if exists store_products_inr_only,
  add constraint store_products_inr_only
    check (
      currency = 'INR'
      and currency_code = 'INR'
      and price_paise = round(price * 100)::bigint
      and compare_at_price_paise is not distinct from case
        when compare_at_price is null then null
        else round(compare_at_price * 100)::bigint
      end
    );

alter table public.store_product_variants
  drop constraint if exists store_product_variants_inr_only,
  add constraint store_product_variants_inr_only
    check (
      currency_code = 'INR'
      and price_paise = round(price * 100)::bigint
    );
