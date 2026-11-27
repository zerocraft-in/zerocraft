"use client";

import { useEffect } from "react";

export default function LeadTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const source = Object.fromEntries(keys.flatMap((key) => {
      const value = params.get(key);
      return value ? [[key, value]] : [];
    }));
    if (Object.keys(source).length) {
      window.localStorage.setItem("zerocraft_attribution", JSON.stringify({ ...source, first_seen: new Date().toISOString() }));
    }
  }, []);

  return null;
}
