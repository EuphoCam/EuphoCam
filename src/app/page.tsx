import { CameraUI } from '@/components/camera-ui';
import { I18nProvider } from '@/hooks/use-i18n';

export default function Home() {
  return (
    <I18nProvider>
      <main className="h-[100dvh] w-screen overflow-hidden bg-black">
        <CameraUI />
      </main>
    </I18nProvider>
  );
}
