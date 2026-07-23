"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle,
  X,
  Layers,
  Award,
  Zap,
  TrendingUp,
  Globe,
  Code2,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  client: string;
  category: "Web App" | "Mobile App" | "Branding" | "UI/UX" | "AI/3D";
  year: string;
  description: string;
  metric: string;
  metricLabel: string;
  tags: string[];
  gradient: string;
  icon: string;
  overview: string;
  challenge: string;
  solution: string;
  deliverables: string[];
  techStack: string[];
  liveUrl?: string;
}

const projectsData: Project[] = [
  {
    id: "apex-fintech",
    title: "Apex Next-Gen Trading Portal",
    client: "Apex Global Capital",
    category: "Web App",
    year: "2024",
    description:
      "A high-frequency web trading dashboard built for modern crypto institutional investors.",
    metric: "+240%",
    metricLabel: "Trading Volume Growth",
    tags: ["Next.js 16", "TypeScript", "WebSocket", "TailwindCSS"],
    gradient: "linear-gradient(135deg, #ddf730 0%, #10b981 100%)",
    icon: "📈",
    overview:
      "Apex Capital required a real-time, low-latency financial portal capable of processing 50,000+ live transactions per second with microsecond visual updates.",
    challenge:
      "Legacy charting tools suffered from severe UI lag during high-volatility market spikes, causing trader friction.",
    solution:
      "We engineered a custom Canvas/WebGL data renderer integrated with Next.js App Router and reactive WebSockets for instant data visualization.",
    deliverables: ["Full UX Audit", "Design System", "Full-Stack Web App", "Real-Time Engine"],
    techStack: ["React 19", "Next.js", "WebGL", "Framer Motion", "Tailwind"],
    liveUrl: "https://zerocraft.in",
  },
  {
    id: "neovault-mobile",
    title: "NeoVault Crypto Wallet",
    client: "NeoVault Tech",
    category: "Mobile App",
    year: "2024",
    description:
      "Self-custodial multi-chain crypto wallet app with biometric security and sleek dark mode UX.",
    metric: "450k+",
    metricLabel: "Active Downloads",
    tags: ["React Native", "Expo", "Web3", "Biometrics"],
    gradient: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
    icon: "🔐",
    overview:
      "NeoVault is a security-first Web3 mobile wallet bridging decentralization with effortless non-custodial asset management.",
    challenge:
      "Balancing complex seed phrase recovery with frictionless onboarding for web2 non-crypto natives.",
    solution:
      "Created an intuitive 3-tap social recovery flow secured by hardware enclave biometrics and MPC cryptography.",
    deliverables: ["iOS & Android App", "Design System", "Security Audit UI", "Brand Identity"],
    techStack: ["React Native", "TypeScript", "Ethers.js", "Tailwind"],
    liveUrl: "https://zerocraft.in",
  },
  {
    id: "lumina-brand",
    title: "Lumina Spatial OS Branding",
    client: "Lumina Labs",
    category: "Branding",
    year: "2023",
    description:
      "Complete visual identity, 3D brand system, and motion strategy for an AI spatial computing startup.",
    metric: "$18M",
    metricLabel: "Series A Raised",
    tags: ["Brand Strategy", "3D Motion", "Typography", "Styleguide"],
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
    icon: "✨",
    overview:
      "Lumina needed an unforgettable, high-tech brand identity prior to launching their flagship AR spatial headset.",
    challenge:
      "Standing out in a crowded hardware tech space while conveying futuristic elegance without feeling corporate.",
    solution:
      "Crafted a dynamic holographic design system featuring custom variable typography, neon accents, and interactive web guidelines.",
    deliverables: ["Brand Identity", "3D Motion Graphics", "Design System", "Pitch Deck"],
    techStack: ["Figma", "Blender", "After Effects", "Cinema4D"],
    liveUrl: "https://zerocraft.in",
  },
  {
    id: "strata-ai",
    title: "Strata AI Cloud Workspace",
    client: "Strata Intelligence",
    category: "UI/UX",
    year: "2024",
    description:
      "Enterprise AI workspace interface powering autonomous workflow automation and prompt orchestrations.",
    metric: "4.9/5",
    metricLabel: "User Satisfaction",
    tags: ["Enterprise UI", "Design System", "AI Nodes", "SaaS UX"],
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    icon: "⚡",
    overview:
      "Strata AI turns multi-model AI agent prompts into visual drag-and-drop workflow graphs for enterprise engineering teams.",
    challenge:
      "Simplifying complex LLM prompt node graphs and asynchronous API chain execution states into clean visual cards.",
    solution:
      "Designed a modular node-graph builder with inline prompt debugging, real-time node logs, and custom node themes.",
    deliverables: ["UX Research", "Figma Components", "Interactive Prototype", "Front-end Spec"],
    techStack: ["Figma", "React Flow", "TailwindCSS", "Framer Motion"],
    liveUrl: "https://zerocraft.in",
  },
  {
    id: "solaris-3d",
    title: "Solaris EV Configurator",
    client: "Solaris Mobility",
    category: "AI/3D",
    year: "2024",
    description:
      "Immersive 3D interactive car customizer with real-time ray-traced lighting and instant checkout.",
    metric: "3.8x",
    metricLabel: "Conversion Increase",
    tags: ["Three.js", "WebGL", "3D Customizer", "Next.js"],
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    icon: "🏎️",
    overview:
      "Solaris Mobility commissioned a hyper-realistic web configurator allowing luxury electric car buyers to customize their vehicle online.",
    challenge:
      "Achieving photorealistic metallic paint reflection and interior fabric textures directly inside standard mobile web browsers.",
    solution:
      "Optimized 3D CAD models into compressed WebGL GLTF files with dynamic environment lighting and WebGPU shaders.",
    deliverables: ["3D Modeling", "Interactive WebGL App", "Customizer UX", "E-Commerce Sync"],
    techStack: ["Three.js", "React Three Fiber", "GLSL Shaders", "Next.js"],
    liveUrl: "https://zerocraft.in",
  },
  {
    id: "zenith-ecom",
    title: "Zenith Luxury Commerce",
    client: "Zenith Timepieces",
    category: "Web App",
    year: "2023",
    description:
      "Bespoke e-commerce experience for high-end luxury mechanical timepieces with interactive AR try-on.",
    metric: "$12M+",
    metricLabel: "GMV Processed",
    tags: ["Shopify Plus", "Next.js", "Headless E-Com", "AR"],
    gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    icon: "⌚",
    overview:
      "Zenith needed a ultra-fast headless e-commerce store reflecting the timeless precision of handcrafted Swiss watches.",
    challenge:
      "Ensuring sub-second page loading speeds while hosting high-resolution 4K product galleries and AR models.",
    solution:
      "Architected a headless Shopify store powered by Next.js App Router, edge image optimization, and instant cart mutation.",
    deliverables: ["Headless E-Commerce", "UX Design", "Custom Checkout", "AR Watch Viewer"],
    techStack: ["Next.js", "Shopify Storefront API", "Tailwind", "Framer Motion"],
    liveUrl: "https://zerocraft.in",
  },
];

const categories = ["All", "Web App", "Mobile App", "Branding", "UI/UX", "AI/3D"] as const;

export default function WorksPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects =
    activeCategory === "All"
      ? projectsData
      : projectsData.filter((p) => p.category === activeCategory);

  return (
    <div className="works-page">
      {/* Background blobs */}
      <div className="works-bg-glows">
        <motion.div
          className="works-glow works-glow-1"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="works-glow works-glow-2"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Hero Header */}
      <section className="works-hero">
        <div className="works-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="works-hero-content"
          >
            <div className="works-badge">
              <Sparkles size={14} className="works-badge-icon" />
              <span>Selected Works & Case Studies</span>
            </div>

            <h1 className="works-title">
              Crafting <span className="text-accent">Digital Breakthroughs</span>
            </h1>

            <p className="works-subtitle">
              Explore how we partner with ambitious companies to design, build, and scale world-class digital products and brand experiences.
            </p>

            {/* Stats Counter Bar */}
            <div className="works-stats-bar">
              <div className="works-stat-item">
                <span className="works-stat-num">45+</span>
                <span className="works-stat-lbl">Projects Delivered</span>
              </div>
              <div className="works-stat-divider" />
              <div className="works-stat-item">
                <span className="works-stat-num">99.4%</span>
                <span className="works-stat-lbl">Client Satisfaction</span>
              </div>
              <div className="works-stat-divider" />
              <div className="works-stat-item">
                <span className="works-stat-num">14</span>
                <span className="works-stat-lbl">Industry Awards</span>
              </div>
              <div className="works-stat-divider" />
              <div className="works-stat-item">
                <span className="works-stat-num">$80M+</span>
                <span className="works-stat-lbl">Client Capital Raised</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="works-filter-section">
        <div className="works-container">
          <div className="works-filter-bar">
            <div className="works-filter-label">
              <Filter size={16} />
              <span>Filter by:</span>
            </div>
            <div className="works-filter-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`works-filter-pill ${
                    activeCategory === cat ? "active" : ""
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <main className="works-main">
        <div className="works-container">
          <motion.div layout className="works-grid">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className="works-card-wrapper"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="works-card">
                    {/* Visual Banner Header */}
                    <div
                      className="works-card-banner"
                      style={{ background: project.gradient }}
                    >
                      <span className="works-card-icon">{project.icon}</span>
                      <div className="works-card-category">{project.category}</div>
                      <div className="works-card-year">{project.year}</div>
                    </div>

                    {/* Content */}
                    <div className="works-card-body">
                      <div className="works-card-client">{project.client}</div>
                      <h3 className="works-card-title">{project.title}</h3>
                      <p className="works-card-desc">{project.description}</p>

                      {/* Highlight Metric */}
                      <div className="works-card-metric">
                        <div className="works-metric-val">{project.metric}</div>
                        <div className="works-metric-lbl">{project.metricLabel}</div>
                      </div>

                      {/* Tags */}
                      <div className="works-card-tags">
                        {project.tags.map((t) => (
                          <span key={t} className="works-tag">
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Action Link */}
                      <button className="works-card-btn">
                        <span>Explore Case Study</span>
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Case Study Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            className="works-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              className="works-modal-content"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="works-modal-close"
                onClick={() => setSelectedProject(null)}
              >
                <X size={20} />
              </button>

              {/* Modal Banner */}
              <div
                className="works-modal-banner"
                style={{ background: selectedProject.gradient }}
              >
                <div className="modal-banner-content">
                  <span className="modal-icon">{selectedProject.icon}</span>
                  <div className="modal-badges">
                    <span className="modal-badge">{selectedProject.category}</span>
                    <span className="modal-badge">{selectedProject.year}</span>
                  </div>
                  <h2 className="modal-title">{selectedProject.title}</h2>
                  <p className="modal-client">Client: {selectedProject.client}</p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="works-modal-body">
                {/* Metric Box */}
                <div className="modal-metric-card">
                  <div className="modal-metric-big">{selectedProject.metric}</div>
                  <div className="modal-metric-sub">{selectedProject.metricLabel}</div>
                </div>

                {/* Grid info */}
                <div className="modal-sections-grid">
                  <div className="modal-section">
                    <h4>Overview</h4>
                    <p>{selectedProject.overview}</p>
                  </div>

                  <div className="modal-section">
                    <h4>The Challenge</h4>
                    <p>{selectedProject.challenge}</p>
                  </div>

                  <div className="modal-section">
                    <h4>Our Solution</h4>
                    <p>{selectedProject.solution}</p>
                  </div>
                </div>

                {/* Deliverables & Tech Stack */}
                <div className="modal-details-row">
                  <div className="modal-details-box">
                    <h4>Key Deliverables</h4>
                    <ul>
                      {selectedProject.deliverables.map((item) => (
                        <li key={item}>
                          <CheckCircle size={16} className="modal-check-icon" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="modal-details-box">
                    <h4>Technology Stack</h4>
                    <div className="modal-tech-chips">
                      {selectedProject.techStack.map((tech) => (
                        <span key={tech} className="modal-tech-chip">
                          <Code2 size={14} />
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="modal-footer-cta">
                  <Link
                    href="/create-project"
                    className="modal-start-btn"
                    onClick={() => setSelectedProject(null)}
                  >
                    <Sparkles size={18} />
                    <span>Build Something Similar</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Call-to-action Section */}
      <section className="works-cta-section">
        <div className="works-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="works-cta-card"
          >
            <h2 className="works-cta-title">
              Have an ambitious project <span className="text-accent">in mind?</span>
            </h2>
            <p className="works-cta-desc">
              Let's create an unforgettable digital product together. Tell us about your vision.
            </p>
            <Link href="/create-project" className="works-cta-button">
              <Sparkles size={18} />
              <span>Start Your Project</span>
              <ArrowUpRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
