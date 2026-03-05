import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getProfileAnalytics, getSessionUser } from '@/lib/db';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (!sessionId) {
    redirect('/login');
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect('/login');
  }

  const analytics = await getProfileAnalytics(user.username);

  return (
    <DashboardClient
      initialUsername={user.username}
      initialProfile={user.profile}
      initialAnalytics={analytics}
    />
  );
}
