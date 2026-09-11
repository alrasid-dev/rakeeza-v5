/** Suggest font family / size by document type + list corrections */

export type FontSuggestion = {
  family: string;
  sizePt: number;
  align: 'right' | 'center' | 'left';
  reason: string;
};

export type FontCorrection = {
  location: string;
  issue: string;
  suggestion: string;
};

const DOC_PRESETS: Record<string, FontSuggestion> = {
  'خطاب صادر': { family: 'Traditional Arabic', sizePt: 16, align: 'right', reason: 'خطابات رسمية — Traditional Arabic 16pt' },
  'مذكرة داخلية': { family: 'Traditional Arabic', sizePt: 14, align: 'right', reason: 'مذكرات داخلية — 14pt' },
  تعميم: { family: 'Traditional Arabic', sizePt: 16, align: 'right', reason: 'تعاميم — 16pt واضح' },
  'محضر جلسة': { family: 'Sakkal Majalla', sizePt: 14, align: 'right', reason: 'محاضر — Sakkal Majalla 14pt' },
  'تقرير دراسة': { family: 'Traditional Arabic', sizePt: 13, align: 'right', reason: 'دراسات — 13pt لكثافة النص' },
  'نموذج تحليل حكم (شكوى)': { family: 'Traditional Arabic', sizePt: 12, align: 'right', reason: 'نموذج دراسة Excel — 12pt مضغوط' },
  'دراسة شكوى': { family: 'Traditional Arabic', sizePt: 12, align: 'right', reason: 'نموذج دراسة — 12pt' },
};

export function suggestFont(docType?: string | null, body?: string | null): {
  suggestion: FontSuggestion;
  corrections: FontCorrection[];
} {
  const key = Object.keys(DOC_PRESETS).find((k) => (docType || '').includes(k.replace(/[()]/g, '')) || (docType || '') === k);
  const suggestion =
    (key && DOC_PRESETS[key]) ||
    (/دراسة|شكوى|تحليل/.test(docType || '') || /رقم القضية|ملخص الدعوى|التوصية/.test(body || '')
      ? DOC_PRESETS['نموذج تحليل حكم (شكوى)']
      : DOC_PRESETS['خطاب صادر']);

  const corrections: FontCorrection[] = [];
  const text = body || '';
  if (text.length > 4000) {
    corrections.push({
      location: 'النص',
      issue: 'النص طويل جداً لعرض واحد',
      suggestion: `استخدم ${suggestion.family} بحجم ${Math.max(11, suggestion.sizePt - 2)}pt`,
    });
  }
  if (/[A-Za-z]{20,}/.test(text)) {
    corrections.push({
      location: 'النص',
      issue: 'مقاطع لاتينية طويلة',
      suggestion: 'أبقِ العربية بخط ناسخ واللاتينية بـ Arial',
    });
  }
  if (!/\n/.test(text) && text.length > 200) {
    corrections.push({
      location: 'النص',
      issue: 'فقرة واحدة طويلة بلا فواصل',
      suggestion: 'قسّم الفقرات لتحسين المحاذاة اليمنى',
    });
  }
  if (/وقائع/.test(text)) {
    corrections.push({
      location: 'الحقول',
      issue: 'وجود عنوان «الوقائع» (غير مستخدم في النماذج الحالية)',
      suggestion: 'انقل المحتوى إلى الأسباب أو نص المكاتبة',
    });
  }
  return { suggestion, corrections };
}
