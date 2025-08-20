import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { useChatHistory } from '~/lib/persistence';
import { DeployButton } from '~/components/deploy/DeployButton';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const [showAIStatus, setShowAIStatus] = useState(false);
  const [aiSystemStatus] = useState<'ready' | 'initializing' | 'error'>('ready');
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const isStreaming = useStore(streamingState);
  const { exportChat } = useChatHistory();

  const shouldShowButtons = !isStreaming && activePreview;

  const getAIStatusColor = () => {
    switch (aiSystemStatus) {
      case 'ready': return 'text-green-400';
      case 'initializing': return 'text-yellow-400 animate-pulse';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAIStatusIcon = () => {
    switch (aiSystemStatus) {
      case 'ready': return 'i-ph:robot-bold';
      case 'initializing': return 'i-ph:spinner-gap-bold animate-spin';
      case 'error': return 'i-ph:warning-bold';
      default: return 'i-ph:robot-bold';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Enhanced AI Status Indicator */}
      <div className="relative">
        <IconButton
          onClick={() => setShowAIStatus(!showAIStatus)}
          className={classNames(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
            'bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3',
            'border border-bolt-elements-borderColor'
          )}
          title="Enhanced AI System - Click for details"
        >
          <div className={classNames(getAIStatusIcon(), 'text-sm', getAIStatusColor())} />
          <span className="text-xs font-medium text-bolt-elements-textSecondary">
            Enhanced AI
          </span>
          <div className={classNames(
            'w-2 h-2 rounded-full',
            aiSystemStatus === 'ready' && 'bg-green-400',
            aiSystemStatus === 'initializing' && 'bg-yellow-400',
            aiSystemStatus === 'error' && 'bg-red-400'
          )} />
        </IconButton>

        {/* AI Status Dropdown */}
        {showAIStatus && (
          <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-xl z-50">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                  <div className="i-ph:robot-bold text-lg text-bolt-elements-textSecondary" />
                  Enhanced AI System
                </h3>
                <IconButton
                  onClick={() => setShowAIStatus(false)}
                  className="text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
                >
                  <div className="i-ph:x text-sm" />
                </IconButton>
              </div>

              {/* System Status */}
              <div>
                <h4 className="text-xs font-medium text-bolt-elements-textSecondary mb-2">SYSTEM STATUS</h4>
                <div className="flex items-center gap-2 mb-2">
                  <div className={classNames(
                    'w-2 h-2 rounded-full',
                    aiSystemStatus === 'ready' && 'bg-green-400',
                    aiSystemStatus === 'initializing' && 'bg-yellow-400',
                    aiSystemStatus === 'error' && 'bg-red-400'
                  )} />
                  <span className="text-sm text-bolt-elements-textPrimary">
                    {aiSystemStatus === 'ready' && 'All Systems Operational'}
                    {aiSystemStatus === 'initializing' && 'Initializing Services...'}
                    {aiSystemStatus === 'error' && 'System Error Detected'}
                  </span>
                </div>
                <div className="text-xs text-bolt-elements-textTertiary">
                  47 AI tools available • Multi-language support • Local PC integration
                </div>
              </div>

              {/* Capabilities Grid */}
              <div>
                <h4 className="text-xs font-medium text-bolt-elements-textSecondary mb-3">ACTIVE CAPABILITIES</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:robot-bold text-green-400" />
                    <span>Autonomous Projects</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:folder-open-bold text-green-400" />
                    <span>Local PC Access</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:brain-bold text-green-400" />
                    <span>AI Code Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:test-tube-bold text-green-400" />
                    <span>Test Generation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:shield-check-bold text-green-400" />
                    <span>Security Scanning</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-bolt-elements-background-depth-3 rounded">
                    <div className="i-ph:git-branch-bold text-green-400" />
                    <span>Git Intelligence</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-xs font-medium text-bolt-elements-textSecondary mb-2">QUICK ACTIONS</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center gap-2 p-2 text-xs bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 rounded transition-colors">
                    <div className="i-ph:plus-bold" />
                    Create Project
                  </button>
                  <button className="flex items-center gap-2 p-2 text-xs bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 rounded transition-colors">
                    <div className="i-ph:magnifying-glass-bold" />
                    Analyze Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Original Buttons */}
      {chatStarted && shouldShowButtons && <ExportChatButton exportChat={exportChat} />}
      {shouldShowButtons && <DeployButton />}
    </div>
  );
}
