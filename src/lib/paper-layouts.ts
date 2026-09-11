/** Official paper visual layouts — persisted on document fieldsJson / drafts */

export type PaperLayoutId =
  | 'classic-green'
  | 'formal-gold'
  | 'compact-memo'
  | 'taameem-circular'
  | 'study-report';

export type PaperLayoutMeta = {
  id: PaperLayoutId;
  nameAr: string;
  description: string;
};

export const PAPER_LAYOUTS: PaperLayoutMeta[] = [
  {
    id: 'classic-green',
    nameAr: 'كلاسيكي أخضر',
    description: 'ترويسة خضراء تقليدية مع شريط ذهبي',
  },
  {
    id: 'formal-gold',
    nameAr: 'رسمي ذهبي',
    description: 'لمسات ذهبية وإطار فاخر للمخاطبات الرسمية',
  },
  {
    id: 'compact-memo',
    nameAr: 'مذكرة مدمجة',
    description: 'تخطيط مضغوط للمذكرات الداخلية السريعة',
  },
  {
    id: 'taameem-circular',
    nameAr: 'تعميم دائري',
    description: 'أسلوب تعميم بشريط علوي وشارة دائرية',
  },
  {
    id: 'study-report',
    nameAr: 'تقرير / دراسة',
    description: 'مناسب لنماذج الدراسة والتقارير المقسّمة',
  },
];

export const DEFAULT_PAPER_LAYOUT: PaperLayoutId = 'classic-green';

export function isPaperLayoutId(v: unknown): v is PaperLayoutId {
  return typeof v === 'string' && PAPER_LAYOUTS.some((l) => l.id === v);
}

export function normalizePaperLayout(v: unknown): PaperLayoutId {
  return isPaperLayoutId(v) ? v : DEFAULT_PAPER_LAYOUT;
}
