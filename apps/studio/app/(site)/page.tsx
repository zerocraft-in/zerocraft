import Link from "next/link";
import { ArrowUpRight, Sparkles, Terminal, Code2, Layers, Cpu, ChevronRight, Mail } from "lucide-react";

export default function PortfolioPage() {
  const projects = [
    {
      title: "Cinema Streetwear Atelier",
      category: "Creative E-Commerce",
      description: "High-performance editorial marketplace built with multi-layered micro-interactions, Next.js, and edge caching.",
      tags: ["Next.js", "TailwindCSS", "Supabase", "Framer Motion"],
      year: "2026",
      metric: "99.8% LCP < 1.1s",
    },
    {
      title: "ZeroCraft Unified CMS",
      category: "Platform Architecture",
      description: "Multi-tenant inventory & real-time analytics portal with automated sync pipelines and row-level role security.",
      tags: ["TypeScript", "PostgreSQL", "RLS", "Turborepo"],
      year: "2026",
      metric: "10k+ SKU sync",
    },
    {
      title: "HyperScale Spatial Showroom",
      category: "Creative Engineering",
      description: "Real-time 3D interactive product configurator powered by Three.js and custom GLSL lighting shaders.",
      tags: ["WebGL", "Three.js", "GLSL", "React"],
      year: "2025",
      metric: "60 FPS WebGL",
    },
  ];

  const capabilities = [
    {
      icon: Code2,
      title: "Full-Stack Architecture",
      description: "Next.js App Router, Turborepo modular architecture, scalable relational schemas, and enterprise edge caching.",
    },
    {
      icon: Sparkles,
      title: "Micro-Interactions & UI",
      description: "Refined dark aesthetic, tactile spring animations, bespoke typography systems, and high-fidelity transitions.",
    },
    {
      icon: Layers,
      title: "Database & Security",
      description: "PostgreSQL with Supabase, Row Level Security policies, audited RBAC, and seamless multi-tenant isolation.",
    },
    {
      icon: Cpu,
      title: "Performance First",
      description: "Sub-second Core Web Vitals, zero layout shifts, asset streaming, and lightweight client footprints.",
    },
  ];

  return (
    <div>
      {/* Header / Navigation */}
      <header className="p-nav">
        <div className="p-nav-inner">
          <Link href="/" className="p-brand">
            <div className="p-brand-logo">Z</div>
            <span className="p-brand-title">
              ZEROCRAFT <span className="p-brand-sub">/ STUDIO</span>
            </span>
          </Link>

          <nav className="p-nav-links">
            <a href="#work">Work</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#contact">Contact</a>
          </nav>

          <Link href="/studio" className="p-pill-btn">
            <Terminal size={14} />
            <span>Studio Portal</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="p-hero">
          <div className="p-ambient-glow" />
          
          <div className="p-badge">
            <span className="p-dot" />
            <span>ACCEPTING SELECT COMMISSIONS Q2/Q3 2026</span>
          </div>

          <h1 className="p-hero-title">
            Crafting digital tools & <br />
            <span className="p-gradient-text">cinematic software experiences.</span>
          </h1>

          <p className="p-hero-desc">
            We engineer uncompromising digital products, enterprise interfaces, and high-fidelity creative systems for visionary teams and forward-thinking brands.
          </p>

          <div className="p-btn-row">
            <a href="#work" className="p-primary-btn">
              <span>Explore Selected Work</span>
              <ChevronRight size={16} />
            </a>
            <Link href="/studio" className="p-secondary-btn">
              <span>Launch Studio Portal</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        {/* Featured Projects Showcase */}
        <section id="work" className="p-section">
          <div className="p-section-header">
            <div>
              <span className="p-eyebrow">Portfolio & Showcase</span>
              <h2 className="p-heading">Selected Commissions</h2>
            </div>
            <p className="p-subheading">
              Each product is custom-architected with speed, scalability, and artisanal micro-details at the core.
            </p>
          </div>

          <div className="p-grid-3">
            {projects.map((p, idx) => (
              <div key={idx} className="p-card">
                <div>
                  <div className="p-card-top">
                    <span className="p-card-category">{p.category}</span>
                    <span className="p-card-year">{p.year}</span>
                  </div>

                  <h3 className="p-card-title">{p.title}</h3>
                  <p className="p-card-desc">{p.description}</p>
                </div>

                <div>
                  <div className="p-card-metric-row">
                    <span>Performance Benchmark</span>
                    <span className="p-card-metric-val">{p.metric}</span>
                  </div>

                  <div className="p-tags">
                    {p.tags.map((t, tIdx) => (
                      <span key={tIdx} className="p-tag">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="p-section">
          <div className="p-section-header" style={{ justifyContent: "center", textAlign: "center" }}>
            <div>
              <span className="p-eyebrow">Capabilities</span>
              <h2 className="p-heading">Engineered For Longevity</h2>
            </div>
          </div>

          <div className="p-grid-4">
            {capabilities.map((c, idx) => (
              <div key={idx} className="p-cap-card">
                <div className="p-cap-icon">
                  <c.icon size={20} />
                </div>
                <h3 className="p-cap-title">{c.title}</h3>
                <p className="p-cap-desc">{c.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact / Inquiries Callout */}
        <section id="contact" className="p-section">
          <div className="p-cta-box">
            <Mail size={40} style={{ color: "var(--accent-light)", margin: "0 auto 1.5rem" }} />
            <h2 className="p-cta-title">Have an ambitious project?</h2>
            <p className="p-cta-desc">
              Let&apos;s build an iconic experience together. Connect directly with our studio engineering team or submit project specs directly to the studio queue.
            </p>
            <div className="p-btn-row">
              <a href="mailto:studio@zerocraft.dev" className="p-primary-btn">
                studio@zerocraft.dev
              </a>
              <Link href="/studio/inquiries" className="p-secondary-btn">
                Submit Project Brief
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="p-footer">
        <div className="p-footer-inner">
          <p>© {new Date().getFullYear()} ZEROCRAFT STUDIO. All rights reserved.</p>
          <div className="p-footer-links">
            <Link href="/studio">Studio Management</Link>
            <a href="#work">Work</a>
            <a href="#capabilities">Capabilities</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
