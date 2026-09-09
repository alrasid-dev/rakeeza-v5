import type { Metadata, Viewport } from 'next';
import { Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-naskh',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ركيزة للمكاتبات والنماذج القضائية',
  description: 'منصة المكاتبات والنماذج القضائية — المحكمة العمالية بالرياض — v5.0.0',
  manifest: '/manifest.json',
  icons: { icon: '/logo.svg' },
};

export const viewport: Viewport = {
  themeColor: '#006C35',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={notoNaskh.variable}>
      <body className="font-arabic antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
