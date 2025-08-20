import { webcontainer } from '~/lib/webcontainer';
import { EventEmitter } from 'events';

export interface ContextItem {
  id: string;
  type: 'file' | 'symbol' | 'selection' | 'error' | 'documentation';
  filePath: string;
  content: string;
  language: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  relevanceScore: number;
  metadata?: {
    symbolName?: string;
    symbolKind?: string;
    errorType?: string;
    documentation?: string;
    references?: Array<{ file: string; line: number; column: number }>;
  };
}

export interface ContextRequest {
  query: string;
  currentFile?: string;
  currentSelection?: {
    text: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  maxItems?: number;
  includeTypes?: Array<'file' | 'symbol' | 'selection' | 'error' | 'documentation'>;
  workspaceScope?: boolean;
}

export interface ContextAnalysis {
  items: ContextItem[];
  totalRelevance: number;
  summary: string;
  suggestions: string[];
  relatedQueries: string[];
}

/**
 * Enhanced Context Engine for WebContainer
 * Provides intelligent multi-source context for AI assistance
 */
export class WebContainerContextEngine extends EventEmitter {
  private webcontainer: any = null;
  private contextHistory: ContextItem[] = [];
  private queryHistory: string[] = [];
  private isAnalyzing = false;
  private fileCache = new Map<string, { content: string; timestamp: number }>();

  constructor() {
    super();
    this.initializeWebContainer();
  }

  private async initializeWebContainer() {
    try {
      this.webcontainer = await webcontainer;
      this.emit('ready');
    } catch (error) {
      console.error('Failed to initialize WebContainer for context engine:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get intelligent context for a query
   */
  async getContext(request: ContextRequest): Promise<ContextAnalysis> {
    this.isAnalyzing = true;
    this.emit('analysisStarted', request);

    try {
      const contextItems: ContextItem[] = [];
      let totalRelevance = 0;

      // Add current file context (highest priority)
      if (request.currentFile) {
        const fileContext = await this.getCurrentFileContext(request.currentFile, request.currentSelection);
        contextItems.push(...fileContext);
        totalRelevance += fileContext.reduce((sum, item) => sum + item.relevanceScore, 0);
      }

      // Add related symbols and files
      if (request.workspaceScope) {
        const workspaceContext = await this.getWorkspaceContext(request.query, request.maxItems || 10);
        contextItems.push(...workspaceContext);
        totalRelevance += workspaceContext.reduce((sum, item) => sum + item.relevanceScore, 0);
      }

      // Add error context if available
      const errorContext = await this.getErrorContext(request.currentFile);
      contextItems.push(...errorContext);
      totalRelevance += errorContext.reduce((sum, item) => sum + item.relevanceScore, 0);

      // Sort by relevance and limit results
      const sortedItems = contextItems
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, request.maxItems || 20);

      // Generate analysis
      const analysis: ContextAnalysis = {
        items: sortedItems,
        totalRelevance,
        summary: this.generateContextSummary(sortedItems, request.query),
        suggestions: this.generateSuggestions(sortedItems, request.query),
        relatedQueries: this.generateRelatedQueries(request.query)
      };

      // Update history
      this.queryHistory.push(request.query);
      this.contextHistory.push(...sortedItems.slice(0, 5)); // Keep recent context

      this.isAnalyzing = false;
      this.emit('analysisComplete', analysis);

      return analysis;
    } catch (error) {
      this.isAnalyzing = false;
      this.emit('analysisError', error);
      throw error;
    }
  }

  /**
   * Get context from current file
   */
  private async getCurrentFileContext(
    filePath: string, 
    selection?: ContextRequest['currentSelection']
  ): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];

    try {
      if (!this.webcontainer) return contextItems;

      const content = await this.getFileContent(filePath);
      const language = this.detectLanguage(filePath);

      // Add full file context
      contextItems.push({
        id: `file:${filePath}`,
        type: 'file',
        filePath,
        content,
        language,
        relevanceScore: 90, // High relevance for current file
        metadata: {}
      });

      // Add selection context if provided
      if (selection) {
        const lines = content.split('\n');
        const selectedLines = lines.slice(selection.startLine, selection.endLine + 1);
        const selectedContent = selectedLines.join('\n');

        contextItems.push({
          id: `selection:${filePath}:${selection.startLine}`,
          type: 'selection',
          filePath,
          content: selectedContent,
          language,
          line: selection.startLine,
          column: selection.startColumn,
          endLine: selection.endLine,
          endColumn: selection.endColumn,
          relevanceScore: 100, // Highest relevance for selection
          metadata: {}
        });

        // Add surrounding context
        const contextStart = Math.max(0, selection.startLine - 5);
        const contextEnd = Math.min(lines.length - 1, selection.endLine + 5);
        const surroundingLines = lines.slice(contextStart, contextEnd + 1);
        const surroundingContent = surroundingLines.join('\n');

        contextItems.push({
          id: `surrounding:${filePath}:${contextStart}`,
          type: 'documentation',
          filePath,
          content: surroundingContent,
          language,
          line: contextStart,
          relevanceScore: 80,
          metadata: {
            documentation: 'Surrounding code context'
          }
        });
      }

      // Extract and add symbols from current file
      const symbols = await this.extractFileSymbols(filePath, content, language);
      contextItems.push(...symbols);

    } catch (error) {
      console.error(`Error getting current file context for ${filePath}:`, error);
    }

    return contextItems;
  }

  /**
   * Get context from workspace
   */
  private async getWorkspaceContext(query: string, maxItems: number): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];

    try {
      if (!this.webcontainer) return contextItems;

      // Search for files matching query
      const matchingFiles = await this.findRelevantFiles(query, maxItems);
      
      for (const filePath of matchingFiles) {
        const content = await this.getFileContent(filePath);
        const language = this.detectLanguage(filePath);
        const relevance = this.calculateFileRelevance(filePath, content, query);

        if (relevance > 20) { // Only include relevant files
          contextItems.push({
            id: `workspace:${filePath}`,
            type: 'file',
            filePath,
            content: this.truncateContent(content, 500), // Limit content size
            language,
            relevanceScore: relevance,
            metadata: {}
          });
        }
      }

    } catch (error) {
      console.error('Error getting workspace context:', error);
    }

    return contextItems;
  }

  /**
   * Get error context
   */
  private async getErrorContext(currentFile?: string): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];

    try {
      if (!this.webcontainer || !currentFile) return contextItems;

      const content = await this.getFileContent(currentFile);
      const language = this.detectLanguage(currentFile);
      
      // Basic syntax error detection
      const errors = this.detectBasicErrors(content, language);
      
      errors.forEach((error, index) => {
        contextItems.push({
          id: `error:${currentFile}:${index}`,
          type: 'error',
          filePath: currentFile,
          content: error.context,
          language,
          line: error.line,
          column: error.column,
          relevanceScore: 85,
          metadata: {
            errorType: error.type,
            documentation: error.message
          }
        });
      });

    } catch (error) {
      console.error('Error getting error context:', error);
    }

    return contextItems;
  }

  /**
   * Extract symbols from file content
   */
  private async extractFileSymbols(filePath: string, content: string, language: string): Promise<ContextItem[]> {
    const symbols: ContextItem[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'javascript') {
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Functions
        const functionMatch = trimmedLine.match(/(?:function|const|let)\s+(\w+)\s*[=\(]/);
        if (functionMatch) {
          symbols.push({
            id: `symbol:${filePath}:${functionMatch[1]}:${index}`,
            type: 'symbol',
            filePath,
            content: line,
            language,
            line: index,
            column: line.indexOf(functionMatch[1]),
            relevanceScore: 70,
            metadata: {
              symbolName: functionMatch[1],
              symbolKind: 'function'
            }
          });
        }

        // Classes
        const classMatch = trimmedLine.match(/class\s+(\w+)/);
        if (classMatch) {
          symbols.push({
            id: `symbol:${filePath}:${classMatch[1]}:${index}`,
            type: 'symbol',
            filePath,
            content: line,
            language,
            line: index,
            column: line.indexOf(classMatch[1]),
            relevanceScore: 75,
            metadata: {
              symbolName: classMatch[1],
              symbolKind: 'class'
            }
          });
        }

        // Interfaces
        const interfaceMatch = trimmedLine.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
          symbols.push({
            id: `symbol:${filePath}:${interfaceMatch[1]}:${index}`,
            type: 'symbol',
            filePath,
            content: line,
            language,
            line: index,
            column: line.indexOf(interfaceMatch[1]),
            relevanceScore: 70,
            metadata: {
              symbolName: interfaceMatch[1],
              symbolKind: 'interface'
            }
          });
        }
      });
    }

    return symbols;
  }

  /**
   * Find relevant files in workspace
   */
  private async findRelevantFiles(query: string, maxFiles: number): Promise<string[]> {
    if (!this.webcontainer) return [];

    const relevantFiles: string[] = [];
    const queryLower = query.toLowerCase();

    try {
      const files = await this.getAllFiles('/');
      
      for (const filePath of files) {
        if (relevantFiles.length >= maxFiles) break;

        // Check if filename matches query
        const filename = filePath.split('/').pop()?.toLowerCase() || '';
        if (filename.includes(queryLower)) {
          relevantFiles.push(filePath);
          continue;
        }

        // Check if file content matches query (for small files)
        try {
          const stats = await this.webcontainer.fs.stat(filePath);
          if (stats.size < 10000) { // Only check small files for content
            const content = await this.getFileContent(filePath);
            if (content.toLowerCase().includes(queryLower)) {
              relevantFiles.push(filePath);
            }
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    } catch (error) {
      console.error('Error finding relevant files:', error);
    }

    return relevantFiles;
  }

  /**
   * Get all files in workspace
   */
  private async getAllFiles(rootPath: string, maxFiles: number = 100): Promise<string[]> {
    if (!this.webcontainer) return [];

    const files: string[] = [];
    const visited = new Set<string>();

    const traverse = async (dirPath: string) => {
      if (files.length >= maxFiles) return;
      if (visited.has(dirPath)) return;
      visited.add(dirPath);

      try {
        const entries = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry.name}`.replace(/\/+/g, '/');
          
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = entry.name.split('.').pop()?.toLowerCase();
            if (['js', 'jsx', 'ts', 'tsx', 'py', 'css', 'html', 'json'].includes(ext || '')) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    await traverse(rootPath);
    return files;
  }

  /**
   * Get file content with caching
   */
  private async getFileContent(filePath: string): Promise<string> {
    const cached = this.fileCache.get(filePath);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < 5000) { // Cache for 5 seconds
      return cached.content;
    }

    if (!this.webcontainer) return '';

    try {
      const content = await this.webcontainer.fs.readFile(filePath, 'utf-8');
      this.fileCache.set(filePath, { content, timestamp: now });
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Calculate file relevance to query
   */
  private calculateFileRelevance(filePath: string, content: string, query: string): number {
    let relevance = 0;
    const queryLower = query.toLowerCase();
    const filename = filePath.split('/').pop()?.toLowerCase() || '';
    const contentLower = content.toLowerCase();

    // Filename matches
    if (filename.includes(queryLower)) {
      relevance += 40;
    }

    // Content matches
    const matches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    relevance += Math.min(matches * 5, 30);

    // File type bonus
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      relevance += 10;
    }

    return relevance;
  }

  /**
   * Detect basic syntax errors
   */
  private detectBasicErrors(content: string, language: string): Array<{
    type: string;
    message: string;
    line: number;
    column: number;
    context: string;
  }> {
    const errors: Array<{
      type: string;
      message: string;
      line: number;
      column: number;
      context: string;
    }> = [];

    const lines = content.split('\n');

    if (language === 'json') {
      try {
        JSON.parse(content);
      } catch (error) {
        errors.push({
          type: 'SyntaxError',
          message: `Invalid JSON: ${(error as Error).message}`,
          line: 0,
          column: 0,
          context: content.slice(0, 200)
        });
      }
    }

    if (language === 'typescript' || language === 'javascript') {
      lines.forEach((line, index) => {
        // Check for unmatched brackets
        const openBrackets = (line.match(/[{[(]/g) || []).length;
        const closeBrackets = (line.match(/[}\])]/g) || []).length;
        
        if (Math.abs(openBrackets - closeBrackets) > 2) {
          errors.push({
            type: 'SyntaxError',
            message: 'Possible unmatched brackets',
            line: index,
            column: 0,
            context: line
          });
        }
      });
    }

    return errors;
  }

  /**
   * Generate context summary
   */
  private generateContextSummary(items: ContextItem[], query: string): string {
    if (items.length === 0) {
      return `No relevant context found for "${query}"`;
    }

    const fileCount = new Set(items.map(item => item.filePath)).size;
    const symbolCount = items.filter(item => item.type === 'symbol').length;
    const errorCount = items.filter(item => item.type === 'error').length;

    let summary = `Found ${items.length} relevant context items across ${fileCount} files`;
    
    if (symbolCount > 0) {
      summary += `, including ${symbolCount} symbols`;
    }
    
    if (errorCount > 0) {
      summary += ` and ${errorCount} potential issues`;
    }

    const primaryFile = items.find(item => item.type === 'file')?.filePath;
    if (primaryFile) {
      const filename = primaryFile.split('/').pop();
      summary += `. Primary focus on ${filename}`;
    }

    return summary + '.';
  }

  /**
   * Generate suggestions based on context
   */
  private generateSuggestions(items: ContextItem[], query: string): string[] {
    const suggestions: string[] = [];

    // Analyze context types
    const hasErrors = items.some(item => item.type === 'error');
    const hasSymbols = items.some(item => item.type === 'symbol');
    const hasSelection = items.some(item => item.type === 'selection');

    if (hasErrors) {
      suggestions.push('Review and fix syntax errors first');
      suggestions.push('Check error messages for specific guidance');
    }

    if (hasSymbols) {
      suggestions.push('Consider the existing functions and classes in your codebase');
      suggestions.push('Look for similar patterns in related files');
    }

    if (hasSelection) {
      suggestions.push('Focus on the selected code section');
      suggestions.push('Consider the surrounding context');
    }

    // Language-specific suggestions
    const languages = new Set(items.map(item => item.language));
    if (languages.has('typescript')) {
      suggestions.push('Leverage TypeScript type safety features');
    }
    if (languages.has('javascript')) {
      suggestions.push('Consider modern ES6+ features');
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Generate related queries
   */
  private generateRelatedQueries(query: string): string[] {
    const related: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);

    // Add variations
    if (queryWords.includes('function')) {
      related.push('method implementation');
      related.push('function parameters');
    }

    if (queryWords.includes('error')) {
      related.push('debugging tips');
      related.push('error handling');
    }

    if (queryWords.includes('component')) {
      related.push('React component');
      related.push('component props');
    }

    // Add recent queries that might be related
    const recentQueries = this.queryHistory.slice(-5);
    recentQueries.forEach(recentQuery => {
      const overlap = this.calculateQueryOverlap(query, recentQuery);
      if (overlap > 0.3 && recentQuery !== query) {
        related.push(recentQuery);
      }
    });

    return related.slice(0, 3);
  }

  /**
   * Calculate overlap between two queries
   */
  private calculateQueryOverlap(query1: string, query2: string): number {
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Detect programming language
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'css': 'css',
      'scss': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown'
    };
    return languageMap[ext || ''] || 'text';
  }

  /**
   * Truncate content to specified length
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isAnalyzing: this.isAnalyzing,
      contextHistorySize: this.contextHistory.length,
      queryHistorySize: this.queryHistory.length,
      fileCacheSize: this.fileCache.size,
      webcontainerReady: !!this.webcontainer
    };
  }

  /**
   * Clear context history
   */
  clearHistory(): void {
    this.contextHistory = [];
    this.queryHistory = [];
    this.fileCache.clear();
    this.emit('historyCleared');
  }
}
