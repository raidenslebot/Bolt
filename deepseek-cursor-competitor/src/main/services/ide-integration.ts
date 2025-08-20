import { IDEOrchestrator } from './ide-orchestrator'
import { BrowserWindow } from 'electron'

/**
 * Integration layer for the enhanced IDE services
 * This connects the orchestrator to the existing Electron app
 */
export class IDEServiceIntegration {
  private orchestrator: IDEOrchestrator | null = null
  private mainWindow: BrowserWindow | null = null
  private currentWorkspace: string | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  /**
   * Initialize the IDE services for a workspace
   */
  async initializeWorkspace(workspacePath: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.currentWorkspace = workspacePath
      
      // Create orchestrator
      this.orchestrator = new IDEOrchestrator(workspacePath, apiKey)
      
      // Setup event forwarding to renderer
      this.setupEventForwarding()
      
      // Initialize
      this.mainWindow?.webContents.send('ide-initialization-started')
      const result = await this.orchestrator.initialize()
      
      if (result.success) {
        this.mainWindow?.webContents.send('ide-initialization-complete', await this.orchestrator.getSystemStatus())
      } else {
        this.mainWindow?.webContents.send('ide-initialization-error', result.error)
      }
      
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.mainWindow?.webContents.send('ide-initialization-error', errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Process AI request with full context
   */
  async processAIRequest(request: {
    type: 'chat' | 'completion' | 'refactor' | 'explain' | 'debug'
    message: string
    currentFile?: string
    currentSelection?: any
    stream?: boolean
  }): Promise<any> {
    if (!this.orchestrator) {
      throw new Error('IDE services not initialized')
    }

    return await this.orchestrator.processRequest(request)
  }

  /**
   * Get file analysis
   */
  async analyzeFile(filePath: string): Promise<any> {
    if (!this.orchestrator) {
      throw new Error('IDE services not initialized')
    }

    return await this.orchestrator.analyzeFile(filePath)
  }

  /**
   * Search codebase
   */
  async searchCodebase(query: string, options?: any): Promise<any> {
    if (!this.orchestrator) {
      throw new Error('IDE services not initialized')
    }

    return await this.orchestrator.searchCodebase(query, options)
  }

  /**
   * Get completions
   */
  async getCompletions(filePath: string, position: { line: number; character: number }): Promise<any> {
    if (!this.orchestrator) {
      throw new Error('IDE services not initialized')
    }

    return await this.orchestrator.getCompletions(filePath, position)
  }

  /**
   * Get hover info
   */
  async getHoverInfo(filePath: string, position: { line: number; character: number }): Promise<any> {
    if (!this.orchestrator) {
      throw new Error('IDE services not initialized')
    }

    return await this.orchestrator.getHoverInfo(filePath, position)
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<any> {
    if (!this.orchestrator) {
      return { isReady: false, error: 'Not initialized' }
    }

    return await this.orchestrator.getSystemStatus()
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    if (!this.orchestrator) {
      return { overall: 'unhealthy', error: 'Not initialized' }
    }

    return await this.orchestrator.healthCheck()
  }

  /**
   * Setup event forwarding from orchestrator to renderer
   */
  private setupEventForwarding(): void {
    if (!this.orchestrator || !this.mainWindow) return

    // Initialization events
    this.orchestrator.on('initializationProgress', (progress) => {
      this.mainWindow?.webContents.send('ide-initialization-progress', progress)
    })

    this.orchestrator.on('systemReady', (status) => {
      this.mainWindow?.webContents.send('ide-system-ready', status)
    })

    this.orchestrator.on('systemError', (error) => {
      this.mainWindow?.webContents.send('ide-system-error', error)
    })

    // AI events
    this.orchestrator.on('aiResponse', (data) => {
      this.mainWindow?.webContents.send('ide-ai-response', data)
    })

    this.orchestrator.on('aiStreamChunk', (data) => {
      this.mainWindow?.webContents.send('ide-ai-stream-chunk', data)
    })

    // Language server events
    this.orchestrator.on('diagnosticsUpdated', (data) => {
      this.mainWindow?.webContents.send('ide-diagnostics-updated', data)
    })

    this.orchestrator.on('languageServerReady', (language) => {
      this.mainWindow?.webContents.send('ide-language-server-ready', language)
    })

    // Context events
    this.orchestrator.on('contextUpdated', (data) => {
      this.mainWindow?.webContents.send('ide-context-updated', data)
    })
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.shutdown()
      this.orchestrator = null
    }
  }

  /**
   * Get current workspace
   */
  getCurrentWorkspace(): string | null {
    return this.currentWorkspace
  }

  /**
   * Check if services are ready
   */
  isReady(): boolean {
    return this.orchestrator !== null
  }
}
