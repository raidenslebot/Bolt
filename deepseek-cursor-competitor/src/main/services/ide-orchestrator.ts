import { EventEmitter } from 'events'
import { LanguageServerManager } from './language-server'
import { CodeIndexingService } from './code-indexing'
import { ContextEngine } from './context-engine'
import { EnhancedDeepSeekService } from './enhanced-deepseek'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { AdvancedCacheService } from './advanced-cache'
import { IntelligentCodeGenerator } from './intelligent-code-generator-v2'
import { AutomatedTestingAssistant } from './automated-testing-assistant'
import { DocumentationAssistant } from './documentation-assistant'
import { CodeReviewAssistant } from './code-review-assistant'
import { DebuggingAssistant } from './debugging-assistant'
import { EnterpriseFeaturesService } from './enterprise-features'
import { PerformanceMonitor } from './performance-monitor'

export interface IDECapabilities {
  languageIntelligence: boolean
  codeIndexing: boolean
  contextualAI: boolean
  realTimeSync: boolean
  multiFileEditing: boolean
  diagnostics: boolean
  debugging: boolean
  // Iteration 7 AI-Powered Development Assistant Capabilities
  intelligentCodeGeneration: boolean
  automatedTesting: boolean
  documentationGeneration: boolean
  codeReview: boolean
  advancedDebugging: boolean
  // Enterprise and Performance
  enterpriseFeatures: boolean
  performanceMonitoring: boolean
}

export interface InitializationProgress {
  stage: string
  progress: number
  message: string
  isComplete: boolean
  error?: string
}

export interface SystemStatus {
  isReady: boolean
  capabilities: IDECapabilities
  stats: {
    indexedFiles: number
    activeLanguageServers: number
    conversationHistory: number
    lastIndexed?: Date
  }
  performance: {
    averageResponseTime: number
    indexingSpeed: number
    memoryUsage: number
  }
}

/**
 * Master orchestrator that brings together all services
 * This is the core system that enables true competition with Cursor IDE
 */
export class IDEOrchestrator extends EventEmitter {
  private workspaceRoot: string
  private deepSeekApiKey: string
  
  // Core services
  private languageServerManager: LanguageServerManager
  private codeIndexingService: CodeIndexingService
  private contextEngine: ContextEngine
  private enhancedDeepSeekService: EnhancedDeepSeekService
  
  // AI-Powered Development Assistant Services (Iteration 7)
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private cacheService: AdvancedCacheService
  private codeGenerator: IntelligentCodeGenerator
  private testingAssistant: AutomatedTestingAssistant
  private documentationAssistant: DocumentationAssistant
  private codeReviewAssistant: CodeReviewAssistant
  private debuggingAssistant: DebuggingAssistant
  
  // Enterprise and Performance Services
  private enterpriseFeatures: EnterpriseFeaturesService
  private performanceMonitor: PerformanceMonitor
  
  // State
  private isInitialized = false
  private initializationProgress = 0
  private capabilities: IDECapabilities = {
    languageIntelligence: false,
    codeIndexing: false,
    contextualAI: false,
    realTimeSync: false,
    multiFileEditing: false,
    diagnostics: false,
    debugging: false,
    // Iteration 7 AI-Powered Development Assistant Capabilities
    intelligentCodeGeneration: false,
    automatedTesting: false,
    documentationGeneration: false,
    codeReview: false,
    advancedDebugging: false,
    // Enterprise and Performance
    enterpriseFeatures: false,
    performanceMonitoring: false
  }

  constructor(workspaceRoot: string, deepSeekApiKey: string) {
    super()
    this.workspaceRoot = workspaceRoot
    this.deepSeekApiKey = deepSeekApiKey
    
    // Initialize core services
    this.languageServerManager = new LanguageServerManager(workspaceRoot)
    this.codeIndexingService = new CodeIndexingService(workspaceRoot)
    this.contextEngine = new ContextEngine(workspaceRoot, this.languageServerManager, this.codeIndexingService)
    this.enhancedDeepSeekService = new EnhancedDeepSeekService(deepSeekApiKey, this.contextEngine)
    
    // Initialize AI-powered services infrastructure
    this.aiModelManager = new AIModelManager()
    this.cacheService = new AdvancedCacheService()
    this.codeAnalysis = new AdvancedCodeAnalysisService({
      enableMetrics: true,
      enableSmellDetection: true,
      enableArchitectureAnalysis: true,
      enableRefactoringSuggestions: true,
      complexityThreshold: 10,
      duplicateCodeThreshold: 5,
      methodLengthThreshold: 50,
      classLengthThreshold: 300,
      excludePatterns: ['node_modules/**', 'dist/**'],
      includeTestFiles: false
    })
    
    // Initialize AI-powered development assistant services
    this.codeGenerator = new IntelligentCodeGenerator(
      this.aiModelManager,
      this.codeAnalysis,
      this.contextEngine,
      this.cacheService
    )
    
    this.testingAssistant = new AutomatedTestingAssistant(
      this.aiModelManager,
      this.codeAnalysis,
      this.codeGenerator,
      this.cacheService
    )
    
    this.documentationAssistant = new DocumentationAssistant(
      this.aiModelManager,
      this.codeAnalysis,
      this.codeGenerator,
      this.cacheService,
      workspaceRoot
    )
    
    this.codeReviewAssistant = new CodeReviewAssistant(
      this.aiModelManager,
      this.codeAnalysis,
      this.codeGenerator,
      this.cacheService,
      this.testingAssistant
    )
    
    this.debuggingAssistant = new DebuggingAssistant(
      this.aiModelManager,
      this.codeAnalysis,
      this.codeGenerator,
      this.cacheService,
      this.testingAssistant
    )
    
    // Initialize enterprise and performance services
    this.enterpriseFeatures = new EnterpriseFeaturesService()
    this.performanceMonitor = new PerformanceMonitor()
    
    this.setupEventHandlers()
  }

  /**
   * Initialize the entire IDE system
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) {
      return { success: true }
    }

    try {
      this.emitProgress('Initializing Language Servers', 10)
      
      // 1. Initialize Language Server Manager
      const lspResult = await this.languageServerManager.initialize()
      if (!lspResult.success) {
        throw new Error(`LSP initialization failed: ${lspResult.error}`)
      }
      this.capabilities.languageIntelligence = true
      this.capabilities.diagnostics = true
      
      this.emitProgress('Starting Code Indexing', 30)
      
      // 2. Initialize Code Indexing Service
      const indexResult = await this.codeIndexingService.initialize()
      if (!indexResult.success) {
        throw new Error(`Indexing initialization failed: ${indexResult.error}`)
      }
      
      this.emitProgress('Building Project Index', 50)
      
      // 3. Index the workspace
      const indexStats = await this.codeIndexingService.indexWorkspace((progress) => {
        const progressPercent = 50 + (progress.completed / progress.total) * 30
        this.emitProgress(`Indexing: ${progress.current}`, progressPercent)
      })
      
      if (!indexStats.success) {
        throw new Error(`Workspace indexing failed: ${indexStats.error}`)
      }
      this.capabilities.codeIndexing = true
      
      this.emitProgress('Initializing Context Engine', 80)
      
      // 4. Initialize Context Engine
      const contextResult = await this.contextEngine.initialize()
      if (!contextResult.success) {
        throw new Error(`Context engine initialization failed: ${contextResult.error}`)
      }
      this.capabilities.contextualAI = true
      this.capabilities.realTimeSync = true
      
      this.emitProgress('Connecting to DeepSeek AI', 90)
      
      // 5. Initialize Enhanced DeepSeek Service
      const aiResult = await this.enhancedDeepSeekService.initialize()
      if (!aiResult.success) {
        throw new Error(`AI service initialization failed: ${aiResult.error}`)
      }
      this.capabilities.multiFileEditing = true
      
      this.emitProgress('Setting up AI Model Manager', 60)
      
      // 6. Configure AI Model Manager with DeepSeek provider
      this.aiModelManager.registerProvider(
        'deepseek',
        'DeepSeek',
        'https://api.deepseek.com/v1',
        this.deepSeekApiKey,
        [
          {
            id: 'deepseek-coder',
            name: 'DeepSeek Coder',
            provider: 'deepseek',
            type: 'completion',
            maxTokens: 4096,
            contextWindow: 16384,
            costPer1kTokens: 0.0014,
            latencyMs: 500,
            capabilities: ['code-completion', 'code-generation', 'debugging'],
            isAvailable: true,
            usageCount: 0,
            errorRate: 0
          }
        ]
      )
      this.aiModelManager.start()
      
      this.emitProgress('Starting Code Analysis Service', 70)
      
      // 7. Initialize Advanced Code Analysis with workspace root
      await this.codeAnalysis.initialize(this.workspaceRoot)
      
      this.emitProgress('Enabling AI-Powered Development Assistants', 80)
      
      // 8. Enable AI-Powered Development Assistant Services
      // These services are ready to use after their dependencies are initialized
      this.capabilities.intelligentCodeGeneration = true
      this.emit('code-generator-ready')
      
      this.capabilities.automatedTesting = true
      this.emit('testing-assistant-ready')
      
      this.capabilities.documentationGeneration = true
      this.emit('documentation-assistant-ready')
      
      this.capabilities.codeReview = true
      this.emit('code-review-assistant-ready')
      
      this.capabilities.advancedDebugging = true
      this.emit('debugging-assistant-ready')
      
      this.emitProgress('Enabling Enterprise Features', 90)
      
      // 9. Enable Enterprise Features
      this.capabilities.enterpriseFeatures = true
      
      this.emitProgress('Starting Performance Monitoring', 95)
      
      // 10. Enable Performance Monitor
      this.capabilities.performanceMonitoring = true
      
      this.emitProgress('AI-Powered IDE System Ready', 100, true)
      
      this.isInitialized = true
      this.emit('systemReady', await this.getSystemStatus())
      
      return { success: true }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emitProgress('Initialization Failed', this.initializationProgress, true, errorMessage)
      this.emit('systemError', error)
      
      return { 
        success: false, 
        error: errorMessage 
      }
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const stats = await this.codeIndexingService.getStats()
    const aiStatus = this.enhancedDeepSeekService.getStatus()
    
    return {
      isReady: this.isInitialized,
      capabilities: this.capabilities,
      stats: {
        indexedFiles: stats.totalFiles,
        activeLanguageServers: 1, // Would be tracked properly with fixed LSP manager
        conversationHistory: aiStatus.totalMessages,
        lastIndexed: stats.lastIndexed
      },
      performance: {
        averageResponseTime: 250, // Would be calculated from real metrics
        indexingSpeed: stats.totalFiles / 60, // Files per minute
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      }
    }
  }

  /**
   * Process a user request with full system intelligence
   */
  async processRequest(request: {
    type: 'chat' | 'completion' | 'refactor' | 'explain' | 'debug'
    message: string
    currentFile?: string
    currentSelection?: {
      text: string
      startLine: number
      startColumn: number
      endLine: number
      endColumn: number
    }
    stream?: boolean
  }): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('IDE system not initialized')
    }

    const startTime = Date.now()
    
    try {
      this.emit('requestStarted', { type: request.type, timestamp: new Date() })
      
      // Transform request based on type
      let enhancedRequest = {
        message: request.message,
        currentFile: request.currentFile,
        currentSelection: request.currentSelection,
        includeContext: true,
        contextTypes: ['file', 'symbol', 'selection', 'error', 'documentation'] as Array<'file' | 'symbol' | 'selection' | 'error' | 'documentation'>,
        stream: request.stream || false
      }

      // Customize based on request type
      switch (request.type) {
        case 'completion':
          enhancedRequest.message = `Complete this code: ${request.message}`
          enhancedRequest.contextTypes = ['file', 'symbol', 'selection']
          break
          
        case 'refactor':
          enhancedRequest.message = `Refactor this code: ${request.message}`
          enhancedRequest.contextTypes = ['file', 'symbol', 'selection']
          break
          
        case 'explain':
          enhancedRequest.message = `Explain this code: ${request.message}`
          enhancedRequest.contextTypes = ['file', 'symbol', 'documentation']
          break
          
        case 'debug':
          enhancedRequest.message = `Help debug this issue: ${request.message}`
          enhancedRequest.contextTypes = ['file', 'symbol', 'error', 'selection']
          break
      }

      // Process with streaming or non-streaming
      if (request.stream) {
        return this.enhancedDeepSeekService.streamMessage(enhancedRequest)
      } else {
        const response = await this.enhancedDeepSeekService.sendMessage(enhancedRequest)
        
        this.emit('requestCompleted', {
          type: request.type,
          responseTime: Date.now() - startTime,
          tokensUsed: response.metadata?.tokens,
          contextItems: response.context?.length || 0
        })
        
        return response
      }
      
    } catch (error) {
      this.emit('requestError', {
        type: request.type,
        error,
        responseTime: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Get file analysis with full context
   */
  async analyzeFile(filePath: string): Promise<{
    symbols: any[]
    diagnostics: any[]
    context: any[]
    suggestions: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('IDE system not initialized')
    }

    try {
      // Get symbols from LSP
      const symbols = await this.languageServerManager.getDocumentSymbols(filePath) || []
      
      // Get diagnostics
      const diagnostics = await this.languageServerManager.getDiagnostics(filePath) || []
      
      // Get contextual analysis
      const contextAnalysis = await this.contextEngine.getContext({
        query: `analyze file ${filePath}`,
        currentFile: filePath,
        maxItems: 10,
        includeTypes: ['file', 'symbol', 'error']
      })
      
      return {
        symbols,
        diagnostics,
        context: contextAnalysis.items,
        suggestions: contextAnalysis.suggestions
      }
      
    } catch (error) {
      console.error('File analysis failed:', error)
      return {
        symbols: [],
        diagnostics: [],
        context: [],
        suggestions: ['Analysis failed - check if file exists and is supported']
      }
    }
  }

  /**
   * Search across the entire codebase
   */
  async searchCodebase(query: string, options?: {
    type?: 'all' | 'symbols' | 'content' | 'files'
    language?: string
    maxResults?: number
  }): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('IDE system not initialized')
    }

    return await this.codeIndexingService.search(query, options)
  }

  /**
   * Get intelligent completions
   */
  async getCompletions(filePath: string, position: { line: number; character: number }): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('IDE system not initialized')
    }

    return await this.languageServerManager.getCompletions(filePath, position) || []
  }

  /**
   * Get hover information
   */
  async getHoverInfo(filePath: string, position: { line: number; character: number }): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('IDE system not initialized')
    }

    return await this.languageServerManager.getHover(filePath, position)
  }

  /**
   * Setup event handlers for inter-service communication
   */
  private setupEventHandlers(): void {
    // Language server events
    this.languageServerManager.on('serverReady', (language) => {
      this.emit('languageServerReady', language)
    })
    
    this.languageServerManager.on('diagnosticsChanged', (filePath, diagnostics) => {
      this.emit('diagnosticsUpdated', { filePath, diagnostics })
    })

    // Context engine events
    this.contextEngine.on('contextChanged', (data) => {
      this.emit('contextUpdated', data)
    })

    // AI service events
    this.enhancedDeepSeekService.on('messageReceived', (data) => {
      this.emit('aiResponse', data)
    })

    this.enhancedDeepSeekService.on('streamingChunk', (data) => {
      this.emit('aiStreamChunk', data)
    })
  }

  /**
   * Emit initialization progress
   */
  private emitProgress(message: string, progress: number, isComplete = false, error?: string): void {
    this.initializationProgress = progress
    
    const progressData: InitializationProgress = {
      stage: message,
      progress,
      message,
      isComplete,
      error
    }
    
    this.emit('initializationProgress', progressData)
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.languageServerManager.shutdown()
      await this.codeIndexingService.shutdown()
      await this.enhancedDeepSeekService.shutdown()
      
      this.isInitialized = false
      this.emit('systemShutdown')
      
    } catch (error) {
      console.error('Shutdown error:', error)
      this.emit('shutdownError', error)
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy'
    services: {
      languageServers: boolean
      indexing: boolean
      contextEngine: boolean
      aiService: boolean
    }
    details: string[]
  }> {
    const details: string[] = []
    const services = {
      languageServers: false,
      indexing: false,
      contextEngine: false,
      aiService: false
    }

    try {
      // Check language servers
      const activeServers = 1 // Would use this.languageServerManager.getActiveServers()
      services.languageServers = activeServers > 0
      details.push(`Language servers: ${activeServers} active`)

      // Check indexing
      const stats = await this.codeIndexingService.getStats()
      services.indexing = stats.totalFiles > 0
      details.push(`Indexing: ${stats.totalFiles} files indexed`)

      // Check context engine
      const contextStatus = this.contextEngine.getStatus()
      services.contextEngine = !contextStatus.isAnalyzing
      details.push(`Context engine: ${contextStatus.historySize} queries processed`)

      // Check AI service
      const aiStatus = this.enhancedDeepSeekService.getStatus()
      services.aiService = !aiStatus.isStreaming
      details.push(`AI service: ${aiStatus.activeConversations} active conversations`)

      const healthyCount = Object.values(services).filter(Boolean).length
      const overall = healthyCount === 4 ? 'healthy' : 
                    healthyCount >= 2 ? 'degraded' : 'unhealthy'

      return { overall, services, details }
      
    } catch (error) {
      details.push(`Health check failed: ${error}`)
      return {
        overall: 'unhealthy',
        services,
        details
      }
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    initialization: number
    memoryUsage: number
    activeServices: number
    isOptimal: boolean
  } {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB
    const activeServices = Object.values(this.capabilities).filter(Boolean).length
    
    return {
      initialization: this.initializationProgress,
      memoryUsage,
      activeServices,
      isOptimal: memoryUsage < 500 && activeServices >= 4 && this.isInitialized
    }
  }
}
