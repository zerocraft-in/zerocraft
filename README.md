# Zerocraft Studio ✦

A premium, award-level creative agency website and bespoke CMS built with a relentless focus on minimalist design, smooth micro-interactions, and robust backend architecture. 

---

## ⚡ Overview

Zerocraft Studio is a dual-layered web application:
1. **The Frontend Showcase:** A meticulously crafted, high-performance landing experience featuring scroll-linked parallax, editorial layouts, and dynamic GSAP/Framer Motion animations.
2. **The Studio CMS (Backend):** A completely custom, role-based content management system built to manage works, blogs, clients, real-time appointment bookings, and automated WhatsApp notifications.

## ✨ Features

- **Modern & Minimal UI:** Editorial typography, glassmorphism, and dark-mode by default.
- **Fluid Animations:** Complex scroll sequences, hover state expansions, and smooth page transitions using Lenis Smooth Scroll, Framer Motion, and GSAP.
- **Headless CMS Studio:** Full CRUD operations for portfolio works, services, testimonials, and team members.
- **Real-Time Booking:** Client appointment scheduling synchronized with live notifications.
- **n8n Automation:** Integrated WhatsApp triggers for client communication directly from the CMS.
- **Global Reach:** Multi-currency switching (USD, EUR, GBP, INR) persisting via cookies.
- **Security:** Supabase SSR Auth with Role-Based Access Control (Admin, Manager, Staff, Client).

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom CSS Architecture
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) + Radix UI
- **Animations:** Framer Motion, GSAP, Lenis
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, SSR Auth, Realtime)
- **Automations:** n8n Webhooks

---

## 🚀 Getting Started

First, ensure you have your `.env.local` configured with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. To access the CMS, navigate to `/login` and authenticate to reach `/studio`.

---

## 👨‍💻 Developer

**Manimaran R**
- Social Profiles: [@ivd.maran](https://instagram.com/ivd.maran)
- Role: Senior Frontend Engineer, Creative Developer, UI/UX Designer, & Motion Designer.

---

<div align="center">
  <sub>Built with 🖤 by Manimaran R.</sub>
</div>
