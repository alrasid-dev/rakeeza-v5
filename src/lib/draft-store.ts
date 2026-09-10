export type DraftPayload = {
  formSlug: string;
  templateId?: string;
  paste?: string;
  step?: number;
  form: Record<string, string>;
  updatedAt: number;
};

const KEY = (slug: string) => `rakeeza-draft:${slug}`;

export function loadDraft(slug: string): DraftPayload | null {
  if (typeof window === 'undefined' || !slug) return null;
  try {
    const raw = sessionStorage.getItem(KEY(slug));
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftPayload;
    if (!data || typeof data !== 'object' || !data.form) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDraft(
  slug: string,
  data: Omit<DraftPayload, 'updatedAt' | 'formSlug'> & { form: Record<string, string> },
): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const payload: DraftPayload = {
      formSlug: slug,
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
  } catch {
    /* ignore */
  }
}
