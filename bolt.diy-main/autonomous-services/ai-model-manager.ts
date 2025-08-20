// Browser-compatible AI Model Manager for Bolt.diy
export interface AIModel {
  id: string
  name: string
  provider: 'deepseek' | 'openai' | 'anthropic' | 'google' | 'local'
  type: 'completion' | 'chat' | 'embedding' | 'image' | 'audio'
  maxTokens: number
  contextWindow: number
  costPer1kTokens: number
  latencyMs: number
  capabilities: string[]
  isAvailable: boolean
  lastUsed?: Date
  usageCount: number
  errorRate: number
}

export interface AIProvider {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: Map<string, AIModel>
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
    currentRequests: number
    currentTokens: number
    resetTime: Date
  }
  healthStatus: 'healthy' | 'degraded' | 'unavailable'
  lastHealthCheck: Date
}

export interface AIRequest {
  id: string
  model: string
  provider: string
  prompt: string
  options: {
    maxTokens?: number
    temperature?: number
    topP?: number
    stream?: boolean
    functions?: any[]
  }
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  timeout: number
}

export interface AIResponse {
  id: string
  requestId: string
  model: string
  provider: string
  content: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  latency: number
  cost: number
  timestamp: Date
  cached: boolean
  error?: string
}

export interface ModelMetrics {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageLatency: number
  successRate: number
  cachingEfficiency: number
  popularityScore: number
}

export interface LoadBalancingStrategy {
  strategy: 'round-robin' | 'least-latency' | 'least-cost' | 'most-capable' | 'intelligent'
  weights?: {
    latency: number
    cost: number
    capability: number
    availability: number
  }
}

// Simple EventEmitter for browser
class SimpleEventEmitter {
  private events: Map<string, Function[]> = new Map()

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
  }

  once(event: string, listener: Function): void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper)
      listener(...args)
    }
    this.on(event, wrapper)
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(...args))
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

// Generate UUID for browser
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Simple hash function for browser
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Advanced AI Model Manager for Bolt.diy Autonomous Integration
 * Provides load balancing, fallback strategies, cost optimization, and performance monitoring
 * OPTIMIZED FOR MAXIMUM PERFORMANCE AND PC RESOURCE UTILIZATION
 */
export class AIModelManager extends SimpleEventEmitter {
  private providers: Map<string, AIProvider> = new Map()
  private models: Map<string, AIModel> = new Map()
  private requestQueue: AIRequest[] = []
  private processingQueues: AIRequest[][] = [] // Parallel processing queues
  private responseCache: Map<string, AIResponse> = new Map()
  private activeRequests: Map<string, { request: AIRequest; startTime: Date }> = new Map()
  
  private loadBalancing: LoadBalancingStrategy = {
    strategy: 'intelligent',
    weights: {
      latency: 0.3,
      cost: 0.2,
      capability: 0.3,
      availability: 0.2
    }
  }
  
  private metrics: Map<string, ModelMetrics> = new Map()
  private isRunning = false
  private processingTimers: (NodeJS.Timeout | null)[] = [] // Multiple processing timers
  private healthCheckTimer: NodeJS.Timeout | null = null
  private maxConcurrentRequests: number
  private maxProcessingQueues: number

  constructor() {
    super()
    
    // Maximize PC utilization - use all available CPU cores
    this.maxConcurrentRequests = Math.max(12, (navigator.hardwareConcurrency || 4) * 3)
    this.maxProcessingQueues = Math.max(6, navigator.hardwareConcurrency || 4)
    
    // Initialize multiple processing queues for parallel execution
    for (let i = 0; i < this.maxProcessingQueues; i++) {
      this.processingQueues.push([])
      this.processingTimers.push(null)
    }
    
    this.initializeDefaultProviders()
    
    console.log(`[HIGH-PERF AI] Initialized with ${this.maxConcurrentRequests} concurrent requests, ${this.maxProcessingQueues} processing threads`)
  }

  /**
   * Initialize default AI providers for Bolt.diy integration
   */
  private initializeDefaultProviders(): void {
    // DeepSeek (primary for autonomous features)
    this.registerProvider('deepseek', 'DeepSeek', 'https://api.deepseek.com', '', [
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        type: 'chat',
        maxTokens: 8192,
        contextWindow: 16384,
        costPer1kTokens: 0.0014,
        capabilities: ['code-generation', 'code-analysis', 'autonomous-reasoning']
      }
    ])

    // OpenAI (for general intelligence)
    this.registerProvider('openai', 'OpenAI', 'https://api.openai.com', '', [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        type: 'chat',
        maxTokens: 4096,
        contextWindow: 128000,
        costPer1kTokens: 0.03,
        capabilities: ['general-intelligence', 'reasoning', 'planning']
      }
    ])

    // Anthropic (for safety and reasoning)
    this.registerProvider('anthropic', 'Anthropic', 'https://api.anthropic.com', '', [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        type: 'chat',
        maxTokens: 8192,
        contextWindow: 200000,
        costPer1kTokens: 0.015,
        capabilities: ['safety-reasoning', 'long-context', 'analysis']
      }
    ])
  }

  /**
   * Start the AI Model Manager
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.startRequestProcessing()
    this.startHealthChecking()
    this.emit('started')
  }

  /**
   * Stop the AI Model Manager
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.stopRequestProcessing()
    this.stopHealthChecking()
    this.emit('stopped')
  }

  /**
   * Register an AI provider
   */
  registerProvider(
    id: string,
    name: string,
    baseURL: string,
    apiKey: string,
    models: Partial<AIModel>[]
  ): void {
    const provider: AIProvider = {
      id,
      name,
      baseURL,
      apiKey,
      models: new Map(),
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
        currentRequests: 0,
        currentTokens: 0,
        resetTime: new Date(Date.now() + 60000)
      },
      healthStatus: 'healthy',
      lastHealthCheck: new Date()
    }

    // Initialize models for this provider
    models.forEach((modelData, index) => {
      const model: AIModel = {
        id: modelData.id || `${id}-model-${index}`,
        name: modelData.name || `Model ${index}`,
        provider: id as any,
        type: modelData.type || 'completion',
        maxTokens: modelData.maxTokens || 4096,
        contextWindow: modelData.contextWindow || 8192,
        costPer1kTokens: modelData.costPer1kTokens || 0.002,
        latencyMs: modelData.latencyMs || 1000,
        capabilities: modelData.capabilities || ['text-generation'],
        isAvailable: true,
        usageCount: 0,
        errorRate: 0
      }
      
      provider.models.set(model.id, model)
      this.models.set(model.id, model)
      
      // Initialize metrics
      this.metrics.set(model.id, {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        successRate: 100,
        cachingEfficiency: 0,
        popularityScore: 0
      })
    })

    this.providers.set(id, provider)
    this.emit('providerRegistered', provider)
  }

  /**
   * Make an AI request with intelligent routing and load balancing
   */
  async makeRequest(
    prompt: string,
    options: {
      modelId?: string
      maxTokens?: number
      temperature?: number
      priority?: 'low' | 'medium' | 'high' | 'critical'
      timeout?: number
    } = {}
  ): Promise<AIResponse> {
    const requestId = generateUUID()
    
    // Select the best model for this request
    const modelId = options.modelId || this.selectOptimalModel(prompt, options)
    
    const request: AIRequest = {
      id: requestId,
      model: modelId,
      provider: this.models.get(modelId)?.provider || 'deepseek',
      prompt,
      options: {
        maxTokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
        ...options
      },
      timestamp: new Date(),
      priority: options.priority || 'medium',
      timeout: options.timeout || 30000
    }

    // Add to queue and process
    return new Promise((resolve, reject) => {
      this.requestQueue.push(request)
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request ${requestId} timed out`))
      }, request.timeout)

      this.once(`response-${requestId}`, (response: AIResponse) => {
        clearTimeout(timeoutId)
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })

      this.processRequestQueue()
    })
  }

  /**
   * Select the optimal model for a request using intelligent routing
   */
  private selectOptimalModel(prompt: string, options: any): string {
    const availableModels = Array.from(this.models.values()).filter(m => m.isAvailable)
    
    if (availableModels.length === 0) {
      throw new Error('No available models')
    }

    // Analyze prompt to determine best model type
    if (prompt.includes('code') || prompt.includes('function') || prompt.includes('class')) {
      const codeModels = availableModels.filter(m => 
        m.capabilities.includes('code-generation') || m.id.includes('coder')
      )
      if (codeModels.length > 0) {
        return this.selectBestModel(codeModels)
      }
    }

    // For autonomous reasoning tasks
    if (prompt.includes('plan') || prompt.includes('strategy') || prompt.includes('autonomous')) {
      const reasoningModels = availableModels.filter(m => 
        m.capabilities.includes('autonomous-reasoning') || m.capabilities.includes('reasoning')
      )
      if (reasoningModels.length > 0) {
        return this.selectBestModel(reasoningModels)
      }
    }

    // Default to best overall model
    return this.selectBestModel(availableModels)
  }

  /**
   * Select the best model from a list using load balancing strategy
   */
  private selectBestModel(models: AIModel[]): string {
    if (models.length === 1) return models[0].id

    switch (this.loadBalancing.strategy) {
      case 'least-latency':
        return models.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b).id
      
      case 'least-cost':
        return models.reduce((a, b) => a.costPer1kTokens < b.costPer1kTokens ? a : b).id
      
      case 'intelligent':
        return this.selectIntelligentModel(models)
      
      default:
        return models[Math.floor(Math.random() * models.length)].id
    }
  }

  /**
   * Intelligent model selection using weighted scoring
   */
  private selectIntelligentModel(models: AIModel[]): string {
    const weights = this.loadBalancing.weights!
    
    let bestModel = models[0]
    let bestScore = 0

    for (const model of models) {
      const metrics = this.metrics.get(model.id)!
      
      const latencyScore = 1 / (model.latencyMs / 1000) // Lower latency = higher score
      const costScore = 1 / model.costPer1kTokens // Lower cost = higher score
      const capabilityScore = model.capabilities.length / 10 // More capabilities = higher score
      const availabilityScore = model.errorRate < 0.1 ? 1 : 0.5 // Low error rate = higher score
      
      const totalScore = 
        latencyScore * weights.latency +
        costScore * weights.cost +
        capabilityScore * weights.capability +
        availabilityScore * weights.availability

      if (totalScore > bestScore) {
        bestScore = totalScore
        bestModel = model
      }
    }

    return bestModel.id
  }

  /**
   * Process the request queue
   */
  private async processRequestQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return

    // Sort by priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    const request = this.requestQueue.shift()!
    await this.executeRequest(request)
  }

  /**
   * Execute a single AI request
   */
  private async executeRequest(request: AIRequest): Promise<void> {
    const startTime = new Date()
    this.activeRequests.set(request.id, { request, startTime })

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request)
      const cachedResponse = this.responseCache.get(cacheKey)
      
      if (cachedResponse) {
        this.emit(`response-${request.id}`, {
          ...cachedResponse,
          id: generateUUID(),
          requestId: request.id,
          cached: true
        })
        return
      }

      // Make actual API request (simplified for demo)
      const response = await this.makeAPIRequest(request)
      
      // Cache successful responses
      if (!response.error) {
        this.responseCache.set(cacheKey, response)
      }

      this.emit(`response-${request.id}`, response)
      this.updateMetrics(request, response, Date.now() - startTime.getTime())

    } catch (error) {
      const errorResponse: AIResponse = {
        id: generateUUID(),
        requestId: request.id,
        model: request.model,
        provider: request.provider,
        content: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
        latency: Date.now() - startTime.getTime(),
        cost: 0,
        timestamp: new Date(),
        cached: false,
        error: error instanceof Error ? error.message : String(error)
      }

      this.emit(`response-${request.id}`, errorResponse)
    } finally {
      this.activeRequests.delete(request.id)
    }
  }

  /**
   * Make the actual API request (placeholder for real implementation)
   */
  private async makeAPIRequest(request: AIRequest): Promise<AIResponse> {
    // This would integrate with Bolt.diy's existing LLM infrastructure
    // For now, return a mock response
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

    return {
      id: generateUUID(),
      requestId: request.id,
      model: request.model,
      provider: request.provider,
      content: `Mock response for: ${request.prompt.substring(0, 50)}...`,
      tokens: {
        prompt: Math.floor(request.prompt.length / 4),
        completion: 100,
        total: Math.floor(request.prompt.length / 4) + 100
      },
      latency: 1000,
      cost: 0.002,
      timestamp: new Date(),
      cached: false
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRequest): string {
    const key = `${request.model}-${request.prompt}-${JSON.stringify(request.options)}`
    return simpleHash(key)
  }

  /**
   * Update model metrics
   */
  private updateMetrics(request: AIRequest, response: AIResponse, latency: number): void {
    const metrics = this.metrics.get(request.model)!
    const model = this.models.get(request.model)!

    metrics.totalRequests++
    metrics.totalTokens += response.tokens.total
    metrics.totalCost += response.cost
    metrics.averageLatency = (metrics.averageLatency + latency) / 2
    
    if (!response.error) {
      metrics.successRate = (metrics.successRate * 0.9) + (1 * 0.1) // Exponential moving average
    } else {
      metrics.successRate = (metrics.successRate * 0.9) + (0 * 0.1)
      model.errorRate = (model.errorRate * 0.9) + (1 * 0.1)
    }

    model.lastUsed = new Date()
    model.usageCount++
    model.latencyMs = latency
  }

  /**
   * Start high-performance request processing with parallel execution
   */
  private startRequestProcessing(): void {
    for (let i = 0; i < this.maxProcessingQueues; i++) {
      this.processingTimers[i] = setInterval(() => {
        this.processRequestQueue(i)
      }, 50) // Process every 50ms for maximum throughput
    }
  }

  /**
   * Stop request processing for all queues
   */
  private stopRequestProcessing(): void {
    for (let i = 0; i < this.processingTimers.length; i++) {
      if (this.processingTimers[i]) {
        clearInterval(this.processingTimers[i]!)
        this.processingTimers[i] = null
      }
    }
  }

  /**
   * Start health checking loop
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks()
    }, 60000) // Check every minute
  }

  /**
   * Stop health checking loop
   */
  private stopHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        // Simple health check (simplified for demo)
        provider.healthStatus = 'healthy'
        provider.lastHealthCheck = new Date()
      } catch (error) {
        provider.healthStatus = 'unavailable'
        console.error(`Health check failed for provider ${provider.id}:`, error)
      }
    }
  }

  /**
   * Get all available models
   */
  getAvailableModels(): AIModel[] {
    return Array.from(this.models.values()).filter(m => m.isAvailable)
  }

  /**
   * Get provider by ID
   */
  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * Get model by ID
   */
  getModel(id: string): AIModel | undefined {
    return this.models.get(id)
  }

  /**
   * Get metrics for a model
   */
  getModelMetrics(modelId: string): ModelMetrics | undefined {
    return this.metrics.get(modelId)
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    isRunning: boolean
    activeRequests: number
    queueLength: number
    totalProviders: number
    healthyProviders: number
    totalModels: number
    availableModels: number
  } {
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => p.healthStatus === 'healthy').length
    
    const availableModels = Array.from(this.models.values())
      .filter(m => m.isAvailable).length

    return {
      isRunning: this.isRunning,
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      totalProviders: this.providers.size,
      healthyProviders,
      totalModels: this.models.size,
      availableModels
    }
  }
}
