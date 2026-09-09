import { getSession } from './auth';
import { redirect } from 'next/navigation';

export async function currentUser() {
  const s = await getSession();
  if (!s) redirect('/login');
  if (s.mustChangePassword) redirect('/change-password');
  return s;
}
