import React, { useState, useEffect } from 'react'

interface TaskActivity {
  id: string
  agentId: string
  agentName: string
  activity: string
  thought: string
  action: string
  timestamp: Date
  status: 'thinking' | 'planning' | 'executing' | 'waiting' | 'completed' | 'error'
  details?: any
}

interface AgentStatus {
  id: string
  name: string
  specialization: string
  currentTask: string
  currentThought: string
  status: 'active' | 'idle' | 'thinking' | 'communicating' | 'error'
  lastActivity: Date
  tasksCompleted: number
  efficiency: number
}

interface DetailedProjectStatus {
  id: string
  status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed' | 'paused'
  progress: number
  startTime: Date
  estimatedCompletion?: Date
  currentPhase: string
  activeAgents: AgentStatus[]
  recentActivities: TaskActivity[]
  currentTasks: {
    total: number
    completed: number
    inProgress: number
    queued: number
  }
  artificactsGenerated: number
  errorsEncountered: number
  learningsGenerated: number
  
  // Enhanced details
  detailedProgress: {
    currentTask: string
    currentSubtask: string
    tasksInProgress: string[]
    blockers: string[]
    nextPlannedActions: string[]
  }
  
  // Real-time thinking
  systemThoughts: {
    currentReasoning: string
    nextDecision: string
    confidenceLevel: number
    alternativesConsidered: string[]
  }
  
  // Performance metrics
  metrics: {
    velocity: number // tasks per hour
    accuracy: number // percentage of successful tasks
    autonomyLevel: number // how independent the system is being
    coordinationScore: number // how well agents are working together
  }
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  issues: string[]
  resourceUsage: {
    cpu: number
    memory: number
    apiCalls: number
  }
}

export const AutonomousAIPanel: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [newProjectVision, setNewProjectVision] = useState('')
  const [newProjectPriority, setNewProjectPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isElectronReady, setIsElectronReady] = useState(false)

  // Check if Electron API is available
  useEffect(() => {
    const checkElectronAPI = () => {
      if (window.electronAPI && window.electronAPI.autonomous) {
        setIsElectronReady(true)
        setError(null)
      } else {
        setIsElectronReady(false)
        setError('Waiting for Electron API to initialize...')
      }
    }

    checkElectronAPI()
    
    // Check every second until API is ready
    const interval = setInterval(() => {
      if (!isElectronReady) {
        checkElectronAPI()
      } else {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isElectronReady])

  // Fetch projects and system status
  const refreshData = async () => {
    setIsLoading(true)
    setError(null)
    
    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available. Please make sure the application is running in Electron.')
      setIsLoading(false)
      return
    }
    
    try {
      // Use the enhanced detailed projects API
      const [projectsResult, healthResult] = await Promise.all([
        window.electronAPI.autonomous.getDetailedProjects(),
        window.electronAPI.autonomous.getSystemHealth()
      ])

      if (projectsResult.success) {
        setProjects(projectsResult.projects)
        console.log('📊 Loaded detailed projects:', projectsResult.projects)
      } else {
        setError(`Failed to load projects: ${projectsResult.error}`)
      }

      if (healthResult.success) {
        setSystemHealth(healthResult.health)
        console.log('🩺 System health:', healthResult.health)
      } else {
        setError(`Failed to load system health: ${healthResult.error}`)
      }
    } catch (error) {
      console.error('Error fetching autonomous data:', error)
      setError(`Connection error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Launch new autonomous project
  const launchProject = async () => {
    if (!newProjectVision.trim()) {
      setError('Please enter a project vision')
      return
    }

    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available. Cannot launch project.')
      return
    }

    setIsLaunching(true)
    setError(null)
    
    // Show immediate feedback
    console.log('🚀 Launching autonomous project:', newProjectVision)
    
    try {
      const request = {
        id: `project-${Date.now()}`,
        vision: newProjectVision,
        priority: newProjectPriority,
        constraints: {
          timeLimit: 24, // 24 hours
          resourceLimit: 70, // 70% of resources
          qualityRequirement: 'production' as const
        },
        userPreferences: {
          communicationLevel: 'normal' as const,
          interventionLevel: 'normal' as const
        }
      }

      console.log('📋 Project request created:', request)
      
      const result = await window.electronAPI.autonomous.launchProject(request)
      
      console.log('📬 Launch result:', result)
      
      if (result.success) {
        console.log('✅ Project launched successfully with ID:', result.projectId || 'Unknown ID')
        setNewProjectVision('')
        
        // Show success message
        setError(null)
        
        // Add temporary project status while waiting for real updates
        const tempProject: DetailedProjectStatus = {
          id: request.id,
          status: 'planning',
          progress: 0,
          startTime: new Date(),
          currentPhase: 'Initializing autonomous execution...',
          activeAgents: [
            {
              id: 'agent-init',
              name: 'System Initializer',
              specialization: 'Project Setup',
              currentTask: 'Analyzing project requirements',
              currentThought: 'Processing user vision and planning approach...',
              status: 'thinking',
              lastActivity: new Date(),
              tasksCompleted: 0,
              efficiency: 100
            }
          ],
          recentActivities: [
            {
              id: 'init-activity',
              agentId: 'agent-init',
              agentName: 'System Initializer',
              activity: 'Project initialization',
              thought: 'Analyzing user requirements and creating execution plan',
              action: 'Setting up autonomous workforce',
              timestamp: new Date(),
              status: 'thinking'
            }
          ],
          currentTasks: {
            total: 1,
            completed: 0,
            inProgress: 1,
            queued: 0
          },
          artificactsGenerated: 0,
          errorsEncountered: 0,
          learningsGenerated: 0,
          detailedProgress: {
            currentTask: 'Project initialization',
            currentSubtask: 'Analyzing requirements',
            tasksInProgress: ['Vision analysis', 'Planning architecture'],
            blockers: [],
            nextPlannedActions: ['Create execution plan', 'Spawn specialized agents']
          },
          systemThoughts: {
            currentReasoning: 'User has requested autonomous project execution. Need to analyze the vision and create a comprehensive plan.',
            nextDecision: 'Determine required specialist agents based on project scope',
            confidenceLevel: 95,
            alternativesConsidered: ['Manual approach', 'Hybrid automation', 'Full autonomy']
          },
          metrics: {
            velocity: 0,
            accuracy: 100,
            autonomyLevel: 100,
            coordinationScore: 100
          }
        }
        setProjects(prev => [tempProject, ...prev])
        
        // Refresh real data after a short delay
        setTimeout(() => refreshData(), 2000)
      } else {
        console.error('❌ Project launch failed:', result.error)
        setError(`Failed to launch project: ${result.error}`)
      }
    } catch (error) {
      console.error('💥 Error launching project:', error)
      setError(`Launch error: ${error}`)
    } finally {
      setIsLaunching(false)
    }
  }

  // Project control actions
  const pauseProject = async (projectId: string) => {
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available')
      return
    }
    
    try {
      const result = await window.electronAPI.autonomous.pauseProject(projectId)
      if (result.success) {
        await refreshData()
      } else {
        setError(`Failed to pause project: ${result.error}`)
      }
    } catch (error) {
      setError(`Error pausing project: ${error}`)
    }
  }

  const resumeProject = async (projectId: string) => {
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available')
      return
    }
    
    try {
      const result = await window.electronAPI.autonomous.resumeProject(projectId)
      if (result.success) {
        await refreshData()
      } else {
        setError(`Failed to resume project: ${result.error}`)
      }
    } catch (error) {
      setError(`Error resuming project: ${error}`)
    }
  }

  const stopProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to stop this project? This cannot be undone.')) return
    
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available')
      return
    }
    
    try {
      const result = await window.electronAPI.autonomous.stopProject(projectId)
      if (result.success) {
        await refreshData()
      } else {
        setError(`Failed to stop project: ${result.error}`)
      }
    } catch (error) {
      setError(`Error stopping project: ${error}`)
    }
  }

  const emergencyStop = async () => {
    if (!confirm('🚨 EMERGENCY STOP: This will immediately halt ALL autonomous projects. Continue?')) return
    
    if (!window.electronAPI || !window.electronAPI.autonomous) {
      setError('Electron API not available')
      return
    }
    
    try {
      const result = await window.electronAPI.autonomous.emergencyStop()
      if (result.success) {
        await refreshData()
      } else {
        setError(`Emergency stop failed: ${result.error}`)
      }
    } catch (error) {
      setError(`Emergency stop error: ${error}`)
    }
  }

  // Get status display information
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'queued':
        return { color: 'text-yellow-400 bg-yellow-900/20', icon: '⏳', label: 'Queued' }
      case 'planning':
        return { color: 'text-blue-400 bg-blue-900/20', icon: '🧠', label: 'Planning' }
      case 'executing':
        return { color: 'text-green-400 bg-green-900/20', icon: '⚡', label: 'Executing' }
      case 'completed':
        return { color: 'text-green-500 bg-green-900/30', icon: '✅', label: 'Completed' }
      case 'failed':
        return { color: 'text-red-400 bg-red-900/20', icon: '❌', label: 'Failed' }
      case 'paused':
        return { color: 'text-orange-400 bg-orange-900/20', icon: '⏸️', label: 'Paused' }
      default:
        return { color: 'text-gray-400 bg-gray-800', icon: '❓', label: 'Unknown' }
    }
  }

  // Auto-refresh data
  useEffect(() => {
    if (isElectronReady) {
      refreshData()
      const interval = setInterval(refreshData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [isElectronReady])

  // Real-time activity updates
  useEffect(() => {
    if (isElectronReady && window.electronAPI && window.electronAPI.autonomous) {
      // Listen for real-time updates
      const handleProjectUpdate = (update: any) => {
        console.log('🔄 Received autonomous update:', update)
        setProjects(prev => 
          prev.map(project => 
            project.id === update.projectId 
              ? { ...project, ...update.data }
              : project
          )
        )
      }

      const handleActivityUpdate = (activity: TaskActivity) => {
        console.log('⚡ New activity:', activity)
        setProjects(prev => 
          prev.map(project => 
            project.activeAgents.some((agent: any) => agent.id === activity.agentId)
              ? {
                  ...project,
                  recentActivities: [activity, ...project.recentActivities.slice(0, 9)] // Keep last 10
                }
              : project
          )
        )
      }

      const handleAgentThought = (thought: { agentId: string, projectId: string, thought: string, status: string }) => {
        console.log('💭 Agent thinking:', thought)
        setProjects(prev => 
          prev.map(project => 
            project.id === thought.projectId
              ? {
                  ...project,
                  activeAgents: project.activeAgents.map((agent: any) =>
                    agent.id === thought.agentId
                      ? { ...agent, currentThought: thought.thought, status: thought.status as any, lastActivity: new Date() }
                      : agent
                  )
                }
              : project
          )
        )
      }

      // Register event listeners if available
      try {
        if (window.electronAPI.autonomous.onProjectUpdate) {
          window.electronAPI.autonomous.onProjectUpdate(handleProjectUpdate)
        }
        if (window.electronAPI.autonomous.onActivityUpdate) {
          window.electronAPI.autonomous.onActivityUpdate(handleActivityUpdate)
        }
        if (window.electronAPI.autonomous.onAgentThought) {
          window.electronAPI.autonomous.onAgentThought(handleAgentThought)
        }
      } catch (error) {
        console.log('Real-time updates not available yet, using polling')
      }
    }
  }, [isElectronReady])

  // Detailed Activity Modal Component
  const DetailedActivityModal = () => {
    const selectedProjectData = projects.find(p => p.id === selectedProject)
    if (!selectedProjectData) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-medium text-white">Detailed Activity Log</h2>
              <div className="text-sm text-gray-400">Project: {selectedProject}</div>
            </div>
            <button
              onClick={() => setShowDetailView(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* System Status */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-3">🧠 System Intelligence Status</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Current Reasoning Process</div>
                  <div className="text-sm text-gray-200 bg-gray-800 rounded p-2">
                    {selectedProjectData.systemThoughts.currentReasoning}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Next Decision</div>
                  <div className="text-sm text-green-300 bg-gray-800 rounded p-2">
                    {selectedProjectData.systemThoughts.nextDecision}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Alternatives Considered</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectData.systemThoughts.alternativesConsidered.map((alt: any, index: number) => (
                      <span key={index} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Details */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-3">🤖 Agent Status & Thoughts</h3>
              <div className="space-y-3">
                {selectedProjectData.activeAgents.map((agent: any) => (
                  <div key={agent.id} className="bg-gray-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-white">{agent.name}</div>
                        <div className="text-xs text-gray-400">{agent.specialization}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          agent.status === 'active' ? 'bg-green-500' :
                          agent.status === 'thinking' ? 'bg-blue-500' :
                          agent.status === 'communicating' ? 'bg-purple-500' :
                          agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></div>
                        <span className="text-xs text-gray-400 capitalize">{agent.status}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-400">Current Task:</div>
                        <div className="text-sm text-gray-200">{agent.currentTask}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Current Thought:</div>
                        <div className="text-sm text-blue-300 italic">"{agent.currentThought}"</div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Tasks Completed: {agent.tasksCompleted}</span>
                        <span>Efficiency: {agent.efficiency}%</span>
                        <span>Last Active: {agent.lastActivity.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Breakdown */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-400 mb-3">📋 Task Breakdown</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-lg font-bold text-blue-400">{selectedProjectData.currentTasks.total}</div>
                    <div className="text-xs text-gray-400">Total Tasks</div>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-lg font-bold text-green-400">{selectedProjectData.currentTasks.completed}</div>
                    <div className="text-xs text-gray-400">Completed</div>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-lg font-bold text-yellow-400">{selectedProjectData.currentTasks.inProgress}</div>
                    <div className="text-xs text-gray-400">In Progress</div>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-lg font-bold text-gray-400">{selectedProjectData.currentTasks.queued}</div>
                    <div className="text-xs text-gray-400">Queued</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 mb-2">Tasks In Progress:</div>
                  <div className="space-y-1">
                    {selectedProjectData.detailedProgress.tasksInProgress.map((task: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-gray-200">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedProjectData.detailedProgress.nextPlannedActions.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Next Planned Actions:</div>
                    <div className="space-y-1">
                      {selectedProjectData.detailedProgress.nextPlannedActions.map((action: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-gray-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-400 mb-3">⚡ Activity Timeline</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedProjectData.recentActivities.map((activity: any) => (
                  <div key={activity.id} className="bg-gray-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-500' :
                          activity.status === 'executing' ? 'bg-blue-500 animate-pulse' :
                          activity.status === 'thinking' ? 'bg-purple-500 animate-pulse' :
                          activity.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></div>
                        <span className="text-sm font-medium text-white">{activity.agentName}</span>
                        <span className="text-xs text-gray-400 capitalize">{activity.status}</span>
                      </div>
                      <span className="text-xs text-gray-400">{activity.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-200">{activity.activity}</div>
                      <div className="text-sm text-purple-300 italic">💭 "{activity.thought}"</div>
                      <div className="text-sm text-blue-300">⚡ {activity.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isElectronReady) {
    return (
      <div className="h-full bg-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-4">⚡</div>
          <div className="text-gray-400">Initializing Electron API...</div>
          <div className="text-xs text-gray-500 mt-2">Please wait while the desktop application starts</div>
        </div>
      </div>
    )
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="p-4 text-gray-400">
        <div className="flex items-center gap-2">
          <div className="animate-spin">⚡</div>
          Loading autonomous AI system...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-800 text-white overflow-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🧠 AI Workforce
          </h2>
          
          {systemHealth && (
            <div className="flex items-center gap-2">
              <div className={`
                px-2 py-1 rounded text-xs font-medium
                ${systemHealth.status === 'healthy' ? 'text-green-400 bg-green-900/20' : 
                  systemHealth.status === 'warning' ? 'text-yellow-400 bg-yellow-900/20' : 
                  'text-red-400 bg-red-900/20'}
              `}>
                {systemHealth.status === 'healthy' ? '✅' : systemHealth.status === 'warning' ? '⚠️' : '🚨'} 
                {systemHealth.status.toUpperCase()}
              </div>
              
              <button
                onClick={emergencyStop}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                title="Emergency Stop All Projects"
              >
                🚨 STOP
              </button>
            </div>
          )}
        </div>

        {/* Quick Workspace Actions */}
        <div className="bg-gray-700 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            📁 Workspace Management
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                if (!window.electronAPI) return
                const result = await window.electronAPI.dialog.showOpenDialog({
                  properties: ['openDirectory']
                })
                if (result && !result.canceled && result.filePaths?.length > 0) {
                  // Trigger workspace change 
                  const selectedPath = result.filePaths[0]
                  console.log('Selected folder for autonomous project:', selectedPath)
                  // Set the selected folder as the workspace context
                  setNewProjectVision(prev => `${prev}\n\nWorkspace: ${selectedPath}`)
                }
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Open Workspace
            </button>
            
            <button
              onClick={async () => {
                if (!window.electronAPI) return
                const result = await window.electronAPI.file.write(
                  'new-file.txt', 
                  '// New file created by AI Workforce\n// Start your autonomous project here!\n\n'
                )
                if (result.success) {
                  // Could trigger file opening here
                  console.log('File created successfully')
                } else {
                  console.error('Failed to create file:', result.error)
                }
              }}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Project
            </button>
            
            <button
              onClick={() => {
                // Refresh the file tree
                window.location.reload()
              }}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            <button
              onClick={() => {
                // Toggle terminal view
                window.dispatchEvent(new KeyboardEvent('keydown', {
                  key: '`',
                  ctrlKey: true,
                  bubbles: true
                }))
              }}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Terminal
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400">
              <span>❌</span>
              <span className="text-sm">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-300 hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* System Health */}
        {systemHealth && (
          <div className="bg-gray-700 rounded-lg p-3">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              📊 System Resources
            </h3>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>CPU</span>
                  <span>{systemHealth.resourceUsage.cpu}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${systemHealth.resourceUsage.cpu}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Memory</span>
                  <span>{systemHealth.resourceUsage.memory}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${systemHealth.resourceUsage.memory}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>API Calls/min</span>
                  <span>{systemHealth.resourceUsage.apiCalls}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1.5">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(systemHealth.resourceUsage.apiCalls, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {systemHealth.issues.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs">
                <div className="text-yellow-400 font-medium mb-1">⚠️ Issues:</div>
                <ul className="text-yellow-300 space-y-1">
                  {systemHealth.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Launch New Project */}
        <div className="bg-gray-700 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            🚀 Launch Project
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Project Vision
              </label>
              <textarea
                placeholder="Describe what you want the AI workforce to build..."
                value={newProjectVision}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProjectVision(e.target.value)}
                className="w-full px-2 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Priority
              </label>
              <select
                value={newProjectPriority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewProjectPriority(e.target.value as any)}
                className="w-full px-2 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="normal">🟡 Normal Priority</option>
                <option value="high">🟠 High Priority</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
            
            <button
              onClick={launchProject}
              disabled={isLaunching || !newProjectVision.trim()}
              className={`
                w-full px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${isLaunching || !newProjectVision.trim() 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
              `}
            >
              {isLaunching ? (
                <>
                  <div className="animate-spin">⚡</div>
                  Launching...
                </>
              ) : (
                <>
                  ▶️ Launch Project
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-gray-700 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            👥 Active Projects ({projects.length})
            <button 
              onClick={refreshData} 
              className="ml-auto text-gray-400 hover:text-white text-xs"
              title="Refresh"
            >
              🔄
            </button>
          </h3>
          
          {projects.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-xs">No autonomous projects running</div>
              <div className="text-xs text-gray-600">Launch one above to get started!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const statusDisplay = getStatusDisplay(project.status)
                
                return (
                  <div key={project.id} className="bg-gray-800 rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                        <span className="text-xs text-gray-400">{project.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {project.status === 'executing' && (
                          <button 
                            onClick={() => pauseProject(project.id)}
                            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 rounded transition-colors"
                            title="Pause"
                          >
                            ⏸️
                          </button>
                        )}
                        
                        {project.status === 'paused' && (
                          <button 
                            onClick={() => resumeProject(project.id)}
                            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                            title="Resume"
                          >
                            ▶️
                          </button>
                        )}
                        
                        <button 
                          onClick={() => stopProject(project.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Stop"
                        >
                          ⏹️
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">
                      <strong>Phase:</strong> {project.currentPhase}
                    </div>
                    
                    <div className="w-full bg-gray-600 rounded-full h-1.5 mb-2">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{project.progress}% complete</div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                      <div>👥 <span className="text-white">{project.activeAgents.length}</span> agents</div>
                      <div>📁 <span className="text-white">{project.artificactsGenerated}</span> artifacts</div>
                      <div>❌ <span className="text-white">{project.errorsEncountered}</span> errors</div>
                      <div>🧠 <span className="text-white">{project.learningsGenerated}</span> learnings</div>
                    </div>
                    
                    {/* Enhanced Task Details */}
                    <div className="border-t border-gray-600 pt-3 space-y-2">
                      {/* Current Task */}
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-xs font-medium text-blue-400 mb-1">🎯 Current Focus</div>
                        <div className="text-xs text-gray-300">{project.detailedProgress.currentTask}</div>
                        <div className="text-xs text-gray-400 mt-1">↳ {project.detailedProgress.currentSubtask}</div>
                      </div>
                      
                      {/* System Thinking */}
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-xs font-medium text-purple-400 mb-1">💭 AI Reasoning</div>
                        <div className="text-xs text-gray-300 mb-1">{project.systemThoughts.currentReasoning}</div>
                        <div className="text-xs text-gray-400">
                          <span className="text-green-400">Next:</span> {project.systemThoughts.nextDecision}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Confidence:</span>
                          <div className="flex-1 bg-gray-600 rounded h-1">
                            <div 
                              className="bg-green-500 h-1 rounded"
                              style={{ width: `${project.systemThoughts.confidenceLevel}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-green-400">{project.systemThoughts.confidenceLevel}%</span>
                        </div>
                      </div>
                      
                      {/* Active Agents */}
                      {project.activeAgents.length > 0 && (
                        <div className="bg-gray-700 rounded p-2">
                          <div className="text-xs font-medium text-green-400 mb-1">🤖 Active Agents</div>
                          <div className="space-y-1">
                            {project.activeAgents.map((agent: any) => (
                              <div key={agent.id} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-300">{agent.name}</div>
                                  <div className="text-xs text-gray-400 truncate">{agent.currentThought}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    agent.status === 'active' ? 'bg-green-500' :
                                    agent.status === 'thinking' ? 'bg-blue-500' :
                                    agent.status === 'communicating' ? 'bg-purple-500' :
                                    agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                                  }`}></div>
                                  <span className="text-xs text-gray-500">{agent.efficiency}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Recent Activities */}
                      {project.recentActivities.length > 0 && (
                        <div className="bg-gray-700 rounded p-2">
                          <div className="text-xs font-medium text-orange-400 mb-1">⚡ Recent Activity</div>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {project.recentActivities.slice(0, 3).map((activity: any) => (
                              <div key={activity.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">{activity.timestamp.toLocaleTimeString()}</span>
                                  <span className="text-blue-400">{activity.agentName}:</span>
                                </div>
                                <div className="text-gray-300 ml-2">{activity.activity}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Performance Metrics */}
                      <div className="bg-gray-700 rounded p-2">
                        <div className="text-xs font-medium text-cyan-400 mb-1">📊 Performance</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Velocity:</span>
                            <span className="text-white ml-1">{project.metrics.velocity} tasks/hr</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Accuracy:</span>
                            <span className="text-green-400 ml-1">{project.metrics.accuracy}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Autonomy:</span>
                            <span className="text-purple-400 ml-1">{project.metrics.autonomyLevel}%</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Coordination:</span>
                            <span className="text-blue-400 ml-1">{project.metrics.coordinationScore}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expand Detail View Button */}
                      <button
                        onClick={() => {
                          setSelectedProject(project.id)
                          setShowDetailView(true)
                        }}
                        className="w-full px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        🔍 View Detailed Activity Log
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Detailed Activity Modal */}
      {showDetailView && <DetailedActivityModal />}
    </div>
  )
}
