import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseBlowDetectorOptions {
  sensitivity?: number; // 0.05 (most sensitive) to 0.4 (requires harder blow)
  onBlowDetected: () => void;
}

export function useBlowDetector({ sensitivity = 0.15, onBlowDetected }: UseBlowDetectorOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sustainedCountRef = useRef<number>(0);
  const hasTriggeredRef = useRef<boolean>(false);

  // Check support on mount
  useEffect(() => {
    const supported = !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    );
    setIsSupported(supported);
  }, []);

  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setCurrentLevel(0);
    sustainedCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setPermissionError('Microphone is not supported in this browser.');
      return;
    }

    try {
      setPermissionError(null);
      hasTriggeredRef.current = false;
      sustainedCountRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        if (!analyserRef.current || hasTriggeredRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Human blow air creates high turbulence in low-to-mid frequencies (60Hz - 600Hz)
        // With fftSize=512 at 44.1kHz, each bin is ~86Hz. Bins 1..8 cover ~86Hz to ~700Hz.
        let lowFreqSum = 0;
        const checkBins = Math.min(10, bufferLength);
        for (let i = 1; i < checkBins; i++) {
          lowFreqSum += dataArray[i];
        }
        const avg = lowFreqSum / (checkBins - 1) / 255;
        setCurrentLevel(avg);

        // Compare against configured sensitivity
        // Sensitivity range: 0.05 (easy) to 0.4 (hard)
        if (avg > sensitivity) {
          sustainedCountRef.current += 1;
          // Must sustain for at least ~8 frames (~130ms) to filter out instant tap clicks
          if (sustainedCountRef.current >= 6) {
            hasTriggeredRef.current = true;
            stopListening();
            onBlowDetected();
            return;
          }
        } else {
          sustainedCountRef.current = Math.max(0, sustainedCountRef.current - 1);
        }

        animFrameRef.current = requestAnimationFrame(checkAudio);
      };

      animFrameRef.current = requestAnimationFrame(checkAudio);
    } catch (err: unknown) {
      console.warn('Microphone permission denied or failed:', err);
      const message = err instanceof Error ? err.message : 'Permission denied';
      setPermissionError(message.includes('Permission') ? 'Microphone permission was denied.' : 'Could not access microphone.');
      setIsListening(false);
    }
  }, [isSupported, sensitivity, stopListening, onBlowDetected]);

  return {
    isListening,
    isSupported,
    permissionError,
    currentLevel,
    startListening,
    stopListening,
  };
}
