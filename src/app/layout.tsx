import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutClient } from '@/components/root-layout-client';
import { I18nProvider, useI18n } from '@/hooks/use-i18n';

export const metadata: Metadata = {
  title: 'EuphoCam',
  description: 'An immersive camera overlay web app for Sound! Euphonium fans.',
};

function Html({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  return <html lang={locale}>{children}</html>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <I18nProvider>
      <Html>
        <RootLayoutClient>{children}</RootLayoutClient>
      </Html>
    </I18nProvider>
  );
}
