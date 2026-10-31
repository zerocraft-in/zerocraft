"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; section: "Create" | "Navigation" };

export function useStudioCommandSearch(navigationLinks: readonly Omit<SearchItem, "section">[], quickActions: readonly Omit<SearchItem, "section">[]) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchResults = useMemo<SearchItem[]>(() => [
    ...quickActions.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).map((item) => ({ ...item, section: "Create" as const })),
    ...navigationLinks.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).map((item) => ({ ...item, section: "Navigation" as const })),
  ], [navigationLinks, quickActions, query]);
  const openSearch = () => { setQuery(""); setActiveSearchIndex(0); setSearchOpen(true); };
  const goToSearchResult = (href: string) => { router.push(href); setSearchOpen(false); setQuery(""); };
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!searchResults.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveSearchIndex((index) => (index + 1) % searchResults.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveSearchIndex((index) => index === 0 ? searchResults.length - 1 : index - 1); }
    else if (event.key === "Enter") { event.preventDefault(); goToSearchResult(searchResults[activeSearchIndex].href); }
  };
  return { searchOpen, setSearchOpen, query, setQuery, activeSearchIndex, setActiveSearchIndex, searchResults, openSearch, goToSearchResult, handleSearchKeyDown };
}
