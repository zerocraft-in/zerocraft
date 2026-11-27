do $$
declare definition text;
begin
 select pg_get_functiondef('public.manage_product_selection(uuid[],text,text[],jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if cardinality(p_ids) < 1 or cardinality(p_ids) > 500 then','if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 500 or (select count(distinct id) from unnest(p_ids) id) <> cardinality(p_ids) then');
 definition:=replace(definition,'if jsonb_typeof(p_edits)<>''array'' or jsonb_array_length(p_edits)<>cardinality(p_ids) then','if p_edits is null or jsonb_typeof(p_edits)<>''array'' or jsonb_array_length(p_edits)<>cardinality(p_ids) or (select count(distinct item->>''id'') from jsonb_array_elements(p_edits) item) <> cardinality(p_ids) then');
 definition:=replace(definition,'if not target=any(p_ids) or','if target is null or not target=any(p_ids) or');
 execute definition;
end $$;
notify pgrst,'reload schema';
