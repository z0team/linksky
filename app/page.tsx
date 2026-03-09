import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/db';
import LandingClient, { type LandingSessionUser } from './LandingClient';

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  let sessionUser: LandingSessionUser | null = null;

  if (sessionId) {
    const user = await getSessionUser(sessionId);
    if (user) {
      sessionUser = {
        username: user.username,
        profile: {
          avatarUrl: user.profile.avatarUrl,
          displayName: user.profile.displayName,
        },
      };
    }
  }

  return <LandingClient initialUser={sessionUser} />;
}
