-- Seed Data for Zerocraft Studio Admin Dashboard

-- 1. SEED BLOGS
INSERT INTO public.blogs (title, slug, excerpt, content, status, author_name, category, views_count) VALUES
('Designing Next-Gen AI Dashboards with Glassmorphism', 'designing-next-gen-ai-dashboards', 'Learn how modern UI patterns enhance AI interaction models.', 'Full article exploring visual feedback, dark mode micro-interactions, and responsive layout grids for complex SaaS apps.', 'published', 'Alex Morgan', 'UI/UX Design', 1420),
('How We Scaled SaaS Performance by 300% with Next.js 16', 'scaling-saas-performance-nextjs-16', 'Architectural breakdown of server component caching and asset optimization.', 'Deep dive into hydration optimizations, static generation strategies, and edge network delivery.', 'published', 'David Chen', 'Engineering', 980),
('The Future of Generative UI Components', 'future-of-generative-ui-components', 'Exploring prompt-driven dynamic components in real-time interfaces.', 'Generative design systems are changing how front-end systems render component states on the fly.', 'draft', 'Elena Rostova', 'AI & Research', 310);

-- 2. SEED WORKS (PORTFOLIO)
INSERT INTO public.works (title, category, image_url, client_name, description, featured) VALUES
('Apex AI Workspace Interface', 'Web App Design', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&fit=crop', 'Apex Technologies', 'Complete redesign of enterprise AI analytics workspace with interactive data canvases.', true),
('Vanguard Fintech Platform', 'SaaS Platform', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=800&fit=crop', 'Vanguard Global', 'Modern web portal for multi-currency asset tracking and real-time yield reports.', true),
('Nebula Mobile Design System', 'Branding & Mobile', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&fit=crop', 'Nebula Inc', 'Cross-platform design token system and motion guidelines for iOS & Android apps.', false);

-- 3. SEED REVIEWS
INSERT INTO public.reviews (client_name, client_role, company, rating, comment, status) VALUES
('Sarah Jenkins', 'VP of Product', 'Luminary Health', 5, 'Zerocraft transformed our clunky enterprise platform into a sleek, intuitive product that our users love.', 'approved'),
('Marcus Vance', 'Founder & CEO', 'Vance Robotics', 5, 'Exceptional craftsmanship! Delivered ahead of schedule with flawless code and pixel-perfect design.', 'approved'),
('Claire Bennett', 'Design Lead', 'Kinetix Studio', 4, 'Great team to collaborate with. They brought high energy and top-notch frontend engineering.', 'approved');

-- 4. SEED CLIENTS
INSERT INTO public.clients (name, email, phone, company, status, total_spent, notes) VALUES
('Acme Corp', 'contact@acmecorp.com', '+1 (555) 234-5678', 'Acme Corporation', 'active', 45000.00, 'Enterprise client with ongoing monthly retainer.'),
('Pulse Analytics', 'team@pulseanalytics.io', '+1 (555) 987-6543', 'Pulse Tech Inc', 'active', 28500.00, 'Revamped main SaaS dashboard & onboarding flow.'),
('Starlight Ventures', 'hello@starlight.vc', '+1 (555) 345-6789', 'Starlight VC', 'lead', 0.00, 'Interested in complete branding & web application redesign.');

-- 5. SEED APPOINTMENTS
INSERT INTO public.appointments (client_name, client_email, client_phone, service, scheduled_at, status, notes, whatsapp_sent) VALUES
('Jonathan Reed', 'j.reed@horizon.io', '+1 (555) 432-1098', '1:1 Product Strategy Session', NOW() + INTERVAL '1 day', 'confirmed', 'Focus on SaaS onboarding funnel overhaul.', true),
('Emily Zhang', 'emily@nexusai.com', '+1 (555) 876-5432', 'Design System Consultation', NOW() + INTERVAL '2 days', 'pending', 'Interested in building a multi-brand token system.', false),
('Michael Sterling', 'm.sterling@alpha.org', '+1 (555) 654-3210', 'Full Web App Audit', NOW() + INTERVAL '4 days', 'confirmed', 'Reviewing security & UX performance.', true);
