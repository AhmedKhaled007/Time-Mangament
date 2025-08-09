import React, { useState } from 'react';
import ObsidianControls from './ObsidianControls';
import TickTickSettings from './TickTickSettings';

interface SettingsProps {
  weekStartDay: string;
  onWeekStartDayChange: (day: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ weekStartDay, onWeekStartDayChange }) => {
  const [obsidianPath, setObsidianPath] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">⚙️ Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Obsidian Integration */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📝 Obsidian Integration</h2>
          <ObsidianControls
            obsidianPath={obsidianPath}
            onPathChange={setObsidianPath}
            autoSyncEnabled={autoSyncEnabled}
            onAutoSyncToggle={setAutoSyncEnabled}
          />
        </div>

        {/* TickTick Integration */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">✅ TickTick Integration</h2>
          <TickTickSettings />
        </div>

        {/* Week Settings */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📅 Week Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week starts on:
              </label>
              <select
                value={weekStartDay}
                onChange={(e) => onWeekStartDayChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today (Dynamic)</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {weekStartDay === 'today' 
                  ? 'Week will always start from today\'s date'
                  : `Week will start from the selected day of the week`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔧 General Settings</h2>
          <p className="text-gray-600">Timer settings, notifications, and other preferences coming soon...</p>
        </div>

        {/* Data Management */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">💾 Data Management</h2>
          <p className="text-gray-600">Export/import data, backup settings, and data cleanup options coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;