declare module 'arabic-persian-reshaper' {
  export const ArabicShaper: {
    convertArabic(text: string): string;
  };
  export const PersianShaper: {
    convertArabic(text: string): string;
  };
}

declare module 'bidi-js' {
  type EmbeddingLevels = { levels: Uint8Array | number[]; paragraphs: unknown[] };
  type BidiApi = {
    getEmbeddingLevels(text: string, baseDirection?: string | null): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): string;
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): number[];
  };
  export default function bidiFactory(): BidiApi;
}
