import React, { useState, useEffect, useRef } from 'react';

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
  const timerRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      <div className="floating-timer-header draggable">
        <div className="floating-timer-title draggable">⏰ Focus Timer</div>
        <div className="flex gap-1">
          <button
            onClick={onRestore}
            className="floating-timer-btn"
            title="Restore"
          >
            🔍
          </button>
          <button
            onClick={onHide}
            className="floating-timer-btn"
            title="Hide"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="floating-timer-display draggable">
        {formatTime(timeLeft)}
      </div>
      <div className="floating-timer-status draggable text-center text-sm mb-3">
        {status}
      </div>
      <div className="flex gap-1 justify-center">
        <button
          onClick={onStart}
          disabled={isRunning}
          className="floating-timer-action"
        >
          ▶️
        </button>
        <button
          onClick={onPause}
          disabled={!isRunning}
          className="floating-timer-action"
        >
          ⏸️
        </button>
        <button
          onClick={onReset}
          className="floating-timer-action"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default FloatingTimer;