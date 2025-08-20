/**
 * 🔍 AUTONOMOUS AI SYSTEM - STATUS API
 * 
 * Get status and progress of autonomous sessions
 */

import { AutonomousOrchestrationHub } from '../../../autonomous-services/autonomous-orchestration-hub'

// Global autonomous system instance
let autonomousHub: AutonomousOrchestrationHub | null = null

function getAutonomousHub(): AutonomousOrchestrationHub {
  if (!autonomousHub) {
    autonomousHub = new AutonomousOrchestrationHub()
  }
  return autonomousHub
}

/**
 * 🔍 GET SESSION STATUS
 * GET /api/autonomous/status?sessionId=xxx
 * GET /api/autonomous/status (all sessions)
 */
export async function loader(args: any) {
  const request = args?.request || args
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  try {
    const hub = getAutonomousHub()

    if (sessionId) {
      // Get specific session status
      const session = hub.getSessionStatus(sessionId)
      
      if (!session) {
        return new Response(JSON.stringify({ 
          error: 'Session not found',
          sessionId 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        session: {
          id: session.id,
          objective: session.objective,
          status: session.status,
          progress: session.progress,
          agentWorkforce: {
            primaryAgent: session.agentWorkforce.primaryAgent.name,
            activeAgents: session.agentWorkforce.activeSubAgents.size,
            maxAgents: session.agentWorkforce.maxConcurrentAgents,
            predictedRequirement: session.agentWorkforce.predictedAgentRequirement
          },
          artifacts: {
            filesCreated: session.artifacts.filesCreated.length,
            filesModified: session.artifacts.filesModified.length,
            errorsEncountered: session.artifacts.errorsEncountered.length,
            learningsGenerated: session.artifacts.learningsGenerated.length
          },
          startTime: session.startTime,
          endTime: session.endTime
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      
    } else {
      // Get all sessions
      const sessions = hub.getAllSessions()
      
      return new Response(JSON.stringify({
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          objective: session.objective,
          status: session.status,
          progress: session.progress.percentage,
          activeAgents: session.agentWorkforce.activeSubAgents.size,
          startTime: session.startTime,
          endTime: session.endTime
        })),
        totalSessions: sessions.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('[AUTONOMOUS API] Status check failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export default function AutonomousStatusRoute() {
  return null
}
