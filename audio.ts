import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAudioOptions {
  url?: string;
  trimStart?: number;
  trimEnd?: number;
  loop?: boolean;
  autoPlay?: boolean;
  volume?: number;
}

export function useAudioPlayer({
  url,
  trimStart = 0,
  trimEnd,
  loop = true,
  autoPlay = true,
  volume = 0.8,
}: UseAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Initialize or update audio element
  useEffect(() => {
    if (!url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setIsLoaded(false);
      return;
    }

    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const start = Math.max(0, trimStart || 0);

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration || 0;
      setDuration(audioDuration);
      setIsLoaded(true);

      const effectiveStart = Math.min(start, audioDuration > 0 ? audioDuration - 0.1 : 0);
      audio.currentTime = effectiveStart;

      if (autoPlay) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsAutoplayBlocked(false);
          })
          .catch(err => {
            console.log('Autoplay blocked by browser policy:', err);
            setIsAutoplayBlocked(true);
            setIsPlaying(false);
          });
      }
    };

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      const end = trimEnd && trimEnd > start ? trimEnd : audio.duration;
      if (end && cur >= end) {
        if (loop) {
          audio.currentTime = start;
          audio.play().catch(() => {});
        } else {
          audio.pause();
          setIsPlaying(false);
          audio.currentTime = start;
        }
      }
    };

    const handleEnded = () => {
      if (loop) {
        audio.currentTime = start;
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
      }
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [url, trimStart, trimEnd, loop, autoPlay, volume]);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    const start = Math.max(0, trimStart || 0);
    const end = trimEnd && trimEnd > start ? trimEnd : audioRef.current.duration;

    if (audioRef.current.currentTime < start || (end && audioRef.current.currentTime >= end)) {
      audioRef.current.currentTime = start;
    }

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      })
      .catch(err => {
        console.warn('Playback error:', err);
        setIsAutoplayBlocked(true);
      });
  }, [trimStart, trimEnd]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const next = !audioRef.current.muted;
    audioRef.current.muted = next;
    setIsMuted(next);
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    isAutoplayBlocked,
    isLoaded,
    isMuted,
    play,
    pause,
    toggle,
    toggleMute,
    seek,
  };
}
