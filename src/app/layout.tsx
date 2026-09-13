import type { Metadata, Viewport } from 'next';
import { Amiri, Cairo, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic, Scheherazade_New } from 'next/font/google';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import ThemeProvider from '@/components/ThemeProvider';

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  variable: '--font-amiri',
  weight: ['400', '700'],
  display: 'swap',
});

const scheherazade = Scheherazade_New({
  subsets: ['arabic'],
  variable: '--font-scheherazade',
  weight: ['400', '700'],
  display: 'swap',
});

const ibmPlex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-ibm-plex-ar',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ركيزة — مكتبة المخاطبات والتعاميم',
  description: 'ركيزة — مكتبة المخاطبات والتعاميم — المحكمة العمالية بالرياض — v5.0.0',
  manifest: '/manifest.json',
  icons: { icon: '/logo.svg' },
};

export const viewport: Viewport = {
  themeColor: '#006C35',
};

const themeBoot = `(function(){try{var t=localStorage.getItem('rakeeza-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${notoNaskh.variable} ${amiri.variable} ${scheherazade.variable} ${ibmPlex.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <style>{`
          .font-arabic { font-family: var(--font-noto-naskh), "Noto Naskh Arabic", Tahoma, serif; }
          :root {
            --font-amiri-stack: var(--font-amiri), "Amiri", "Traditional Arabic", serif;
            --font-scheherazade-stack: var(--font-scheherazade), "Scheherazade New", "Sakkal Majalla", serif;
            --font-ibm-stack: var(--font-ibm-plex-ar), "IBM Plex Sans Arabic", Tahoma, sans-serif;
            --font-cairo-stack: var(--font-cairo), "Cairo", Tahoma, sans-serif;
          }
        `}</style>
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
