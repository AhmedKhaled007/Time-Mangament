import React, { useEffect, useState } from 'react';

interface AlwaysOnTopTimerProps {
  timeLeft: number;
  isRunning: boolean;
  status: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  isVisible: boolean;
}

const AlwaysOnTopTimer: React.FC<AlwaysOnTopTimerProps> = ({
  timeLeft,
  isRunning,
  status,
  onStart,
  onPause,
  onReset,
  isVisible
}) => {
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openPopupTimer = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
      return;
    }

    const popup = window.open(
      '',
      'TimerPopup',
      'width=300,height=200,top=100,left=100,alwaysRaised=yes,resizable=no,scrollbars=no,menubar=no,toolbar=no,location=no,status=no'
    );

    if (popup) {
      setPopupWindow(popup);
      
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pomodoro Timer</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              box-sizing: border-box;
            }
            .timer-display {
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .status {
              font-size: 14px;
              margin-bottom: 20px;
              opacity: 0.8;
            }
            .controls {
              display: flex;
              gap: 10px;
            }
            button {
              padding: 8px 12px;
              border: none;
              border-radius: 5px;
              background: rgba(255,255,255,0.2);
              color: white;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover {
              background: rgba(255,255,255,0.3);
            }
            button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .running {
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.7; }
              100% { opacity: 1; }
            }
          </style>
        </head>
        <body>
          <div class="timer-display" id="timer">00:00</div>
          <div class="status" id="status">Ready</div>
          <div class="controls">
            <button onclick="parent.postMessage('start', '*')" id="startBtn">▶️</button>
            <button onclick="parent.postMessage('pause', '*')" id="pauseBtn">⏸️</button>
            <button onclick="parent.postMessage('reset', '*')" id="resetBtn">🔄</button>
          </div>
        </body>
        </html>
      `);

      popup.document.close();

      // Handle messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== popup) return;
        
        switch (event.data) {
          case 'start':
            onStart();
            break;
          case 'pause':
            onPause();
            break;
          case 'reset':
            onReset();
            break;
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup when popup closes
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setPopupWindow(null);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    }
  };

  // Update popup content when timer changes
  useEffect(() => {
    if (popupWindow && !popupWindow.closed) {
      const timerEl = popupWindow.document.getElementById('timer');
      const statusEl = popupWindow.document.getElementById('status');
      const startBtn = popupWindow.document.getElementById('startBtn') as HTMLButtonElement;
      const pauseBtn = popupWindow.document.getElementById('pauseBtn') as HTMLButtonElement;
      
      if (timerEl) {
        timerEl.textContent = formatTime(timeLeft);
        timerEl.className = isRunning ? 'timer-display running' : 'timer-display';
      }
      if (statusEl) statusEl.textContent = status;
      if (startBtn) startBtn.disabled = isRunning;
      if (pauseBtn) pauseBtn.disabled = !isRunning;
    }
  }, [timeLeft, isRunning, status, popupWindow]);

  if (!isVisible) return null;

  return (
    <button
      onClick={openPopupTimer}
      className="floating-timer-btn"
      title="Open Always-On-Top Timer"
    >
      🖼️ Popup Timer
    </button>
  );
};

export default AlwaysOnTopTimer;