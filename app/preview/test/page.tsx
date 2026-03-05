import type { Metadata } from 'next';
import type { UserProfile } from '@/lib/db';
import ProfileClient from '../../[username]/ProfileClient';

export const metadata: Metadata = {
  title: 'LinkSky Demo',
  description: 'Styled demo profile used for the landing preview.',
  robots: {
    index: false,
    follow: false,
  },
};

const demoProfile: UserProfile = {
  displayName: 'Mila Hart',
  bio: 'Creative direction, visuals and links collected in one clean profile.',
  status: 'Art direction and motion',
  location: 'Kyiv, UA',
  avatarUrl: '/demo/avatar.svg',
  backgroundUrl: '/demo/background.svg',
  musicUrl: '',
  cursorUrl: '',
  songTitle: 'Midnight Motion',
  enterText: '[ click to enter ]',
  accentColor: '#8ea7ff',
  cardOpacity: 0.45,
  blurStrength: 18,
  showViews: true,
  enableGlow: true,
  fontFamily: 'sans',
  socials: [
    { platform: 'github', url: 'https://github.com' },
    { platform: 'instagram', url: 'https://instagram.com' },
    { platform: 'youtube', url: 'https://youtube.com' },
    { platform: 'website', url: 'https://example.com' },
  ],
  views: 2451,
};

export default function PreviewTestPage() {
  return <ProfileClient profile={demoProfile} username="preview-demo" previewMode />;
}
