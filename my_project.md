# Zerocraft Project Documentation

## Architecture & Structure

This project is built using **Next.js 16.1+ (App Router)**.
It follows a strict separation between the **Public Site** and the **Studio CMS**.

### Folder Structure

```
zerocraft/
├── app/
│   ├── (site)/             # Public facing website (Custom CSS)
│   │   ├── layout.tsx
│   │   ├── page.tsx        
│   │   └── footer.tsx      
│   ├── (cms)/
│   │   └── studio/         # Protected CMS Dashboard (Tailwind + Shadcn)
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── error.tsx   # Scoped Error Boundary
│   │       └── loading.tsx # Scoped Loading UI
│   ├── auth/               # Supabase Auth Callbacks
│   ├── login/              # Login Page for CMS
│   ├── layout.tsx          # Global Layout
│   ├── error.tsx           # Global Error Boundary
│   └── loading.tsx         # Global Loading UI
├── components/
│   ├── section/            # Custom CSS semantic components for /(site)
│   └── ui/                 # Shadcn UI components (Tailwind) for /studio
├── styles/
│   ├── index.css           # Custom CSS for the public site
│   ├── footer.css          # Scoped CSS for the footer
│   └── globals.css         # Tailwind initialization for /studio
├── proxy.ts                # Next.js Middleware handling Supabase auth proxy
└── package.json            # Dependencies and scripts
```

## Styling Strategy: Custom CSS vs Tailwind

To satisfy the requirement of keeping the base site exclusively custom CSS while retaining Tailwind for the CMS:
1. **Public Site (`app/(site)`)**: Uses pure custom CSS defined in `styles/index.css` and `styles/footer.css`. All Tailwind utility classes have been stripped from public components (e.g. `HeroMinimal`, `ProjectsShowcase`, `Footer`).
2. **Studio CMS (`app/(cms)/studio`)**: Continues to use Tailwind CSS (v4) and Shadcn UI components. Tailwind is strictly scoped to this route tree via the import of `styles/globals.css` inside `app/(cms)/studio/layout.tsx`.

## Routing & Security (Middleware Proxy)

The project uses Next.js middleware (named `proxy.ts` due to Next.js 16 conventions) to secure the `/studio/*` routes.
It utilizes `@supabase/ssr` to intercept requests, update the session cookie securely, and redirect unauthorized users to the `/login` page if they attempt to access the CMS.

## Error & Loading States

- **Global Level**: `app/error.tsx` and `app/loading.tsx` handle unexpected crashes and loading states across the entire application.
- **Studio Level**: `app/(cms)/studio/error.tsx` and `app/(cms)/studio/loading.tsx` provide contextual error boundaries and loading indicators specifically tailored to the dashboard interface.

## Cleanup Conducted

During the restructuring:
- Removed heavily Tailwind-coupled unused sliders and sections from `components/section/` that were not aligned with the custom CSS constraint.
- Consolidated routing logic.
- Rewrote `HeroMinimal`, `ProjectsShowcase`, and `Footer` to utilize custom semantic CSS.
