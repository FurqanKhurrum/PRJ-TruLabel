"use client";

import { useEffect } from "react";
import { applyTheme, getTheme, subscribeTheme } from "@/lib/theme";

export default function ThemeProvider() {
  useEffect(() => {
    applyTheme(getTheme());
    const unsubscribe = subscribeTheme(() => applyTheme(getTheme()));
    return unsubscribe;
  }, []);

  return null;
}
