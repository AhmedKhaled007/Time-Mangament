import React, { useState } from 'react';
import type { Distraction } from '../types';

interface DistractionTrackerProps {
  distractions: Distraction[];
  onAddDistraction: (distraction: Omit<Distraction, 'id' | 'created_at'>) => Promise<void>;
}

const DistractionTracker: React.FC<DistractionTrackerProps> = ({
  distractions,
  onAddDistraction
}) => {
  const [distractionText, setDistractionText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (distractionText.trim()) {
      await onAddDistraction({
        text: distractionText.trim(),
        time: new Date().toLocaleTimeString()
      });
      setDistractionText('');
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-3 text-center">
        🚫 Distraction Buster
      </h3>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={distractionText}
          onChange={(e) => setDistractionText(e.target.value)}
          placeholder="What distracted you?"
          className="input-field mb-4"
        />
        <div className="text-center">
          <button type="submit" className="btn-primary">
            Log Distraction
          </button>
        </div>
      </form>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {distractions.slice(0, 5).map((distraction) => (
          <div
            key={distraction.id}
            className="bg-white rounded-lg p-3 border-l-4 border-red-400"
          >
            <div className="font-semibold text-sm text-gray-600">
              {distraction.time}
            </div>
            <div className="text-gray-800">{distraction.text}</div>
          </div>
        ))}
        {distractions.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No distractions logged yet. Stay focused! 🎯
          </p>
        )}
      </div>
    </div>
  );
};

export default DistractionTracker;