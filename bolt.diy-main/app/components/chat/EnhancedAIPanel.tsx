/**
 * Enhanced AI Capabilities Panel
 * Shows all autonomous AI features integrated into Bolt.diy
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';
import type { ProjectExecution } from '~/autonomous-services/autonomous-director';

interface AutonomousCapability {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'ready' | 'working' | 'complete' | 'error';
  progress?: number;
}

interface EnhancedAIPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  onCreateProject?: (description: string) => Promise<void>;
  onAnalyzeCode?: (filePath: string) => Promise<void>;
  onGenerateTests?: (filePath: string) => Promise<void>;
  onOptimizePerformance?: (filePath: string) => Promise<void>;
  onSecurityScan?: (projectPath: string) => Promise<void>;
}

export function EnhancedAIPanel({
  isVisible,
  onToggle,
  onCreateProject,
  onAnalyzeCode,
  onGenerateTests,
  onOptimizePerformance,
  onSecurityScan
}: EnhancedAIPanelProps) {
  const [projectDescription, setProjectDescription] = useState('');
  const [activeProjects, setActiveProjects] = useState<ProjectExecution[]>([]);
  const [systemStatus, setSystemStatus] = useState<'initializing' | 'ready' | 'error'>('ready');

  const capabilities: AutonomousCapability[] = [
    {
      id: 'project-creation',
      name: 'Autonomous Project Creation',
      description: 'Create complete full-stack projects from natural language descriptions',
      icon: 'i-ph:rocket-launch-bold',
      status: 'ready'
    },
    {
      id: 'code-analysis',
      name: 'Intelligent Code Analysis',
      description: 'AI-powered code quality analysis and improvement suggestions',
      icon: 'i-ph:brain-bold',
      status: 'ready'
    },
    {
      id: 'test-generation',
      name: 'Automated Test Generation',
      description: 'Generate comprehensive tests for your code automatically',
      icon: 'i-ph:test-tube-bold',
      status: 'ready'
    },
    {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Analyze and optimize application performance bottlenecks',
      icon: 'i-ph:lightning-bold',
      status: 'ready'
    },
    {
      id: 'security-scanning',
      name: 'Security Vulnerability Detection',
      description: 'Comprehensive security analysis and vulnerability detection',
      icon: 'i-ph:shield-check-bold',
      status: 'ready'
    },
    {
      id: 'git-intelligence',
      name: 'AI Git Operations',
      description: 'Smart commit messages, branch management, and merge assistance',
      icon: 'i-ph:git-branch-bold',
      status: 'ready'
    },
    {
      id: 'local-filesystem',
      name: 'Local PC Integration',
      description: 'Direct access to your local filesystem and project creation',
      icon: 'i-ph:folder-open-bold',
      status: 'ready'
    },
    {
      id: 'terminal-management',
      name: 'Advanced Terminal Operations',
      description: 'Intelligent command execution and process management',
      icon: 'i-ph:terminal-window-bold',
      status: 'ready'
    }
  ];

  const handleCreateProject = async () => {
    if (!projectDescription.trim() || !onCreateProject) return;
    
    try {
      await onCreateProject(projectDescription);
      setProjectDescription('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: isVisible ? '400px' : '0px' }}
      transition={{ duration: 0.3 }}
      className="bg-bolt-elements-background-depth-2 border-l border-bolt-elements-borderColor overflow-hidden"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
          <h2 className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
            <div className="i-ph:robot-bold text-xl text-bolt-elements-textSecondary" />
            Enhanced AI
          </h2>
          <IconButton
            onClick={onToggle}
            className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
          >
            <div className="i-ph:x text-lg" />
          </IconButton>
        </div>

        {/* System Status */}
        <div className="p-4 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-2 mb-2">
            <div className={classNames(
              'w-2 h-2 rounded-full',
              systemStatus === 'ready' && 'bg-green-500',
              systemStatus === 'initializing' && 'bg-yellow-500',
              systemStatus === 'error' && 'bg-red-500'
            )} />
            <span className="text-sm text-bolt-elements-textSecondary">
              System Status: {systemStatus === 'ready' ? 'Ready' : systemStatus}
            </span>
          </div>
          <div className="text-xs text-bolt-elements-textTertiary">
            47 AI tools available • Multi-language support • Local PC integration
          </div>
        </div>

        {/* Project Creation Section */}
        <div className="p-4 border-b border-bolt-elements-borderColor">
          <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">
            🚀 Create Project from Description
          </h3>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe your project in natural language, e.g., 'Create a React todo app with Firebase backend and user authentication'"
            className="w-full h-20 p-2 text-sm bg-bolt-elements-prompt-background border border-bolt-elements-borderColor rounded resize-none focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
          />
          <button
            onClick={handleCreateProject}
            disabled={!projectDescription.trim()}
            className="mt-2 w-full py-2 px-3 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text text-sm rounded hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project Autonomously
          </button>
        </div>

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="p-4 border-b border-bolt-elements-borderColor">
            <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">
              Active Projects
            </h3>
            <div className="space-y-2">
              {activeProjects.map((project) => (
                <div
                  key={project.projectId}
                  className="p-2 bg-bolt-elements-background-depth-3 rounded text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-bolt-elements-textPrimary font-medium">
                      {project.projectId}
                    </span>
                    <span className={classNames(
                      'px-2 py-1 rounded',
                      project.status === 'completed' && 'bg-green-500/20 text-green-400',
                      project.status === 'in_progress' && 'bg-blue-500/20 text-blue-400',
                      project.status === 'failed' && 'bg-red-500/20 text-red-400'
                    )}>
                      {project.status}
                    </span>
                  </div>
                  {project.progress && (
                    <div className="mt-1 w-full bg-bolt-elements-background-depth-1 rounded-full h-1">
                      <div
                        className="bg-bolt-elements-button-primary-background h-1 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Capabilities */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-3">
            AI Capabilities
          </h3>
          <div className="space-y-2">
            {capabilities.map((capability) => (
              <motion.div
                key={capability.id}
                whileHover={{ scale: 1.02 }}
                className="p-3 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor hover:border-bolt-elements-focus transition-colors cursor-pointer"
                onClick={() => {
                  // Handle capability activation based on type
                  switch (capability.id) {
                    case 'code-analysis':
                      onAnalyzeCode?.('current-file');
                      break;
                    case 'test-generation':
                      onGenerateTests?.('current-file');
                      break;
                    case 'performance-optimization':
                      onOptimizePerformance?.('current-file');
                      break;
                    case 'security-scanning':
                      onSecurityScan?.('current-project');
                      break;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={classNames(
                    capability.icon,
                    'text-lg mt-0.5',
                    capability.status === 'ready' && 'text-green-400',
                    capability.status === 'working' && 'text-blue-400 animate-pulse',
                    capability.status === 'complete' && 'text-green-500',
                    capability.status === 'error' && 'text-red-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-bolt-elements-textPrimary">
                        {capability.name}
                      </h4>
                      <div className={classNames(
                        'w-2 h-2 rounded-full',
                        capability.status === 'ready' && 'bg-green-400',
                        capability.status === 'working' && 'bg-blue-400 animate-pulse',
                        capability.status === 'complete' && 'bg-green-500',
                        capability.status === 'error' && 'bg-red-400'
                      )} />
                    </div>
                    <p className="text-xs text-bolt-elements-textSecondary mt-1">
                      {capability.description}
                    </p>
                    {capability.progress && (
                      <div className="mt-2 w-full bg-bolt-elements-background-depth-1 rounded-full h-1">
                        <div
                          className="bg-bolt-elements-button-primary-background h-1 rounded-full transition-all duration-300"
                          style={{ width: `${capability.progress * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-bolt-elements-borderColor">
          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 px-3 bg-bolt-elements-background-depth-3 text-xs rounded hover:bg-bolt-elements-background-depth-1 transition-colors">
              <div className="i-ph:file-code-bold text-sm mb-1" />
              Analyze Current File
            </button>
            <button className="py-2 px-3 bg-bolt-elements-background-depth-3 text-xs rounded hover:bg-bolt-elements-background-depth-1 transition-colors">
              <div className="i-ph:test-tube-bold text-sm mb-1" />
              Generate Tests
            </button>
            <button className="py-2 px-3 bg-bolt-elements-background-depth-3 text-xs rounded hover:bg-bolt-elements-background-depth-1 transition-colors">
              <div className="i-ph:shield-check-bold text-sm mb-1" />
              Security Scan
            </button>
            <button className="py-2 px-3 bg-bolt-elements-background-depth-3 text-xs rounded hover:bg-bolt-elements-background-depth-1 transition-colors">
              <div className="i-ph:lightning-bold text-sm mb-1" />
              Optimize Performance
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
