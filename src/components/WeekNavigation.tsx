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
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 px-2 sm:px-5 gap-3 sm:gap-0">
      <button
        onClick={() => onWeekChange(-1)}
        className="bg-blue-500 text-white px-4 py-3 rounded-full text-sm hover:bg-blue-600 transition-colors min-h-[44px] touch-manipulation order-1 sm:order-none w-full sm:w-auto"
      >
        ← Previous Week
      </button>
      
      <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 text-center order-0 sm:order-none px-2">
        {getWeekTitle()}
      </div>
      
      <button
        onClick={() => onWeekChange(1)}
        className="bg-blue-500 text-white px-4 py-3 rounded-full text-sm hover:bg-blue-600 transition-colors min-h-[44px] touch-manipulation order-2 sm:order-none w-full sm:w-auto"
      >
        Next Week →
      </button>
    </div>
  );
};

export default WeekNavigation;