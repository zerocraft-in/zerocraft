-- Normalize starter content written with escaped newlines by the catalog seed.
-- This keeps API consumers and the editor from receiving literal "\\n" text.
update public.pages
set content = replace(content, chr(92) || 'n', chr(10)),
    updated_at = now()
where content like '%' || chr(92) || 'n%';

notify pgrst, 'reload schema';
