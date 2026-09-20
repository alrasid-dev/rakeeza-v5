import { NextRequest, NextResponse } from 'next/server';
import { getSession, audit } from '@/lib/auth';
import { classifyText } from '@/lib/classify';
import { localUniversalParse, processUniversalDocument } from '@/services/documentParser';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'ملف مطلوب' }, { status: 400 });

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let text = '';

  try {
    if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const wb = XLSX.read(buf, { type: 'buffer' });
      const parts: string[] = [];
      for (const sn of wb.SheetNames) {
        parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[sn]));
      }
      text = parts.join('\n');
    } else if (name.endsWith('.txt') || name.endsWith('.html') || name.endsWith('.md')) {
      text = buf.toString('utf8');
    } else {
      text = buf.toString('utf8');
    }
  } catch {
    return NextResponse.json({ error: 'تعذر استخراج النص' }, { status: 400 });
  }

  const classification = classifyText(text);
  let universal;
  let engine: 'deepseek' | 'local' = 'local';
  try {
    universal = await processUniversalDocument(text);
    engine = 'deepseek';
  } catch {
    universal = localUniversalParse(text);
  }
  await audit('smart_import', 'Import', undefined, file.name, s.id);
  return NextResponse.json({ text, classification, universal, engine, fileName: file.name });
}
