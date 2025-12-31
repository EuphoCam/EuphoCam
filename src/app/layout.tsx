import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutClient } from '@/components/root-layout-client';
import { I18nProvider } from '@/hooks/use-i18n';

export const metadata: Metadata = {
  title: 'EuphoCam',
  description: 'An immersive camera overlay web app for Sound! Euphonium fans. Choose a photo frame of your favorite Eupho character, take a photo or video, and share your candid moments with the world.',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    title: 'EuphoCam',
    statusBarStyle: 'default',
    capable: true,
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <I18nProvider>
      <RootLayoutClient>{children}</RootLayoutClient>
    </I18nProvider>
  );
}
