import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const COOKIE = 'rakeeza_session';
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function isMojEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@moj.gov.sa');
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function requireUser(roles?: string[]) {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  if (session.mustChangePassword) throw new Error('MUST_CHANGE_PASSWORD');
  if (roles && !roles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}

export async function audit(action: string, entity?: string, entityId?: string, details?: string, userId?: string) {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId, details, userId },
    });
  } catch {
    /* ignore */
  }
}
