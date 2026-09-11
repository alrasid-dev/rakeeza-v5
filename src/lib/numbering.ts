import { prisma } from './db';
import { hijriYear } from './hijri';

export async function nextDocumentNumber(): Promise<string> {
  const year = hijriYear();
  let rule = await prisma.numberingRule.findFirst({ where: { name: 'default' } });
  if (!rule) {
    rule = await prisma.numberingRule.create({
      data: { name: 'default', pattern: 'صادر-{year}-{seq}', year, nextSeq: 1, prefix: 'صادر' },
    });
  }
  if (rule.year !== year) {
    rule = await prisma.numberingRule.update({
      where: { id: rule.id },
      data: { year, nextSeq: 1 },
    });
  }
  const seq = rule.nextSeq;
  await prisma.numberingRule.update({
    where: { id: rule.id },
    data: { nextSeq: seq + 1 },
  });
  const padded = String(seq).padStart(4, '0');
  return `صادر-${year}-${padded}`;
}
