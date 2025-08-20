import React, { useState, useEffect } from 'react'
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, Play, Pause } from 'lucide-react'

interface AutonomousProjectStatus {
  id: string
  status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed' | 'paused'
  progress: number
  startTime: Date
  estimatedCompletion?: Date
  currentPhase: string
  activeAgents: number
  artifactsGenerated: number
  errorsEncountered: number
  learningsGenerated: number
}

interface ProgressData {
  sessionId: string
  status: AutonomousProjectStatus
  details?: string
}

export const AutonomousProgressTracker: React.FC = () => {
  const [activeProjects, setActiveProjects] = useState<Map<string, AutonomousProjectStatus>>(new Map())
  const [realtimeUpdates, setRealtimeUpdates] = useState<ProgressData[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Subscribe to real-time progress updates
    const handleProgressUpdate = (data: ProgressData) => {
      setActiveProjects(prev => {
        const newMap = new Map(prev)
        newMap.set(data.sessionId, data.status)
        return newMap
      })
      
      // Add to recent updates (keep last 10)
      setRealtimeUpdates(prev => {
        const newUpdates = [{ ...data, timestamp: new Date() }, ...prev].slice(0, 10)
        return newUpdates as any
      })
    }

    const handleStatusChanged = (data: any) => {
      setActiveProjects(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(data.sessionId)
        if (existing) {
          existing.status = data.status
          newMap.set(data.sessionId, existing)
        }
        return newMap
      })
    }

    const handleProjectLaunched = (data: any) => {
      console.log('🚀 Project launched:', data.sessionId)
      setIsVisible(true)
    }

    const handleProjectCompleted = (data: any) => {
      console.log('✅ Project completed:', data.sessionId)
      // Keep visible for a few more seconds
      setTimeout(() => {
        setActiveProjects(prev => {
          const newMap = new Map(prev)
          newMap.delete(data.sessionId)
          return newMap
        })
      }, 5000)
    }

    const handleProjectFailed = (data: any) => {
      console.log('❌ Project failed:', data.sessionId)
    }

    // Set up IPC listeners
    if (window.electronAPI) {
      window.electronAPI.autonomous.onProgressUpdate(handleProgressUpdate)
      window.electronAPI.autonomous.onStatusChanged(handleStatusChanged)
      window.electronAPI.autonomous.onProjectLaunched(handleProjectLaunched)
      window.electronAPI.autonomous.onProjectCompleted(handleProjectCompleted)
      window.electronAPI.autonomous.onProjectFailed(handleProjectFailed)

      // Get initial status
      window.electronAPI.autonomous.subscribeToProgress().then((result: any) => {
        if (result.success && result.projects) {
          const projectMap = new Map()
          result.projects.forEach((project: AutonomousProjectStatus) => {
            projectMap.set(project.id, project)
          })
          setActiveProjects(projectMap)
          setIsVisible(projectMap.size > 0)
        }
      })
    }

    return () => {
      if (window.electronAPI?.ipc) {
        window.electronAPI.ipc.removeAllListeners('autonomous:progress-update')
        window.electronAPI.ipc.removeAllListeners('autonomous:status-changed')
        window.electronAPI.ipc.removeAllListeners('autonomous:project-launched')
        window.electronAPI.ipc.removeAllListeners('autonomous:project-completed')
        window.electronAPI.ipc.removeAllListeners('autonomous:project-failed')
      }
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'planning':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-gray-500" />
      case 'queued':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Play className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing':
        return 'bg-blue-50 border-blue-200'
      case 'planning':
        return 'bg-yellow-50 border-yellow-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      case 'paused':
        return 'bg-gray-50 border-gray-200'
      case 'queued':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (!isVisible || activeProjects.size === 0) {
    return null
  }

  const projectArray = Array.from(activeProjects.values())

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-md z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Autonomous Projects</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {projectArray.map((project) => (
            <div
              key={project.id}
              className={`p-3 border-l-4 ${getStatusColor(project.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(project.status)}
                  <span className="font-medium text-sm text-gray-900">
                    Project {project.id.slice(-8)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 capitalize">
                  {project.status}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-gray-600">
                  {project.currentPhase}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {Math.round(project.progress)}%
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>{project.artifactsGenerated}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Activity className="h-3 w-3" />
                    <span>{project.activeAgents}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>{project.errorsEncountered}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {realtimeUpdates.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Latest: {realtimeUpdates[0]?.details || 'Working...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AutonomousProgressTracker
