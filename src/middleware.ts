import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/** Prefer public workers.dev host when behind CF access proxy. */
function absoluteUrl(req: NextRequest, path: string) {
  const xfHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const xfProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (xfHost) return new URL(path, `${xfProto}://${xfHost}`);
  return new URL(path, req.url);
}

const PUBLIC = [
  '/login',
  '/guide',
  '/verify',
  '/api/guide',
  '/api/auth/login',
  '/api/auth/ping',
  '/api/auth/setup-pin',
  '/api/auth/pin-status',
  '/api/auth/fingerprint',
  '/api/auth/register-request',
  '/api/public',
  '/manifest.json',
  '/sw.js',
  '/logo.svg',
  '/brand/',
  '/icons/',
  '/icons',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('rakeeza_session')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    return NextResponse.redirect(absoluteUrl(req, '/login'));
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
    const { payload } = await jwtVerify(token, secret);
    if (
      payload.mustChangePassword &&
      !pathname.startsWith('/change-password') &&
      !pathname.startsWith('/api/auth/change-password') &&
      !pathname.startsWith('/api/auth/logout') &&
      !pathname.startsWith('/api/auth/me')
    ) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'يجب برمجة رمز الدخول أولاً' }, { status: 403 });
      }
      return NextResponse.redirect(absoluteUrl(req, '/change-password'));
    }
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }
    return NextResponse.redirect(absoluteUrl(req, '/login'));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
