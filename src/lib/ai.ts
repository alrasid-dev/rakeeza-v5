export async function assist(prompt: string, context?: string) {
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
                'أنت مساعد قانوني لمحكمة عمالية سعودية. أجب بالعربية الفصحى الموجزة. لا تختلق أسماء أطراف أو أرقام قضايا.',
            },
            { role: 'user', content: context ? `${context}\n\n${prompt}` : prompt },
          ],
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { source: 'openai' as const, text: data.choices?.[0]?.message?.content || '' };
      }
    } catch {
      /* fall through */
    }
  }

  // Local fallback heuristics
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
      'المساعد المحلي جاهز: حدّد الحقل (موضوع / وقائع / أسباب / صيغة خطاب) للحصول على إرشاد أدق.',
      'فعّل OPENAI_API_KEY في .env لاستخدام نموذج سحابي اختياري.',
    );
  }
  return {
    source: 'local' as const,
    text: ['[مساعد محلي — بدون مفتاح API]', ...tips, context ? `\nسياق مختصر:\n${context.slice(0, 300)}` : '']
      .filter(Boolean)
      .join('\n'),
  };
}
