import React, { useState, useEffect } from 'react'
import { Play, Activity, Zap, Brain, Code, Search, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

interface SystemStatus {
  isReady: boolean
  capabilities: {
    languageIntelligence: boolean
    codeIndexing: boolean
    contextualAI: boolean
    realTimeSync: boolean
    multiFileEditing: boolean
    diagnostics: boolean
    debugging: boolean
  }
  stats: {
    indexedFiles: number
    activeLanguageServers: number
    conversationHistory: number
    lastIndexed?: Date
  }
  performance: {
    averageResponseTime: number
    indexingSpeed: number
    memoryUsage: number
  }
}

interface InitializationProgress {
  stage: string
  progress: number
  message: string
  isComplete: boolean
  error?: string
}

/**
 * Enhanced AI Panel showcasing real IDE capabilities
 * This demonstrates the sophisticated features that compete with Cursor
 */
export const EnhancedAIPanel: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [initProgress, setInitProgress] = useState<InitializationProgress | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [currentRequest, setCurrentRequest] = useState('')
  const [responses, setResponses] = useState<Array<{
    id: string
    type: string
    message: string
    response: string
    timestamp: Date
    context?: any[]
    metadata?: any
  }>>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Listen for initialization events
    window.electronAPI.on('ide-initialization-started', () => {
      setIsInitializing(true)
      setInitProgress(null)
    })

    window.electronAPI.on('ide-initialization-progress', (progress: InitializationProgress) => {
      setInitProgress(progress)
    })

    window.electronAPI.on('ide-system-ready', (status: SystemStatus) => {
      setSystemStatus(status)
      setIsInitializing(false)
      setInitProgress(null)
    })

    window.electronAPI.on('ide-system-error', (error: any) => {
      console.error('IDE System Error:', error)
      setIsInitializing(false)
      setInitProgress({ 
        stage: 'Error', 
        progress: 0, 
        message: 'Initialization failed', 
        isComplete: true, 
        error: error.message || String(error)
      })
    })

    window.electronAPI.on('ide-ai-response', (data: any) => {
      const response = {
        id: data.message.id,
        type: 'response',
        message: currentRequest,
        response: data.message.content,
        timestamp: new Date(data.message.timestamp),
        context: data.message.context,
        metadata: data.message.metadata
      }
      
      setResponses(prev => [...prev, response])
      setIsProcessing(false)
    })

    return () => {
      window.electronAPI.removeAllListeners('ide-initialization-started')
      window.electronAPI.removeAllListeners('ide-initialization-progress')
      window.electronAPI.removeAllListeners('ide-system-ready')
      window.electronAPI.removeAllListeners('ide-system-error')
      window.electronAPI.removeAllListeners('ide-ai-response')
    }
  }, [currentRequest])

  const initializeIDE = async () => {
    try {
      // This would trigger workspace selection and initialization
      const result = await window.electronAPI.initializeIDEServices(
        'c:\\Ai\\Tools\\Ai\\deepseek-cursor-competitor', // Example workspace
        'sk-your-deepseek-api-key' // This should come from settings
      )
      
      if (!result.success) {
        console.error('Failed to initialize IDE services:', result.error)
      }
    } catch (error) {
      console.error('Initialization error:', error)
    }
  }

  const sendRequest = async (type: 'chat' | 'completion' | 'refactor' | 'explain' | 'debug') => {
    if (!currentRequest.trim() || isProcessing) return

    setIsProcessing(true)
    
    try {
      const request = {
        type,
        message: currentRequest,
        currentFile: 'example.ts', // Would come from current editor
        stream: false
      }

      // This would be handled by the IDE integration
      await window.electronAPI.processAIRequest(request)
      setCurrentRequest('')
      
    } catch (error) {
      console.error('Request error:', error)
      setIsProcessing(false)
    }
  }

  const getCapabilityIcon = (capability: keyof SystemStatus['capabilities']) => {
    const icons = {
      languageIntelligence: Brain,
      codeIndexing: Search,
      contextualAI: Zap,
      realTimeSync: Activity,
      multiFileEditing: FileText,
      diagnostics: AlertTriangle,
      debugging: Code
    }
    return icons[capability] || Code
  }

  const getCapabilityName = (capability: keyof SystemStatus['capabilities']) => {
    const names = {
      languageIntelligence: 'Language Intelligence',
      codeIndexing: 'Code Indexing',
      contextualAI: 'Contextual AI',
      realTimeSync: 'Real-time Sync',
      multiFileEditing: 'Multi-file Editing',
      diagnostics: 'Diagnostics',
      debugging: 'Debugging'
    }
    return names[capability] || capability
  }

  return (
    <div className="enhanced-ai-panel h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            Enhanced AI Assistant
          </h2>
          
          {!systemStatus && !isInitializing && (
            <button
              onClick={initializeIDE}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Initialize
            </button>
          )}
          
          {systemStatus && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Initialization Progress */}
      {isInitializing && (
        <div className="p-4 border-b border-gray-700">
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span>{initProgress?.stage || 'Initializing...'}</span>
              <span>{initProgress?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${initProgress?.progress || 0}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">{initProgress?.message || 'Please wait...'}</p>
          {initProgress?.error && (
            <p className="text-xs text-red-400 mt-1">Error: {initProgress.error}</p>
          )}
        </div>
      )}

      {/* System Status */}
      {systemStatus && (
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium mb-3">System Capabilities</h3>
          
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(systemStatus.capabilities).map(([capability, enabled]) => {
              const Icon = getCapabilityIcon(capability as keyof SystemStatus['capabilities'])
              return (
                <div 
                  key={capability}
                  className={`flex items-center gap-2 p-2 rounded text-xs ${
                    enabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{getCapabilityName(capability as keyof SystemStatus['capabilities'])}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Files Indexed</div>
              <div className="font-medium">{systemStatus.stats.indexedFiles}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">LSP Servers</div>
              <div className="font-medium">{systemStatus.stats.activeLanguageServers}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Memory</div>
              <div className="font-medium">{Math.round(systemStatus.performance.memoryUsage)}MB</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Interaction */}
      {systemStatus?.isReady && (
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {responses.map((response) => (
              <div key={response.id} className="space-y-2">
                <div className="bg-blue-900/30 p-3 rounded-lg">
                  <div className="text-sm text-blue-300 mb-1">You:</div>
                  <div className="text-sm">{response.message}</div>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-green-300 mb-1 flex items-center gap-2">
                    Assistant:
                    {response.context && (
                      <span className="text-xs bg-green-900/30 px-1 rounded">
                        {response.context.length} context items
                      </span>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{response.response}</div>
                  
                  {response.metadata && (
                    <div className="mt-2 text-xs text-gray-400 flex gap-4">
                      {response.metadata.tokens && <span>Tokens: {response.metadata.tokens}</span>}
                      {response.metadata.responseTime && <span>Time: {response.metadata.responseTime}ms</span>}
                      {response.metadata.contextScore && <span>Context: {response.metadata.contextScore.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="bg-gray-800 p-3 rounded-lg animate-pulse">
                <div className="text-sm text-gray-400">Processing request...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => sendRequest('chat')}
                disabled={!currentRequest.trim() || isProcessing}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-xs"
              >
                Chat
              </button>
              <button
                onClick={() => sendRequest('completion')}
                disabled={!currentRequest.trim() || isProcessing}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded text-xs"
              >
                Complete
              </button>
              <button
                onClick={() => sendRequest('refactor')}
                disabled={!currentRequest.trim() || isProcessing}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-xs"
              >
                Refactor
              </button>
              <button
                onClick={() => sendRequest('explain')}
                disabled={!currentRequest.trim() || isProcessing}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded text-xs"
              >
                Explain
              </button>
            </div>
            
            <textarea
              value={currentRequest}
              onChange={(e) => setCurrentRequest(e.target.value)}
              placeholder="Ask about your code, request completions, or get explanations..."
              className="w-full h-20 bg-gray-800 border border-gray-600 rounded p-2 text-sm resize-none focus:border-blue-500 focus:outline-none"
              disabled={isProcessing}
            />
          </div>
        </div>
      )}
    </div>
  )
}
