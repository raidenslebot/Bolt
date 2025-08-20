import { useState } from 'react';
import { toast } from 'react-toastify';

interface SelfAwarenessStatus {
  initialized: boolean;
  sourceRoot: string;
  analysis: any;
  capabilities: any[];
  canSelfModify: boolean;
  canOpenSourceWorkspace: boolean;
}

export function SelfAwarenessPanel() {
  const [status, setStatus] = useState<SelfAwarenessStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-awareness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-status' })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      } else {
        toast.error('Failed to get self-awareness status');
      }
    } catch (error) {
      toast.error('Error fetching status');
    } finally {
      setLoading(false);
    }
  };

  const openSourceWorkspace = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-awareness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open-source-workspace' })
      });
      
      const data = await response.json();
      if (data.success) {
        setWorkspaceOpen(true);
        toast.success(`Source workspace opened: ${data.data.sourcePath}`);
        
        // Show analysis results
        const { fileCount, codeLines, enhancements } = data.data;
        toast.info(`Analysis: ${fileCount} files, ${codeLines} lines of code`);
        
      } else {
        toast.error(data.message || 'Failed to open source workspace');
      }
    } catch (error) {
      toast.error('Error opening workspace');
    } finally {
      setLoading(false);
    }
  };

  const implementCapability = async (capability: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/self-awareness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'implement-capability',
          capability 
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        if (data.data.filesModified.length > 0) {
          toast.info(`Modified ${data.data.filesModified.length} files`);
        }
      } else {
        toast.error(data.message || 'Failed to implement capability');
      }
    } catch (error) {
      toast.error('Error implementing capability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🧠</div>
        <h2 className="text-xl font-bold text-gray-800">Bolt Self-Awareness</h2>
      </div>
      
      {!status && (
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Initialize Self-Awareness'}
        </button>
      )}
      
      {status && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Status</div>
              <div className={`font-bold ${status.initialized ? 'text-green-600' : 'text-red-600'}`}>
                {status.initialized ? '✅ Initialized' : '❌ Not Initialized'}
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Source Root</div>
              <div className="text-xs text-gray-600 break-all">{status.sourceRoot}</div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Can Self-Modify</div>
              <div className={`font-bold ${status.canSelfModify ? 'text-green-600' : 'text-red-600'}`}>
                {status.canSelfModify ? '✅ Yes' : '❌ No'}
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Capabilities</div>
              <div className="text-sm text-gray-600">{status.capabilities?.length || 0} available</div>
            </div>
          </div>
          
          {workspaceOpen && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-bold text-green-800 mb-2">🚀 Source Workspace Open</h3>
              <p className="text-green-700 text-sm mb-3">
                Bolt.diy can now analyze and modify its own source code!
              </p>
              
              {status.analysis && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium">Files</div>
                    <div className="font-bold text-blue-600">{status.analysis.totalFiles}</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium">Code Lines</div>
                    <div className="font-bold text-blue-600">{status.analysis.codeLines}</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium">Enhancements</div>
                    <div className="font-bold text-blue-600">
                      {status.analysis.enhancement?.existingEnhancements?.length || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            {!workspaceOpen && (
              <button
                onClick={openSourceWorkspace}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <span>📂</span>
                {loading ? 'Opening...' : 'Open Source Workspace'}
              </button>
            )}
            
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              🔄 Refresh Status
            </button>
          </div>
          
          {status.capabilities && status.capabilities.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-gray-800 mb-3">🚀 Self-Improvement Capabilities</h3>
              <div className="grid gap-3">
                {status.capabilities.map((capability: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-800">{capability.name}</div>
                        <div className="text-xs text-gray-600">{capability.description}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className={`px-2 py-1 rounded text-white ${
                          capability.potentialImpact === 'revolutionary' ? 'bg-red-500' :
                          capability.potentialImpact === 'high' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}>
                          {capability.potentialImpact}
                        </div>
                      </div>
                    </div>
                    
                    {capability.canImplement && workspaceOpen && (
                      <button
                        onClick={() => implementCapability(capability.name)}
                        disabled={loading}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Implementing...' : '🔧 Implement'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
