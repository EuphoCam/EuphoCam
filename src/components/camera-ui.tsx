
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Camera, Video, SwitchCamera, Download, Settings, Loader, AlertTriangle, CircleDot, X } from 'lucide-react';
import { AssetSelector } from './asset-selector';
import { LanguageSwitcher } from './language-switcher';

type Mode = 'photo' | 'video';
type FacingMode = 'user' | 'environment';

export function CameraUI() {
  const { t } = useI18n();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameId = useRef<number>();
  const currentStreamRef = useRef<MediaStream | null>(null);
  const zoomStartDistRef = useRef<number | null>(null);
  const zoomStartScaleRef = useRef<number>(1);

  const [mounted, setMounted] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('photo');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [assets, setAssets] = useState<ImagePlaceholder[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ImagePlaceholder | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [overlayAspectRatio, setOverlayAspectRatio] = useState<number | null>(null);
  const [digitalZoom, setDigitalZoom] = useState(1);

  useEffect(() => {
    setMounted(true);

    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventDefault);
    document.addEventListener('gesturechange', preventDefault);
    document.addEventListener('gestureend', preventDefault);

    return () => {
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('gestureend', preventDefault);
    };
  }, []);

  useEffect(() => {
    const allAssets = PlaceHolderImages;
    setAssets(allAssets);

    const assetId = searchParams.get('assetId');
    const uploadedAssetUrl = searchParams.get('uploadedAssetUrl');
    const uploadedAssetDescription = searchParams.get('uploadedAssetDescription');

    if (assetId) {
      const initialAsset = allAssets.find(a => a.id === assetId);
      setSelectedAsset(initialAsset || null);
    } else if (uploadedAssetUrl) {
      const uploadedAsset: ImagePlaceholder = {
        id: `uploaded-${Date.now()}`,
        imageUrl: decodeURIComponent(uploadedAssetUrl),
        description: uploadedAssetDescription ? decodeURIComponent(uploadedAssetDescription) : 'Uploaded asset',
        imageHint: 'uploaded'
      };
      setAssets(prev => [uploadedAsset, ...prev]);
      setSelectedAsset(uploadedAsset);
    }
  }, [searchParams]);

  useEffect(() => {
    setOverlayAspectRatio(null);
  }, [selectedAsset]);

  useEffect(() => {
    if (!mounted) return;

    const startStream = async () => {
      setIsLoading(true);
      setHasCameraPermission(null);

      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 4096 },
            height: { ideal: 2160 }
          },
          audio: true
        });

        currentStreamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setHasCameraPermission(true);

        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack && 'zoom' in videoTrack.getSettings()) {
          try {
            const caps = videoTrack.getCapabilities();
            if (caps.zoom) {
              setZoomCapabilities({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step });
              const currentZoom = videoTrack.getSettings().zoom || caps.zoom.min;
              setZoom(currentZoom);
            } else {
              setZoomCapabilities(null);
            }
          } catch (e) {
            console.warn("Could not get zoom capabilities:", e);
            setZoomCapabilities(null);
          }
        } else {
          setZoomCapabilities(null);
        }
      } catch (err) {
        setHasCameraPermission(false);
        let messageKey: any = 'error.camera.generic';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') messageKey = 'error.camera.permission';
          if (err.name === 'NotFoundError') messageKey = 'error.camera.notfound';
        }
        toast({ variant: 'destructive', title: t('error.title'), description: t(messageKey) });
      } finally {
        setIsLoading(false);
      }
    };

    startStream();

    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
        currentStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [facingMode, mounted, t, toast]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Error playing video:", e)
        }
      });
    }
    setIsLoading(false);
  }


  const handleZoomChange = (value: number[]) => {
    if (!currentStreamRef.current || !zoomCapabilities) return;
    const videoTrack = currentStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    setZoom(value[0]);
    videoTrack.applyConstraints({ advanced: [{ zoom: value[0] }] }).catch(() => {
      toast({ variant: 'destructive', title: t('error.title'), description: t('error.zoom.unsupported') });
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      zoomStartDistRef.current = dist;
      zoomStartScaleRef.current = digitalZoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 2 && zoomStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / zoomStartDistRef.current;
      const newZoom = Math.min(Math.max(zoomStartScaleRef.current * scaleFactor, 1), 5);
      setDigitalZoom(newZoom);
    }
  };

  const drawFrame = useCallback((context: CanvasRenderingContext2D, video: HTMLVideoElement) => {
    const canvas = context.canvas;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const overlayAspectRatio = overlay.naturalWidth / overlay.naturalHeight;
    const videoAspectRatio = video.videoWidth / video.videoHeight;

    let baseSw, baseSh, baseSx, baseSy;

    if (videoAspectRatio > overlayAspectRatio) {
      baseSh = video.videoHeight;
      baseSw = baseSh * overlayAspectRatio;
      baseSx = (video.videoWidth - baseSw) / 2;
      baseSy = 0;
    } else {
      baseSw = video.videoWidth;
      baseSh = baseSw / overlayAspectRatio;
      baseSx = 0;
      baseSy = (video.videoHeight - baseSh) / 2;
    }

    const zoomedSw = baseSw / digitalZoom;
    const zoomedSh = baseSh / digitalZoom;
    const zoomedSx = baseSx + (baseSw - zoomedSw) / 2;
    const zoomedSy = baseSy + (baseSh - zoomedSh) / 2;

    canvas.width = baseSw;
    canvas.height = baseSh;

    context.save();
    if (facingMode === 'user') {
      context.scale(-1, 1);
      context.translate(-canvas.width, 0);
    }

    context.drawImage(video, zoomedSx, zoomedSy, zoomedSw, zoomedSh, 0, 0, canvas.width, canvas.height);
    context.restore();

    context.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  }, [facingMode, digitalZoom]);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !selectedAsset) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const context = canvas.getContext('2d');
    if (!context) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    drawFrame(context, video);

    const link = document.createElement('a');
    link.download = `EuphoCam-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: t('photo.saved') });
  }, [drawFrame, t, toast, selectedAsset]);

  const recordLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const currentIsRecording = mediaRecorderRef.current?.state === 'recording';
    if (!currentIsRecording) return;

    const context = canvasRef.current.getContext('2d');
    if (context) {
      drawFrame(context, videoRef.current);
    }
    animationFrameId.current = requestAnimationFrame(recordLoop);
  }, [drawFrame]);

  const handleStartRecording = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isRecording || !selectedAsset) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    setIsRecording(true);
    recordedChunksRef.current = [];
    const canvasStream = canvas.captureStream(30);

    if (currentStreamRef.current && currentStreamRef.current.getAudioTracks().length > 0) {
      currentStreamRef.current.getAudioTracks().forEach(audioTrack => canvasStream.addTrack(audioTrack.clone()));
    }

    mediaRecorderRef.current = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EuphoCam-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: t('video.saved') });
    };

    mediaRecorderRef.current.start();
    animationFrameId.current = requestAnimationFrame(recordLoop);
  }, [isRecording, recordLoop, t, toast, selectedAsset]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [isRecording]);

  const handleShutterClick = () => {
    if (!selectedAsset) {
      toast({
        variant: "destructive",
        title: t('error.title'),
        description: t('error.select.frame'),
      });
      return;
    }
    if (mode === 'photo') {
      handleCapturePhoto();
    } else {
      isRecording ? handleStopRecording() : handleStartRecording();
    }
  };

  const handleAssetUpload = (file: File) => {
    const newAsset: ImagePlaceholder = {
      id: `uploaded-${Date.now()}`,
      imageUrl: URL.createObjectURL(file),
      description: file.name,
      imageHint: 'uploaded',
    };
    setAssets(prev => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (!mounted) {
    return <div className="absolute z-20 flex h-full w-full items-center justify-center bg-black"><Loader className="h-12 w-12 animate-spin text-primary-foreground" /></div>;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {(isLoading || hasCameraPermission === null) && <Loader className="absolute z-20 h-12 w-12 animate-spin text-primary-foreground" />}
      {hasCameraPermission === false && (
        <div className="absolute z-20 flex flex-col items-center gap-4 text-center text-primary-foreground p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="font-medium">{t('error.camera.permission')}</p>
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={`relative overflow-hidden flex items-center justify-center touch-none ${selectedAsset && overlayAspectRatio ? 'max-h-full max-w-full' : 'h-full w-full'
          }`}
        style={{ aspectRatio: selectedAsset && overlayAspectRatio ? overlayAspectRatio : 'auto' }}
      >
        <video
          ref={videoRef}
          style={{
            transform: `${facingMode === 'user' ? 'scaleX(-1)' : ''} scale(${digitalZoom})`
          }}
          className={`h-full w-full ${selectedAsset && overlayAspectRatio ? 'object-cover' : 'object-contain'
            } ${hasCameraPermission ? '' : 'hidden'}`} // 移除了 className 里的 scale-x-[-1]
          onLoadedData={handleVideoLoaded}
        ></video>

        {selectedAsset && (
          <Image
            ref={overlayRef}
            crossOrigin="anonymous"
            src={selectedAsset.imageUrl}
            alt={selectedAsset.description}
            fill
            onLoadingComplete={({ naturalWidth, naturalHeight }) => setOverlayAspectRatio(naturalWidth / naturalHeight)}
            className="pointer-events-none object-fill"
            data-ai-hint={selectedAsset.imageHint}
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="absolute top-4 left-4 z-30">
        <Button onClick={handleGoHome} variant="ghost" size="icon" className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full">
          <X />
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <LanguageSwitcher className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full" />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full">
              <Settings />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{t('settings')}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-6 py-4">
              {zoomCapabilities && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">{t('zoom')}</label>
                  <Slider
                    value={[zoom]}
                    min={zoomCapabilities.min}
                    max={zoomCapabilities.max}
                    step={zoomCapabilities.step}
                    onValueChange={handleZoomChange}
                  />
                </div>
              )}
              <div className="space-y-3">
                <label className="text-sm font-medium">{t('overlays')}</label>
                <AssetSelector
                  assets={assets}
                  selectedAsset={selectedAsset}
                  onSelectAsset={setSelectedAsset}
                  onUploadAsset={handleAssetUpload}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-4 p-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex w-full max-w-xs items-center justify-around">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="w-auto">
            <TabsList className="bg-black/50 text-white">
              <TabsTrigger value="photo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('photo')}</TabsTrigger>
              <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('video')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex w-full items-center justify-center">
          <div className="flex-1"></div>
          <Button
            aria-label={mode === 'photo' ? t('capture.photo') : (isRecording ? t('stop.recording') : t('start.recording'))}
            onClick={handleShutterClick}
            className="h-20 w-20 rounded-full border-4 border-white bg-transparent hover:bg-white/20 transition-all duration-200 flex items-center justify-center group"
            disabled={isLoading || !hasCameraPermission}
          >
            {isRecording ? (
              <div className="h-8 w-8 rounded-md bg-destructive animate-pulse"></div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-white/80 group-hover:bg-white transition-all"></div>
            )}
          </Button>
          <div className="flex-1 flex justify-end">
            <Button
              aria-label={t('switch.camera')}
              onClick={() => setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-white bg-black/30 hover:bg-black/50"
              disabled={isLoading || isRecording || !hasCameraPermission}
            >
              <SwitchCamera className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
