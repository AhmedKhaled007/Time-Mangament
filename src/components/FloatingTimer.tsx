import React, { useState, useEffect, useRef } from 'react';
import AlwaysOnTopTimer from './AlwaysOnTopTimer';

interface FloatingTimerProps {
  timeLeft: number;
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRestore: () => void;
  onHide: () => void;
  isVisible: boolean;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({
  timeLeft,
  isRunning,
  status,
  onStart,
  onPause,
  onReset,
  onRestore,
  onHide,
  isVisible
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Create canvas timer for Picture-in-Picture
  const drawTimerOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 320;
    canvas.height = 180;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw timer background
    ctx.fillStyle = '#374151';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Draw timer text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timeLeft), canvas.width / 2, canvas.height / 2 + 10);

    // Draw status text
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.fillText(status, canvas.width / 2, canvas.height / 2 + 35);

    // Draw running indicator
    if (isRunning) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - 100, canvas.height / 2, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Update canvas when timer changes
  useEffect(() => {
    if (isPictureInPicture) {
      drawTimerOnCanvas();
    }
  }, [timeLeft, isRunning, status, isPictureInPicture]);

  // Continuous canvas update for Picture-in-Picture
  useEffect(() => {
    let animationFrame: number;
    
    if (isPictureInPicture) {
      const updateCanvas = () => {
        drawTimerOnCanvas();
        animationFrame = requestAnimationFrame(updateCanvas);
      };
      updateCanvas();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPictureInPicture, timeLeft, isRunning, status]);

  // Picture-in-Picture functionality
  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!document.pictureInPictureElement) {
        // Check if Picture-in-Picture is supported
        if (!('pictureInPictureEnabled' in document)) {
          alert('Picture-in-Picture is not supported in this browser. Try using Chrome, Edge, or Safari.');
          return;
        }

        // Enter Picture-in-Picture
        drawTimerOnCanvas();
        const canvas = canvasRef.current;
        if (canvas) {
          // Check if captureStream is supported
          if (!canvas.captureStream) {
            alert('Canvas streaming is not supported in this browser. This feature works best in Chrome.');
            return;
          }

          const stream = canvas.captureStream(30); // 30 FPS for smoother updates
          video.srcObject = stream;
          
          // Wait for video to load
          await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
          });
          
          await video.play();
          await video.requestPictureInPicture();
          setIsPictureInPicture(true);
        }
      } else {
        // Exit Picture-in-Picture
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      }
    } catch (error) {
      console.error('Error toggling Picture-in-Picture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Picture-in-Picture failed: ${errorMessage}. This feature works best in Chrome with a running timer.`);
    }
  };

  // Handle Picture-in-Picture events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPictureInPicture(true);
    const handleLeavePiP = () => setIsPictureInPicture(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('draggable')) {
      setIsDragging(true);
      const rect = timerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible) return null;

  return (
    <div
      ref={timerRef}
      className="floating-timer"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="floating-timer-header draggable p-2">
        <div className="floating-timer-title draggable text-sm font-semibold">⏰ Focus Timer</div>
        <div className="flex gap-1">
          <button
            onClick={togglePictureInPicture}
            className="floating-timer-btn min-w-[32px] min-h-[32px] touch-manipulation"
            title={isPictureInPicture ? "Exit Picture-in-Picture" : "Picture-in-Picture (Chrome/Edge)"}
          >
            📺
          </button>
          <AlwaysOnTopTimer
            timeLeft={timeLeft}
            isRunning={isRunning}
            status={status}
            onStart={onStart}
            onPause={onPause}
            onReset={onReset}
            isVisible={true}
          />
          <button
            onClick={onRestore}
            className="floating-timer-btn min-w-[32px] min-h-[32px] touch-manipulation"
            title="Restore"
          >
            🔍
          </button>
          <button
            onClick={onHide}
            className="floating-timer-btn min-w-[32px] min-h-[32px] touch-manipulation"
            title="Hide"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="floating-timer-display draggable text-xl sm:text-2xl font-bold text-center py-2">
        {formatTime(timeLeft)}
      </div>
      <div className="floating-timer-status draggable text-center text-xs sm:text-sm mb-2">
        {status}
      </div>
      <div className="flex gap-1 justify-center px-2">
        <button
          onClick={onStart}
          disabled={isRunning}
          className="floating-timer-action min-w-[36px] min-h-[36px] touch-manipulation"
        >
          ▶️
        </button>
        <button
          onClick={onPause}
          disabled={!isRunning}
          className="floating-timer-action min-w-[36px] min-h-[36px] touch-manipulation"
        >
          ⏸️
        </button>
        <button
          onClick={onReset}
          className="floating-timer-action min-w-[36px] min-h-[36px] touch-manipulation"
        >
          🔄
        </button>
      </div>

      {/* Hidden video and canvas for Picture-in-Picture */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FloatingTimer;