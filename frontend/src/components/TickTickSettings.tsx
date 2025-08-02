import React, { useState, useEffect } from 'react';
import { Settings, Key, TestTube, Sync, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TickTickSettings {
  enabled: boolean;
  access_token: string | null;
  default_project_id: string | null;
  username: string | null;
}

interface Project {
  id: string;
  name: string;
}

const TickTickSettings: React.FC = () => {
  const [settings, setSettings] = useState<TickTickSettings>({
    enabled: false,
    access_token: null,
    default_project_id: null,
    username: null
  });
  
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/v1/settings/ticktick');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setIsConnected(!!data.access_token);
        if (data.default_project_id) {
          setSelectedProjectId(data.default_project_id);
        }
      }
    } catch (error) {
      console.error('Failed to load TickTick settings:', error);
    }
  };

  const testConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter your access token');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/ticktick/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Connected successfully! User: ${result.user}`);
        setIsConnected(true);
        
        // Load projects after successful connection
        await loadProjects();
        
        // Update settings with the new token
        await updateSettings({
          ...settings,
          access_token: accessToken,
          username: result.user,
          enabled: true
        });
      } else {
        toast.error(result.message || 'Connection failed');
        setIsConnected(false);
      }
    } catch (error) {
      toast.error('Failed to test connection');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!accessToken.trim()) return;

    try {
      const response = await fetch(`/api/v1/ticktick/projects?access_token=${encodeURIComponent(accessToken)}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const updateSettings = async (newSettings: TickTickSettings) => {
    try {
      const response = await fetch('/api/v1/settings/ticktick', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(newSettings);
        toast.success('Settings updated successfully');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleEnabled = async () => {
    const newSettings = {
      ...settings,
      enabled: !settings.enabled
    };
    await updateSettings(newSettings);
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    const newSettings = {
      ...settings,
      default_project_id: projectId || null
    };
    await updateSettings(newSettings);
  };

  const handleClearSettings = async () => {
    if (confirm('Are you sure you want to clear all TickTick settings?')) {
      try {
        const response = await fetch('/api/v1/settings/ticktick', {
          method: 'DELETE',
        });

        if (response.ok) {
          setSettings({
            enabled: false,
            access_token: null,
            default_project_id: null,
            username: null
          });
          setAccessToken('');
          setIsConnected(false);
          setProjects([]);
          setSelectedProjectId('');
          toast.success('TickTick settings cleared');
        } else {
          toast.error('Failed to clear settings');
        }
      } catch (error) {
        toast.error('Failed to clear settings');
      }
    }
  };

  const syncTasks = async (direction: 'import' | 'export' | 'both') => {
    if (!isConnected || !settings.access_token) {
      toast.error('Please connect to TickTick first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/ticktick/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: settings.access_token,
          project_id: selectedProjectId || null,
          sync_direction: direction
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Sync completed! Imported: ${result.imported}, Exported: ${result.exported}`);
      } else {
        toast.error(`Sync failed. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5" />
        <h2 className="text-xl font-semibold">TickTick Integration</h2>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        {isConnected ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? `Connected (${settings.username})` : 'Not Connected'}
        </span>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={handleToggleEnabled}
            className="sr-only"
          />
          <div className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
          <span className="ml-3 text-sm font-medium">Enable TickTick Integration</span>
        </label>
      </div>

      {/* Access Token Configuration */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          <Key className="w-4 h-4 inline mr-1" />
          Access Token
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Enter your TickTick access token"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={testConnection}
            disabled={isLoading || !accessToken.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {isLoading ? 'Testing...' : 'Test'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Get your access token from TickTick Developer Console
        </p>
      </div>

      {/* Project Selection */}
      {isConnected && projects.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Default Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a project (optional)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sync Controls */}
      {isConnected && settings.enabled && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Sync Tasks</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => syncTasks('import')}
              disabled={isLoading}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Sync className="w-4 h-4" />
              Import from TickTick
            </button>
            <button
              onClick={() => syncTasks('export')}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Sync className="w-4 h-4" />
              Export to TickTick
            </button>
            <button
              onClick={() => syncTasks('both')}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Sync className="w-4 h-4" />
              Sync Both Ways
            </button>
          </div>
        </div>
      )}

      {/* Clear Settings */}
      {isConnected && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleClearSettings}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Clear TickTick Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default TickTickSettings;