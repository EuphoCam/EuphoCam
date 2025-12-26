
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Camera, Video, SwitchCamera, Download, Settings, Loader, AlertTriangle, CircleDot, X, RefreshCw, Save } from 'lucide-react';
import { AssetSelector } from './asset-selector';
import { LanguageSwitcher } from './language-switcher';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

type Mode = 'photo' | 'video';
type FacingMode = 'user' | 'environment';
type PreviewType = 'photo' | 'video';
type PhotoFormat = 'png' | 'jpeg';

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
  const animationFrameId = useRef<number>(0);
  const lastRecordFrameTimeRef = useRef<number>(0);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const zoomStartDistRef = useRef<number | null>(null);
  const zoomStartScaleRef = useRef<number>(1);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastZoomTimeRef = useRef<number>(0);
  const zoomIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [mounted, setMounted] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('photo');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [assets, setAssets] = useState<ImagePlaceholder[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ImagePlaceholder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [overlayAspectRatio, setOverlayAspectRatio] = useState<number | null>(null);
  const [digitalZoom, setDigitalZoom] = useState(1);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [previewFileType, setPreviewFileType] = useState<string>('');
  const [photoFormat, setPhotoFormat] = useState<PhotoFormat>('png');


  useEffect(() => {
    setMounted(true);

    const savedFormat = localStorage.getItem('photoFormat') as PhotoFormat | null;
    if (savedFormat && ['png', 'jpeg'].includes(savedFormat)) {
      setPhotoFormat(savedFormat);
    }

    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventDefault);
    document.addEventListener('gesturechange', preventDefault);
    document.addEventListener('gestureend', preventDefault);

    return () => {
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('gestureend', preventDefault);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      if (zoomIndicatorTimeoutRef.current) clearTimeout(zoomIndicatorTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleSetPhotoFormat = (value: PhotoFormat) => {
    setPhotoFormat(value);
    localStorage.setItem('photoFormat', value);
  };

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
    if (!mounted || previewUrl) return;

    const startStream = async () => {
      setIsLoading(true);
      setHasCameraPermission(null);
      setIsVideoReady(false);

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
      setIsVideoReady(false);
    };
  }, [facingMode, mounted, t, toast, previewUrl]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsVideoReady(true);
      }).catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Error playing video:", e)
        }
      });
    }
    setIsLoading(false);
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (previewUrl) return;
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
    if (previewUrl) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 2 && zoomStartDistRef.current) {
      lastZoomTimeRef.current = Date.now();

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / zoomStartDistRef.current;
      const newZoom = Math.min(Math.max(zoomStartScaleRef.current * scaleFactor, 1), 5);
      setDigitalZoom(newZoom);
      setShowZoomIndicator(true);

      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    if (previewUrl) return;
    zoomStartDistRef.current = null;
    if (showZoomIndicator) {
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current);
      }
      zoomIndicatorTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
      }, 500);
    }
  };

  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (previewUrl) return;

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.nativeEvent.clientX;
      clientY = e.nativeEvent.clientY;
    }

    const container = e.currentTarget.getBoundingClientRect();
    const x = clientX - container.left;
    const y = clientY - container.top;

    if (Date.now() - lastZoomTimeRef.current < 300) return;

    setFocusPoint({ x, y, visible: true });
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => {
      setFocusPoint(prev => prev ? { ...prev, visible: false } : null);
    }, 800);

    if (!currentStreamRef.current) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (!capabilities.focusMode) return;

    try {
      await track.applyConstraints({
        advanced: [{ focusMode: 'manual' }]
      } as any);

      let normalizedX = x / container.width;
      const normalizedY = y / container.height;

      if (facingMode === 'user') {
        normalizedX = 1 - normalizedX;
      }

      await track.applyConstraints({
        advanced: [{
          focusMode: 'continuous',
          pointsOfInterest: [{ x: normalizedX, y: normalizedY }]
        }]
      } as any);

    } catch (err) {
      console.debug("Hardware focus failed, relying on default autofocus", err);
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

    const targetW = Math.floor(baseSw);
    const targetH = Math.floor(baseSh);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    context.save();
    if (facingMode === 'user') {
      context.scale(-1, 1);
      context.translate(-canvas.width, 0);
    }
    
    // Fill background for formats that don't support transparency
    if (photoFormat === 'jpeg') {
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }


    context.drawImage(video, zoomedSx, zoomedSy, zoomedSw, zoomedSh, 0, 0, canvas.width, canvas.height);
    context.restore();
    context.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  }, [facingMode, digitalZoom, photoFormat]);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !selectedAsset) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const context = canvas.getContext('2d', { alpha: photoFormat === 'png' });
    if (!context) return;

    drawFrame(context, video);

    const mimeType = `image/${photoFormat}`;
    setPreviewUrl(canvas.toDataURL(mimeType));
    setPreviewType('photo');
    setPreviewFileType(photoFormat === 'png' ? 'png' : 'jpg');
  }, [drawFrame, selectedAsset, photoFormat]);

  const recordLoop = useCallback((timestamp: number) => {
    if (!isRecording) return;

    if (timestamp - lastRecordFrameTimeRef.current >= 32) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          drawFrame(context, video);
          context.getImageData(0, 0, 1, 1);
        }
      }
      lastRecordFrameTimeRef.current = timestamp;
    }

    animationFrameId.current = requestAnimationFrame(recordLoop);
  }, [drawFrame, isRecording]);

  const handleStartRecording = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isRecording || !selectedAsset) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    drawFrame(context, video);

    setIsRecording(true);
    setRecordingTime(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
    }, 1000);

    recordedChunksRef.current = [];
    lastRecordFrameTimeRef.current = performance.now();
    animationFrameId.current = requestAnimationFrame(recordLoop);

    setTimeout(() => {
      try {
        const canvasStream = canvas.captureStream(30);

        if (currentStreamRef.current) {
          currentStreamRef.current.getAudioTracks().forEach(track => {
            canvasStream.addTrack(track.clone());
          });
        }

        const getSupportedMimeType = () => {
          const types = [
            'video/mp4;codecs=avc1',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
          ];
          return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
        };

        const mimeType = getSupportedMimeType();
        if (!mimeType) {
          toast({ variant: 'destructive', title: t('error.title'), description: "Device not supported." });
          return;
        }

        const options = {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 4000000
        };

        const recorder = new MediaRecorder(canvasStream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length === 0) {
            toast({ variant: 'destructive', title: t('error.title'), description: "Recording failed: No data." });
          } else {
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewType('video');
            setPreviewFileType(extension);
          }
        };

        recorder.start(500);

      } catch (err) {
        console.error("Recording error:", err);
        setIsRecording(false);
      }
    }, 250);

  }, [isRecording, recordLoop, drawFrame, selectedAsset, toast, t]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      console.warn("Recorder was not ready yet.");
    }
    
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    setRecordingTime(0);
    setIsRecording(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

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
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    if (zoomIndicatorTimeoutRef.current) clearTimeout(zoomIndicatorTimeoutRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    router.push('/');
  };

  const handleRetake = () => {
    if (previewUrl && previewType === 'video') {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewType(null);
    setPreviewFileType('');
  };
  
  const handleSave = () => {
    if (!previewUrl) return;
  
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `EuphoCam-${Date.now()}.${previewFileType}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    toast({ title: previewType === 'photo' ? t('photo.saved') : t('video.saved') });
    handleRetake();
  };

  const formatRecordingTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };


  if (!mounted) {
    return <div className="absolute z-20 flex h-full w-full items-center justify-center bg-black"><Loader className="h-12 w-12 animate-spin text-primary-foreground" /></div>;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <div className={`absolute top-0 left-0 right-0 bottom-0 z-0 flex items-center justify-center transition-opacity duration-300 ${previewUrl ? 'opacity-0' : 'opacity-100'}`}>
        {(isLoading || hasCameraPermission === null || !isVideoReady) && <Loader className="absolute z-20 h-12 w-12 animate-spin text-primary-foreground" />}
        {hasCameraPermission === false && (
          <div className="absolute z-20 flex flex-col items-center gap-4 text-center text-primary-foreground p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="font-medium">{t('error.camera.permission')}</p>
          </div>
        )}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTapToFocus}
          className={`relative overflow-hidden flex items-center justify-center touch-none ${selectedAsset && overlayAspectRatio && isVideoReady ? 'max-h-full max-w-full' : 'h-full w-full'
          }`}
          style={{ aspectRatio: selectedAsset && overlayAspectRatio && isVideoReady ? overlayAspectRatio : 'auto' }}
        >
          <video
            ref={videoRef}
            style={{
              transform: `${facingMode === 'user' ? 'scaleX(-1)' : ''} scale(${digitalZoom})`
            }}
            className={`h-full w-full ${selectedAsset && overlayAspectRatio && isVideoReady ? 'object-cover' : 'object-contain'
              } ${(hasCameraPermission && !isLoading) ? '' : 'hidden'}`}
            onLoadedData={handleVideoLoaded}
            playsInline
            muted
          ></video>

          {selectedAsset && (
            <Image
              ref={overlayRef}
              crossOrigin="anonymous"
              src={selectedAsset.imageUrl}
              alt={selectedAsset.description}
              fill
              onLoadingComplete={({ naturalWidth, naturalHeight }) => setOverlayAspectRatio(naturalWidth / naturalHeight)}
              className={`pointer-events-none object-cover transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
              data-ai-hint={selectedAsset.imageHint}
              priority
            />
          )}
        </div>

        {showZoomIndicator && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-4 py-2 text-white transition-opacity duration-300">
            <p className="text-lg font-bold">{digitalZoom.toFixed(1)}x</p>
          </div>
        )}

        {focusPoint && (
          <div
            className={`pointer-events-none absolute h-16 w-16 border-2 border-yellow-400 transition-opacity duration-300 ease-out ${focusPoint.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-150'
              }`}
            style={{
              left: focusPoint.x,
              top: focusPoint.y,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)'
            }}
          >
            <div className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400"></div>
          </div>
        )}
      </div>


      <canvas ref={canvasRef}
        className="pointer-events-none absolute opacity-0"
        style={{
          left: '-10000px',
          top: '0',
          visibility: 'hidden'
        }}
      ></canvas>

      <div className={`absolute top-0 left-0 right-0 bottom-0 z-40 transition-opacity duration-300 ${!previewUrl ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {previewUrl &&
          <div className="relative flex h-full w-full items-center justify-center bg-black">
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ aspectRatio: selectedAsset && overlayAspectRatio ? overlayAspectRatio : 'auto' }}
            >
              {previewType === 'photo' && (
                <Image src={previewUrl} alt="Preview" layout="fill" objectFit="contain" />
              )}
              {previewType === 'video' && (
                <video src={previewUrl} className="w-full h-full" autoPlay controls loop />
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center gap-8 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <Button onClick={handleRetake} variant="ghost" size="lg" className="text-white flex-col h-auto gap-1">
                <RefreshCw className="h-8 w-8" />
                <span>{t('retake')}</span>
              </Button>
              <Button onClick={handleSave} variant="ghost" size="lg" className="text-white flex-col h-auto gap-1">
                <Save className="h-8 w-8" />
                <span>{t('save')}</span>
              </Button>
            </div>
          </div>
        }
      </div>


      <div className={`absolute top-4 left-4 z-30 flex items-center gap-4 transition-opacity duration-300 ${previewUrl ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Button onClick={handleGoHome} variant="ghost" size="icon" className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full">
          <X />
        </Button>
        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            <span>{formatRecordingTime(recordingTime)}</span>
          </div>
        )}
      </div>

      <div className={`absolute top-4 right-4 z-30 flex gap-2 transition-opacity duration-300 ${previewUrl ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <LanguageSwitcher className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full" />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground bg-black/30 hover:bg-black/50 hover:text-white rounded-full">
              <Settings />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="px-0 pb-10">
            <SheetHeader className="px-4">
              <SheetTitle>{t('settings')}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium px-4 text-muted-foreground">
                  {t('overlays')}
                </label>

                <div className="w-full">
                  <AssetSelector
                    assets={assets}
                    selectedAsset={selectedAsset}
                    onSelectAsset={setSelectedAsset}
                    onUploadAsset={handleAssetUpload}
                  />
                </div>
              </div>

              <Separator />
              
              <div className="flex flex-col gap-3 px-4">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('photo.format')}
                </label>
                <RadioGroup 
                  value={photoFormat} 
                  onValueChange={(value) => handleSetPhotoFormat(value as PhotoFormat)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png">{t('photo.format.png')}</Label>

                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpeg" id="jpeg" />
                    <Label htmlFor="jpeg">{t('photo.format.jpg')}</Label>
                  </div>
                </RadioGroup>
              </div>

            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-4 p-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${previewUrl ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex w-full max-w-xs items-center justify-around">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="w-auto">
            <TabsList className="bg-black/50 text-white">
              <TabsTrigger value="photo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={isRecording}>{t('photo')}</TabsTrigger>
              <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={isRecording}>{t('video')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex w-full items-center justify-center">
          <div className="flex-1"></div>
          <Button
            aria-label={mode === 'photo' ? t('capture.photo') : (isRecording ? t('stop.recording') : t('start.recording'))}
            onClick={handleShutterClick}
            className="h-20 w-20 rounded-full border-4 border-white bg-transparent hover:bg-white/20 transition-all duration-200 flex items-center justify-center group"
            disabled={!isVideoReady || !hasCameraPermission}
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
