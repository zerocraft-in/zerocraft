"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";

import { useReveal } from "@/lib/use-reveal";

export function AuthShell({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <div className="account-shell">
      <main className="auth-main">
        <div ref={ref} className={`auth-card ${className ?? ""}`}>
          {children}
        </div>
      </main>
      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Zerocraft</span>
        <span className="auth-footer-links">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
