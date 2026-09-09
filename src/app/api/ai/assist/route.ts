import { NextRequest, NextResponse } from 'next/server';
import { getSession, audit } from '@/lib/auth';
import { assist } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const { prompt, context } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'الطلب مطلوب' }, { status: 400 });
  const result = await assist(String(prompt), context ? String(context) : undefined);
  await audit('ai_assist', 'AI', undefined, result.source, s.id);
  return NextResponse.json(result);
}
