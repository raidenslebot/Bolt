import { spawn, ChildProcess } from 'child_process'
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  MarkedString,
  MarkupContent,
  Hover,
  Definition,
  Location,
  Position,
  Range,
  DocumentSymbol,
  SymbolKind
} from 'vscode-languageserver/node'

import { TextDocument } from 'vscode-languageserver-textdocument'
import * as cp from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { EventEmitter } from 'events'

export interface LanguageServerConfig {
  command: string
  args: string[]
  rootPath: string
  initializationOptions?: any
}

export interface LanguageCapabilities {
  hover: boolean
  completion: boolean
  definition: boolean
  references: boolean
  rename: boolean
  codeAction: boolean
  formatting: boolean
}

export interface LanguageServerInstance {
  id: string
  name: string
  process?: ChildProcess
  capabilities: LanguageCapabilities
  isRunning: boolean
  documentSelector: string[]
  pendingRequests?: Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>
}

/**
 * Real Language Server Protocol manager for providing IDE-level features
 * This is what makes the difference between a text editor and an IDE
 */
/**
 * Language Server Manager for providing real IDE-level language intelligence
 * Replaces basic code analysis with proper Language Server Protocol integration
 */
export class LanguageServerManager extends EventEmitter {
  private servers: Map<string, LanguageServerInstance> = new Map()
  private diagnostics: Map<string, Diagnostic[]> = new Map()
  private activeDocuments: Map<string, TextDocument> = new Map()
  private workspaceRoot: string = ''

  constructor(workspaceRoot: string) {
    super()
    this.workspaceRoot = workspaceRoot
  }

  /**
   * Initialize language servers for different file types
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // TypeScript/JavaScript Language Server
      await this.startLanguageServer('typescript', {
        command: 'typescript-language-server',
        args: ['--stdio'],
        rootPath: this.workspaceRoot,
        initializationOptions: {
          preferences: {
            includeCompletionsForModuleExports: true,
            includeCompletionsWithInsertText: true,
            allowIncompleteCompletions: true
          }
        }
      })

      // Python Language Server (if available)
      await this.startLanguageServer('python', {
        command: 'pylsp',
        args: [],
        rootPath: this.workspaceRoot
      })

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * Start a specific language server
   */
  private async startLanguageServer(
    languageId: string, 
    config: LanguageServerConfig
  ): Promise<void> {
    try {
      // Check if command exists
      if (!this.commandExists(config.command)) {
        console.warn(`Language server ${config.command} not found, skipping ${languageId}`)
        return
      }

      const process = spawn(config.command, config.args, {
        cwd: config.rootPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      const server: LanguageServerInstance = {
        id: languageId,
        name: config.command,
        process,
        capabilities: {
          hover: true,
          completion: true,
          definition: true,
          references: true,
          rename: true,
          codeAction: true,
          formatting: true
        },
        isRunning: true,
        documentSelector: this.getDocumentSelector(languageId)
      }

      // Handle server communication
      this.setupServerCommunication(server, config)

      this.servers.set(languageId, server)
      console.log(`Started ${languageId} language server`)

    } catch (error) {
      console.error(`Failed to start ${languageId} language server:`, error)
    }
  }

  /**
   * Setup bidirectional communication with language server
   */
  private setupServerCommunication(
    server: LanguageServerInstance, 
    config: LanguageServerConfig
  ): void {
    if (!server.process) return

    // Initialize the language server
    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: process.pid,
        clientInfo: {
          name: 'DeepSeek Cursor Competitor',
          version: '0.1.0'
        },
        rootPath: config.rootPath,
        rootUri: `file://${config.rootPath}`,
        capabilities: {
          textDocument: {
            synchronization: {
              didOpen: true,
              didChange: true,
              didClose: true,
              didSave: true
            },
            completion: {
              completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
                deprecatedSupport: true,
                preselectSupport: true
              }
            },
            hover: {
              contentFormat: ['markdown', 'plaintext']
            },
            definition: {
              linkSupport: true
            },
            references: {},
            documentSymbol: {},
            workspaceSymbol: {},
            codeAction: {
              codeActionLiteralSupport: {
                codeActionKind: {
                  valueSet: [
                    'quickfix',
                    'refactor',
                    'refactor.extract',
                    'refactor.inline',
                    'refactor.rewrite',
                    'source',
                    'source.organizeImports'
                  ]
                }
              }
            },
            formatting: {},
            rangeFormatting: {},
            rename: {
              prepareSupport: true
            }
          },
          workspace: {
            applyEdit: true,
            workspaceEdit: {
              documentChanges: true,
              resourceOperations: ['create', 'rename', 'delete'],
              failureHandling: 'textOnlyTransactional'
            },
            didChangeConfiguration: {
              dynamicRegistration: true
            },
            didChangeWatchedFiles: {
              dynamicRegistration: true
            },
            symbol: {
              dynamicRegistration: true
            },
            executeCommand: {
              dynamicRegistration: true
            }
          }
        },
        initializationOptions: config.initializationOptions || {}
      }
    }

    // Send initialize request
    this.sendMessage(server, initializeRequest)

    // Handle responses
    server.process.stdout?.on('data', (data) => {
      this.handleServerMessage(server, data.toString())
    })

    server.process.stderr?.on('data', (data) => {
      console.error(`${server.name} stderr:`, data.toString())
    })

    server.process.on('exit', (code) => {
      console.log(`${server.name} exited with code ${code}`)
      server.isRunning = false
    })
  }

  /**
   * Send message to language server
   */
  private sendMessage(server: LanguageServerInstance, message: any): void {
    if (!server.process?.stdin) return

    const content = JSON.stringify(message)
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`
    
    server.process.stdin.write(header + content)
  }

  /**
   * Send request to language server and wait for response
   */
  private async sendRequest(server: LanguageServerInstance, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7)
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }

      // Store promise resolvers for this request ID
      if (!server.pendingRequests) {
        server.pendingRequests = new Map()
      }
      server.pendingRequests.set(id, { resolve, reject })

      // Send the request
      this.sendMessage(server, request)

      // Timeout after 10 seconds
      setTimeout(() => {
        if (server.pendingRequests?.has(id)) {
          server.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }
      }, 10000)
    })
  }

  /**
   * Handle incoming messages from language server
   */
  private handleServerMessage(server: LanguageServerInstance, data: string): void {
    // Parse LSP messages (they include headers)
    const messages = this.parseMessages(data)
    
    for (const message of messages) {
      if (message.method === 'initialized') {
        console.log(`${server.name} initialized successfully`)
      } else if (message.result) {
        // Handle responses (completions, hovers, etc.)
        this.handleServerResponse(server, message)
      }
    }
  }

  /**
   * Parse LSP protocol messages
   */
  private parseMessages(data: string): any[] {
    const messages: any[] = []
    const lines = data.split('\r\n')
    
    let i = 0
    while (i < lines.length) {
      if (lines[i].startsWith('Content-Length:')) {
        const length = parseInt(lines[i].split(':')[1].trim())
        i += 2 // Skip header and empty line
        
        if (i < lines.length) {
          try {
            const content = lines.slice(i).join('\r\n').substr(0, length)
            const message = JSON.parse(content)
            messages.push(message)
          } catch (error) {
            console.error('Failed to parse LSP message:', error)
          }
        }
        break
      }
      i++
    }
    
    return messages
  }

  /**
   * Handle server responses
   */
  private handleServerResponse(server: LanguageServerInstance, message: any): void {
    // Handle request responses
    if (message.id && server.pendingRequests?.has(message.id)) {
      const { resolve, reject } = server.pendingRequests.get(message.id)!
      server.pendingRequests.delete(message.id)
      
      if (message.error) {
        reject(new Error(message.error.message || 'LSP error'))
      } else {
        resolve(message.result)
      }
    }
    
    // Handle notifications (diagnostics, etc.)
    if (message.method === 'textDocument/publishDiagnostics') {
      const { uri, diagnostics } = message.params
      this.diagnostics.set(uri, diagnostics)
      this.emitDiagnosticsChanged(uri, diagnostics)
    }
  }

  /**
   * Get completions for a document position
   */
  async getCompletions(
    uri: string, 
    position: { line: number; character: number }
  ): Promise<CompletionItem[]> {
    const languageId = this.getLanguageIdFromUri(uri)
    const server = this.servers.get(languageId)
    
    if (!server || !server.isRunning) {
      return []
    }

    return new Promise((resolve) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'textDocument/completion',
        params: {
          textDocument: { uri },
          position
        }
      }

      this.sendMessage(server, request)
      
      // In a real implementation, we'd wait for the response
      // For now, return empty array
      setTimeout(() => resolve([]), 100)
    })
  }

  /**
   * Get hover information
   */
  async getHover(
    uri: string, 
    position: { line: number; character: number }
  ): Promise<Hover | null> {
    const languageId = this.getLanguageIdFromUri(uri)
    const server = this.servers.get(languageId)
    
    if (!server || !server.isRunning) {
      return null
    }

    return new Promise((resolve) => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'textDocument/hover',
        params: {
          textDocument: { uri },
          position
        }
      }

      this.sendMessage(server, request)
      
      // In a real implementation, we'd wait for the response
      setTimeout(() => resolve(null), 100)
    })
  }

  /**
   * Notify server of document changes
   */
  async didOpen(uri: string, languageId: string, content: string): Promise<void> {
    const server = this.servers.get(languageId)
    if (!server || !server.isRunning) return

    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text: content
        }
      }
    }

    this.sendMessage(server, notification)
  }

  async didChange(
    uri: string, 
    version: number, 
    changes: Array<{ text: string }>
  ): Promise<void> {
    const languageId = this.getLanguageIdFromUri(uri)
    const server = this.servers.get(languageId)
    if (!server || !server.isRunning) return

    const notification = {
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: { uri, version },
        contentChanges: changes
      }
    }

    this.sendMessage(server, notification)
  }

  /**
   * Utility methods
   */
  private commandExists(command: string): boolean {
    try {
      require('child_process').execSync(`where ${command}`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  private getLanguageIdFromUri(uri: string): string {
    const ext = path.extname(uri).toLowerCase()
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust'
    }
    return languageMap[ext] || 'plaintext'
  }

  private getDocumentSelector(languageId: string): string[] {
    const selectors: { [key: string]: string[] } = {
      typescript: ['typescript', 'typescriptreact'],
      javascript: ['javascript', 'javascriptreact'],
      python: ['python'],
      java: ['java'],
      csharp: ['csharp'],
      cpp: ['cpp', 'c'],
      go: ['go'],
      rust: ['rust']
    }
    return selectors[languageId] || []
  }

  /**
   * Get document symbols for a file
   */
  async getDocumentSymbols(filePath: string): Promise<DocumentSymbol[] | null> {
    const language = this.getLanguageForFile(filePath)
    const server = this.servers.get(language)
    if (!server || !server.isRunning) return null

    try {
      const uri = `file://${filePath}`
      const symbols = await this.sendRequest(server, 'textDocument/documentSymbol', {
        textDocument: { uri }
      })

      const documentSymbols = symbols?.map((symbol: any) => ({
        name: symbol.name,
        kind: symbol.kind || SymbolKind.Variable,
        range: symbol.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        selectionRange: symbol.selectionRange || symbol.range || { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
      })) || []

      this.emitSymbolsChanged(filePath, documentSymbols)
      return documentSymbols
    } catch (error) {
      console.error('Failed to get document symbols:', error)
      return null
    }
  }

  /**
   * Get definition for a symbol at position
   */
  async getDefinition(filePath: string, position: Position): Promise<Location[] | null> {
    const language = this.getLanguageForFile(filePath)
    const server = this.servers.get(language)
    if (!server || !server.isRunning) return null

    try {
      const uri = `file://${filePath}`
      const definition = await this.sendRequest(server, 'textDocument/definition', {
        textDocument: { uri },
        position
      })

      if (Array.isArray(definition)) {
        return definition.map((def: any) => ({
          uri: def.uri,
          range: def.range
        }))
      } else if (definition) {
        return [{
          uri: definition.uri,
          range: definition.range
        }]
      }

      return null
    } catch (error) {
      console.error('Failed to get definition:', error)
      return null
    }
  }

  /**
   * Get references for a symbol at position
   */
  async getReferences(filePath: string, position: Position): Promise<Location[] | null> {
    const language = this.getLanguageForFile(filePath)
    const server = this.servers.get(language)
    if (!server || !server.isRunning) return null

    try {
      const uri = `file://${filePath}`
      const references = await this.sendRequest(server, 'textDocument/references', {
        textDocument: { uri },
        position,
        context: { includeDeclaration: true }
      })

      return references?.map((ref: any) => ({
        uri: ref.uri,
        range: ref.range
      })) || null
    } catch (error) {
      console.error('Failed to get references:', error)
      return null
    }
  }

  /**
   * Get diagnostics for a file
   */
  async getDiagnostics(filePath: string): Promise<Diagnostic[] | null> {
    const diagnostics = this.diagnostics.get(filePath)
    return diagnostics || null
  }

  /**
   * Get language for file
   */
  private getLanguageForFile(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust'
    }
    return languageMap[ext] || 'plaintext'
  }

  /**
   * Emit diagnostic changes
   */
  private emitDiagnosticsChanged(filePath: string, diagnostics: Diagnostic[]): void {
    this.emit('diagnosticsChanged', filePath, diagnostics)
  }

  /**
   * Emit symbol changes
   */
  private emitSymbolsChanged(filePath: string, symbols: DocumentSymbol[]): void {
    this.emit('symbolsChanged', filePath, symbols)
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    for (const server of this.servers.values()) {
      if (server.process && server.isRunning) {
        server.process.kill()
      }
    }
    this.servers.clear()
  }
}
