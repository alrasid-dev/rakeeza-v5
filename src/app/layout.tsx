import type { Metadata, Viewport } from 'next';
import {
  Almarai,
  Amiri,
  Cairo,
  Changa,
  El_Messiri,
  Harmattan,
  IBM_Plex_Sans_Arabic,
  Lateef,
  Mada,
  Markazi_Text,
  Noto_Kufi_Arabic,
  Noto_Naskh_Arabic,
  Readex_Pro,
  Reem_Kufi,
  Rubik,
  Scheherazade_New,
  Tajawal,
} from 'next/font/google';
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

const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  weight: ['400', '500', '700'],
  display: 'swap',
});

const lateef = Lateef({
  subsets: ['arabic'],
  variable: '--font-lateef',
  weight: ['400', '700'],
  display: 'swap',
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-kufi',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const reemKufi = Reem_Kufi({
  subsets: ['arabic'],
  variable: '--font-reem-kufi',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const changa = Changa({
  subsets: ['arabic'],
  variable: '--font-changa',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const almarai = Almarai({
  subsets: ['arabic'],
  variable: '--font-almarai',
  weight: ['400', '700'],
  display: 'swap',
});

const elMessiri = El_Messiri({
  subsets: ['arabic', 'latin'],
  variable: '--font-el-messiri',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const markazi = Markazi_Text({
  subsets: ['arabic', 'latin'],
  variable: '--font-markazi',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const harmattan = Harmattan({
  subsets: ['arabic', 'latin'],
  variable: '--font-harmattan',
  weight: ['400', '700'],
  display: 'swap',
});

const readex = Readex_Pro({
  subsets: ['arabic', 'latin'],
  variable: '--font-readex',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const rubik = Rubik({
  subsets: ['arabic', 'latin'],
  variable: '--font-rubik',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const mada = Mada({
  subsets: ['arabic', 'latin'],
  variable: '--font-mada',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ركيزة — مكتبة المخاطبات والتعاميم',
  description: 'ركيزة — مكتبة المخاطبات والتعاميم — المحكمة العمالية بالرياض — v5.0.0',
  manifest: '/manifest.json',
  icons: { icon: [{ url: '/brand/moj-icon-64.png', type: 'image/png', sizes: '64x64' }, { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' }] },
};

export const viewport: Viewport = {
  themeColor: '#006C35',
};

const themeBoot = `(function(){try{var t=localStorage.getItem('rakeeza-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

const fontVars = [
  notoNaskh.variable,
  amiri.variable,
  scheherazade.variable,
  ibmPlex.variable,
  cairo.variable,
  tajawal.variable,
  lateef.variable,
  notoKufi.variable,
  reemKufi.variable,
  changa.variable,
  almarai.variable,
  elMessiri.variable,
  markazi.variable,
  harmattan.variable,
  readex.variable,
  rubik.variable,
  mada.variable,
].join(' ');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={fontVars}
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
            --font-tajawal-stack: var(--font-tajawal), "Tajawal", Tahoma, sans-serif;
            --font-lateef-stack: var(--font-lateef), "Lateef", serif;
            --font-noto-kufi-stack: var(--font-noto-kufi), "Noto Kufi Arabic", sans-serif;
            --font-reem-kufi-stack: var(--font-reem-kufi), "Reem Kufi", sans-serif;
            --font-changa-stack: var(--font-changa), "Changa", sans-serif;
            --font-almarai-stack: var(--font-almarai), "Almarai", sans-serif;
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
