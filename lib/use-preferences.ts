"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  clearPreferences,
  loadPreferences,
  savePreferences,
  type Preferences
} from "@/lib/preferences";

const EVENT_NAME = "infracis:preferences";

/**
 * Cookie-backed preferences shared by every component on the page.
 * The first render uses defaults (so server and client markup match); the
 * saved values are applied right after hydration.
 */
export function usePreferences(): {
  prefs: Preferences;
  ready: boolean;
  update: (patch: Partial<Preferences>) => boolean;
  reset: () => void;
} {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setReady(true);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Preferences>).detail;
      if (detail) setPrefs(detail);
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    // Always merge into the latest cookie so two components never overwrite each other.
    const next: Preferences = { ...loadPreferences(), ...patch };
    const saved = next.remember ? savePreferences(next) : savePreferences({ ...DEFAULT_PREFERENCES, remember: false });
    setPrefs(next);
    window.dispatchEvent(new CustomEvent<Preferences>(EVENT_NAME, { detail: next }));
    return saved;
  }, []);

  const reset = useCallback(() => {
    clearPreferences();
    const fresh = { ...DEFAULT_PREFERENCES };
    setPrefs(fresh);
    window.dispatchEvent(new CustomEvent<Preferences>(EVENT_NAME, { detail: fresh }));
  }, []);

  return { prefs, ready, update, reset };
}
