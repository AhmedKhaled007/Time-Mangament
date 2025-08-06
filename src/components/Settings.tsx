import React, { useState } from 'react';
import ObsidianControls from './ObsidianControls';
import TickTickSettings from './TickTickSettings';

const Settings: React.FC = () => {
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