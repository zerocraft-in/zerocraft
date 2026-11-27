-- Make Google Search Console an independently manageable Studio feature.
insert into public.studio_features (feature_key, display_name, description, enabled)
values ('search_console', 'Search Console', 'Search queries, indexing signals and sitemap health.', true)
on conflict (feature_key) do update set
  display_name = excluded.display_name,
  description = excluded.description;
