import React from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'daily', label: '📅 Daily Focus' },
    { id: 'weekly', label: '🗓️ Weekly Planner' }
  ];

  return (
    <div className="flex bg-gray-100 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-8 py-4 text-lg font-semibold transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;