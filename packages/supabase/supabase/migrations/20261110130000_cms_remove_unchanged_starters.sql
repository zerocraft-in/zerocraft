-- Remove only the five unchanged starter records explicitly approved for cleanup.
-- Match the full seeded payload so edited or unrelated content is preserved.
with starter_content (slug, title, excerpt, content, content_type, seo_title, seo_description) as (
  values
    (
      'about',
      'About ZeroCraft',
      'The people, principles, and practice behind ZeroCraft.',
      E'# About ZeroCraft\n\nWe help ambitious teams turn complex ideas into clear digital experiences. Our studio blends strategy, design, and delivery.',
      'page',
      'About | ZeroCraft Studio',
      'Learn about ZeroCraft Studio and our approach to thoughtful digital work.'
    ),
    (
      'journal',
      'The Journal',
      'Notes on design, technology, and building useful things.',
      E'# The Journal\n\nA running collection of lessons, experiments, and observations from the studio.',
      'blog',
      'Journal | ZeroCraft Studio',
      'Notes on design, technology, and building useful things.'
    ),
    (
      'testimonials',
      'Client testimonials',
      'A collection of words from teams we have worked with.',
      E'# Client testimonials\n\n“ZeroCraft helped us turn a messy launch into a story the whole team could understand.”\n\n— Maya Chen, Northstar Health',
      'testimonial',
      'Testimonials | ZeroCraft Studio',
      'Read what teams say about working with ZeroCraft Studio.'
    ),
    (
      'northstar-health',
      'Northstar Health digital platform',
      'A clearer digital platform for a growing healthcare team.',
      E'# Northstar Health\n\nWe created a flexible digital foundation that made the service easier to understand and easier to grow.',
      'case_study',
      'Northstar Health case study | ZeroCraft',
      'A ZeroCraft Studio case study.'
    ),
    (
      'studio-announcement',
      'Studio announcement',
      'A starter announcement record for your publishing workflow.',
      E'# Studio announcement\n\nThis is a starter announcement. Replace it with your first official update, launch note, or release story.',
      'announcement',
      'Studio announcement | ZeroCraft',
      'A starter announcement for the ZeroCraft publishing workflow.'
    )
)
delete from public.pages as page
using starter_content as starter
where page.slug = starter.slug
  and page.title = starter.title
  and page.excerpt = starter.excerpt
  and page.content = starter.content
  and page.content_type = starter.content_type
  and page.status = 'draft'
  and page.content_metadata = '{}'::jsonb
  and page.seo_title = starter.seo_title
  and page.seo_description = starter.seo_description;
