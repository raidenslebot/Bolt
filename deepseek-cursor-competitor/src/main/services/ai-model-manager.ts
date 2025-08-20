import { EventEmitter } from 'events'
import * as crypto from 'crypto'

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

/**
 * Advanced AI Model Manager for handling multiple AI providers and intelligent routing
 * Provides load balancing, fallback strategies, cost optimization, and performance monitoring
 */
export class AIModelManager extends EventEmitter {
  private providers: Map<string, AIProvider> = new Map()
  private models: Map<string, AIModel> = new Map()
  private requestQueue: AIRequest[] = []
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
  private processingTimer: NodeJS.Timeout | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null

  constructor() {
    super()
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
   * Make an AI request with intelligent routing
   */
  async makeRequest(
    prompt: string,
    options: {
      modelId?: string
      providerId?: string
      maxTokens?: number
      temperature?: number
      topP?: number
      stream?: boolean
      priority?: 'low' | 'medium' | 'high' | 'critical'
      timeout?: number
      allowFallback?: boolean
    } = {}
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId()
    
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, options)
    const cached = this.responseCache.get(cacheKey)
    if (cached) {
      this.emit('cacheHit', requestId, cached)
      return { ...cached, id: requestId, cached: true }
    }

    // Create request
    const request: AIRequest = {
      id: requestId,
      model: options.modelId || await this.selectOptimalModel(prompt, options),
      provider: options.providerId || await this.selectOptimalProvider(options.modelId),
      prompt,
      options: {
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9,
        stream: options.stream || false
      },
      timestamp: new Date(),
      priority: options.priority || 'medium',
      timeout: options.timeout || 300000 // 5 minutes for AI responses
    }

    // Queue request based on priority
    this.queueRequest(request)
    
    // Wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeRequests.delete(requestId)
        reject(new Error(`Request ${requestId} timed out`))
      }, request.timeout)

      const handleResponse = (response: AIResponse) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout)
          this.removeListener('response', handleResponse)
          this.removeListener('error', handleError)
          
          // Cache successful response
          if (!response.error) {
            this.responseCache.set(cacheKey, response)
          }
          
          resolve(response)
        }
      }

      const handleError = (error: Error, reqId: string) => {
        if (reqId === requestId) {
          clearTimeout(timeout)
          this.removeListener('response', handleResponse)
          this.removeListener('error', handleError)
          
          // Try fallback if allowed
          if (options.allowFallback !== false) {
            this.tryFallback(request).then(resolve).catch(reject)
          } else {
            reject(error)
          }
        }
      }

      this.on('response', handleResponse)
      this.on('error', handleError)
    })
  }

  /**
   * Get model information
   */
  getModel(modelId: string): AIModel | undefined {
    return this.models.get(modelId)
  }

  /**
   * Get all available models
   */
  getAvailableModels(type?: string): AIModel[] {
    const models = Array.from(this.models.values())
    return type ? models.filter(m => m.type === type && m.isAvailable) : models.filter(m => m.isAvailable)
  }

  /**
   * Get provider information
   */
  getProvider(providerId: string): AIProvider | undefined {
    return this.providers.get(providerId)
  }

  /**
   * Get all providers
   */
  getProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get model metrics
   */
  getModelMetrics(modelId?: string): ModelMetrics | Map<string, ModelMetrics> {
    if (modelId) {
      return this.metrics.get(modelId) || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        successRate: 100,
        cachingEfficiency: 0,
        popularityScore: 0
      }
    }
    return new Map(this.metrics)
  }

  /**
   * Update load balancing strategy
   */
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancing = strategy
    this.emit('loadBalancingUpdated', strategy)
  }

  /**
   * Get system status
   */
  getStatus(): {
    isRunning: boolean
    providers: number
    models: number
    queueLength: number
    activeRequests: number
    cacheSize: number
    totalRequests: number
    totalCost: number
  } {
    const totalRequests = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalRequests, 0)
    const totalCost = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalCost, 0)

    return {
      isRunning: this.isRunning,
      providers: this.providers.size,
      models: this.models.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      cacheSize: this.responseCache.size,
      totalRequests,
      totalCost
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.responseCache.clear()
    this.emit('cacheCleared')
  }

  /**
   * Private methods
   */
  private async selectOptimalModel(prompt: string, options: any): Promise<string> {
    const availableModels = this.getAvailableModels(options.type)
    
    if (availableModels.length === 0) {
      throw new Error('No available models')
    }

    switch (this.loadBalancing.strategy) {
      case 'round-robin':
        return this.selectRoundRobinModel(availableModels)
        
      case 'least-latency':
        return this.selectLeastLatencyModel(availableModels)
        
      case 'least-cost':
        return this.selectLeastCostModel(availableModels)
        
      case 'most-capable':
        return this.selectMostCapableModel(availableModels, prompt)
        
      case 'intelligent':
        return this.selectIntelligentModel(availableModels, prompt, options)
        
      default:
        return availableModels[0].id
    }
  }

  private async selectOptimalProvider(modelId?: string): Promise<string> {
    if (modelId) {
      const model = this.models.get(modelId)
      return model ? model.provider : 'deepseek'
    }
    
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => p.healthStatus === 'healthy')
    
    return healthyProviders.length > 0 ? healthyProviders[0].id : 'deepseek'
  }

  private selectRoundRobinModel(models: AIModel[]): string {
    // Simple round-robin based on usage count
    const leastUsed = models.reduce((min, model) => 
      model.usageCount < min.usageCount ? model : min
    )
    return leastUsed.id
  }

  private selectLeastLatencyModel(models: AIModel[]): string {
    const fastestModel = models.reduce((min, model) => 
      model.latencyMs < min.latencyMs ? model : min
    )
    return fastestModel.id
  }

  private selectLeastCostModel(models: AIModel[]): string {
    const cheapestModel = models.reduce((min, model) => 
      model.costPer1kTokens < min.costPer1kTokens ? model : min
    )
    return cheapestModel.id
  }

  private selectMostCapableModel(models: AIModel[], prompt: string): string {
    // Analyze prompt to determine required capabilities
    const requiredCapabilities = this.analyzePromptCapabilities(prompt)
    
    const capableModels = models.filter(model => 
      requiredCapabilities.every(cap => model.capabilities.includes(cap))
    )
    
    if (capableModels.length === 0) {
      return models[0].id // Fallback to first available
    }
    
    // Select model with most capabilities
    const mostCapable = capableModels.reduce((max, model) => 
      model.capabilities.length > max.capabilities.length ? model : max
    )
    
    return mostCapable.id
  }

  private selectIntelligentModel(models: AIModel[], prompt: string, options: any): string {
    const weights = this.loadBalancing.weights!
    const scores: Array<{ modelId: string; score: number }> = []
    
    for (const model of models) {
      const metrics = this.metrics.get(model.id)!
      
      // Calculate weighted score
      const latencyScore = 1 / (model.latencyMs / 1000) // Higher is better (lower latency)
      const costScore = 1 / model.costPer1kTokens // Higher is better (lower cost)
      const capabilityScore = this.calculateCapabilityScore(model, prompt)
      const availabilityScore = model.isAvailable ? (metrics.successRate / 100) : 0
      
      const totalScore = 
        latencyScore * weights.latency +
        costScore * weights.cost +
        capabilityScore * weights.capability +
        availabilityScore * weights.availability
      
      scores.push({ modelId: model.id, score: totalScore })
    }
    
    // Select highest scoring model
    const bestModel = scores.reduce((max, current) => 
      current.score > max.score ? current : max
    )
    
    return bestModel.modelId
  }

  private analyzePromptCapabilities(prompt: string): string[] {
    const capabilities = ['text-generation']
    
    // Simple analysis - in real implementation, this would be more sophisticated
    if (prompt.includes('code') || prompt.includes('function') || prompt.includes('class')) {
      capabilities.push('code-generation')
    }
    
    if (prompt.includes('translate') || prompt.includes('language')) {
      capabilities.push('translation')
    }
    
    if (prompt.includes('summarize') || prompt.includes('summary')) {
      capabilities.push('summarization')
    }
    
    return capabilities
  }

  private calculateCapabilityScore(model: AIModel, prompt: string): number {
    const requiredCapabilities = this.analyzePromptCapabilities(prompt)
    const matchingCapabilities = requiredCapabilities.filter(cap => 
      model.capabilities.includes(cap)
    )
    
    return matchingCapabilities.length / requiredCapabilities.length
  }

  private queueRequest(request: AIRequest): void {
    // Insert request based on priority
    const priorities = ['low', 'medium', 'high', 'critical']
    const priority = priorities.indexOf(request.priority)
    
    let insertIndex = this.requestQueue.length
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuePriority = priorities.indexOf(this.requestQueue[i].priority)
      if (priority > queuePriority) {
        insertIndex = i
        break
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request)
    this.emit('requestQueued', request)
  }

  private startRequestProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processRequestQueue()
    }, 100) // Process every 100ms
  }

  private stopRequestProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }
  }

  private async processRequestQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return

    const request = this.requestQueue.shift()!
    this.activeRequests.set(request.id, { request, startTime: new Date() })

    try {
      const response = await this.executeRequest(request)
      this.handleResponse(response)
    } catch (error) {
      this.handleError(error as Error, request.id)
    }
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    const model = this.models.get(request.model)!
    const provider = this.providers.get(request.provider)!

    // Check rate limits
    await this.checkRateLimits(provider)

    // Simulate API call - in real implementation, this would call the actual API
    const response = await this.callProviderAPI(provider, model, request)
    
    const latency = Date.now() - startTime
    const cost = this.calculateCost(model, response.tokens.total)

    // Update metrics
    this.updateModelMetrics(model.id, {
      request,
      response,
      latency,
      cost,
      success: !response.error
    })

    return {
      id: this.generateResponseId(),
      requestId: request.id,
      model: request.model,
      provider: request.provider,
      content: response.content,
      tokens: response.tokens,
      latency,
      cost,
      timestamp: new Date(),
      cached: false,
      error: response.error
    }
  }

  private async callProviderAPI(provider: AIProvider, model: AIModel, request: AIRequest): Promise<any> {
    // Real DeepSeek API implementation
    if (provider.id === 'deepseek') {
      return await this.callDeepSeekAPI(model, request)
    }
    
    // Real OpenAI API implementation
    if (provider.id === 'openai') {
      return await this.callOpenAIAPI(model, request)
    }
    
    // Real Anthropic API implementation
    if (provider.id === 'anthropic') {
      return await this.callAnthropicAPI(model, request)
    }
    
    // Fallback for unsupported providers
    throw new Error(`Unsupported provider: ${provider.id}`)
  }

  private async callDeepSeekAPI(model: AIModel, request: AIRequest): Promise<any> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required')
    }

    const payload = {
      model: model.id,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.maxTokens || 2000,
      stream: false
    }

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`DeepSeek API error (${response.status}): ${errorData}`)
      }

      const data = await response.json() as {
        choices: Array<{
          message: { content: string }
          finish_reason: string
        }>
        usage: {
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
        }
        model: string
      }
      
      return {
        content: data.choices[0]?.message?.content || 'No response content',
        tokens: {
          prompt: data.usage?.prompt_tokens || Math.floor(request.prompt.length / 4),
          completion: data.usage?.completion_tokens || 100,
          total: data.usage?.total_tokens || Math.floor(request.prompt.length / 4) + 100
        },
        model: data.model || model.id,
        finish_reason: data.choices[0]?.finish_reason || 'stop'
      }
    } catch (error) {
      console.error('DeepSeek API call failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`DeepSeek API call failed: ${errorMessage}`)
    }
  }

  private async callOpenAIAPI(model: AIModel, request: AIRequest): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    const payload = {
      model: model.id,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.maxTokens || 2000
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorData}`)
      }

      const data = await response.json() as {
        choices: Array<{
          message: { content: string }
          finish_reason: string
        }>
        usage: {
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
        }
        model: string
      }
      
      return {
        content: data.choices[0]?.message?.content || 'No response content',
        tokens: {
          prompt: data.usage?.prompt_tokens || Math.floor(request.prompt.length / 4),
          completion: data.usage?.completion_tokens || 100,
          total: data.usage?.total_tokens || Math.floor(request.prompt.length / 4) + 100
        },
        model: data.model || model.id,
        finish_reason: data.choices[0]?.finish_reason || 'stop'
      }
    } catch (error) {
      console.error('OpenAI API call failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`OpenAI API call failed: ${errorMessage}`)
    }
  }

  private async callAnthropicAPI(model: AIModel, request: AIRequest): Promise<any> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    const payload = {
      model: model.id,
      max_tokens: request.options?.maxTokens || 2000,
      temperature: request.options?.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Anthropic API error (${response.status}): ${errorData}`)
      }

      const data = await response.json() as {
        content: Array<{ text: string }>
        usage: {
          input_tokens: number
          output_tokens: number
        }
        model: string
        stop_reason: string
      }
      
      return {
        content: data.content[0]?.text || 'No response content',
        tokens: {
          prompt: data.usage?.input_tokens || Math.floor(request.prompt.length / 4),
          completion: data.usage?.output_tokens || 100,
          total: (data.usage?.input_tokens || Math.floor(request.prompt.length / 4)) + 
                 (data.usage?.output_tokens || 100)
        },
        model: data.model || model.id,
        finish_reason: data.stop_reason || 'stop'
      }
    } catch (error) {
      console.error('Anthropic API call failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Anthropic API call failed: ${errorMessage}`)
    }
  }

  private async checkRateLimits(provider: AIProvider): Promise<void> {
    const now = Date.now()
    
    // Reset rate limits if time window has passed
    if (now > provider.rateLimits.resetTime.getTime()) {
      provider.rateLimits.currentRequests = 0
      provider.rateLimits.currentTokens = 0
      provider.rateLimits.resetTime = new Date(now + 60000) // Next minute
    }
    
    // Check if we're over limits
    if (provider.rateLimits.currentRequests >= provider.rateLimits.requestsPerMinute) {
      const waitTime = provider.rateLimits.resetTime.getTime() - now
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  private calculateCost(model: AIModel, tokens: number): number {
    return (tokens / 1000) * model.costPer1kTokens
  }

  private updateModelMetrics(modelId: string, data: any): void {
    const metrics = this.metrics.get(modelId)!
    
    metrics.totalRequests++
    metrics.totalTokens += data.response.tokens.total
    metrics.totalCost += data.cost
    metrics.averageLatency = (metrics.averageLatency * (metrics.totalRequests - 1) + data.latency) / metrics.totalRequests
    
    if (data.success) {
      metrics.successRate = (metrics.successRate * (metrics.totalRequests - 1) + 100) / metrics.totalRequests
    } else {
      metrics.successRate = (metrics.successRate * (metrics.totalRequests - 1)) / metrics.totalRequests
    }
    
    // Update model usage
    const model = this.models.get(modelId)!
    model.usageCount++
    model.lastUsed = new Date()
  }

  private handleResponse(response: AIResponse): void {
    this.activeRequests.delete(response.requestId)
    this.emit('response', response)
  }

  private handleError(error: Error, requestId: string): void {
    this.activeRequests.delete(requestId)
    this.emit('error', error, requestId)
  }

  private async tryFallback(originalRequest: AIRequest): Promise<AIResponse> {
    // Try different model or provider
    const alternativeModels = this.getAvailableModels()
      .filter(m => m.id !== originalRequest.model)
    
    if (alternativeModels.length === 0) {
      throw new Error('No fallback models available')
    }
    
    const fallbackRequest = {
      ...originalRequest,
      id: this.generateRequestId(),
      model: alternativeModels[0].id,
      provider: alternativeModels[0].provider
    }
    
    return this.executeRequest(fallbackRequest)
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks()
    }, 30000) // Every 30 seconds
  }

  private stopHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        // Simple health check - in real implementation, this would ping the provider
        const isHealthy = await this.checkProviderHealth(provider)
        provider.healthStatus = isHealthy ? 'healthy' : 'degraded'
        provider.lastHealthCheck = new Date()
      } catch (error) {
        provider.healthStatus = 'unavailable'
        provider.lastHealthCheck = new Date()
      }
    }
  }

  private async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    try {
      // For now, check if provider has the required API key and is configured properly
      if (provider.id === 'deepseek') {
        return !!process.env.DEEPSEEK_API_KEY
      }
      if (provider.id === 'openai') {
        return !!process.env.OPENAI_API_KEY
      }
      if (provider.id === 'anthropic') {
        return !!process.env.ANTHROPIC_API_KEY
      }
      // Default to healthy if provider is configured
      return provider.models.size > 0
    } catch (error) {
      console.warn(`Health check failed for provider ${provider.id}:`, error)
      return false
    }
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }

  private generateResponseId(): string {
    return `res-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }

  private generateCacheKey(prompt: string, options: any): string {
    const keyData = { prompt, options }
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }
}
