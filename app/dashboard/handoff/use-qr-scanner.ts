"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function useQrScanner(onDetect: (value: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(window.BarcodeDetector);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("Camera scan not supported on this device/browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        setError("Scanner preview not ready.");
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);

      const Detector = window.BarcodeDetector;
      if (!Detector) {
        setError("Barcode detector unavailable.");
        return;
      }
      const detector = new Detector({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !isScanning) return;
        try {
          const results = await detector.detect(videoRef.current);
          const first = results[0]?.rawValue?.trim();
          if (first) {
            onDetect(first);
            stop();
            return;
          }
        } catch {
          // keep scanning; camera pipelines can be noisy
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Unable to access camera. Check camera permission.");
      stop();
    }
  }, [isScanning, onDetect, stop, supported]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    supported,
    isScanning,
    error,
    start,
    stop,
    videoRef,
  };
}
