import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: `دليل الاستخدام — ${BRAND.platform}`,
};

const LOGIN = 'https://rakeza-moj-assistant.vercel.app/login';

const STEPS = [
  {
    n: '١',
    title: 'تسجيل الدخول',
    body: 'تسجيل الدخول عبر البريد المؤسسي @moj.gov.sa للوصول التلقائي للوحدة التنظيمية.',
  },
  {
    n: '٢',
    title: 'استكشاف لوحة التحكم والهيكل',
    body: 'استكشاف لوحة التحكم والهيكل: مساحة العمل، المهام المسندة، الوحدة التنظيمية.',
  },
  {
    n: '٣',
    title: 'إدارة المهام والتكاليف',
    body: 'إدارة المهام والتكاليف: إسناد التكاليف، متابعة الإنجاز، تحديث التنبيهات.',
  },
  {
    n: '٤',
    title: 'قائمة إدارة القسم',
    body: 'قائمة إدارة القسم (للمدراء/رؤساء الأقسام): أداء الموظفين، الصلاحيات، التقارير الدورية.',
  },
];

export default function GuidePage() {
  return (
    <div
      className="min-h-screen text-[#f5f8f6]"
      dir="rtl"
      style={{ background: 'linear-gradient(165deg, #0a1210 0%, #0d1f18 45%, #12241e 100%)' }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #0a1210 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <header className="border-b border-[#C5A059]/40 bg-[#006C35]/90 backdrop-blur sticky top-0 z-10 no-print">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/brand/moj-logo-gold.png" alt="" className="w-10 h-10 object-contain rounded-lg bg-white/95 p-0.5" />
            <div>
              <div className="font-bold text-sm text-[#C5A059]">دليل الاستخدام</div>
              <div className="text-[11px] text-white/70">{BRAND.platform}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/guide"
              className="rounded-xl bg-[#006C35] border border-[#C5A059] text-[#C5A059] px-3 py-1.5 text-sm font-medium hover:bg-[#007a3c] transition"
            >
              تحميل PDF
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/50 text-[#C5A059] px-3 py-1.5 text-sm hover:bg-[#C5A059]/25 transition"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <img
            src="/brand/moj-logo-gold.png"
            alt="شعار وزارة العدل"
            className="mx-auto w-24 h-24 object-contain rounded-2xl bg-white/95 p-2 shadow-[0_0_28px_rgba(197,160,89,0.35)]"
          />
          <p className="text-[#C5A059] text-sm">{BRAND.kingdom}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{BRAND.platform}</h1>
          <p className="text-white/60 text-sm">{BRAND.court}</p>
          <p className="text-lg text-[#C5A059] font-medium">دليل الاستخدام لأول مرة</p>
        </div>

        <section className="rounded-2xl border border-[#C5A059]/35 bg-[#12241e]/90 p-5 sm:p-6 space-y-3">
          <h2 className="text-[#C5A059] font-bold text-lg">نبذة عن المنصة</h2>
          <p className="leading-8 text-white/90">
            منصة ركيزة: منصة إدارية وقضائية مؤتمتة لتنظيم وتتبع سائر المعاملات والتكاليف بين جميع القيادات
            والوحدات التنظيمية بالمحكمة العمالية بالرياض.
          </p>
          <p className="leading-8 text-white/70">
            الهدف: أتمتة تدفق العمليات، حوكمة تسلسل الصلاحيات والهيكل التنظيمي، وتسريع إنجاز المهام مع رفع
            مستويات الشفافية ومراقبة الأداء.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[#C5A059] font-bold text-lg px-1">خطوات البدء لأول مرة</h2>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="rounded-2xl border border-white/10 bg-[#12241e]/80 p-4 flex gap-3 items-start"
              >
                <span className="shrink-0 w-9 h-9 rounded-full bg-[#006C35] border border-[#C5A059] text-[#C5A059] flex items-center justify-center font-bold">
                  {s.n}
                </span>
                <div>
                  <div className="font-semibold text-[#C5A059] mb-1">{s.title}</div>
                  <p className="text-sm leading-7 text-white/85">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-[#C5A059]/40 bg-[#12241e] p-6 text-center space-y-4">
          <h2 className="text-[#C5A059] font-bold text-lg">الوصول السريع</h2>
          <a
            href={LOGIN}
            className="inline-flex items-center justify-center rounded-2xl bg-[#006C35] border-2 border-[#C5A059] text-[#C5A059] px-8 py-3.5 text-base font-bold hover:bg-[#007a3c] transition shadow-lg"
          >
            تسجيل الدخول الآن
          </a>
          <p className="text-xs text-white/50 dir-ltr" dir="ltr">
            {LOGIN}
          </p>
          <div className="flex flex-wrap justify-center gap-3 no-print pt-2">
            <a
              href="/api/guide"
              className="rounded-xl border border-[#C5A059]/50 text-[#C5A059] px-4 py-2 text-sm hover:bg-[#C5A059]/10 transition"
            >
              تحميل PDF
            </a>
            <a
              href="/Rakiza_User_Guide.pdf"
              className="rounded-xl border border-white/20 text-white/70 px-4 py-2 text-sm hover:bg-white/5 transition"
            >
              نسخة ثابتة
            </a>
          </div>
        </section>

        <p className="text-center text-xs text-white/40 pb-8">
          {BRAND.footer} · {BRAND.court}
        </p>
      </main>
    </div>
  );
}
