import React from 'react';
import type { Distraction } from '../types';

interface StatsCardProps {
  focusSessions: number;
  distractions: Distraction[];
}

const StatsCard: React.FC<StatsCardProps> = ({
  focusSessions,
  distractions
}) => {
  const distractionCount = distractions.length;
  const productivityScore = Math.max(0, 100 - (distractionCount * 10));

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-3">
        📊 Today's Progress
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{focusSessions}</div>
          <div className="text-sm text-gray-600">Focus Sessions</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">-</div>
          <div className="text-sm text-gray-600">Tasks Done</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{distractionCount}</div>
          <div className="text-sm text-gray-600">Distractions</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{productivityScore}</div>
          <div className="text-sm text-gray-600">Focus Score</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;