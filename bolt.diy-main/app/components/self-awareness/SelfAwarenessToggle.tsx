import { useState } from 'react';
import { SelfAwarenessPanel } from '~/components/self-awareness/SelfAwarenessPanel';

export function SelfAwarenessToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 flex items-center gap-2"
        title="Open Bolt Self-Awareness"
      >
        <span className="text-lg">🧠</span>
        {!isOpen && <span className="text-sm font-medium">Self-Aware</span>}
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h1 className="text-xl font-bold text-gray-800">🧠 Bolt Self-Awareness System</h1>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4">
              <SelfAwarenessPanel />
            </div>
            
            <div className="border-t p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                <strong>What is Self-Awareness?</strong>
              </p>
              <p className="text-xs text-gray-500">
                This system allows Bolt.diy to analyze and modify its own source code, 
                implementing new features and improvements autonomously. Once you open 
                the source workspace, Bolt can enhance itself with Cursor-like features, 
                multi-model AI capabilities, and advanced autonomous development tools.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
