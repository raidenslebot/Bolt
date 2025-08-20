import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { boltSelfAwarenessSystem } from '~/lib/core/bolt-self-awareness';

const logger = createScopedLogger('api.self-awareness');

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { action: requestAction, ...params } = await request.json();
    
    logger.info(`🧠 Self-awareness request: ${requestAction}`);
    
    switch (requestAction) {
      case 'open-source-workspace':
        return await handleOpenSourceWorkspace();
        
      case 'get-status':
        return await handleGetStatus();
        
      case 'implement-capability':
        return await handleImplementCapability(params.capability);
        
      case 'analyze-source':
        return await handleAnalyzeSource();
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${requestAction}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
  } catch (error) {
    logger.error('❌ Self-awareness API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleOpenSourceWorkspace() {
  logger.info('📂 Opening source workspace...');
  
  try {
    const result = await boltSelfAwarenessSystem.openSourceWorkspace();
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.success ? 
        'Source workspace opened successfully' : 
        'Failed to open source workspace',
      data: {
        sourcePath: result.sourcePath,
        capabilities: result.capabilities,
        fileCount: result.analysis?.totalFiles || 0,
        codeLines: result.analysis?.codeLines || 0,
        enhancements: result.analysis?.enhancement || {}
      }
    }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('❌ Failed to open source workspace:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to open source workspace',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetStatus() {
  logger.info('📊 Getting self-awareness status...');
  
  try {
    const status = boltSelfAwarenessSystem.getStatus();
    
    return new Response(JSON.stringify({
      success: true,
      data: status
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('❌ Failed to get status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleImplementCapability(capability: string) {
  logger.info(`🔧 Implementing capability: ${capability}`);
  
  if (!capability) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Capability name is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const result = await boltSelfAwarenessSystem.implementCapability(capability);
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.message,
      data: {
        capability,
        filesModified: result.filesModified
      }
    }), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('❌ Failed to implement capability:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to implement capability',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAnalyzeSource() {
  logger.info('🔍 Analyzing source code...');
  
  try {
    // Initialize self-awareness if not already done
    await boltSelfAwarenessSystem.initialize();
    const status = boltSelfAwarenessSystem.getStatus();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Source analysis complete',
      data: {
        analysis: status.analysis,
        capabilities: status.capabilities,
        canSelfModify: status.canSelfModify
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logger.error('❌ Source analysis failed:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Source analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
