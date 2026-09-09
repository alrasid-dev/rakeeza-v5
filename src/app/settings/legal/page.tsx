import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { currentUser } from '@/lib/server-user';

export const dynamic = 'force-dynamic';

const LINKS = [
  { href: 'https://www.moj.gov.sa', label: 'موقع وزارة العدل' },
  { href: 'https://www.moj.gov.sa/ar/Ministry/Versions/Pages/default.aspx', label: 'الأنظمة واللوائح (moj.gov.sa)' },
  { href: 'https://laws.moj.gov.sa', label: 'بوابة الأنظمة (إن توفرت)' },
];

export default async function LegalSettingsPage() {
  const user = await currentUser();

  return (
    <AppShell user={user}>
      <PageHeader title="المراجع النظامية" subtitle="روابط رسمية من moj.gov.sa فقط — لا محتوى مخترع" />
      <div className="space-y-4 max-w-4xl">
        <ul className="bg-white border rounded-xl divide-y">
          {LINKS.map((l) => (
            <li key={l.href} className="p-3">
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-moj-green underline">
                {l.label}
              </a>
              <div className="text-xs text-gray-400" dir="ltr">{l.href}</div>
            </li>
          ))}
        </ul>
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="bg-moj-light px-3 py-2 text-sm text-moj-green">معاينة موقع وزارة العدل</div>
          <iframe
            title="moj"
            src="https://www.moj.gov.sa"
            className="w-full h-[480px] border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-xs text-gray-500">
          نص التعميم الرسمي في النظام فارغ عمداً — يُستكمل من المصادر الرسمية فقط.
        </p>
      </div>
    </AppShell>
  );
}
