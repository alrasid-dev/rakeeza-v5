import 'server-only';
import { prisma } from '@/lib/db';
import {
  JUDGMENT_CARD_BODY,
  JUDGMENT_CARD_RECIPIENTS,
  JUDGMENT_CARD_SEED,
  JUDGMENT_CARD_SUBJECT,
} from '@/lib/judgment-card';

const SESSION_NOTICE_BODY = `فضيلة/سعادة: [اسم صاحب الفضيلة/السعادة]،

إشارة إلى [موضوع المعاملة/رقم القضية]،

نود إشعاركم بموعدكم المقرر في يوم: [اليوم] وتاريخ: [التاريخ الهجري]، في تمام الساعة: [الوقت]، وذلك في قاعة الاجتماعات بالدور الأول.

وتقبلوا وافر التحية والتقدير.`;

const URGENT_REFERRAL_BODY = `إلى: [الجهة / الإدارة المحال إليها]،

إشارة إلى المعاملة رقم: [رقم المعاملة] وتاريخ: [التاريخ الهجري]، المتعلقة بـ: [موضوع المعاملة]،

نأمل منكم اتخاذ اللازم حيالها بصفة عاجلة خلال مدة لا تتجاوز [المدة]، وإفادتنا بما يتم التوصل إليه.

نسخة إلى: [الجهة / الإدارة للاطلاع].

وتقبلوا وافر التحية والتقدير.`;

const LETTER_KEYS = ['number', 'date', 'subject', 'recipients', 'copyTo', 'body'];

function judgmentFieldsJson(defaultPaperLayout: string) {
  return JSON.stringify({
    keys: [...LETTER_KEYS, 'judgmentCard'],
    defaultPaperLayout,
    mode: 'briefing',
    hideBodyAndParties: true,
    seed: {
      subject: JUDGMENT_CARD_SUBJECT,
      recipients: JUDGMENT_CARD_RECIPIENTS,
      judgmentCard: JUDGMENT_CARD_SEED,
    },
  });
}

/** Soft-migrate template categories + ensure new group templates exist (no wipe). */
export async function ensureTemplates() {
  try {
    // Remap legacy categories in place
    await prisma.template.updateMany({
      where: { category: 'document' },
      data: { category: 'letter-official' },
    });
    await prisma.template.updateMany({
      where: { category: 'freeform' },
      data: { category: 'letter-identity' },
    });
    await prisma.template.updateMany({
      where: { category: { in: ['study', 'signature', 'cover'] } },
      data: { category: 'pdf-identity' },
    });

    const extras: {
      name: string;
      category: string;
      description: string;
      fieldsJson: string;
      bodyHtml: string;
      isEmpty: boolean;
    }[] = [
      {
        name: 'نموذج خطاب PDF رسمي',
        category: 'pdf-official',
        description: 'قالب PDF رسمي للطباعة بهوية الوزارة',
        fieldsJson: JSON.stringify(['number', 'date', 'subject', 'recipients', 'copyTo', 'body']),
        bodyHtml: '',
        isEmpty: true,
      },
      {
        name: 'كشف أسماء / Excel',
        category: 'excel',
        description: 'قالب لكشوف الأسماء وأرقام الهوية (لصق جدول أو استيراد)',
        fieldsJson: JSON.stringify(['tableRows', 'parties', 'body']),
        bodyHtml: '',
        isEmpty: true,
      },
      {
        name: 'إشعار موعد جلسة',
        category: 'letter-official',
        description: 'إشعار رسمي بموعد جلسة/اجتماع — نص جاهز للتعبئة',
        fieldsJson: JSON.stringify([
          'number',
          'date',
          'subject',
          'recipients',
          'copyTo',
          'body',
        ]),
        bodyHtml: SESSION_NOTICE_BODY,
        isEmpty: false,
      },
      {
        name: 'إحالة داخلية عاجلة',
        category: 'letter-official',
        description: 'إحالة داخلية عاجلة لجهة/إدارة مع مهلة ونسخة إلى',
        fieldsJson: JSON.stringify([
          'number',
          'date',
          'subject',
          'recipients',
          'copyTo',
          'body',
        ]),
        bodyHtml: URGENT_REFERRAL_BODY,
        isEmpty: false,
      },
      {
        name: 'مدخلات الأحكام بطاقة عرض',
        category: 'letter-official',
        description: 'بطاقة رصد مدخلات الأحكام مع ديباجة آلية المعالجة (تعميم دائري)',
        fieldsJson: judgmentFieldsJson('taameem-circular'),
        bodyHtml: JUDGMENT_CARD_BODY,
        isEmpty: false,
      },
      {
        name: 'مدخلات الأحكام بطاقة عرض — عصري هندسي',
        category: 'letter-official',
        description: 'بطاقة رصد مدخلات الأحكام مع ديباجة آلية المعالجة (عصري هندسي)',
        fieldsJson: judgmentFieldsJson('modern-hex'),
        bodyHtml: JUDGMENT_CARD_BODY,
        isEmpty: false,
      },
    ];

    const maxOrder = await prisma.template.aggregate({ _max: { sortOrder: true } });
    let order = (maxOrder._max.sortOrder ?? 0) + 1;
    for (const ex of extras) {
      const existing = await prisma.template.findFirst({ where: { name: ex.name } });
      if (!existing) {
        // المرحلة الثانية: القوالب الجديدة تُنشأ معطّلة افتراضياً حتى يفعلها المشرف يدوياً
        await prisma.template.create({
          data: {
            name: ex.name,
            category: ex.category,
            description: ex.description,
            fieldsJson: ex.fieldsJson,
            bodyHtml: ex.bodyHtml,
            isEmpty: ex.isEmpty,
            sortOrder: order++,
            isActive: false,
          },
        });
      } else {
        const patch: Record<string, unknown> = {};
        if (existing.category !== ex.category) patch.category = ex.category;
        if (!ex.isEmpty) {
          // Keep filled templates in sync (body + seed meta) without wiping user-created empty shells
          if (existing.bodyHtml !== ex.bodyHtml || existing.isEmpty) {
            patch.bodyHtml = ex.bodyHtml;
            patch.isEmpty = false;
          }
          if (existing.fieldsJson !== ex.fieldsJson) patch.fieldsJson = ex.fieldsJson;
          if (existing.description !== ex.description) patch.description = ex.description;
        }
        if (Object.keys(patch).length) {
          await prisma.template.update({ where: { id: existing.id }, data: patch });
        }
      }
    }
  } catch (e) {
    console.error('ensureTemplates', e);
  }
}
