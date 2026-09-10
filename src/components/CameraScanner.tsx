/**
 * CameraScanner Component
 * 
 * Uses Capacitor Camera plugin to scan QR codes.
 * Falls back to manual input on web platforms.
 */

import { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ZXingBrowserMultiFormatReader } from '@zxing/browser';
import { BrowserMultiFormatReader } from '@zxing/library';

export interface ScanResult {
  text: string;
  format: string;
}

interface CameraScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

/**
 * Check if running on native platform
 */
function isNativePlatform(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * CameraScanner component
 * 
 * Uses Capacitor Camera on native platforms,
 * falls back to browser camera on web.
 */
export function CameraScanner({ onScan, onError, enabled = true }: CameraScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  /**
   * Start camera scanning
   */
  const startCamera = async () => {
    if (!enabled) return;
    
    try {
      setError(null);
      
      if (isNativePlatform()) {
        // Native platform: use Capacitor Camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });
        
        await processImage(image.webPath || image.path);
      } else {
        // Web platform: use browser camera
        await startWebCamera();
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur lors du scan';
      setError(msg);
      onError?.(msg);
    }
  };

  /**
   * Start web camera for continuous scanning
   */
  const startWebCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setScanning(true);
      
      // Create QR code reader
      const codeReader = new ZXingBrowserMultiFormatReader();
      analyzerRef.current = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            stopCamera();
            onScan({
              text: result.text,
              format: result.format?.formatName || 'QR_CODE',
            });
          }
          if (err && err.name !== 'NotFoundError') {
            console.error('QR decode error:', err);
          }
        }
      );
    } catch (err) {
      setError('Impossible d\'accéder à la caméra');
      onError?.('Camera access denied');
    }
  };

  /**
   * Process captured image for QR decoding
   */
  const processImage = async (imagePath: string) => {
    try {
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(imagePath);
      
      onScan({
        text: result.text,
        format: result.format?.formatName || 'QR_CODE',
      });
    } catch (err) {
      setError('QR code non détecté');
      onError?.('No QR code found');
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera preview */}
      {scanning && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            autoPlay
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50" />
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
            Positionnez le QR code dans le cadre
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={startCamera}
          disabled={!enabled || scanning}
          className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
        >
          {scanning ? 'Scan en cours...' : 'Scanner QR'}
        </button>
        {scanning && (
          <button
            onClick={stopCamera}
            className="px-4 py-3 rounded-xl bg-secondary text-text-primary"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

export default CameraScanner;
