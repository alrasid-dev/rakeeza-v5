'use client';

import { useTheme } from './ThemeProvider';
import { IconMoon, IconSun } from './Icons';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition ${
        dark
          ? 'border-white/20 bg-white/5 text-moj-gold hover:bg-white/10'
          : 'border-moj-green/20 bg-white text-moj-green hover:bg-moj-light'
      } ${className}`}
      aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
