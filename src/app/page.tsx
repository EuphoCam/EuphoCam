
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { I18nProvider, useI18n } from '@/hooks/use-i18n';
import { Upload } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

function AssetGrid() {
  const [assets, setAssets] = useState<ImagePlaceholder[]>([]);
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAssets(PlaceHolderImages);
  }, []);

  const handleSelectAsset = (assetId: string) => {
    router.push(`/camera?assetId=${assetId}`);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newAsset: ImagePlaceholder = {
        id: `uploaded-${Date.now()}`,
        imageUrl: URL.createObjectURL(file),
        description: file.name,
        imageHint: 'uploaded',
      };
      router.push(`/camera?uploadedAssetUrl=${encodeURIComponent(newAsset.imageUrl)}&uploadedAssetDescription=${encodeURIComponent(newAsset.description)}`);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
            <h1 className="text-4xl font-bold">{t('app.title')}</h1>
            <LanguageSwitcher />
        </div>
        <p className="max-w-3xl mx-auto text-muted-foreground">{t('app.description')}</p>
      </header>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold">{t('select.overlay.title')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets.map((asset) => (
          <Card 
            key={asset.id} 
            onClick={() => handleSelectAsset(asset.id)}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
          >
            <CardContent className="p-0">
              <div className="relative aspect-[9/16] w-full">
                <Image
                  src={asset.imageUrl}
                  alt={asset.description}
                  fill
                  className="object-cover"
                  data-ai-hint={asset.imageHint}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                   <p className="text-white font-semibold text-lg opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    {asset.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
         <Card 
            onClick={handleUploadClick}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group flex items-center justify-center bg-secondary hover:bg-muted aspect-[9/16]"
          >
            <CardContent className="p-0 flex flex-col items-center justify-center gap-4 text-secondary-foreground">
                <Upload className="h-12 w-12" />
                <p className="font-semibold text-lg">{t('upload.overlay')}</p>
            </CardContent>
          </Card>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png"
            className="hidden"
          />
      </div>
      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <div className="space-y-1">
            <p>©武田綾乃・宝島社／『響け！』製作委員会2024</p>
            <p>画像は「京阪電車×響け！ユーフォニアム2025」コラボレーション企画より引用しています。</p>
        </div>
        <div className="mt-6 space-y-1">
            <p>{t('footer.disclaimer.line1')}</p>
            <p>{t('footer.disclaimer.line2')}</p>
            <p>{t('footer.disclaimer.line3')}</p>
            <p>{t('footer.disclaimer.line4')}</p>
        </div>
      </footer>
    </div>
  );
}


export default function Home() {
  return (
    <I18nProvider>
      <main className="min-h-screen bg-background text-foreground">
        <AssetGrid />
      </main>
    </I18nProvider>
  );
}
