import { useCallback, useEffect, useState } from "react";

const KEY = "ecobot_theme";

// Nilai awal dibaca dari class <html> yang sudah di-set oleh script di index.html (tanpa kilatan)
const readInitial = () => (document.documentElement.classList.contains("light") ? "light" : "dark");

const useTheme = () => {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    const isLight = theme === "light";
    root.classList.toggle("light", isLight);
    root.classList.toggle("dark", !isLight);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // storage tidak tersedia
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return { theme, toggle };
};

export default useTheme;
