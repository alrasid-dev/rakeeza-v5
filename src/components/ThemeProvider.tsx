'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx>({ theme: 'light', toggle: () => {}, setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('rakeeza-theme') as Theme | null) || null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const t = saved || preferred;
    setThemeState(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    setReady(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('rakeeza-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return <ThemeCtx.Provider value={{ theme: ready ? theme : 'light', toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}
