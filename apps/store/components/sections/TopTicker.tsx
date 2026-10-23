"use client";

import { useState } from "react";

export default function TopTicker() {
  const t = "★ First day first show  ★ Free shipping above ₹999  ★ Tamil + Malayalam drops weekly  ★ Code FIRSTSHOW10 for 10% off  ";
  const [paused, setPaused] = useState(false);
  return (
    <div className="announcement-ticker storefront-mono" role="region" aria-label="Store announcements">
      <div className={paused ? "is-paused" : undefined} aria-hidden="true">{t.repeat(2)}</div>
      <button type="button" className="announcement-ticker__control" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? "Resume announcements" : "Pause announcements"}>{paused ? "Play" : "Pause"}</button>
    </div>
  );
}
