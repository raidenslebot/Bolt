/**
 * Enhanced AI Status Indicator
 * Shows the status of autonomous AI services in the header
 */

import React, { useState, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';

interface AIStatusIndicatorProps {
  onTogglePanel?: () => void;
  systemStatus?: 'initializing' | 'ready' | 'error';
  activeOperations?: number;
  availableTools?: number;
}

export function AIStatusIndicator({
  onTogglePanel,
  systemStatus = 'ready',
  activeOperations = 0,
  availableTools = 47
}: AIStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(() => {
    setIsExpanded(!isExpanded);
    onTogglePanel?.();
  }, [isExpanded, onTogglePanel]);

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'ready': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'initializing': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 animate-pulse';
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'ready': return 'i-ph:robot-bold';
      case 'initializing': return 'i-ph:spinner-gap-bold animate-spin';
      case 'error': return 'i-ph:warning-bold';
      default: return 'i-ph:robot-bold';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <IconButton
        onClick={handleClick}
        className={classNames(
          'relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
          getStatusColor(),
          'hover:scale-105 hover:shadow-lg'
        )}
        title="Enhanced AI System Status"
      >
        <div className={classNames(getStatusIcon(), 'text-sm')} />
        <div className="hidden sm:flex flex-col items-start text-xs">
          <span className="font-medium">Enhanced AI</span>
          <span className="opacity-70">
            {systemStatus} • {availableTools} tools
          </span>
        </div>
        
        {activeOperations > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
            {activeOperations}
          </div>
        )}
      </IconButton>

      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-lg z-50 min-w-64">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-bolt-elements-textPrimary mb-2">
                System Status
              </h4>
              <div className="flex items-center gap-2">
                <div className={classNames(
                  'w-2 h-2 rounded-full',
                  systemStatus === 'ready' && 'bg-green-400',
                  systemStatus === 'initializing' && 'bg-yellow-400',
                  systemStatus === 'error' && 'bg-red-400'
                )} />
                <span className="text-sm text-bolt-elements-textSecondary">
                  {systemStatus === 'ready' && 'All systems operational'}
                  {systemStatus === 'initializing' && 'Initializing services...'}
                  {systemStatus === 'error' && 'System error detected'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-bolt-elements-textPrimary mb-2">
                Capabilities
              </h4>
              <div className="space-y-1 text-xs text-bolt-elements-textSecondary">
                <div>✅ Autonomous Project Creation</div>
                <div>✅ Local PC Filesystem Access</div>
                <div>✅ AI Code Analysis & Suggestions</div>
                <div>✅ Automated Test Generation</div>
                <div>✅ Security Vulnerability Detection</div>
                <div>✅ Performance Optimization</div>
                <div>✅ Git Intelligence</div>
                <div>✅ Advanced Terminal Management</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-bolt-elements-textPrimary mb-2">
                Available Tools
              </h4>
              <div className="text-xs text-bolt-elements-textSecondary">
                {availableTools} AI tools ready for use
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
