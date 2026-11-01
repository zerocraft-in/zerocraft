-- Export the clean, current store schema as a fresh-project bootstrap (no customer data).
with objects as (
 select 10 as position, t.typname as name, format('create type public.%I as enum (%s);',t.typname,string_agg(quote_literal(e.enumlabel),',' order by e.enumsortorder)) as sql
 from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' group by t.typname
 union all
 select 20,c.relname,format('create table public.%I (%s);',c.relname,string_agg(format('%I %s%s%s',a.attname,format_type(a.atttypid,a.atttypmod),case when a.attidentity<>'' then ' generated '||case when a.attidentity='a' then 'always' else 'by default' end||' as identity' when a.attgenerated<>'' then ' generated always as ('||pg_get_expr(d.adbin,d.adrelid)||') stored' when d.adbin is not null then ' default '||pg_get_expr(d.adbin,d.adrelid) else '' end,case when a.attnotnull then ' not null' else '' end),E',\n' order by a.attnum))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind='r' group by c.relname
 union all
 select 30,p.proname,pg_get_functiondef(p.oid)||';' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
 union all
 select case when contype='f' then 50 else 40 end,conname,format('alter table %s add constraint %I %s;',conrelid::regclass,conname,pg_get_constraintdef(oid)) from pg_constraint where connamespace='public'::regnamespace and conrelid<>0
 union all
 select 45,indexname,indexdef||';' from pg_indexes i where schemaname='public' and not exists(select 1 from pg_constraint c where c.conindid=(quote_ident(i.schemaname)||'.'||quote_ident(i.indexname))::regclass)
 union all
 select 60,tgname,pg_get_triggerdef(t.oid)||';' from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and (n.nspname='public' or (n.nspname='auth' and c.relname='users' and p.pronamespace='public'::regnamespace))
 union all
 select 70,tablename,format('alter table public.%I enable row level security;',tablename) from pg_tables where schemaname='public' and rowsecurity
 union all
 select 80,tablename||policyname,format('create policy %I on %I.%I as %s for %s to %s%s%s;',policyname,schemaname,tablename,permissive,cmd,array_to_string(roles,','),case when qual is not null then ' using ('||qual||')' else '' end,case when with_check is not null then ' with check ('||with_check||')' else '' end) from pg_policies where schemaname in ('public','storage')
 union all
 select 85,tablename,format('revoke all on public.%I from anon,authenticated;',tablename) from pg_tables where schemaname='public'
 union all
 select 90,table_name||grantee,format('grant %s on public.%I to %I;',string_agg(distinct privilege_type,','),table_name,grantee) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') group by table_name,grantee
 union all
 select 95,'seed-permissions','insert into public.commerce_permissions(key,label,description,group_name,sort_order) values '||string_agg(format('(%L,%L,%L,%L,%s)',key,label,description,group_name,sort_order),',')||';' from public.commerce_permissions
 union all
 select 96,'seed-roles','insert into public.commerce_role_permissions(role,permission_key,allowed) values '||string_agg(format('(%L,%L,%L)',role,permission_key,allowed),',')||';' from public.commerce_role_permissions
 union all
 select 97,'seed-features','insert into public.commerce_features(feature_key,display_name,description,enabled) values '||string_agg(format('(%L,%L,%L,%L)',feature_key,display_name,description,enabled),',')||';' from public.commerce_features
 union all
 select 98,'storage-buckets','insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values '||string_agg(format('(%L,%L,%L,%L,%L::text[])',id,name,public,file_size_limit,allowed_mime_types),',')||' on conflict(id) do nothing;' from storage.buckets
)
select '-- Store-only schema snapshot. Fresh Supabase projects only; never apply over an existing store.'||E'\n-- No products, orders, customers, credentials, or Studio data are included.\nbegin;\nset local check_function_bodies=false;\n'||string_agg(sql,E'\n\n' order by position,name)||E'\nnotify pgrst, ''reload schema'';\ncommit;\n' as schema_sql from objects;
