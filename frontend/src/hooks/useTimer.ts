import { useState, useEffect, useRef } from 'react';

export const useTimer = (initialMinutes: number = 25, onComplete?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Ready to focus! 🎯');
  const intervalRef = useRef<number | null>(null);

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
      console.log('Sound not supported:', error);
    }
  };

  const start = () => {
    if (!isRunning) {
      setIsRunning(true);
      setStatus('Focus mode ON! 🔥');
    }
  };

  const pause = () => {
    setIsRunning(false);
    setStatus('Paused ⏸️');
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(initialMinutes * 60);
    setStatus('Ready to focus! 🎯');
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setStatus('Great work! Take a 5min break 🎉');
            playCompletionSound();
            if (onComplete) {
              onComplete();
            }
            setTimeout(() => reset(), 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, initialMinutes, onComplete]);

  useEffect(() => {
    // Update document title with timer when running
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (isRunning) {
      document.title = `⏰ ${formatTime(timeLeft)} - Dev Time Master`;
    } else {
      document.title = 'Dev Time Master';
    }
  }, [isRunning, timeLeft]);

  return {
    timeLeft,
    isRunning,
    status,
    start,
    pause,
    reset
  };
};