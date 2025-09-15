"use client";

import React, { useRef, useEffect, useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Use back camera on mobile
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
          setError(null);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setHasPermission(false);

        let errorMessage = "Could not access camera";
        if (err.name === "NotAllowedError") {
          errorMessage = "Camera permission denied. Please allow camera access and refresh.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera found on this device.";
        }

        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    // Simple QR detection (in production, you'd use a proper QR library like jsQR)
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId = requestAnimationFrame(detectQR);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // In a real implementation, you would use jsQR here to detect QR codes
      // For now, we'll simulate QR detection with a manual input option

      animationId = requestAnimationFrame(detectQR);
    };

    startCamera();

    // Start QR detection loop once video is playing
    if (videoRef.current) {
      videoRef.current.addEventListener("loadeddata", detectQR);
    }

    return () => {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (videoRef.current) {
        videoRef.current.removeEventListener("loadeddata", detectQR);
      }
    };
  }, [onError]);

  // Simulate QR code scan (for development purposes)
  const handleTestScan = () => {
    const mockQRData = {
      participant_code: "LFG-0001",
      participant_id: "mock-uuid-123",
      timestamp: new Date().toISOString(),
      expires: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    };
    onScan(JSON.stringify(mockQRData));
  };

  if (hasPermission === false || error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Camera permission is required to scan QR codes"}
          </AlertDescription>
        </Alert>

        {/* Development fallback */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">Camera not available</p>
          <button
            onClick={handleTestScan}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Scan (Development)
          </button>
        </div>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
        <p className="text-gray-500">Requesting camera access...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
        />

        {/* QR targeting overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white rounded-lg w-48 h-48 relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400"></div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for QR detection */}
      <canvas ref={canvasRef} className="hidden" />

      <p className="text-center text-sm text-gray-600">
        Position the QR code within the frame to scan
      </p>

      {/* Development test button */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={handleTestScan}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm"
        >
          Test Scan (Development Mode)
        </button>
      )}
    </div>
  );
}