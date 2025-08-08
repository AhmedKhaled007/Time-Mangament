import React from 'react';

interface PomodoroTimerProps {
  timeLeft: number;
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  isMinimized: boolean;
  onMinimize: () => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  timeLeft,
  isRunning,
  status,
  onStart,
  onPause,
  onReset,
  isMinimized,
  onMinimize
}) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    onStart();
    if (!isMinimized) {
      onMinimize();
    }
  };

  return (
    <div className={`card text-center bg-gradient-to-br from-pink-400 to-pink-500 text-white ${
      isMinimized ? 'opacity-30 pointer-events-none' : ''
    }`}>
      <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 border-b-2 border-white border-opacity-30 pb-3">
        ⏰ Focus Timer (Pomodoro)
      </h3>
      <div className="timer-display text-4xl sm:text-5xl lg:text-6xl font-bold my-4 sm:my-6 font-mono">
        {formatTime(timeLeft)}
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4 sm:mb-6">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="btn-primary disabled:opacity-50 min-w-[80px] min-h-[44px] text-sm sm:text-base touch-manipulation"
        >
          Start
        </button>
        <button
          onClick={onPause}
          disabled={!isRunning}
          className="btn-primary disabled:opacity-50 min-w-[80px] min-h-[44px] text-sm sm:text-base touch-manipulation"
        >
          Pause
        </button>
        <button
          onClick={onReset}
          className="btn-primary min-w-[80px] min-h-[44px] text-sm sm:text-base touch-manipulation"
        >
          Reset
        </button>
        <button
          onClick={onMinimize}
          className="btn-secondary min-w-[100px] min-h-[44px] text-sm sm:text-base touch-manipulation"
        >
          📱 Minimize
        </button>
      </div>
      <p className="text-base sm:text-lg font-medium">{status}</p>
    </div>
  );
};

export default PomodoroTimer;