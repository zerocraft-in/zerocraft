"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IconChevronLeft, IconUsers } from "@tabler/icons-react";

export function UsersPageHeader({ title, actions, back = false }: { title: string; actions?: ReactNode; back?: boolean }) {
  const anchor = useRef<HTMLElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(anchor.current?.closest<HTMLElement>("[data-studio-scroll]") || null);
  }, []);

  return <header ref={anchor} className="users-page-header">
    <h1>{title}</h1>
    {container && createPortal(<div className="users-page-actions">
      {back && <Link href="/settings/users" className="users-back-link"><span className="users-back-icon"><IconChevronLeft size={16} /></span><IconUsers size={16} /><span>Users</span></Link>}
      <div className="users-actions-group">{actions}</div>
    </div>, container)}
  </header>;
}
