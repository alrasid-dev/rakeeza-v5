import { NextResponse } from 'next/server';
import { isTursoMode } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Public connectivity check — used by login when fetch fails */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    db: isTursoMode() ? 'turso' : 'sqlite',
  });
}
