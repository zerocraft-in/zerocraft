"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SETTINGS_LINKS } from "./settings-sidebar";
import { IconSettings } from "@tabler/icons-react";

export function SettingsScrollHeader() {
  const pathname = usePathname();
  const anchor = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = anchor.current?.closest<HTMLElement>("[data-studio-scroll]");
    if (!container) return;
    const update = () => {
      const heading = container.querySelector("[data-studio-content] h1");
      setTitle(heading?.textContent?.trim() || "Settings");
      setVisible(Boolean(heading && heading.getBoundingClientRect().bottom <= container.getBoundingClientRect().top));
    };
    update();
    container.addEventListener("scroll", update, { passive: true });
    const observer = new MutationObserver(update);
    observer.observe(container.querySelector("[data-studio-content]") || container, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    const Icon = SETTINGS_LINKS.find(([label]) => label === title)?.[2] || IconSettings;
  return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [pathname]);

  const Icon = SETTINGS_LINKS.find(([label]) => label === title)?.[2] || IconSettings;
  return (
    <div ref={anchor} className="sticky top-0 z-30 h-0" aria-hidden={!visible}>
      <div className={`flex h-12 items-center gap-3 border-b bg-background px-5 text-xs font-medium transition-opacity duration-150 motion-reduce:transition-none ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <Icon className="size-4 shrink-0" stroke={1.7} aria-hidden="true" />
        <span className="truncate">{title}</span>
      </div>
    </div>
  );
}
