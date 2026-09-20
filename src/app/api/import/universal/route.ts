import { NextRequest, NextResponse } from 'next/server';
import { getSession, audit } from '@/lib/auth';
import {
  localUniversalParse,
  processUniversalDocument,
  type UniversalParseResult,
} from '@/services/documentParser';

/**
 * Universal parse endpoint — accepts raw content (text / HTML / TSV / JSON)
 * and returns a canonical FORM|TABLE result via DeepSeek (with local fallback).
 */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = body?.content ?? body?.raw ?? '';
  if (!content) return NextResponse.json({ error: 'المحتوى مطلوب' }, { status: 400 });

  let result: UniversalParseResult;
  let engine: 'deepseek' | 'local' = 'local';
  try {
    result = await processUniversalDocument(String(content));
    engine = 'deepseek';
  } catch {
    result = localUniversalParse(String(content));
  }

  await audit('universal_parse', 'Import', undefined, engine, s.id);
  return NextResponse.json({ result, engine });
}
