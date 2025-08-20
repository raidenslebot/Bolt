import { EventEmitter } from 'events'
import { LanguageServerManager } from './language-server'
import { CodeIndexingService } from './code-indexing'

export interface ContextItem {
  id: string
  type: 'file' | 'symbol' | 'selection' | 'error' | 'documentation'
  filePath: string
  content: string
  language: string
  line?: number
  column?: number
  endLine?: number
  endColumn?: number
  relevanceScore: number
  metadata?: {
    symbolName?: string
    symbolKind?: string
    errorType?: string
    documentation?: string
    references?: Array<{ file: string; line: number; column: number }>
  }
}

export interface ContextRequest {
  query: string
  currentFile?: string
  currentSelection?: {
    text: string
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  maxItems?: number
  includeTypes?: Array<'file' | 'symbol' | 'selection' | 'error' | 'documentation'>
  workspaceScope?: boolean
}

export interface ContextAnalysis {
  items: ContextItem[]
  totalRelevance: number
  summary: string
  suggestions: string[]
  relatedQueries: string[]
}

/**
 * Intelligent context engine that rivals Cursor's capabilities
 * Combines LSP data, indexing, and AI analysis for sophisticated code understanding
 */
export class ContextEngine extends EventEmitter {
  private lspManager: LanguageServerManager
  private indexingService: CodeIndexingService
  private workspaceRoot: string
  private contextHistory: ContextItem[] = []
  private queryHistory: string[] = []
  private isAnalyzing = false

  constructor(
    workspaceRoot: string,
    lspManager: LanguageServerManager,
    indexingService: CodeIndexingService
  ) {
    super()
    this.workspaceRoot = workspaceRoot
    this.lspManager = lspManager
    this.indexingService = indexingService
  }

  /**
   * Initialize the context engine
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Listen for LSP events to update context
      this.lspManager.on('diagnosticsChanged', this.handleDiagnosticsChanged.bind(this))
      this.lspManager.on('symbolsChanged', this.handleSymbolsChanged.bind(this))

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
   * Get intelligent context for a query
   */
  async getContext(request: ContextRequest): Promise<ContextAnalysis> {
    this.isAnalyzing = true
    this.emit('analysisStarted', request)

    try {
      const {
        query,
        currentFile,
        currentSelection,
        maxItems = 20,
        includeTypes = ['file', 'symbol', 'selection', 'error', 'documentation'],
        workspaceScope = true
      } = request

      const contextItems: ContextItem[] = []

      // 1. Current file and selection context
      if (currentFile && includeTypes.includes('file')) {
        const fileContext = await this.getFileContext(currentFile, currentSelection)
        contextItems.push(...fileContext)
      }

      // 2. Symbol-based context using LSP
      if (includeTypes.includes('symbol')) {
        const symbolContext = await this.getSymbolContext(query, currentFile)
        contextItems.push(...symbolContext)
      }

      // 3. Workspace-wide search context
      if (workspaceScope) {
        const searchContext = await this.getSearchContext(query, maxItems)
        contextItems.push(...searchContext)
      }

      // 4. Error and diagnostic context
      if (includeTypes.includes('error') && currentFile) {
        const errorContext = await this.getErrorContext(currentFile)
        contextItems.push(...errorContext)
      }

      // 5. Documentation context
      if (includeTypes.includes('documentation')) {
        const docContext = await this.getDocumentationContext(query, currentFile)
        contextItems.push(...docContext)
      }

      // 6. Historical context based on previous queries
      const historicalContext = this.getHistoricalContext(query)
      contextItems.push(...historicalContext)

      // Sort by relevance and limit results
      const sortedItems = contextItems
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxItems)

      // Generate analysis summary
      const analysis = await this.analyzeContext(sortedItems, query)

      // Update history
      this.queryHistory.unshift(query)
      this.queryHistory = this.queryHistory.slice(0, 100) // Keep last 100 queries
      
      this.contextHistory.unshift(...sortedItems.slice(0, 5))
      this.contextHistory = this.contextHistory.slice(0, 500) // Keep last 500 items

      this.emit('analysisCompleted', analysis)
      return analysis

    } catch (error) {
      const errorAnalysis: ContextAnalysis = {
        items: [],
        totalRelevance: 0,
        summary: `Context analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        suggestions: ['Try a simpler query', 'Check if the workspace is properly indexed'],
        relatedQueries: []
      }

      this.emit('analysisError', error)
      return errorAnalysis
    } finally {
      this.isAnalyzing = false
    }
  }

  /**
   * Get context from current file and selection
   */
  private async getFileContext(
    filePath: string,
    selection?: ContextRequest['currentSelection']
  ): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    try {
      // Get file content and symbols from LSP
      const documentSymbols = await this.lspManager.getDocumentSymbols(filePath)
      const content = await require('fs/promises').readFile(filePath, 'utf-8')

      // Current file as context
      items.push({
        id: `file-${filePath}`,
        type: 'file',
        filePath,
        content: content.slice(0, 5000), // Limit content size
        language: this.detectLanguage(filePath),
        relevanceScore: selection ? 0.9 : 0.7,
        metadata: {
          symbolName: 'current-file'
        }
      })

      // Current selection as high-priority context
      if (selection) {
        const lines = content.split('\n')
        const selectedContent = lines
          .slice(selection.startLine - 1, selection.endLine)
          .join('\n')

        items.push({
          id: `selection-${filePath}-${selection.startLine}`,
          type: 'selection',
          filePath,
          content: selectedContent,
          language: this.detectLanguage(filePath),
          line: selection.startLine,
          column: selection.startColumn,
          endLine: selection.endLine,
          endColumn: selection.endColumn,
          relevanceScore: 1.0, // Highest relevance
          metadata: {
            symbolName: 'current-selection'
          }
        })
      }

      // Symbols in current file
      if (documentSymbols) {
        for (const symbol of documentSymbols.slice(0, 10)) {
          items.push({
            id: `symbol-${filePath}-${symbol.name}`,
            type: 'symbol',
            filePath,
            content: this.extractSymbolContent(content, symbol),
            language: this.detectLanguage(filePath),
            line: symbol.range.start.line + 1,
            column: symbol.range.start.character,
            endLine: symbol.range.end.line + 1,
            endColumn: symbol.range.end.character,
            relevanceScore: 0.8,
            metadata: {
              symbolName: symbol.name,
              symbolKind: symbol.kind.toString()
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to get file context:', error)
    }

    return items
  }

  /**
   * Get symbol-based context using LSP
   */
  private async getSymbolContext(query: string, currentFile?: string): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    try {
      // Search for symbols using the indexing service instead of LSP position-based lookups
      const searchResults = await this.indexingService.search(query, {
        type: 'symbols',
        maxResults: 10
      })

      for (const result of searchResults) {
        for (const match of result.matches) {
          if (match.type === 'symbol') {
            const content = await this.getFileContentSnippet(
              result.file.path,
              match.line,
              3
            )

            items.push({
              id: `symbol-search-${result.file.path}-${match.line}`,
              type: 'symbol',
              filePath: result.file.path,
              content,
              language: result.file.language,
              line: match.line,
              column: match.column,
              relevanceScore: 0.8 + (1 - (match.score || 0)) * 0.2,
              metadata: {
                symbolName: match.snippet,
                symbolKind: 'symbol'
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to get symbol context:', error)
    }

    return items
  }

  /**
   * Get context from workspace search
   */
  private async getSearchContext(query: string, maxItems: number): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    try {
      const searchResults = await this.indexingService.search(query, {
        type: 'all',
        maxResults: maxItems
      })

      for (const result of searchResults) {
        for (const match of result.matches) {
          const content = await this.getFileContentSnippet(
            result.file.path,
            match.line,
            3 // Context lines
          )

          items.push({
            id: `search-${result.file.path}-${match.line || 0}`,
            type: match.type === 'symbol' ? 'symbol' : 'file',
            filePath: result.file.path,
            content,
            language: result.file.language,
            line: match.line,
            column: match.column,
            relevanceScore: 0.6 + (1 - (match.score || 0)) * 0.3,
            metadata: {
              symbolName: match.type === 'symbol' ? match.snippet : undefined,
              symbolKind: match.type
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to get search context:', error)
    }

    return items
  }

  /**
   * Get error and diagnostic context
   */
  private async getErrorContext(filePath: string): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    try {
      const diagnostics = await this.lspManager.getDiagnostics(filePath)
      
      for (const diagnostic of (diagnostics || []).slice(0, 5)) {
        const content = await this.getFileContentSnippet(
          filePath,
          diagnostic.range.start.line + 1,
          2
        )

        items.push({
          id: `error-${filePath}-${diagnostic.range.start.line}`,
          type: 'error',
          filePath,
          content,
          language: this.detectLanguage(filePath),
          line: diagnostic.range.start.line + 1,
          column: diagnostic.range.start.character,
          endLine: diagnostic.range.end.line + 1,
          endColumn: diagnostic.range.end.character,
          relevanceScore: 0.8, // Errors are highly relevant
          metadata: {
            errorType: diagnostic.severity?.toString() || 'unknown',
            documentation: diagnostic.message
          }
        })
      }
    } catch (error) {
      console.error('Failed to get error context:', error)
    }

    return items
  }

  /**
   * Get documentation context
   */
  private async getDocumentationContext(query: string, currentFile?: string): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    try {
      if (currentFile) {
        // Create a position for the query (simplified approach)
        const position = { line: 0, character: 0 }
        const hover = await this.lspManager.getHover(currentFile, position)
        
        if (hover) {
          let hoverContent = ''
          if (typeof hover.contents === 'string') {
            hoverContent = hover.contents
          } else if (Array.isArray(hover.contents)) {
            hoverContent = hover.contents.map(item => 
              typeof item === 'string' ? item : (item as any).value || ''
            ).join('\n')
          } else {
            hoverContent = (hover.contents as any).value || JSON.stringify(hover.contents)
          }

          items.push({
            id: `docs-${currentFile}-${query}`,
            type: 'documentation',
            filePath: currentFile,
            content: hoverContent,
            language: 'markdown',
            relevanceScore: 0.7,
            metadata: {
              symbolName: query,
              documentation: hoverContent
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to get documentation context:', error)
    }

    return items
  }

  /**
   * Get historical context based on previous queries
   */
  private getHistoricalContext(query: string): ContextItem[] {
    const items: ContextItem[] = []

    // Find similar previous queries
    const similarQueries = this.queryHistory.filter(prevQuery => 
      this.calculateStringSimilarity(query.toLowerCase(), prevQuery.toLowerCase()) > 0.3
    )

    // Get context items from similar queries
    for (const similarQuery of similarQueries.slice(0, 3)) {
      const relatedItems = this.contextHistory.filter(item => 
        item.content.toLowerCase().includes(similarQuery.toLowerCase()) ||
        item.metadata?.symbolName?.toLowerCase().includes(similarQuery.toLowerCase())
      )

      for (const item of relatedItems.slice(0, 2)) {
        items.push({
          ...item,
          id: `historical-${item.id}`,
          relevanceScore: item.relevanceScore * 0.5 // Reduce relevance for historical items
        })
      }
    }

    return items
  }

  /**
   * Analyze context and generate summary
   */
  private async analyzeContext(items: ContextItem[], query: string): Promise<ContextAnalysis> {
    const totalRelevance = items.reduce((sum, item) => sum + item.relevanceScore, 0)
    
    // Generate summary based on context types
    const typeCounts = items.reduce((counts, item) => {
      counts[item.type] = (counts[item.type] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const summary = this.generateContextSummary(typeCounts, items.length, query)
    const suggestions = this.generateSuggestions(items, query)
    const relatedQueries = this.generateRelatedQueries(items, query)

    return {
      items,
      totalRelevance,
      summary,
      suggestions,
      relatedQueries
    }
  }

  /**
   * Utility methods
   */
  private async getFileContentSnippet(filePath: string, line?: number, contextLines = 2): Promise<string> {
    try {
      const content = await require('fs/promises').readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      
      if (!line) {
        return lines.slice(0, 10).join('\n')
      }

      const startLine = Math.max(0, line - contextLines - 1)
      const endLine = Math.min(lines.length, line + contextLines)
      
      return lines.slice(startLine, endLine).join('\n')
    } catch (error) {
      return 'Failed to read file content'
    }
  }

  private extractSymbolContent(content: string, symbol: any): string {
    const lines = content.split('\n')
    const startLine = symbol.range.start.line
    const endLine = Math.min(symbol.range.end.line + 2, lines.length - 1)
    
    return lines.slice(startLine, endLine + 1).join('\n')
  }

  private detectLanguage(filePath: string): string {
    const ext = require('path').extname(filePath).toLowerCase()
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java'
    }
    return languageMap[ext] || 'plaintext'
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private generateContextSummary(typeCounts: Record<string, number>, totalItems: number, query: string): string {
    const typeDescriptions: Record<string, string> = {
      file: 'file content',
      symbol: 'code symbols',
      selection: 'selected code',
      error: 'errors/diagnostics',
      documentation: 'documentation'
    }

    const descriptions = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${typeDescriptions[type] || type} items`)
      .join(', ')

    return `Found ${totalItems} relevant context items for "${query}": ${descriptions}`
  }

  private generateSuggestions(items: ContextItem[], query: string): string[] {
    const suggestions: string[] = []
    
    if (items.some(item => item.type === 'error')) {
      suggestions.push('Review the errors and diagnostics found')
    }
    
    if (items.some(item => item.type === 'symbol')) {
      suggestions.push('Explore the related symbols and their definitions')
    }
    
    if (items.length > 10) {
      suggestions.push('Consider refining your query for more specific results')
    }
    
    if (items.length < 3) {
      suggestions.push('Try a broader query or check if the workspace is fully indexed')
    }

    return suggestions
  }

  private generateRelatedQueries(items: ContextItem[], query: string): string[] {
    const relatedQueries: string[] = []
    
    // Extract symbol names from context
    const symbolNames = items
      .filter(item => item.metadata?.symbolName)
      .map(item => item.metadata!.symbolName!)
      .filter(name => name !== query)
      .slice(0, 5)

    relatedQueries.push(...symbolNames)

    // Add common patterns
    if (query.includes('function')) {
      relatedQueries.push('class', 'interface', 'type')
    }
    
    if (query.includes('error')) {
      relatedQueries.push('exception', 'try catch', 'debugging')
    }

    return [...new Set(relatedQueries)].slice(0, 5)
  }

  /**
   * Event handlers
   */
  private handleDiagnosticsChanged(filePath: string, diagnostics: any[]): void {
    this.emit('contextChanged', {
      type: 'diagnostics',
      filePath,
      data: diagnostics
    })
  }

  private handleSymbolsChanged(filePath: string, symbols: any[]): void {
    this.emit('contextChanged', {
      type: 'symbols',
      filePath,
      data: symbols
    })
  }

  /**
   * Get current status
   */
  getStatus(): { isAnalyzing: boolean; historySize: number; lastQuery?: string } {
    return {
      isAnalyzing: this.isAnalyzing,
      historySize: this.queryHistory.length,
      lastQuery: this.queryHistory[0]
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.queryHistory = []
    this.contextHistory = []
    this.emit('historyCleared')
  }
}
