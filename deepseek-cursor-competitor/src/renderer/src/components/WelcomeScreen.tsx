import React from 'react'
import {
  SparklesIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface WelcomeScreenProps {
  onGetStarted?: () => void
  onOpenFolder?: (folderPath?: string) => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted, onOpenFolder }) => {
  const features = [
    {
      icon: <SparklesIcon className="w-8 h-8 text-purple-500" />,
      title: "Multi-File Composer",
      description: "Edit multiple files simultaneously with AI assistance",
      shortcut: "Ctrl/Cmd + I"
    },
    {
      icon: <MagnifyingGlassIcon className="w-8 h-8 text-blue-500" />,
      title: "Advanced Search",
      description: "Symbol search, find references, project-wide navigation",
      shortcut: "Ctrl/Cmd + F"
    },
    {
      icon: <CodeBracketIcon className="w-8 h-8 text-green-500" />,
      title: "Code Analysis",
      description: "TypeScript AST parsing, intelligent code understanding",
      shortcut: "Automatic"
    },
    {
      icon: <CommandLineIcon className="w-8 h-8 text-orange-500" />,
      title: "Git Integration",
      description: "Complete Git workflow with visual interface",
      shortcut: "Git Tab"
    },
    {
      icon: <ChatBubbleLeftRightIcon className="w-8 h-8 text-pink-500" />,
      title: "AI Chat",
      description: "DeepSeek integration for code assistance",
      shortcut: "Ctrl/Cmd + L"
    },
    {
      icon: <FolderIcon className="w-8 h-8 text-indigo-500" />,
      title: "Professional Editor",
      description: "Monaco Editor with VS Code features",
      shortcut: "Built-in"
    }
  ]

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto p-8 text-center">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-6">
            <SparklesIcon className="w-16 h-16 text-purple-500 mr-4" />
            <h1 className="text-5xl font-bold text-white">
              DeepSeek Cursor Competitor
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">
            AI-Powered Code Editor Built to Compete
          </p>
          <p className="text-lg text-gray-400">
            Professional development environment with advanced AI capabilities
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600"
            >
              <div className="flex items-center mb-4">
                {feature.icon}
                <h3 className="text-lg font-semibold text-white ml-3">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-300 mb-3 text-sm">
                {feature.description}
              </p>
              <div className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded">
                {feature.shortcut}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">500+</div>
            <div className="text-sm text-gray-300">Lines of Code Analysis</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">10+</div>
            <div className="text-sm text-gray-300">Programming Languages</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">0</div>
            <div className="text-sm text-gray-300">Type Errors</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-orange-400">100%</div>
            <div className="text-sm text-gray-300">Feature Complete</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={async () => {
              console.log('Open folder button clicked')
              
              if (window.electronAPI && window.electronAPI.dialog) {
                try {
                  const result = await window.electronAPI.dialog.showOpenDialog({
                    properties: ['openDirectory']
                  })
                  
                  console.log('Dialog result:', result)
                  
                  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0]
                    console.log('Selected folder:', folderPath)
                    
                    // Pass the folder path to the parent component
                    onOpenFolder?.(folderPath)
                  }
                } catch (error) {
                  console.error('Error opening folder dialog:', error)
                  // Fallback to callback without path
                  onOpenFolder?.()
                }
              } else {
                console.log('Falling back to callback')
                onOpenFolder?.()
              }
            }}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <FolderIcon className="w-5 h-5" />
            Open Project Folder
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium border border-gray-600"
          >
            <CodeBracketIcon className="w-5 h-5" />
            Start Coding
          </button>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Version 0.1.0 • Built with Electron, React, TypeScript & DeepSeek AI</p>
          <p className="mt-1">
            Professional-grade code editor designed to compete with Cursor IDE
          </p>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 text-left max-w-2xl mx-auto bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <SparklesIcon className="w-5 h-5 text-yellow-500 mr-2" />
            Quick Tips
          </h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="text-purple-400 mr-2">•</span>
              Use <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl/Cmd + I</kbd> to open the Composer for multi-file editing
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              Press <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl/Cmd + F</kbd> to search symbols across your project
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              Click the Git tab to manage your repository with visual tools
            </li>
            <li className="flex items-start">
              <span className="text-orange-400 mr-2">•</span>
              Use <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl/Cmd + L</kbd> to chat with DeepSeek AI for code assistance
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
