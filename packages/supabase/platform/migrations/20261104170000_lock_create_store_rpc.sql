-- Store creation is server-mediated; do not expose this SECURITY DEFINER RPC through PostgREST.
revoke execute on function public.create_store(text, text, jsonb) from authenticated, anon, public;
grant execute on function public.create_store(text, text, jsonb) to service_role;
