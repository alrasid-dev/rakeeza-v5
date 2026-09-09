import { NextResponse } from 'next/server';
import { destroySession, getSession, audit } from '@/lib/auth';

export async function POST() {
  const s = await getSession();
  if (s) await audit('logout', 'User', s.id, undefined, s.id);
  await destroySession();
  return NextResponse.json({ ok: true });
}
