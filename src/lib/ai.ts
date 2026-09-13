import { polishLegalStyle, polishSpelling, proofreadReport } from '@/lib/arabic-polish';

export type AiAction = { label: string; href: string };

export type AssistResult = {
  source: 'openai' | 'local';
  text: string;
  actions?: AiAction[];
};

function platformHelp(prompt: string): AssistResult | null {
  const p = prompt.trim();
  const actions: AiAction[] = [];
  const tips: string[] = [];

  const add = (label: string, href: string) => {
    if (!actions.some((a) => a.href === href)) actions.push({ label, href });
  };

  if (/مستند|مكاتبة|خطاب|نموذج جديد|إنشاء/.test(p)) {
    tips.push(
      'لإنشاء مكاتبة: من الشريط الجانبي افتح «النماذج» واختر النوع، أو اضغط «مستند جديد».',
      'يمكنك لصق النص بالكامل ليُوزَّع على الحقول تلقائياً، ثم حفظ مسودة أو إصدار برقم صادر.',
    );
    add('مستند جديد', '/documents/new');
    add('قائمة النماذج', '/templates');
  }
  if (/قالب|قوالب|مكتبة|هوية|توقيع|غلاف|دراسة شكوى/.test(p)) {
    tips.push('القوالب الفارغة بهوية الوزارة موجودة تحت «المكتبة → القوالب»، بما فيها دراسة الشكوى والتوقيع الرقمي وغلاف التقرير.');
    add('القوالب', '/templates');
  }
  if (/أرشيف|أرشيفي|محفوظ/.test(p)) {
    tips.push('المكاتبات المؤرشفة تظهر في «أرشيفي» داخل المكتبة.');
    add('أرشيفي', '/archive');
  }
  if (/دليل|موظف|لقب|تشريف/.test(p)) {
    tips.push('دليل الموظفين يعرض الاسم مع اللقب التشريفي المناسب للمنصب.');
    add('دليلي', '/directory');
  }
  if (/استيراد|excel|وورد|ملف/.test(p)) {
    tips.push('الاستيراد الذكي يفهم نوع الملف ويستخرج النص للتصنيف المحلي. استيراد الموظفين عبر Excel من شاشة الموظفين (للرئيس/الأمين).');
    add('الاستيراد الذكي', '/import');
  }
  if (/رمز|رقم سري|pin|بصم|كلمة مرور|دخول/.test(p)) {
    tips.push(
      'الدخول ببريد @moj.gov.sa ورمز من 6 أرقام فقط.',
      'بعد أول دخول فعّل البصمة من الشاشة الرئيسية لنفس الجهاز.',
      'لتغيير الرمز استخدم «تغيير الرمز».',
    );
    add('تغيير الرمز', '/settings/password');
  }
  if (/ترقيم|صادر|رقم/.test(p)) {
    tips.push('الترقيم المركزي بصيغة: صادر-{السنة الهجرية}-{تسلسل}. يُمنح عند الإصدار وليس عند المسودة.');
  }
  if (/رئيس|أمين|صلاح|دور|kpi|مؤشر|تسجيل/.test(p)) {
    tips.push(
      'الموظف/القاضي: شاشة خفيفة (مستند جديد · أرشيفي · دليلي).',
      'الرئيس والأمين: مؤشرات حية. طلبات تسجيل الموظفين يوافق عليها الرئيس فقط.',
    );
    add('لوحة التحكم', '/');
    add('طلبات التسجيل', '/admin/registrations');
  }
  if (/تصدير|وورد|docx|outlook|pdf|excel/.test(p)) {
    tips.push('من صفحة المستند صدّر DOCX بهوية رسمية، أو انسخ HTML لـ Outlook. PDF متاح لكن العربية فيه أضعف — فضّل DOCX.');
  }
  if (/مساعد|ai|ذكاء|صياغ|موضوع|وقائع|أسباب/.test(p) && !tips.length) {
    tips.push('يمكنني اقتراح صياغة موضوع/وقائع/أسباب، أو إرشادك لأي شاشة في المنصة. اكتب ما تحتاجه بصياغة واضحة.');
    add('المساعد الكامل', '/assistant');
  }

  if (!tips.length) return null;

  return {
    source: 'local',
    text: ['[ركيزة Ai — دليل المنصة]', ...tips].join('\n'),
    actions,
  };
}

export async function assist(prompt: string, context?: string): Promise<AssistResult> {
  const platform = context === 'platform-help' || /منصة|وين|كيف|أين|ارشد|ساعد/.test(prompt);
  if (platform) {
    const local = platformHelp(prompt);
    if (local) return local;
  }

  // Local proofread / rewrite — no paid API
  if (/تدقيق|إملائ|املائ|صحح|تصحيح|صياغ|أعد.?صياغ|اسلوب|أسلوب|قانوني/.test(prompt)) {
    const src = (context || '').trim() || prompt.replace(/^(?:تدقيق|صياغة|صحح|أعد صياغة)[^\n]*\n?/i, '').trim();
    if (src.length >= 8) {
      const legal = /صياغ|اسلوب|أسلوب|قانوني|نظ[ّم]/.test(prompt);
      const after = legal ? polishLegalStyle(src) : polishSpelling(src);
      return {
        source: 'local',
        text: `[ركيزة Ai — تدقيق محلي مجاني]\n${proofreadReport(src, after)}\n\n--- النص بعد المعالجة ---\n${after}`,
      };
    }
    return {
      source: 'local',
      text: 'الصق النص في خانة السياق أو اكتب: تدقيق:\nثم النص. أو من شاشة المستند استخدم زر «تدقيق إملائي (محلي)».',
      actions: [{ label: 'مستند جديد', href: '/documents/new' }],
    };
  }

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'أنت «ركيزة Ai» مساعد منصة المكاتبات القضائية لمحكمة عمالية سعودية. أجب بالعربية الفصحى الموجزة. أرشد لشاشات المنصة عند الحاجة. لا تختلق أسماء أطراف أو أرقام قضايا.',
            },
            { role: 'user', content: context ? `${context}\n\n${prompt}` : prompt },
          ],
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { source: 'openai', text: data.choices?.[0]?.message?.content || '' };
      }
    } catch {
      /* fall through */
    }
  }

  const localHelp = platformHelp(prompt);
  if (localHelp) return localHelp;

  const tips: string[] = [];
  if (/موضوع|عنوان/.test(prompt)) {
    tips.push('اقترح موضوعاً موجزاً يبدأ بـ «بشأن» ويخلو من أسماء أطراف.');
  }
  if (/أسباب|تسبيب/.test(prompt)) {
    tips.push('رتّب الأسباب في نقاط مرقمة، مع الإشارة إلى النظام دون سرد مواد غير مؤكدة.');
  }
  if (/وقائع/.test(prompt)) {
    tips.push('لخّص الوقائع زمنياً: تقديم الطلب → الإجراءات → النتيجة المطلوبة.');
  }
  if (!tips.length) {
    tips.push(
      'مرحباً، أنا ركيزة Ai. اسأل عن إنشاء مكاتبة، القوالب، الأرشيف، الرمز السري، الترقيم، أو الصياغة.',
      'اختصارات سريعة متاحة من الأيقونة العائمة.',
    );
  }
  return {
    source: 'local',
    text: ['[ركيزة Ai]', ...tips, context ? `\nسياق:\n${context.slice(0, 300)}` : '']
      .filter(Boolean)
      .join('\n'),
    actions: [
      { label: 'مستند جديد', href: '/documents/new' },
      { label: 'القوالب', href: '/templates' },
      { label: 'المساعد الكامل', href: '/assistant' },
    ],
  };
}
