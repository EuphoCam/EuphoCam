'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

interface AssetSelectorProps {
  assets: ImagePlaceholder[];
  selectedAsset: ImagePlaceholder | null;
  onSelectAsset: (asset: ImagePlaceholder | null) => void;
  onUploadAsset: (file: File) => void;
}

export function AssetSelector({ assets, selectedAsset, onSelectAsset, onUploadAsset }: AssetSelectorProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadAsset(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="relative w-full overflow-x-auto py-2 scrollbar-hide touch-pan-x"
      data-vaul-no-drag
    >
      <div className="flex flex-nowrap gap-4 px-4 w-max">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onSelectAsset(asset)}
            className={cn(
              'relative h-24 w-16 shrink-0 overflow-hidden rounded-md transition-all focus:outline-none ring-offset-background',
              selectedAsset?.id === asset.id ? 'ring-2 ring-primary ring-offset-2' : 'opacity-80'
            )}
          >
            <Image
              src={asset.imageUrl}
              alt={asset.description}
              fill
              className="object-cover"
              sizes="64px"
              loading="lazy"
            />
          </button>
        ))}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png"
          className="hidden"
        />

        <Button
          variant="outline"
          className="h-24 w-16 flex-col items-center justify-center gap-2 shrink-0"
          onClick={handleUploadClick}
        >
          <Upload className="h-5 w-5" />
          <span className="text-[10px] text-center leading-tight">{t('upload.overlay')}</span>
        </Button>
      </div>
    </div>
  );
}
