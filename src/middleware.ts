import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = ['/login', '/verify', '/api/auth/login', '/api/public', '/manifest.json', '/sw.js', '/logo.svg', '/icons'];

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
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
    const { payload } = await jwtVerify(token, secret);
    if (payload.mustChangePassword && !pathname.startsWith('/change-password') && !pathname.startsWith('/api/auth/change-password') && !pathname.startsWith('/api/auth/logout') && !pathname.startsWith('/api/auth/me')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'يجب تغيير كلمة المرور' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/change-password', req.url));
    }
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
