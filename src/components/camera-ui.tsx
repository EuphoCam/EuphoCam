'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useI18n } from '@/hooks/use-i18n';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Camera, Video, SwitchCamera, Download, Settings, Loader, AlertTriangle, CircleDot } from 'lucide-react';
import { AssetSelector } from './asset-selector';
import { LanguageSwitcher } from './language-switcher';

type Mode = 'photo' | 'video';
type FacingMode = 'user' | 'environment';

export function CameraUI() {
  const { t } = useI18n();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameId = useRef<number>();

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('photo');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [assets, setAssets] = useState<ImagePlaceholder[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ImagePlaceholder | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setAssets(PlaceHolderImages);
    setSelectedAsset(PlaceHolderImages[0] || null);
  }, []);

  const cleanupStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleError = useCallback((err: Error) => {
    let messageKey: any = 'error.camera.generic';
    if (err.name === 'NotAllowedError') messageKey = 'error.camera.permission';
    if (err.name === 'NotFoundError') messageKey = 'error.camera.notfound';
    setError(t(messageKey));
    setIsLoading(false);
    toast({ variant: 'destructive', title: t('error.title'), description: t(messageKey) });
  }, [t, toast]);

  useEffect(() => {
    if (!isClient) return;
    cleanupStream();
    setIsLoading(true);
    setError(null);

    navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true })
      .then(mediaStream => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack && 'zoom' in videoTrack.getSettings()) {
          const caps = videoTrack.getCapabilities();
          if (caps.zoom) {
            setZoomCapabilities({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step });
          }
        } else {
            setZoomCapabilities(null);
        }
        setIsLoading(false);
      })
      .catch(handleError);

    return () => cleanupStream();
  }, [isClient, facingMode, cleanupStream, handleError]);

  const handleZoomChange = (value: number[]) => {
    if (!stream || !zoomCapabilities) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    setZoom(value[0]);
    videoTrack.applyConstraints({ advanced: [{ zoom: value[0] }] }).catch(() => {
        toast({ variant: 'destructive', title: t('error.title'), description: t('error.zoom.unsupported')});
    });
  };
  
  const drawFrame = useCallback((context: CanvasRenderingContext2D, video: HTMLVideoElement) => {
    const canvas = context.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    if (selectedAsset && overlayRef.current && overlayRef.current.complete) {
        context.drawImage(overlayRef.current, 0, 0, canvas.width, canvas.height);
    }
  }, [facingMode, selectedAsset]);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    drawFrame(context, video);

    const link = document.createElement('a');
    link.download = `candidcam-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: t('photo.saved') });
  }, [drawFrame, t, toast]);

  const recordLoop = useCallback(() => {
    if (!isRecording || !videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (context) {
        drawFrame(context, videoRef.current);
    }
    animationFrameId.current = requestAnimationFrame(recordLoop);
  }, [isRecording, drawFrame]);

  const handleStartRecording = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isRecording) return;
    const canvas = canvasRef.current;
    canvas.width = 1080;
    canvas.height = 1920;

    setIsRecording(true);
    recordedChunksRef.current = [];
    const canvasStream = canvas.captureStream(30);
    
    // Mix audio from camera stream into canvas stream
    if (stream && stream.getAudioTracks().length > 0) {
        stream.getAudioTracks().forEach(audioTrack => canvasStream.addTrack(audioTrack));
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
      a.download = `candidcam-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: t('video.saved') });
    };

    mediaRecorderRef.current.start();
    animationFrameId.current = requestAnimationFrame(recordLoop);
  }, [isRecording, stream, recordLoop, t, toast]);

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

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {isLoading && <Loader className="absolute z-20 h-12 w-12 animate-spin text-primary-foreground" />}
      {error && !isLoading && (
         <div className="absolute z-20 flex flex-col items-center gap-4 text-center text-primary-foreground p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="font-medium">{error}</p>
         </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        onLoadedData={() => setIsLoading(false)}
      ></video>

      {selectedAsset && (
        <Image
          ref={overlayRef}
          crossOrigin="anonymous"
          src={selectedAsset.imageUrl}
          alt={selectedAsset.description}
          fill
          className="pointer-events-none object-contain"
          data-ai-hint={selectedAsset.imageHint}
        />
      )}

      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <LanguageSwitcher />
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
                className="h-20 w-20 rounded-full border-4 border-white bg-transparent hover:bg-white/20 transition-all duration-200 flex items-center justify-center"
                disabled={isLoading || !!error}
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
                    disabled={isLoading || isRecording}
                >
                    <SwitchCamera className="h-6 w-6" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
