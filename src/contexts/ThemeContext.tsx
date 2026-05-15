"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LIGHT, DARK, type Theme } from "@/lib/theme";

interface ThemeCtx { theme: Theme; isDark: boolean; toggle: () => void; }

const ThemeContext = createContext<ThemeCtx>({ theme: LIGHT, isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem("dark-mode") === "true");
  }, []);

  const toggle = () => setIsDark((v) => {
    localStorage.setItem("dark-mode", String(!v));
    return !v;
  });

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
