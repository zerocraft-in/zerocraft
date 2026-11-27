import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Handshake,
  LogOut,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { getPublicAuthConfig } from "@/lib/auth/config";
import { getOptionalUser } from "@/lib/auth/session";


export const metadata: Metadata = {
  title: "Zerocraft Accounts",
};

export const dynamic = "force-dynamic";

type Destination = {
  key: string;
  name: string;
  description: string;
  href: string | null;
  status: string;
  icon: LucideIcon;
};

function Brand() {
  return (
    <span className="ac-brand">
      <span className="ac-mark" aria-hidden="true">
        Z
      </span>
      <span className="ac-brand-text">
        <b>Zerocraft</b>
        <small>Accounts</small>
      </span>
    </span>
  );
}

function DestinationRow({ destination }: { destination: Destination }) {
  const Icon = destination.icon;
  const isOpen = Boolean(destination.href);

  const content = (
    <>
      <span className="ac-row-icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="ac-row-body">
        <span className="ac-row-head">
          <span className="ac-row-name">{destination.name}</span>
          <span className={isOpen ? "ac-badge ac-badge-open" : "ac-badge"}>
            {destination.status}
          </span>
        </span>
        <span className="ac-row-desc">{destination.description}</span>
      </span>
      {isOpen ? (
        <ArrowRight className="ac-row-arrow" size={16} aria-hidden="true" />
      ) : (
        <span className="ac-soon">Soon</span>
      )}
    </>
  );

  return (
    <li>
      {destination.href ? (
        <a href={destination.href} className="ac-row">
          {content}
        </a>
      ) : (
        <div className="ac-row ac-row-disabled" aria-disabled="true">
          {content}
        </div>
      )}
    </li>
  );
}

export default async function AccountsHomePage() {
  const [user, config] = await Promise.all([
    getOptionalUser(),
    Promise.resolve(getPublicAuthConfig()),
  ]);

  const workspaceHref = user
    ? `${config.adminOrigin}/auth/start?returnTo=${encodeURIComponent("/dashboard")}`
    : `/login?next=${encodeURIComponent(`${config.adminOrigin}/dashboard`)}`;

  const destinations: Destination[] = [
    {
      key: "workspace",
      name: "Your workspace",
      description: "Products, orders, customers and your storefront.",
      href: workspaceHref,
      status: "Open",
      icon: PanelsTopLeft,
    },
    {
      key: "partners",
      name: "Zerocraft Partners",
      description: "Partner programs, referrals and payouts.",
      href: config.partnersUrl,
      status: config.partnersUrl ? "Open" : "Coming soon",
      icon: Handshake,
    },
    {
      key: "community",
      name: "Zerocraft Community",
      description: "Events, conversations and the builder network.",
      href: config.communityUrl,
      status: config.communityUrl ? "Open" : "Coming soon",
      icon: Users,
    },
  ];

  return (
    <div className="ac-shell">
      <header className="ac-header">
        <Link href="/" aria-label="Zerocraft Accounts home" className="ac-home">
          <Brand />
        </Link>

        {user ? (
          <span className="ac-pill" >
            {user.email}
          </span>
        ) : (
          <Link href="/login" className="ac-link-btn">
            Log in
          </Link>
        )}
      </header>

      <main className="ac-main">
        <div className="ac-col">
          <h1 className="ac-title">
            Welcome to Zerocraft
            <span>One account for everything you build</span>
          </h1>

          <ul className="ac-list">
            {destinations.map((destination) => (
              <DestinationRow key={destination.key} destination={destination} />
            ))}
          </ul>

          {user ? (
            <div className="ac-session">
              <p className="ac-session-text">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>
                  Signed in as <b>{user.email}</b>
                </span>
              </p>
              <form action="/logout" method="post">
                <button type="submit" className="ac-signout">
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="ac-guest">
              <Link href="/login" className="ac-btn">
                Log in
              </Link>
              <p className="ac-note">
                New to Zerocraft? Enter your email on the sign-in page to
                create your account.
              </p>
            </div>
          )}

          <p className="ac-secure">Secured by Zerocraft · accounts.zerocraft.in</p>
        </div>
      </main>

      <footer className="ac-footer">
        <span>© {new Date().getFullYear()} Zerocraft</span>
        <span>One account · every product</span>
      </footer>
    </div>
  );
}