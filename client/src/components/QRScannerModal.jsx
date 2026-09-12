import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      const qrRegionId = "qr-reader-container";
      const qrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await qrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          console.log('[QR Scanned text]:', decodedText);
          
          let parsedCode = decodedText.trim();
          // If URL like http://192.168.1.5:5173/?room=XYZ123
          try {
            if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
              const url = new URL(decodedText);
              const roomParam = url.searchParams.get('room');
              if (roomParam) {
                parsedCode = roomParam;
              }
            }
          } catch (e) {
            // keep raw text
          }

          stopScanner();
          onScanSuccess(parsedCode.toUpperCase());
          onClose();
        },
        (errorMessage) => {
          // Frame parse failure (normal while scanning)
        }
      );
    } catch (err) {
      console.error('[QR Scanner Error]:', err);
      setError(err.message || 'Unable to access device camera. Please allow camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scan Room QR</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Point your camera at a room QR code</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="relative w-full aspect-square bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-700">
          <div id="qr-reader-container" className="w-full h-full overflow-hidden" />

          {isScanning && !error && (
            <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/50 m-12 rounded-2xl animate-pulse">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-400 -mt-1 -ml-1 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-400 -mt-1 -mr-1 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-400 -mb-1 -ml-1 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-400 -mb-1 -mr-1 rounded-br-lg" />
            </div>
          )}

          {error && (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-xs text-rose-400">{error}</p>
              <button
                onClick={startScanner}
                className="btn-secondary text-xs py-1.5 px-3 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scanning works directly on phones or webcams with zero data sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
