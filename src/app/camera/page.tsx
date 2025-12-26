
'use client';

import { Suspense } from 'react';
import { CameraUI } from '@/components/camera-ui';
import { I18nProvider } from '@/hooks/use-i18n';
import { Loader } from 'lucide-react';

function CameraPageContent() {
  return (
      <main className="h-[100dvh] w-screen overflow-hidden bg-black">
        <CameraUI />
      </main>
  );
}


export default function CameraPage() {
    return (
        <I18nProvider>
            <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-black"><Loader className="h-12 w-12 animate-spin text-white" /></div>}>
                <CameraPageContent />
            </Suspense>
        </I18nProvider>
    );
}
