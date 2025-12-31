import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutClient } from '@/components/root-layout-client';
import { I18nProvider } from '@/hooks/use-i18n';

export const metadata: Metadata = {
  title: 'EuphoCam',
  description: 'An immersive camera overlay web app for Sound! Euphonium fans.',
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
