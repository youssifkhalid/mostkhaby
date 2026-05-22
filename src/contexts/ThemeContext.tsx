import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { THEMES as themeList, type ThemeId } from "@/lib/themes";

type ThemeMode = "dark" | "light";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
  themes: typeof themeList;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  previewTheme: (id: ThemeId | null) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  toggleMode: () => {},
  themes: themeList,
  themeId: themeList[0]?.id as ThemeId,
  setThemeId: () => {},
  previewTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mstkhbi-mode") as ThemeMode) || "dark";
  });

  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return themeList[0]?.id as ThemeId;
    return ((localStorage.getItem("mstkhbi-theme") as ThemeId) || themeList[0]?.id) as ThemeId;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    localStorage.setItem("mstkhbi-mode", mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-mstkhbi-theme", themeId);
    localStorage.setItem("mstkhbi-theme", themeId);
  }, [themeId]);

  const setMode = (m: ThemeMode) => setModeState(m);
  const toggleMode = () => setModeState(prev => prev === "dark" ? "light" : "dark");

  const setThemeId = useCallback((id: ThemeId) => setThemeIdState(id), []);
  const previewTheme = useCallback((id: ThemeId | null) => {
    const root = document.documentElement;
    if (id) root.setAttribute("data-mstkhbi-theme-preview", id);
    else root.removeAttribute("data-mstkhbi-theme-preview");
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode, themes: themeList, themeId, setThemeId, previewTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
