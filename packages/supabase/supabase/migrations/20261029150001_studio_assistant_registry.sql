-- Register the optional AI assistant and provider without exposing credentials.
insert into public.studio_features (feature_key, display_name, description, enabled)
values ('assistant', 'AI command center', 'Text, voice, and natural-language workspace navigation.', true)
on conflict (feature_key) do update set
  display_name = excluded.display_name,
  description = excluded.description;

insert into public.studio_integrations (provider, display_name, status, enabled, metadata)
values ('gemini', 'Zerocraft AI', 'error', false, jsonb_build_object('capability', 'command-routing'))
on conflict (provider) do update set
  display_name = excluded.display_name,
  metadata = public.studio_integrations.metadata || excluded.metadata;
