import React, { useState, useEffect } from 'react';
import type { WeeklyTask } from '../types';
import { obsidianApi } from '../services/api';

interface ObsidianControlsProps {
  obsidianPath: string;
  onPathChange: (path: string) => void;
  autoSyncEnabled: boolean;
  onAutoSyncToggle: (enabled: boolean) => void;
  weeklyTasks?: WeeklyTask[];
  currentWeekStart?: Date;
}

const ObsidianControls: React.FC<ObsidianControlsProps> = ({
  obsidianPath,
  onPathChange,
  autoSyncEnabled,
  onAutoSyncToggle
}) => {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Obsidian settings from backend on component mount
  useEffect(() => {
    const loadObsidianSettings = async () => {
      try {
        const syncStatus = await obsidianApi.getSyncStatus();
        
        // Use vault_folder_path or fallback to vault_path for backwards compatibility
        const path = syncStatus.vault_folder_path || syncStatus.vault_path;
        if (path) {
          onPathChange(path);
        }
        
        if (syncStatus.auto_sync_enabled) {
          onAutoSyncToggle(syncStatus.auto_sync_enabled);
        }
      } catch (error) {
        console.error('Failed to load Obsidian settings:', error);
        // Don't show error to user on initial load, just log it
      }
    };

    loadObsidianSettings();
  }, []); // Empty dependency array means this runs once on mount

  const setObsidianPath = async () => {
    if (!obsidianPath.trim()) {
      setStatus('⚠️ Please enter a valid folder path');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    // Remove validation for .md extension since we're now accepting folder paths
    // The backend will automatically create weekly files in this folder

    setIsLoading(true);
    try {
      // Send path to backend to enable auto-sync
      const result = await obsidianApi.setVaultPath(obsidianPath);
      
      if (result.success) {
        onPathChange(obsidianPath);
        onAutoSyncToggle(true);
        setStatus('✅ Auto-sync enabled! Weekly files will be created automatically.');
        
        // Trigger initial sync
        await obsidianApi.manualSync();
      } else {
        setStatus(`❌ Failed to set path: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to set Obsidian path:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`❌ Error: ${message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const manualSync = async () => {
    if (!autoSyncEnabled || !obsidianPath) {
      setStatus('⚠️ Please enable auto-sync first');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await obsidianApi.manualSync();
      
      if (result.success) {
        setStatus(`✅ Synced successfully to ${result.file_path?.split(/[\\/]/).pop()}`);
      } else {
        setStatus(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`❌ Sync error: ${message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  return (
    <div className="bg-purple-600 text-white p-4 rounded-lg mb-6">
      <h4 className="text-lg font-bold mb-4">🔗 Obsidian Auto-Sync Integration</h4>
      
      <div className="mb-4">
        <label className="block mb-2 font-semibold text-white">Obsidian Vault Folder:</label>
        <input
          type="text"
          value={obsidianPath}
          onChange={(e) => onPathChange(e.target.value)}
          placeholder="Enter path to your Obsidian vault folder (e.g., C:/Users/YourName/Documents/MyVault)"
          className="w-full p-2 rounded text-gray-800 mb-3"
          disabled={isLoading}
        />
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={setObsidianPath}
            disabled={isLoading}
            className="bg-white text-purple-600 px-4 py-2 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Setting up...' : '💾 Enable Auto-Sync'}
          </button>
          {autoSyncEnabled && (
            <button
              onClick={manualSync}
              disabled={isSyncing}
              className="bg-white text-purple-600 px-4 py-2 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? '🔄 Syncing...' : '🔄 Manual Sync'}
            </button>
          )}
          {status && (
            <span className="text-white text-sm">{status}</span>
          )}
        </div>
      </div>

      <div className="mb-3 p-3 bg-white bg-opacity-10 rounded">
        <strong>Vault Folder:</strong>{' '}
        <span className="text-gray-200 text-sm">
          {obsidianPath || 'No folder set'}
        </span>
      </div>

      <div className="mb-3 p-2 bg-white bg-opacity-10 rounded text-sm">
        <strong>Auto-Sync Status:</strong>{' '}
        <span style={{ color: autoSyncEnabled ? '#4CAF50' : '#ff6b6b' }}>
          {autoSyncEnabled ? 'Enabled' : 'Disabled'}
        </span>
        {autoSyncEnabled && ' - Weekly files are automatically created in your vault folder when tasks change'}
      </div>

      <div className="mb-4 p-2 bg-white bg-opacity-10 rounded text-xs text-gray-200">
        💡 <strong>How it works:</strong> Set your Obsidian vault folder above, and the system will automatically 
        create weekly files (e.g., weekly-planer-2-8-2025.md) in that folder whenever your tasks change. Each week gets its own file!
      </div>
    </div>
  );
};

export default ObsidianControls;