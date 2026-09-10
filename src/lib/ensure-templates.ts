import 'server-only';
import { prisma } from '@/lib/db';

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
    }[] = [
      {
        name: 'نموذج خطاب PDF رسمي',
        category: 'pdf-official',
        description: 'قالب PDF رسمي للطباعة بهوية الوزارة',
        fieldsJson: JSON.stringify(['number', 'date', 'subject', 'recipients', 'body']),
      },
      {
        name: 'كشف أسماء / Excel',
        category: 'excel',
        description: 'قالب لكشوف الأسماء وأرقام الهوية (لصق جدول أو استيراد)',
        fieldsJson: JSON.stringify(['tableRows', 'parties', 'body']),
      },
    ];

    const maxOrder = await prisma.template.aggregate({ _max: { sortOrder: true } });
    let order = (maxOrder._max.sortOrder ?? 0) + 1;
    for (const ex of extras) {
      const existing = await prisma.template.findFirst({ where: { name: ex.name } });
      if (!existing) {
        await prisma.template.create({
          data: {
            name: ex.name,
            category: ex.category,
            description: ex.description,
            fieldsJson: ex.fieldsJson,
            bodyHtml: '',
            isEmpty: true,
            sortOrder: order++,
          },
        });
      } else if (existing.category !== ex.category) {
        await prisma.template.update({
          where: { id: existing.id },
          data: { category: ex.category },
        });
      }
    }
  } catch (e) {
    console.error('ensureTemplates', e);
  }
}
