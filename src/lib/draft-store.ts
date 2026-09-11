export type DraftPayload = {
  formSlug: string;
  /** Bump when draft shape / paste semantics change — stale drafts are ignored */
  version: number;
  templateId?: string;
  paste?: string;
  step?: number;
  form: Record<string, string>;
  updatedAt: number;
};

/** Increment when apply/paste/layout semantics change so refresh won't resurrect ghosts */
export const DRAFT_VERSION = 3;

const KEY = (slug: string) => `rakeeza-draft:v${DRAFT_VERSION}:${slug}`;
/** Legacy keys from earlier builds — cleared aggressively to stop overlap rehydrate */
const LEGACY_KEYS = (slug: string) => [
  `rakeeza-draft:${slug}`,
  `rakeeza-draft:v1:${slug}`,
  `rakeeza-draft:v2:${slug}`,
];

export function loadDraft(slug: string): DraftPayload | null {
  if (typeof window === 'undefined' || !slug) return null;
  try {
    // Drop legacy unversioned / old drafts that caused stacked body rehydrate
    for (const k of LEGACY_KEYS(slug)) {
      try {
        sessionStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    const raw = sessionStorage.getItem(KEY(slug));
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftPayload;
    if (!data || typeof data !== 'object' || !data.form) return null;
    if (data.version !== DRAFT_VERSION) {
      sessionStorage.removeItem(KEY(slug));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveDraft(
  slug: string,
  data: Omit<DraftPayload, 'updatedAt' | 'formSlug' | 'version'> & {
    form: Record<string, string>;
  },
): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const payload: DraftPayload = {
      formSlug: slug,
      version: DRAFT_VERSION,
      templateId: data.templateId,
      paste: data.paste,
      step: data.step,
      form: data.form,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(KEY(slug), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearDraft(slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    sessionStorage.removeItem(KEY(slug));
    for (const k of LEGACY_KEYS(slug)) {
      sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** Clear every rakeeza draft key (current + legacy) — for «مسح المسودة» */
export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('rakeeza-draft')) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
