import type { Metadata, Viewport } from 'next';
import { Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import ThemeProvider from '@/components/ThemeProvider';

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'rakeza-moj-assistant — ركيزة للمكاتبات والنماذج القضائية',
  description: 'rakeza-moj-assistant — منصة ركيزة للمكاتبات والنماذج القضائية — v5.0.0',
  manifest: '/manifest.json',
  icons: { icon: '/logo.svg' },
};

export const viewport: Viewport = {
  themeColor: '#006C35',
};

const themeBoot = `(function(){try{var t=localStorage.getItem('rakeeza-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={notoNaskh.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="font-arabic antialiased">
        <ThemeProvider>
          <PwaRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
