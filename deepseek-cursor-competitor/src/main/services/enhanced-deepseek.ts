import OpenAI from 'openai'
import { EventEmitter } from 'events'
import { ContextEngine, ContextItem, ContextRequest } from './context-engine'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  context?: ContextItem[]
  metadata?: {
    model?: string
    tokens?: number
    responseTime?: number
    contextScore?: number
  }
}

export interface StreamingResponse {
  id: string
  content: string
  isComplete: boolean
  context?: ContextItem[]
  metadata?: {
    totalTokens?: number
    responseTime?: number
    contextUsed?: number
  }
}

export interface DeepSeekRequest {
  message: string
  currentFile?: string
  currentSelection?: {
    text: string
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  chatHistory?: ChatMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
  includeContext?: boolean
  contextTypes?: Array<'file' | 'symbol' | 'selection' | 'error' | 'documentation'>
}

/**
 * Enhanced DeepSeek service with sophisticated context integration
 * Rivals Cursor's AI capabilities with intelligent code understanding
 */
export class EnhancedDeepSeekService extends EventEmitter {
  private client: OpenAI
  private contextEngine: ContextEngine
  private conversationHistory: Map<string, ChatMessage[]> = new Map()
  private isStreaming = false
  private currentModel = 'deepseek-chat'
  private apiKey: string
  private baseURL = 'https://api.deepseek.com'

  constructor(apiKey: string, contextEngine: ContextEngine) {
    super()
    this.apiKey = apiKey
    this.contextEngine = contextEngine
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    })
  }

  /**
   * Initialize the enhanced service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test API connection
      await this.client.models.list()
      
      this.emit('initialized')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Send a message with intelligent context
   */
  async sendMessage(
    request: DeepSeekRequest,
    conversationId = 'default'
  ): Promise<ChatMessage> {
    const startTime = Date.now()
    
    try {
      // Get intelligent context if requested
      let contextItems: ContextItem[] = []
      let contextScore = 0
      
      if (request.includeContext !== false) {
        const contextRequest: ContextRequest = {
          query: request.message,
          currentFile: request.currentFile,
          currentSelection: request.currentSelection,
          maxItems: 15,
          includeTypes: request.contextTypes || ['file', 'symbol', 'selection', 'error', 'documentation'],
          workspaceScope: true
        }
        
        const contextAnalysis = await this.contextEngine.getContext(contextRequest)
        contextItems = contextAnalysis.items
        contextScore = contextAnalysis.totalRelevance
        
        this.emit('contextGathered', {
          conversationId,
          contextItems: contextItems.length,
          relevanceScore: contextScore,
          summary: contextAnalysis.summary
        })
      }

      // Build enhanced prompt with context
      const systemPrompt = this.buildSystemPrompt(contextItems, request)
      const messages = this.buildMessages(
        request.message,
        systemPrompt,
        request.chatHistory || this.conversationHistory.get(conversationId) || [],
        contextItems
      )

      // Send request to DeepSeek
      const response = await this.client.chat.completions.create({
        model: this.currentModel,
        messages,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.3,
        stream: false // Handle streaming separately
      })

      const responseContent = response.choices[0]?.message?.content || ''
      const responseTime = Date.now() - startTime

      // Create response message
      const chatMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        context: contextItems,
        metadata: {
          model: this.currentModel,
          tokens: response.usage?.total_tokens,
          responseTime,
          contextScore
        }
      }

      // Update conversation history
      const history = this.conversationHistory.get(conversationId) || []
      history.push({
        id: this.generateMessageId(),
        role: 'user',
        content: request.message,
        timestamp: new Date()
      })
      history.push(chatMessage)
      this.conversationHistory.set(conversationId, history.slice(-20)) // Keep last 20 messages

      this.emit('messageReceived', { conversationId, message: chatMessage })
      return chatMessage

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        metadata: {
          responseTime: Date.now() - startTime
        }
      }

      this.emit('messageError', { conversationId, error, message: errorMessage })
      return errorMessage
    }
  }

  /**
   * Stream a message with real-time context
   */
  async *streamMessage(
    request: DeepSeekRequest,
    conversationId = 'default'
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    const startTime = Date.now()
    this.isStreaming = true
    
    try {
      // Get context (same as non-streaming)
      let contextItems: ContextItem[] = []
      
      if (request.includeContext !== false) {
        const contextRequest: ContextRequest = {
          query: request.message,
          currentFile: request.currentFile,
          currentSelection: request.currentSelection,
          maxItems: 15,
          includeTypes: request.contextTypes || ['file', 'symbol', 'selection', 'error', 'documentation'],
          workspaceScope: true
        }
        
        const contextAnalysis = await this.contextEngine.getContext(contextRequest)
        contextItems = contextAnalysis.items
      }

      // Build enhanced prompt
      const systemPrompt = this.buildSystemPrompt(contextItems, request)
      const messages = this.buildMessages(
        request.message,
        systemPrompt,
        request.chatHistory || this.conversationHistory.get(conversationId) || [],
        contextItems
      )

      // Create streaming request
      const stream = await this.client.chat.completions.create({
        model: this.currentModel,
        messages,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.3,
        stream: true
      })

      let fullContent = ''
      let streamId = this.generateMessageId()

      // Stream responses
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullContent += content
        
        const streamingResponse: StreamingResponse = {
          id: streamId,
          content: fullContent,
          isComplete: false,
          context: contextItems
        }

        this.emit('streamingChunk', { conversationId, chunk: streamingResponse })
        yield streamingResponse
      }

      // Final response
      const finalResponse: StreamingResponse = {
        id: streamId,
        content: fullContent,
        isComplete: true,
        context: contextItems,
        metadata: {
          responseTime: Date.now() - startTime,
          contextUsed: contextItems.length
        }
      }

      // Update conversation history
      const history = this.conversationHistory.get(conversationId) || []
      history.push({
        id: this.generateMessageId(),
        role: 'user',
        content: request.message,
        timestamp: new Date()
      })
      history.push({
        id: streamId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        context: contextItems,
        metadata: finalResponse.metadata
      })
      this.conversationHistory.set(conversationId, history.slice(-20))

      this.emit('streamComplete', { conversationId, response: finalResponse })
      yield finalResponse

    } catch (error) {
      this.emit('streamError', { conversationId, error })
      throw error
    } finally {
      this.isStreaming = false
    }
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(contextItems: ContextItem[], request: DeepSeekRequest): string {
    let systemPrompt = `You are an expert AI programming assistant with deep knowledge of software development.

You have access to the user's codebase and can see the current context of their work. Use this context to provide accurate, helpful responses.

Key capabilities:
- Code analysis and understanding
- Bug detection and debugging
- Code optimization and refactoring
- Documentation and explanation
- Architecture and design guidance
- Best practices recommendations

Guidelines:
- Be concise but thorough
- Provide working code examples when relevant
- Explain your reasoning
- Consider the broader codebase context
- Suggest improvements when appropriate`

    if (contextItems.length > 0) {
      systemPrompt += `\n\nCURRENT CONTEXT:\n`
      
      // Group context by type
      const contextByType = contextItems.reduce((groups, item) => {
        if (!groups[item.type]) groups[item.type] = []
        groups[item.type].push(item)
        return groups
      }, {} as Record<string, ContextItem[]>)

      // Add context sections
      Object.entries(contextByType).forEach(([type, items]) => {
        systemPrompt += `\n${type.toUpperCase()}:\n`
        items.slice(0, 5).forEach(item => {
          systemPrompt += `- ${item.filePath}${item.line ? `:${item.line}` : ''}\n`
          if (item.metadata?.symbolName) {
            systemPrompt += `  Symbol: ${item.metadata.symbolName}\n`
          }
          systemPrompt += `  ${item.content.slice(0, 200)}...\n\n`
        })
      })
    }

    if (request.currentFile) {
      systemPrompt += `\nCURRENT FILE: ${request.currentFile}`
    }

    if (request.currentSelection) {
      systemPrompt += `\nCURRENT SELECTION: Lines ${request.currentSelection.startLine}-${request.currentSelection.endLine}\n${request.currentSelection.text.slice(0, 500)}`
    }

    return systemPrompt
  }

  /**
   * Build message array for API
   */
  private buildMessages(
    userMessage: string,
    systemPrompt: string,
    chatHistory: ChatMessage[],
    contextItems: ContextItem[]
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    // System message
    messages.push({
      role: 'system',
      content: systemPrompt
    })

    // Recent chat history (last 10 messages)
    const recentHistory = chatHistory.slice(-10)
    for (const msg of recentHistory) {
      if (msg.role !== 'system' && (msg.role === 'user' || msg.role === 'assistant')) {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    // Current user message
    messages.push({
      role: 'user',
      content: userMessage
    })

    return messages
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId = 'default'): ChatMessage[] {
    return this.conversationHistory.get(conversationId) || []
  }

  /**
   * Clear conversation history
   */
  clearConversation(conversationId = 'default'): void {
    this.conversationHistory.delete(conversationId)
    this.emit('conversationCleared', { conversationId })
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): string[] {
    return Array.from(this.conversationHistory.keys())
  }

  /**
   * Update model settings
   */
  updateModel(model: string): void {
    this.currentModel = model
    this.emit('modelChanged', { model })
  }

  /**
   * Get current status
   */
  getStatus(): {
    isStreaming: boolean
    currentModel: string
    activeConversations: number
    totalMessages: number
  } {
    const totalMessages = Array.from(this.conversationHistory.values())
      .reduce((total, history) => total + history.length, 0)

    return {
      isStreaming: this.isStreaming,
      currentModel: this.currentModel,
      activeConversations: this.conversationHistory.size,
      totalMessages
    }
  }

  /**
   * Export conversation for analysis
   */
  exportConversation(conversationId = 'default'): {
    conversationId: string
    messages: ChatMessage[]
    exported: Date
    stats: {
      totalMessages: number
      totalTokens: number
      averageResponseTime: number
      contextItemsUsed: number
    }
  } {
    const messages = this.conversationHistory.get(conversationId) || []
    
    const stats = {
      totalMessages: messages.length,
      totalTokens: messages.reduce((sum, msg) => sum + (msg.metadata?.tokens || 0), 0),
      averageResponseTime: messages
        .filter(msg => msg.metadata?.responseTime)
        .reduce((sum, msg, _, arr) => sum + (msg.metadata?.responseTime || 0) / arr.length, 0),
      contextItemsUsed: messages.reduce((sum, msg) => sum + (msg.context?.length || 0), 0)
    }

    return {
      conversationId,
      messages,
      exported: new Date(),
      stats
    }
  }

  /**
   * Utility methods
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    this.conversationHistory.clear()
    this.emit('shutdown')
  }
}
