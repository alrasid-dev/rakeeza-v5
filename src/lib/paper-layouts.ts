/** Official paper visual layouts — persisted on document fieldsJson / drafts */

export type PaperLayoutId =
  | 'classic-green'
  | 'formal-gold'
  | 'compact-memo'
  | 'taameem-circular'
  | 'study-report'
  | 'identity-service-a'
  | 'identity-service-b'
  | 'modern-hex';

export type PaperLayoutMeta = {
  id: PaperLayoutId;
  nameAr: string;
  description: string;
};

export const PAPER_LAYOUTS: PaperLayoutMeta[] = [
  {
    id: 'modern-hex',
    nameAr: 'عصري هندسي',
    description: 'مساحة قراءة كريمية وتذييل أخضر داكن مع زخارف سداسية ذهبية/خضراء',
  },
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
  {
    id: 'identity-service-a',
    nameAr: 'هوية خدمة أ',
    description: 'صفحة كريمية وترويسة خضراء مع نمط هندسي ذهبي في التذييل',
  },
  {
    id: 'identity-service-b',
    nameAr: 'هوية خدمة ب',
    description: 'شريط علوي تركوازي/أخضر مع نمط هندسي في الأسفل',
  },
];

export const DEFAULT_PAPER_LAYOUT: PaperLayoutId = 'classic-green';

export function isPaperLayoutId(v: unknown): v is PaperLayoutId {
  return typeof v === 'string' && PAPER_LAYOUTS.some((l) => l.id === v);
}

export function normalizePaperLayout(v: unknown): PaperLayoutId {
  return isPaperLayoutId(v) ? v : DEFAULT_PAPER_LAYOUT;
}

/** Shared identity motif colors (inspired by brand cards — not emblem art) */
export const IDENTITY_COLORS = {
  cream: '#F7F1E3',
  creamDeep: '#EFE6D4',
  green: '#006C35',
  greenDeep: '#004d26',
  teal: '#0B6E4F',
  tealBand: '#147A5F',
  gold: '#C5A059',
  goldSoft: '#D4B97A',
  beige: '#E8DCC8',
} as const;
