/**
 * 🚀 AUTONOMOUS AI SYSTEM - REACT COMPONENT
 * 
 * Complete UI for managing autonomous AI sessions within Bolt.diy
 */

import React, { useState, useEffect } from 'react'

interface AutonomousSession {
  id: string
  objective: string
  status: string
  progress: { percentage: number }
  activeAgents: number
  startTime: string
}

interface AutonomousCapabilities {
  canSelfModifyCode: boolean
  canTrainModels: boolean
  canManageInfrastructure: boolean
  canHandleSecurity: boolean
  canProcessNaturalLanguage: boolean
  canLearnFromErrors: boolean
  canManageMemory: boolean
  canCommunicateAIToAI: boolean
  canManageAgentWorkforce: boolean
  canExecuteAutonomousProjects: boolean
}

export function AutonomousSystemPanel() {
  const [sessions, setSessions] = useState<AutonomousSession[]>([])
  const [capabilities, setCapabilities] = useState<AutonomousCapabilities | null>(null)
  const [newObjective, setNewObjective] = useState('')
  const [autonomyLevel, setAutonomyLevel] = useState(95)
  const [maxAgents, setMaxAgents] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [systemHealth, setSystemHealth] = useState<any>(null)

  // Fetch autonomous sessions and status
  useEffect(() => {
    loadSessions()
    loadSystemHealth()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadSessions()
      loadSystemHealth()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/autonomous/status')
      const data = await response.json()
      
      if (data.success) {
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/autonomous/dashboard')
      const data = await response.json()
      
      if (data.success) {
        setSystemHealth(data.dashboard.health)
        setCapabilities(data.dashboard.capabilities)
      }
    } catch (err) {
      console.error('Failed to load system health:', err)
    }
  }

  const startAutonomousSession = async () => {
    if (!newObjective.trim()) {
      setError('Please enter a project objective')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/autonomous/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: newObjective,
          autonomyLevel,
          maxAgents,
          specializations: ['frontend', 'backend', 'database', 'testing'],
          memoryPersistence: true,
          selfEvolutionEnabled: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewObjective('')
        loadSessions()
        alert(`🚀 Autonomous session started! Session ID: ${data.sessionId}`)
      } else {
        setError(data.error || 'Failed to start session')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Start session error:', err)
    } finally {
      setLoading(false)
    }
  }

  const controlSession = async (sessionId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      const response = await fetch('/api/autonomous/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action })
      })

      const data = await response.json()

      if (data.success) {
        loadSessions()
        alert(`Session ${action}d successfully`)
      } else {
        alert(`Failed to ${action} session: ${data.error}`)
      }
    } catch (err) {
      alert(`Network error during ${action}`)
      console.error(`Control session error:`, err)
    }
  }

  const triggerSelfEvolution = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/autonomous/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'improve system capabilities and performance',
          targetAreas: ['performance', 'capabilities', 'error_handling'],
          aggressiveness: 'moderate'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('🧠 Self-evolution process initiated successfully!')
        loadSessions()
      } else {
        alert(`Self-evolution failed: ${data.error}`)
      }
    } catch (err) {
      alert('Network error during self-evolution')
      console.error('Self-evolution error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing': return 'text-green-500'
      case 'paused': return 'text-yellow-500'
      case 'completed': return 'text-blue-500'
      case 'failed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="autonomous-system-panel p-6 bg-gray-900 text-white rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center">
          🚀 Autonomous AI System
          {systemHealth && (
            <span className={`ml-2 text-sm ${getHealthColor(systemHealth.overall)}`}>
              ● {systemHealth.overall}
            </span>
          )}
        </h2>
        <p className="text-gray-400">
          Self-evolving AI workforce for autonomous project execution
        </p>
      </div>

      {/* Capabilities Overview */}
      {capabilities && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🧠 System Capabilities</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(capabilities).map(([key, enabled]) => (
              <div key={key} className={`text-xs p-2 rounded ${enabled ? 'bg-green-800' : 'bg-red-800'}`}>
                {enabled ? '✅' : '❌'} {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start New Session */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🎯 Start New Autonomous Session</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Objective</label>
            <textarea
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Describe what you want the AI to build or accomplish..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Autonomy Level: {autonomyLevel}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={autonomyLevel}
                onChange={(e) => setAutonomyLevel(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Max Agents: {maxAgents}
              </label>
              <input
                type="range"
                min="2"
                max="16"
                value={maxAgents}
                onChange={(e) => setMaxAgents(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm p-2 bg-red-900 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={startAutonomousSession}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
            >
              {loading ? '🔄 Starting...' : '🚀 Start Autonomous Session'}
            </button>
            
            <button
              onClick={triggerSelfEvolution}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
            >
              🧠 Self-Evolve
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🤖 Active Sessions ({sessions.length})</h3>
        
        {sessions.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No active autonomous sessions
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium">{session.objective}</h4>
                    <div className="text-sm text-gray-400 mt-1">
                      ID: {session.id} • Started: {new Date(session.startTime).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-medium ${getStatusColor(session.status)}`}>
                      {session.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-400">
                      {session.activeAgents} agents
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{session.progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${session.progress.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  {session.status === 'executing' && (
                    <button
                      onClick={() => controlSession(session.id, 'pause')}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                    >
                      ⏸️ Pause
                    </button>
                  )}
                  
                  {session.status === 'paused' && (
                    <button
                      onClick={() => controlSession(session.id, 'resume')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      ▶️ Resume
                    </button>
                  )}
                  
                  <button
                    onClick={() => controlSession(session.id, 'stop')}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    ⏹️ Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📊 System Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(systemHealth).map(([system, health]) => (
              <div key={system} className="text-center">
                <div className={`font-medium ${getHealthColor(health as string)}`}>
                  ● {health}
                </div>
                <div className="text-sm text-gray-400 capitalize">
                  {system.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AutonomousSystemPanel
