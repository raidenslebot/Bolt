/**
 * 🎮 AUTONOMOUS AI SYSTEM - CONTROL API
 * 
 * Control autonomous sessions (pause, resume, stop)
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
 * 🎮 CONTROL AUTONOMOUS SESSION
 * POST /api/autonomous/control
 */
export async function action(args: any) {
  const request = args?.request || args
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json()
    const { sessionId, action: controlAction } = body

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!controlAction) {
      return new Response(JSON.stringify({ error: 'Action is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const hub = getAutonomousHub()

    // Check if session exists
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

    let result: any = {}

    switch (controlAction) {
      case 'pause':
        await hub.pauseSession(sessionId)
        result = { action: 'paused', sessionId, status: 'paused' }
        break

      case 'resume':
        await hub.resumeSession(sessionId)
        result = { action: 'resumed', sessionId, status: 'executing' }
        break

      case 'stop':
        await hub.stopSession(sessionId)
        result = { action: 'stopped', sessionId, status: 'completed' }
        break

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use: pause, resume, or stop' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Session ${controlAction}d successfully`,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[AUTONOMOUS API] Control action failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export default function AutonomousControlRoute() {
  return null
}
