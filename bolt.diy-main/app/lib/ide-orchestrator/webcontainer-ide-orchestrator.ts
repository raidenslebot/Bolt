import { webcontainer } from '~/lib/webcontainer';
import { EventEmitter } from 'events';
import { WebContainerLSPManager } from '../language-server/webcontainer-lsp-manager';
import { WebContainerCodeIndexer } from '../code-indexing/webcontainer-code-indexer';
import { WebContainerContextEngine } from '../context-engine/webcontainer-context-engine';
import { WebContainerAdvancedFileOperations } from '../file-operations/webcontainer-advanced-operations';

export interface IDECapability {
  name: string;
  status: 'initializing' | 'ready' | 'error' | 'disabled';
  service: any;
  dependencies: string[];
  version: string;
}

export interface WorkspaceState {
  currentFile?: string;
  openFiles: string[];
  projectRoot: string;
  language: string;
  hasErrors: boolean;
  activeFeatures: string[];
}

export interface IDERequest {
  id: string;
  type: 'code_completion' | 'diagnostics' | 'context_search' | 'file_operation' | 'symbol_search';
  payload: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface IDEResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
  processingTime: number;
}

/**
 * IDE Orchestrator for WebContainer
 * Coordinates all IDE services and provides unified interface
 */
export class WebContainerIDEOrchestrator extends EventEmitter {
  private webcontainer: any = null;
  private capabilities = new Map<string, IDECapability>();
  private workspaceState: WorkspaceState;
  private requestQueue: IDERequest[] = [];
  private isProcessing = false;
  private services: {
    lsp?: WebContainerLSPManager;
    indexer?: WebContainerCodeIndexer;
    context?: WebContainerContextEngine;
    fileOps?: WebContainerAdvancedFileOperations;
  } = {};

  constructor() {
    super();
    this.workspaceState = {
      openFiles: [],
      projectRoot: '/',
      language: 'typescript',
      hasErrors: false,
      activeFeatures: []
    };
    this.initialize();
  }

  /**
   * Initialize IDE orchestrator
   */
  private async initialize() {
    try {
      this.webcontainer = await webcontainer;
      await this.initializeCapabilities();
      this.startRequestProcessor();
      this.emit('ready', this.getStatus());
    } catch (error) {
      console.error('Failed to initialize IDE Orchestrator:', error);
      this.emit('error', error);
    }
  }

  /**
   * Initialize all IDE capabilities
   */
  private async initializeCapabilities() {
    // Language Server Protocol
    try {
      this.capabilities.set('lsp', {
        name: 'Language Server Protocol',
        status: 'initializing',
        service: null,
        dependencies: ['webcontainer'],
        version: '1.0.0'
      });

      this.services.lsp = new WebContainerLSPManager();
      this.services.lsp.on('ready', () => {
        this.updateCapabilityStatus('lsp', 'ready');
      });
      this.services.lsp.on('error', (error) => {
        this.updateCapabilityStatus('lsp', 'error');
      });

    } catch (error) {
      this.updateCapabilityStatus('lsp', 'error');
      console.error('Failed to initialize LSP:', error);
    }

    // Code Indexer
    try {
      this.capabilities.set('indexer', {
        name: 'Code Indexer',
        status: 'initializing',
        service: null,
        dependencies: ['webcontainer'],
        version: '1.0.0'
      });

      this.services.indexer = new WebContainerCodeIndexer();
      this.services.indexer.on('ready', () => {
        this.updateCapabilityStatus('indexer', 'ready');
      });
      this.services.indexer.on('error', (error) => {
        this.updateCapabilityStatus('indexer', 'error');
      });

    } catch (error) {
      this.updateCapabilityStatus('indexer', 'error');
      console.error('Failed to initialize Code Indexer:', error);
    }

    // Context Engine
    try {
      this.capabilities.set('context', {
        name: 'Context Engine',
        status: 'initializing',
        service: null,
        dependencies: ['webcontainer', 'indexer'],
        version: '1.0.0'
      });

      this.services.context = new WebContainerContextEngine();
      this.services.context.on('ready', () => {
        this.updateCapabilityStatus('context', 'ready');
      });
      this.services.context.on('error', (error) => {
        this.updateCapabilityStatus('context', 'error');
      });

    } catch (error) {
      this.updateCapabilityStatus('context', 'error');
      console.error('Failed to initialize Context Engine:', error);
    }

    // Advanced File Operations
    try {
      this.capabilities.set('fileOps', {
        name: 'Advanced File Operations',
        status: 'initializing',
        service: null,
        dependencies: ['webcontainer'],
        version: '1.0.0'
      });

      this.services.fileOps = new WebContainerAdvancedFileOperations();
      this.services.fileOps.on('ready', () => {
        this.updateCapabilityStatus('fileOps', 'ready');
      });
      this.services.fileOps.on('error', (error) => {
        this.updateCapabilityStatus('fileOps', 'error');
      });

    } catch (error) {
      this.updateCapabilityStatus('fileOps', 'error');
      console.error('Failed to initialize File Operations:', error);
    }
  }

  /**
   * Update capability status
   */
  private updateCapabilityStatus(capability: string, status: IDECapability['status']) {
    const cap = this.capabilities.get(capability);
    if (cap) {
      cap.status = status;
      this.capabilities.set(capability, cap);
      this.emit('capabilityStatusChanged', { capability, status });
    }
  }

  /**
   * Make IDE request
   */
  async makeRequest(
    type: IDERequest['type'],
    payload: any,
    priority: IDERequest['priority'] = 'medium'
  ): Promise<IDEResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: IDERequest = {
      id: requestId,
      type,
      payload,
      timestamp: Date.now(),
      priority
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${requestId} timed out`));
      }, 30000); // 30 second timeout

      const handler = (response: IDEResponse) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout);
          this.off('response', handler);
          resolve(response);
        }
      };

      this.on('response', handler);
      this.queueRequest(request);
    });
  }

  /**
   * Queue request for processing
   */
  private queueRequest(request: IDERequest) {
    // Insert request based on priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const requestPriority = priorityOrder[request.priority];
    
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuedPriority = priorityOrder[this.requestQueue[i].priority];
      if (requestPriority < queuedPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
    this.emit('requestQueued', request);
  }

  /**
   * Start request processor with parallel processing
   */
  private startRequestProcessor() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processRequestsParallel();
  }

  /**
   * Process request queue
   */
  private async processRequests() {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      const startTime = Date.now();
      let response: IDEResponse;

      try {
        this.emit('requestStarted', request);
        const data = await this.executeRequest(request);
        
        response = {
          requestId: request.id,
          success: true,
          data,
          timestamp: Date.now(),
          processingTime: Date.now() - startTime
        };

      } catch (error) {
        response = {
          requestId: request.id,
          success: false,
          error: (error as Error).message,
          timestamp: Date.now(),
          processingTime: Date.now() - startTime
        };
      }

      this.emit('response', response);
      this.emit('requestCompleted', request, response);
    }

    this.isProcessing = false;
  }

  /**
   * Process request queue with parallel processing and resource optimization
   */
  private async processRequestsParallel() {
    const MAX_CONCURRENT = Math.max(4, navigator.hardwareConcurrency || 4);
    const activeRequests = new Set<Promise<void>>();

    while (this.requestQueue.length > 0 || activeRequests.size > 0) {
      // Start new requests up to concurrency limit
      while (this.requestQueue.length > 0 && activeRequests.size < MAX_CONCURRENT) {
        const request = this.requestQueue.shift();
        if (!request) continue;

        const requestPromise = this.executeRequestAsync(request)
          .finally(() => activeRequests.delete(requestPromise));
        
        activeRequests.add(requestPromise);
      }

      // Wait for at least one request to complete
      if (activeRequests.size > 0) {
        await Promise.race(activeRequests);
      }

      // Yield control to prevent blocking
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  /**
   * Execute request asynchronously with performance optimization
   */
  private async executeRequestAsync(request: IDERequest): Promise<void> {
    const startTime = performance.now();
    let response: IDEResponse;

    try {
      this.emit('requestStarted', request);
      
      // Execute with timeout for responsiveness
      const data = await Promise.race([
        this.executeRequest(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 8000)
        )
      ]) as any;
      
      response = {
        requestId: request.id,
        success: true,
        data,
        timestamp: Date.now(),
        processingTime: performance.now() - startTime
      };
    } catch (error) {
      response = {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        processingTime: performance.now() - startTime
      };
    }

    this.emit('response', response);
    this.emit('requestCompleted', request, response);
  }

  /**
   * Execute IDE request
   */
  private async executeRequest(request: IDERequest): Promise<any> {
    switch (request.type) {
      case 'code_completion':
        return this.handleCodeCompletion(request);
      case 'diagnostics':
        return this.handleDiagnostics(request);
      case 'context_search':
        return this.handleContextSearch(request);
      case 'file_operation':
        return this.handleFileOperation(request);
      case 'symbol_search':
        return this.handleSymbolSearch(request);
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * Handle code completion request
   */
  private async handleCodeCompletion(request: IDERequest): Promise<any> {
    if (!this.services.lsp || this.capabilities.get('lsp')?.status !== 'ready') {
      throw new Error('LSP service not available');
    }

    const { filePath, position, context } = request.payload;
    return await this.services.lsp.getCompletions(filePath, position, context);
  }

  /**
   * Handle diagnostics request
   */
  private async handleDiagnostics(request: IDERequest): Promise<any> {
    if (!this.services.lsp || this.capabilities.get('lsp')?.status !== 'ready') {
      throw new Error('LSP service not available');
    }

    const { filePath } = request.payload;
    return await this.services.lsp.getDiagnostics(filePath);
  }

  /**
   * Handle context search request
   */
  private async handleContextSearch(request: IDERequest): Promise<any> {
    if (!this.services.context || this.capabilities.get('context')?.status !== 'ready') {
      throw new Error('Context Engine service not available');
    }

    return await this.services.context.getContext(request.payload);
  }

  /**
   * Handle file operation request
   */
  private async handleFileOperation(request: IDERequest): Promise<any> {
    if (!this.services.fileOps || this.capabilities.get('fileOps')?.status !== 'ready') {
      throw new Error('File Operations service not available');
    }

    const { operation, ...params } = request.payload;
    
    switch (operation) {
      case 'createFromTemplate':
        return await this.services.fileOps.createFromTemplate(
          params.templateName, 
          params.targetPath, 
          params.variables
        );
      case 'smartRename':
        return await this.services.fileOps.smartRename(
          params.directory, 
          params.pattern, 
          params.replacement
        );
      case 'smartDuplicate':
        return await this.services.fileOps.smartDuplicate(
          params.sourcePath, 
          params.targetDirectory
        );
      case 'batchOperation':
        return await this.services.fileOps.createBatchOperation(params.operations);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Handle symbol search request
   */
  private async handleSymbolSearch(request: IDERequest): Promise<any> {
    if (!this.services.indexer || this.capabilities.get('indexer')?.status !== 'ready') {
      throw new Error('Code Indexer service not available');
    }

    const { query, options } = request.payload;
    return await this.services.indexer.searchSymbols(query, options);
  }

  /**
   * Update workspace state
   */
  updateWorkspaceState(updates: Partial<WorkspaceState>) {
    this.workspaceState = { ...this.workspaceState, ...updates };
    this.emit('workspaceStateChanged', this.workspaceState);
    
    // Notify relevant services of state changes
    if (updates.currentFile && this.services.indexer) {
      this.services.indexer.setCurrentFile(updates.currentFile);
    }
  }

  /**
   * Get current workspace state
   */
  getWorkspaceState(): WorkspaceState {
    return { ...this.workspaceState };
  }

  /**
   * High-level convenience methods
   */
  
  async getIntelligentCompletions(filePath: string, position: any, context?: string) {
    return this.makeRequest('code_completion', { filePath, position, context }, 'high');
  }

  async getSmartContext(query: string, currentFile?: string, options?: any) {
    return this.makeRequest('context_search', {
      query,
      currentFile,
      ...options
    }, 'medium');
  }

  async performSmartFileOperation(operation: string, params: any) {
    return this.makeRequest('file_operation', { operation, ...params }, 'medium');
  }

  async searchCodeSymbols(query: string, options?: any) {
    return this.makeRequest('symbol_search', { query, options }, 'low');
  }

  async analyzeCurrentFile(filePath: string) {
    const diagnostics = await this.makeRequest('diagnostics', { filePath }, 'high');
    const context = await this.makeRequest('context_search', {
      query: 'current file analysis',
      currentFile: filePath,
      workspaceScope: false
    }, 'medium');

    return {
      diagnostics: diagnostics.data,
      context: context.data,
      timestamp: Date.now()
    };
  }

  /**
   * Get system status
   */
  getStatus() {
    const capabilities = Array.from(this.capabilities.values());
    const readyCount = capabilities.filter(cap => cap.status === 'ready').length;
    const errorCount = capabilities.filter(cap => cap.status === 'error').length;

    return {
      isReady: readyCount === capabilities.length,
      capabilities: Object.fromEntries(this.capabilities),
      workspaceState: this.workspaceState,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      stats: {
        totalCapabilities: capabilities.length,
        readyCapabilities: readyCount,
        errorCapabilities: errorCount,
        initializingCapabilities: capabilities.length - readyCount - errorCount
      },
      webcontainerReady: !!this.webcontainer
    };
  }

  /**
   * Enable/disable specific capabilities
   */
  toggleCapability(capability: string, enabled: boolean) {
    const cap = this.capabilities.get(capability);
    if (cap) {
      cap.status = enabled ? 'ready' : 'disabled';
      this.capabilities.set(capability, cap);
      this.emit('capabilityToggled', { capability, enabled });
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      capabilities: Array.from(this.capabilities.values()).map(cap => ({
        name: cap.name,
        status: cap.status,
        service: this.services[cap.name.toLowerCase().replace(/\s+/g, '')]?.getStatus?.() || null
      })),
      workspace: this.workspaceState,
      queue: {
        length: this.requestQueue.length,
        processing: this.isProcessing
      }
    };
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown() {
    this.isProcessing = false;
    this.requestQueue = [];
    
    // Shutdown services
    Object.values(this.services).forEach(service => {
      if (service && typeof service.shutdown === 'function') {
        service.shutdown();
      }
    });

    this.capabilities.clear();
    this.emit('shutdown');
  }
}

// Export singleton instance
export const ideOrchestrator = new WebContainerIDEOrchestrator();
