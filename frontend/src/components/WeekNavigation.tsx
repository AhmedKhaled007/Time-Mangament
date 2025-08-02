import React from 'react';

interface WeekNavigationProps {
  currentWeekStart: Date;
  onWeekChange: (direction: number) => void;
}

const WeekNavigation: React.FC<WeekNavigationProps> = ({
  currentWeekStart,
  onWeekChange
}) => {
  const getWeekTitle = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    const startStr = currentWeekStart.toLocaleDateString('en-US', options);
    const endStr = weekEnd.toLocaleDateString('en-US', options);
    const year = currentWeekStart.getFullYear();
    
    return `Week of ${startStr} - ${endStr}, ${year}`;
  };

  return (
    <div className="flex justify-between items-center mb-6 px-5">
      <button
        onClick={() => onWeekChange(-1)}
        className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-600 transition-colors"
      >
        ← Previous Week
      </button>
      
      <div className="text-xl font-bold text-gray-800">
        {getWeekTitle()}
      </div>
      
      <button
        onClick={() => onWeekChange(1)}
        className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-600 transition-colors"
      >
        Next Week →
      </button>
    </div>
  );
};

export default WeekNavigation;