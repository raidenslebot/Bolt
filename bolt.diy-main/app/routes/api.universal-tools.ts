/**
 * Universal Tool API for Bolt.diy - SIMPLIFIED VERSION
 * Provides access to ALL tools available to the AI assistant
 */

import UniversalToolExecutor from '~/autonomous-services/universal-tool-executor';
import { AVAILABLE_TOOLS } from '~/types/tool-integration-types';
import type { ToolExecutionRequest } from '~/types/tool-integration-types';
import { webcontainer } from '~/lib/webcontainer';

// Helper function to create JSON responses
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function loader() {
  return jsonResponse({
    availableTools: AVAILABLE_TOOLS,
    totalTools: AVAILABLE_TOOLS.length,
    categories: [...new Set(AVAILABLE_TOOLS.map(tool => tool.category))],
    message: 'Universal Tool API - Every AI capability available to Bolt.diy users',
    endpoint: '/api/universal-tools',
    methods: ['GET', 'POST'],
    documentation: 'Access to all AI assistant tools through web interface'
  });
}

export async function action(request: Request): Promise<Response> {
  try {
    const data = await request.json();
    const { action, toolName, parameters = {}, context = {} } = data;

    // Create tool executor
    const toolExecutor = new UniversalToolExecutor(webcontainer, '/app');

    switch (action) {
      case 'execute': {
        if (!toolName) {
          return jsonResponse({ 
            success: false, 
            error: 'toolName is required for execute action' 
          }, 400);
        }

        const toolRequest: ToolExecutionRequest = {
          toolName,
          parameters,
          context
        };

        const result = await toolExecutor.executeTool(toolRequest);
        
        return jsonResponse({
          success: result.success,
          result: result.result,
          error: result.error,
          metadata: result.metadata,
          toolName,
          executedAt: new Date().toISOString()
        });
      }

      case 'list-tools': {
        const { category } = data;
        let tools = AVAILABLE_TOOLS;
        
        if (category) {
          tools = tools.filter(tool => tool.category === category);
        }
        
        return jsonResponse({
          success: true,
          tools,
          count: tools.length,
          category: category || 'all'
        });
      }

      case 'search-tools': {
        const { query } = data;
        if (!query) {
          return jsonResponse({ 
            success: false, 
            error: 'query is required for search-tools action' 
          }, 400);
        }

        const queryLower = query.toLowerCase();
        const matchingTools = AVAILABLE_TOOLS.filter(tool => 
          tool.name.toLowerCase().includes(queryLower) ||
          tool.description.toLowerCase().includes(queryLower) ||
          tool.category.toLowerCase().includes(queryLower)
        );

        return jsonResponse({
          success: true,
          query,
          tools: matchingTools,
          count: matchingTools.length
        });
      }

      case 'validate': {
        if (!toolName) {
          return jsonResponse({ 
            success: false, 
            error: 'toolName is required for validate action' 
          }, 400);
        }

        const toolRequest: ToolExecutionRequest = {
          toolName,
          parameters,
          context
        };

        const isValid = toolExecutor.validateToolRequest(toolRequest);
        const tool = AVAILABLE_TOOLS.find(t => t.name === toolName);
        
        return jsonResponse({
          success: true,
          valid: isValid,
          tool,
          requiredParameters: tool?.parameters || {},
          optionalParameters: tool?.optionalParameters || []
        });
      }

      case 'get-categories': {
        const categories = [...new Set(AVAILABLE_TOOLS.map(tool => tool.category))];
        const categoryStats = categories.map(category => ({
          category,
          count: AVAILABLE_TOOLS.filter(tool => tool.category === category).length,
          tools: AVAILABLE_TOOLS.filter(tool => tool.category === category).map(t => t.name)
        }));

        return jsonResponse({
          success: true,
          categories: categoryStats,
          totalCategories: categories.length
        });
      }

      default:
        return jsonResponse({ 
          success: false, 
          error: `Unknown action: ${action}. Available actions: execute, list-tools, search-tools, validate, get-categories` 
        }, 400);
    }

  } catch (error) {
    console.error('Universal Tools API Error:', error);
    
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }, 500);
  }
}
