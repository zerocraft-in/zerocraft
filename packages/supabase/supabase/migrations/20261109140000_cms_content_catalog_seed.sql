-- CMS content taxonomy and safe starter records for Studio.
alter table public.pages add column if not exists content_type text not null default 'page';
alter table public.pages add column if not exists content_metadata jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cms_pages_content_type_check') then
    alter table public.pages add constraint cms_pages_content_type_check
      check (content_type in ('page','blog','testimonial','case_study','announcement'));
  end if;
end $$;
create index if not exists cms_pages_content_type_updated_idx on public.pages(content_type, updated_at desc);

-- Keep the existing Hello World record live after the workflow columns are
-- introduced, then seed only missing starter records by slug.
update public.pages
set status = 'published', workflow_status = 'approved', published_at = coalesce(published_at, now()), updated_at = now()
where slug = 'hello-world';

insert into public.pages (title, slug, excerpt, content, content_type, status, workflow_status, seo_title, seo_description)
values
  ('Home', 'home', 'A calm operating system for creative teams and the work they ship.', '# Make the next move clear\n\nZeroCraft Studio brings content, client work, and delivery into one focused workspace.', 'page', 'draft', 'draft', 'Home | ZeroCraft Studio', 'A calm operating system for creative teams and the work they ship.'),
  ('About ZeroCraft', 'about', 'The people, principles, and practice behind ZeroCraft.', '# About ZeroCraft\n\nWe help ambitious teams turn complex ideas into clear digital experiences. Our studio blends strategy, design, and delivery.', 'page', 'draft', 'draft', 'About | ZeroCraft Studio', 'Learn about ZeroCraft Studio and our approach to thoughtful digital work.'),
  ('The Journal', 'journal', 'Notes on design, technology, and building useful things.', '# The Journal\n\nA running collection of lessons, experiments, and observations from the studio.', 'blog', 'draft', 'draft', 'Journal | ZeroCraft Studio', 'Notes on design, technology, and building useful things.'),
  ('What makes a useful content system?', 'useful-content-systems', 'A practical look at structure, rhythm, and the small details that make publishing feel calm.', '# What makes a useful content system?\n\nGood content systems make the next action obvious. They give teams structure without taking away momentum.\n\nStart with a clear model, keep the editing surface quiet, and make every state visible.', 'blog', 'draft', 'draft', 'What makes a useful content system? | ZeroCraft', 'A practical look at structure, rhythm, and the details behind a useful content system.'),
  ('Client testimonials', 'testimonials', 'A collection of words from teams we have worked with.', '# Client testimonials\n\n“ZeroCraft helped us turn a messy launch into a story the whole team could understand.”\n\n— Maya Chen, Northstar Health', 'testimonial', 'draft', 'draft', 'Testimonials | ZeroCraft Studio', 'Read what teams say about working with ZeroCraft Studio.'),
  ('Northstar Health digital platform', 'northstar-health', 'A clearer digital platform for a growing healthcare team.', '# Northstar Health\n\nWe created a flexible digital foundation that made the service easier to understand and easier to grow.', 'case_study', 'draft', 'draft', 'Northstar Health case study | ZeroCraft', 'A ZeroCraft Studio case study.'),
  ('Studio announcement', 'studio-announcement', 'A starter announcement record for your publishing workflow.', '# Studio announcement\n\nThis is a starter announcement. Replace it with your first official update, launch note, or release story.', 'announcement', 'draft', 'draft', 'Studio announcement | ZeroCraft', 'A starter announcement for the ZeroCraft publishing workflow.')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
