"use client";

import * as React from "react";
import {
  type PublicAppearance,
  DEFAULT_APPEARANCE,
  APPEARANCE_EVENT_NAME,
  APPEARANCE_CHANNEL_NAME,
  APPEARANCE_STORAGE_KEY,
  ensureGoogleFontsLoaded,
  applyAppearanceToDOM,
  broadcastAppearanceUpdate,
} from "@/lib/studio-appearance";

type AppearanceContextValue = {
  appearance: PublicAppearance;
  setAppearance: React.Dispatch<React.SetStateAction<PublicAppearance>>;
  updateAppearance: (partial: Partial<PublicAppearance>) => void;
  broadcastAppearance: (next: PublicAppearance) => void;
};

const StudioAppearanceContext = React.createContext<AppearanceContextValue | null>(null);

export function StudioAppearanceProvider({
  initialAppearance,
  children,
}: {
  initialAppearance?: PublicAppearance;
  children: React.ReactNode;
}) {
  const [appearance, setAppearance] = React.useState<PublicAppearance>(
    initialAppearance ?? DEFAULT_APPEARANCE
  );

  // Apply to DOM and load Google Fonts on initial mount and state change
  React.useEffect(() => {
    ensureGoogleFontsLoaded();
    applyAppearanceToDOM(appearance);
  }, [appearance]);

  // Synchronize with external updates (other tabs, settings saves, system theme changes)
  React.useEffect(() => {
    ensureGoogleFontsLoaded();

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<PublicAppearance>;
      if (customEvent.detail) {
        setAppearance(customEvent.detail);
        applyAppearanceToDOM(customEvent.detail);
      }
    };

    window.addEventListener(APPEARANCE_EVENT_NAME, handleCustomEvent);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(APPEARANCE_CHANNEL_NAME);
      channel.onmessage = (messageEvent) => {
        if (messageEvent.data) {
          setAppearance(messageEvent.data);
          applyAppearanceToDOM(messageEvent.data);
        }
      };
    } catch {}

    const handleStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as PublicAppearance;
          setAppearance(parsed);
          applyAppearanceToDOM(parsed);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);

    // Watch OS system theme change if in system theme mode
    let mediaQuery: MediaQueryList | null = null;
    const handleMediaChange = () => {
      if (appearance.themeMode === "system") {
        applyAppearanceToDOM(appearance);
      }
    };

    if (window.matchMedia) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      window.removeEventListener(APPEARANCE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
      if (mediaQuery) mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [appearance]);

  const updateAppearance = React.useCallback(
    (partial: Partial<PublicAppearance>) => {
      setAppearance((current) => {
        const next = { ...current, ...partial };
        applyAppearanceToDOM(next);
        return next;
      });
    },
    []
  );

  const broadcastAppearance = React.useCallback((next: PublicAppearance) => {
    setAppearance(next);
    broadcastAppearanceUpdate(next);
  }, []);

  const value = React.useMemo(
    () => ({
      appearance,
      setAppearance,
      updateAppearance,
      broadcastAppearance,
    }),
    [appearance, updateAppearance, broadcastAppearance]
  );

  return (
    <StudioAppearanceContext.Provider value={value}>
      {children}
    </StudioAppearanceContext.Provider>
  );
}

export function useStudioAppearance(): AppearanceContextValue {
  const context = React.useContext(StudioAppearanceContext);
  if (!context) {
    return {
      appearance: DEFAULT_APPEARANCE,
      setAppearance: () => {},
      updateAppearance: () => {},
      broadcastAppearance: () => {},
    };
  }
  return context;
}
