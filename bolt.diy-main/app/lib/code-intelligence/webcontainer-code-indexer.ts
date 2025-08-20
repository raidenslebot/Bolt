/**
 * 🔍 WEBCONTAINER CODE INDEXING ENGINE
 * Real-time code analysis and search for WebContainer environment
 * Brings cursor-level code intelligence to Bolt.diy
 */

import { webcontainer } from '~/lib/webcontainer';

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'type' | 'enum' | 'method' | 'property';
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  signature?: string;
  documentation?: string;
  scope: string;
  accessibility?: 'public' | 'private' | 'protected';
  file: string;
}

export interface IndexedFile {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  errors: CodeError[];
  metrics: FileMetrics;
}

export interface CodeError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface FileMetrics {
  lines: number;
  complexity: number;
  maintainability: number;
  testCoverage?: number;
}

export interface SearchResult {
  file: IndexedFile;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  type: 'symbol' | 'content' | 'filename';
  line: number;
  column: number;
  snippet: string;
  symbol?: SymbolInfo;
  score: number;
}

export interface IndexStats {
  totalFiles: number;
  totalSymbols: number;
  totalLines: number;
  languages: Record<string, number>;
  lastIndexed: Date;
  indexingTime: number;
}

/**
 * High-performance code indexing for WebContainer
 */
export class WebContainerCodeIndexer {
  private indexedFiles: Map<string, IndexedFile> = new Map();
  private symbolIndex: Map<string, SymbolInfo[]> = new Map();
  private contentIndex: Map<string, string[]> = new Map();
  private fileWatchers: Map<string, any> = new Map();
  
  private isIndexing = false;
  private indexingQueue: string[] = [];
  private lastIndexTime = 0;
  
  // Performance optimizations
  private readonly maxConcurrentFiles = 10;
  private readonly maxFileSize = 1024 * 1024; // 1MB
  private readonly batchSize = 50;
  
  constructor() {
    this.initialize();
  }

  /**
   * Initialize the indexing engine
   */
  private async initialize(): Promise<void> {
    console.log('[CODE-INDEXER] Initializing WebContainer code indexing...');
    
    try {
      const wc = await webcontainer;
      console.log('[CODE-INDEXER] WebContainer ready, starting initial index...');
      
      // Perform initial indexing
      await this.indexWorkspace();
      
      console.log(`[CODE-INDEXER] Initial indexing complete. Indexed ${this.indexedFiles.size} files.`);
    } catch (error) {
      console.error('[CODE-INDEXER] Failed to initialize:', error);
    }
  }

  /**
   * Index entire workspace
   */
  async indexWorkspace(): Promise<IndexStats> {
    const startTime = Date.now();
    this.isIndexing = true;
    
    try {
      const wc = await webcontainer;
      const filesToIndex: string[] = [];
      
      // Discover all files
      await this.discoverFiles('/project', filesToIndex);
      
      console.log(`[CODE-INDEXER] Found ${filesToIndex.length} files to index`);
      
      // Process files in batches for performance
      const batches = this.createBatches(filesToIndex, this.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }
      
      this.lastIndexTime = Date.now() - startTime;
      
      return this.getIndexStats();
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Discover files recursively
   */
  private async discoverFiles(dir: string, files: string[]): Promise<void> {
    try {
      const wc = await webcontainer;
      const entries = await wc.fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`.replace('//', '/');
        
        // Skip hidden files and common ignore patterns
        if (this.shouldIgnoreFile(entry.name)) continue;
        
        if (entry.isDirectory()) {
          await this.discoverFiles(fullPath, files);
        } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`[CODE-INDEXER] Cannot read directory: ${dir}`);
    }
  }

  /**
   * Process a batch of files
   */
  private async processBatch(filePaths: string[]): Promise<void> {
    const promises = filePaths.map(path => this.indexFile(path));
    await Promise.allSettled(promises);
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<IndexedFile | null> {
    try {
      const wc = await webcontainer;
      
      // Get file stats
      const stats = await wc.fs.stat(filePath);
      
      // Skip files that are too large
      if (stats.size > this.maxFileSize) {
        console.warn(`[CODE-INDEXER] Skipping large file: ${filePath} (${stats.size} bytes)`);
        return null;
      }
      
      // Read file content
      const content = await wc.fs.readFile(filePath, 'utf8');
      const contentStr = content.toString();
      
      // Detect language
      const language = this.detectLanguage(filePath);
      
      // Parse symbols and structure
      const symbols = await this.extractSymbols(contentStr, language, filePath);
      const imports = this.extractImports(contentStr, language);
      const exports = this.extractExports(contentStr, language);
      const errors = this.extractErrors(contentStr, language);
      const metrics = this.calculateMetrics(contentStr);
      
      const indexedFile: IndexedFile = {
        path: filePath,
        content: contentStr,
        language,
        size: stats.size,
        lastModified: new Date(stats.mtime),
        symbols,
        imports,
        exports,
        errors,
        metrics
      };
      
      // Store in indexes
      this.indexedFiles.set(filePath, indexedFile);
      this.updateSymbolIndex(filePath, symbols);
      this.updateContentIndex(filePath, contentStr);
      
      return indexedFile;
      
    } catch (error) {
      console.warn(`[CODE-INDEXER] Failed to index file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract symbols from code
   */
  private async extractSymbols(content: string, language: string, filePath: string): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = [];
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        symbols.push(...this.extractJSSymbols(content, filePath));
        break;
      case 'python':
        symbols.push(...this.extractPythonSymbols(content, filePath));
        break;
      case 'java':
        symbols.push(...this.extractJavaSymbols(content, filePath));
        break;
      // Add more languages as needed
    }
    
    return symbols;
  }

  /**
   * Extract JavaScript/TypeScript symbols
   */
  private extractJSSymbols(content: string, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Function declarations
      const funcMatch = line.match(/^\s*(export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[2],
          kind: 'function',
          line: lineNum,
          column: line.indexOf(funcMatch[2]) + 1,
          endLine: this.findBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: funcMatch[1] ? 'public' : 'private',
          file: filePath
        });
      }
      
      // Class declarations
      const classMatch = line.match(/^\s*(export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[2],
          kind: 'class',
          line: lineNum,
          column: line.indexOf(classMatch[2]) + 1,
          endLine: this.findBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: classMatch[1] ? 'public' : 'private',
          file: filePath
        });
      }
      
      // Interface declarations
      const interfaceMatch = line.match(/^\s*(export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[2],
          kind: 'interface',
          line: lineNum,
          column: line.indexOf(interfaceMatch[2]) + 1,
          endLine: this.findBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: interfaceMatch[1] ? 'public' : 'private',
          file: filePath
        });
      }
      
      // Variable declarations
      const varMatch = line.match(/^\s*(export\s+)?(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (varMatch) {
        symbols.push({
          name: varMatch[3],
          kind: varMatch[2] === 'const' ? 'constant' : 'variable',
          line: lineNum,
          column: line.indexOf(varMatch[3]) + 1,
          endLine: lineNum,
          endColumn: line.indexOf(varMatch[3]) + varMatch[3].length,
          signature: line.trim(),
          scope: 'global',
          accessibility: varMatch[1] ? 'public' : 'private',
          file: filePath
        });
      }
    }
    
    return symbols;
  }

  /**
   * Extract Python symbols (simplified)
   */
  private extractPythonSymbols(content: string, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Function definitions
      const funcMatch = line.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          line: lineNum,
          column: line.indexOf(funcMatch[1]) + 1,
          endLine: this.findPythonBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: funcMatch[1].startsWith('_') ? 'private' : 'public',
          file: filePath
        });
      }
      
      // Class definitions
      const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          line: lineNum,
          column: line.indexOf(classMatch[1]) + 1,
          endLine: this.findPythonBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: 'public',
          file: filePath
        });
      }
    }
    
    return symbols;
  }

  /**
   * Extract Java symbols (simplified)
   */
  private extractJavaSymbols(content: string, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Method declarations
      const methodMatch = line.match(/^\s*(public|private|protected)?\s*(?:static\s+)?(?:final\s+)?([a-zA-Z_$][a-zA-Z0-9_$<>]*)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (methodMatch) {
        symbols.push({
          name: methodMatch[3],
          kind: 'method',
          line: lineNum,
          column: line.indexOf(methodMatch[3]) + 1,
          endLine: this.findBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'class',
          accessibility: methodMatch[1] as any || 'public',
          file: filePath
        });
      }
      
      // Class declarations
      const classMatch = line.match(/^\s*(public|private|protected)?\s*(?:abstract\s+)?(?:final\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[2],
          kind: 'class',
          line: lineNum,
          column: line.indexOf(classMatch[2]) + 1,
          endLine: this.findBlockEnd(lines, i),
          endColumn: 1,
          signature: line.trim(),
          scope: 'global',
          accessibility: classMatch[1] as any || 'public',
          file: filePath
        });
      }
    }
    
    return symbols;
  }

  /**
   * Find the end of a code block
   */
  private findBlockEnd(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let inBlock = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') {
          braceCount++;
          inBlock = true;
        } else if (char === '}') {
          braceCount--;
          if (inBlock && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    
    return startIndex + 1;
  }

  /**
   * Find the end of a Python block (indentation-based)
   */
  private findPythonBlockEnd(lines: string[], startIndex: number): number {
    const startIndent = lines[startIndex].search(/\S/);
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue; // Skip empty lines
      
      const indent = line.search(/\S/);
      if (indent <= startIndent && line.trim() !== '') {
        return i;
      }
    }
    
    return lines.length;
  }

  /**
   * Extract imports from code
   */
  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        for (const line of lines) {
          const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            imports.push(importMatch[1]);
          }
        }
        break;
        
      case 'python':
        for (const line of lines) {
          const importMatch = line.match(/(?:from\s+(\S+)\s+)?import\s+(.+)/);
          if (importMatch) {
            imports.push(importMatch[1] || importMatch[2].split(',')[0].trim());
          }
        }
        break;
    }
    
    return imports;
  }

  /**
   * Extract exports from code
   */
  private extractExports(content: string, language: string): string[] {
    const exports: string[] = [];
    const lines = content.split('\n');
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        for (const line of lines) {
          const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
          if (exportMatch) {
            exports.push(exportMatch[1]);
          }
        }
        break;
    }
    
    return exports;
  }

  /**
   * Extract syntax errors (basic)
   */
  private extractErrors(content: string, language: string): CodeError[] {
    const errors: CodeError[] = [];
    // This would integrate with language servers for real error detection
    // For now, just detect basic syntax issues
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for unmatched braces/brackets
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces && openBraces > 0 && closeBraces > 0) {
        errors.push({
          line: i + 1,
          column: 1,
          message: 'Unmatched braces',
          severity: 'warning'
        });
      }
    }
    
    return errors;
  }

  /**
   * Calculate file metrics
   */
  private calculateMetrics(content: string): FileMetrics {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '').length;
    
    // Simple complexity calculation
    const complexity = this.calculateCyclomaticComplexity(content);
    
    // Simple maintainability index
    const maintainability = Math.max(0, 100 - complexity - (nonEmptyLines / 10));
    
    return {
      lines: nonEmptyLines,
      complexity,
      maintainability
    };
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateCyclomaticComplexity(content: string): number {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPoints = [
      /if\s*\(/g,
      /else\s*if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g
    ];
    
    for (const pattern of decisionPoints) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Update symbol index
   */
  private updateSymbolIndex(filePath: string, symbols: SymbolInfo[]): void {
    // Remove old symbols for this file
    for (const [key, symbolList] of this.symbolIndex.entries()) {
      this.symbolIndex.set(key, symbolList.filter(s => s.file !== filePath));
    }
    
    // Add new symbols
    for (const symbol of symbols) {
      const key = symbol.name.toLowerCase();
      if (!this.symbolIndex.has(key)) {
        this.symbolIndex.set(key, []);
      }
      this.symbolIndex.get(key)!.push(symbol);
    }
  }

  /**
   * Update content index
   */
  private updateContentIndex(filePath: string, content: string): void {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    
    for (const word of words) {
      if (word.length < 3) continue; // Skip short words
      
      if (!this.contentIndex.has(word)) {
        this.contentIndex.set(word, []);
      }
      
      if (!this.contentIndex.get(word)!.includes(filePath)) {
        this.contentIndex.get(word)!.push(filePath);
      }
    }
  }

  /**
   * Search across the codebase
   */
  search(query: string, options: {
    type?: 'symbol' | 'content' | 'filename' | 'all';
    language?: string;
    maxResults?: number;
  } = {}): SearchResult[] {
    const { type = 'all', language, maxResults = 50 } = options;
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    if (type === 'symbol' || type === 'all') {
      // Search symbols
      for (const [key, symbols] of this.symbolIndex.entries()) {
        if (key.includes(queryLower)) {
          for (const symbol of symbols) {
            const file = this.indexedFiles.get(symbol.file);
            if (!file || (language && file.language !== language)) continue;
            
            const match: SearchMatch = {
              type: 'symbol',
              line: symbol.line,
              column: symbol.column,
              snippet: symbol.signature || '',
              symbol,
              score: this.calculateMatchScore(query, symbol.name)
            };
            
            results.push({
              file,
              matches: [match],
              score: match.score
            });
          }
        }
      }
    }
    
    if (type === 'content' || type === 'all') {
      // Search content
      for (const [word, filePaths] of this.contentIndex.entries()) {
        if (word.includes(queryLower)) {
          for (const filePath of filePaths) {
            const file = this.indexedFiles.get(filePath);
            if (!file || (language && file.language !== language)) continue;
            
            const matches = this.findContentMatches(file.content, query);
            if (matches.length > 0) {
              results.push({
                file,
                matches,
                score: Math.max(...matches.map(m => m.score))
              });
            }
          }
        }
      }
    }
    
    if (type === 'filename' || type === 'all') {
      // Search filenames
      for (const [filePath, file] of this.indexedFiles.entries()) {
        if (filePath.toLowerCase().includes(queryLower)) {
          if (language && file.language !== language) continue;
          
          const match: SearchMatch = {
            type: 'filename',
            line: 1,
            column: 1,
            snippet: filePath,
            score: this.calculateMatchScore(query, filePath)
          };
          
          results.push({
            file,
            matches: [match],
            score: match.score
          });
        }
      }
    }
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Find content matches within a file
   */
  private findContentMatches(content: string, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lines = content.split('\n');
    const queryLower = query.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      if (lineLower.includes(queryLower)) {
        const column = lineLower.indexOf(queryLower) + 1;
        const snippet = this.createSnippet(lines, i, column, query);
        
        matches.push({
          type: 'content',
          line: i + 1,
          column,
          snippet,
          score: this.calculateMatchScore(query, line)
        });
      }
    }
    
    return matches;
  }

  /**
   * Create context snippet around a match
   */
  private createSnippet(lines: string[], lineIndex: number, column: number, query: string): string {
    const contextLines = 2;
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Calculate match score
   */
  private calculateMatchScore(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === queryLower) return 100;
    
    // Starts with gets high score
    if (textLower.startsWith(queryLower)) return 90;
    
    // Contains gets medium score
    if (textLower.includes(queryLower)) return 70;
    
    // Fuzzy match gets lower score
    const fuzzyScore = this.calculateFuzzyScore(queryLower, textLower);
    return Math.max(0, fuzzyScore);
  }

  /**
   * Calculate fuzzy match score
   */
  private calculateFuzzyScore(query: string, text: string): number {
    if (query.length === 0) return 0;
    if (text.length === 0) return 0;
    
    let score = 0;
    let textIndex = 0;
    
    for (const char of query) {
      const index = text.indexOf(char, textIndex);
      if (index === -1) return 0;
      
      score += 1 / (index - textIndex + 1);
      textIndex = index + 1;
    }
    
    return Math.min(50, (score / query.length) * 50);
  }

  /**
   * Get symbols for a file
   */
  getFileSymbols(filePath: string): SymbolInfo[] {
    const file = this.indexedFiles.get(filePath);
    return file ? file.symbols : [];
  }

  /**
   * Get file by path
   */
  getFile(filePath: string): IndexedFile | undefined {
    return this.indexedFiles.get(filePath);
  }

  /**
   * Get index statistics
   */
  getIndexStats(): IndexStats {
    const languages: Record<string, number> = {};
    let totalLines = 0;
    let totalSymbols = 0;
    
    for (const file of this.indexedFiles.values()) {
      languages[file.language] = (languages[file.language] || 0) + 1;
      totalLines += file.metrics.lines;
      totalSymbols += file.symbols.length;
    }
    
    return {
      totalFiles: this.indexedFiles.size,
      totalSymbols,
      totalLines,
      languages,
      lastIndexed: new Date(this.lastIndexTime),
      indexingTime: this.lastIndexTime
    };
  }

  /**
   * Helper methods
   */
  private shouldIgnoreFile(name: string): boolean {
    const ignorePatterns = [
      /^\./,          // Hidden files
      /node_modules/, // Dependencies
      /\.git/,        // Git files
      /\.DS_Store/,   // macOS files
      /thumbs\.db/i   // Windows files
    ];
    
    return ignorePatterns.some(pattern => pattern.test(name));
  }

  private isSupportedFile(name: string): boolean {
    const supportedExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php',
      'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'html', 'css', 'scss',
      'json', 'xml', 'yaml', 'yml', 'md', 'sql', 'sh', 'ps1'
    ];
    
    const ext = name.split('.').pop()?.toLowerCase();
    return ext ? supportedExtensions.includes(ext) : false;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'ps1': 'powershell'
    };
    
    return ext ? langMap[ext] || 'text' : 'text';
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

// Export singleton instance
export const codeIndexer = new WebContainerCodeIndexer();
