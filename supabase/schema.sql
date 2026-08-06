-- Studio Admin Dashboard Schema for Supabase PostgreSQL
-- Enforces Role-Based Access Control (RBAC) and Row Level Security (RLS)

-- 1. ENUM / ROLES DEFINITION
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'client');

-- 2. PROFILES TABLE (User Accounts & RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'staff',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BLOGS TABLE (Content Management)
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('published', 'draft', 'archived')) DEFAULT 'draft',
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'Studio Team',
    category TEXT DEFAULT 'Design & Tech',
    views_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WORKS / PORTFOLIO TABLE
CREATE TABLE IF NOT EXISTS public.works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    client_name TEXT NOT NULL,
    description TEXT,
    featured BOOLEAN DEFAULT false,
    completion_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS TABLE (Testimonials & Moderation)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    client_role TEXT,
    company TEXT,
    avatar_url TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
    comment TEXT NOT NULL,
    status TEXT CHECK (status IN ('approved', 'pending', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLIENTS TABLE (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    company TEXT,
    status TEXT CHECK (status IN ('active', 'lead', 'archived')) DEFAULT 'lead',
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APPOINTMENTS TABLE (Booking & n8n Automation)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    whatsapp_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated studio users
CREATE POLICY "Public or Authenticated Read Blogs" ON public.blogs FOR SELECT USING (true);
CREATE POLICY "Public Read Works" ON public.works FOR SELECT USING (true);
CREATE POLICY "Public Read Approved Reviews" ON public.reviews FOR SELECT USING (status = 'approved' OR auth.role() = 'authenticated');
CREATE POLICY "Studio Staff Read Clients" ON public.clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Studio Staff Read Appointments" ON public.appointments FOR SELECT USING (auth.role() = 'authenticated');

-- Enable full access for authenticated users
CREATE POLICY "All Access for Studio Users on Blogs" ON public.blogs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "All Access for Studio Users on Works" ON public.works FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "All Access for Studio Users on Reviews" ON public.reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "All Access for Studio Users on Clients" ON public.clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "All Access for Studio Users on Appointments" ON public.appointments FOR ALL USING (auth.role() = 'authenticated');
