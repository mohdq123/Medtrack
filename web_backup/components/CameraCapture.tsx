
import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please check permissions.");
    }
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      
      // Stop stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsActive(false);
    }
  };

  const handleDone = () => {
    if (capturedImage) onCapture(capturedImage);
  };

  const reset = () => {
    setCapturedImage(null);
    startCamera();
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl aspect-square bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl">
        {!capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={capturedImage} className="w-full h-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition">
          <X size={24} />
        </button>
      </div>

      <div className="mt-8 flex items-center gap-6">
        {!capturedImage ? (
          <button 
            onClick={takePhoto}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl border-4 border-slate-300 active:scale-95 transition"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <Camera size={32} />
            </div>
          </button>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={reset}
              className="flex flex-col items-center gap-2 p-4 text-white hover:text-indigo-400 transition"
            >
              <div className="p-4 bg-slate-800 rounded-full"><RefreshCw size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Retake</span>
            </button>
            <button 
              onClick={handleDone}
              className="flex flex-col items-center gap-2 p-4 text-white hover:text-emerald-400 transition"
            >
              <div className="p-4 bg-emerald-600 rounded-full"><Check size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Confirm</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
