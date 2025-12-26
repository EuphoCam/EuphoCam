
'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    <div className="relative">
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex w-max space-x-4 p-4">
                {assets.map((asset) => (
                    <button
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={cn(
                            'relative h-24 w-16 shrink-0 overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                            selectedAsset?.id === asset.id && 'ring-2 ring-primary ring-offset-2'
                        )}
                    >
                        <Image
                        src={asset.imageUrl}
                        alt={asset.description}
                        fill
                        className="object-cover"
                        data-ai-hint={asset.imageHint}
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
                    className="h-24 w-16 flex-col gap-2 shrink-0"
                    onClick={handleUploadClick}
                >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">{t('upload.overlay')}</span>
                </Button>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
  );
}
