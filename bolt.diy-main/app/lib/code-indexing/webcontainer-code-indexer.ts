/**
 * WebContainer-Compatible Code Indexing Service
 * Provides intelligent code navigation and search capabilities
 */

import { webcontainer } from '~/lib/webcontainer';
import type { WebContainer } from '@webcontainer/api';
import { EventEmitter } from 'events';

export interface SymbolInfo {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'module' | 'property';
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  signature?: string;
  documentation?: string;
  scope?: string;
}

export interface FileIndex {
  filePath: string;
  language: string;
  symbols: SymbolInfo[];
  content: string;
  lastModified: number;
  size: number;
}

export interface SearchResult {
  symbol: SymbolInfo;
  file: FileIndex;
  relevanceScore: number;
  matchReason: string;
}

export interface ContentSearchResult {
  filePath: string;
  line: number;
  column: number;
  content: string;
  context: string[];
  relevanceScore: number;
}

/**
 * Advanced code indexing service for WebContainer
 * Provides project-wide symbol navigation and intelligent search
 */
export class WebContainerCodeIndexer extends EventEmitter {
  private webcontainer: WebContainer | null = null;
  private fileIndexes = new Map<string, FileIndex>();
  private symbolIndex = new Map<string, SymbolInfo[]>();
  private isIndexing = false;
  private indexingQueue: string[] = [];
  private supportedExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
    '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.html', '.css', '.scss',
    '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.md', '.txt'
  ]);

  constructor() {
    super();
    this.initializeWebContainer();
  }

  private async initializeWebContainer() {
    try {
      this.webcontainer = await webcontainer;
      this.emit('ready');
    } catch (error) {
      console.error('Failed to initialize WebContainer for code indexing:', error);
      this.emit('error', error);
    }
  }

  /**
   * Index the entire workspace
   */
  async indexWorkspace(rootPath: string = '/'): Promise<{ 
    success: boolean; 
    filesIndexed: number; 
    symbolsFound: number; 
    errors: string[] 
  }> {
    if (!this.webcontainer) {
      return { success: false, filesIndexed: 0, symbolsFound: 0, errors: ['WebContainer not available'] };
    }

    this.isIndexing = true;
    this.emit('indexingStarted');

    const results = {
      success: true,
      filesIndexed: 0,
      symbolsFound: 0,
      errors: [] as string[]
    };

    try {
      const files = await this.findIndexableFiles(rootPath);
      this.emit('indexingProgress', { total: files.length, processed: 0 });

      for (let i = 0; i < files.length; i++) {
        try {
          const fileIndex = await this.indexFile(files[i]);
          if (fileIndex) {
            this.fileIndexes.set(files[i], fileIndex);
            results.filesIndexed++;
            results.symbolsFound += fileIndex.symbols.length;
            
            // Update symbol index
            this.updateSymbolIndex(fileIndex);
          }
        } catch (error) {
          results.errors.push(`Error indexing ${files[i]}: ${error}`);
        }

        this.emit('indexingProgress', { total: files.length, processed: i + 1 });
      }

    } catch (error) {
      results.success = false;
      results.errors.push(`Workspace indexing error: ${error}`);
    }

    this.isIndexing = false;
    this.emit('indexingComplete', results);
    
    return results;
  }

  /**
   * Find all indexable files in the workspace
   */
  private async findIndexableFiles(rootPath: string, maxFiles: number = 1000): Promise<string[]> {
    if (!this.webcontainer) return [];

    const files: string[] = [];
    const visited = new Set<string>();

    const traverse = async (dirPath: string) => {
      if (files.length >= maxFiles) return;
      if (visited.has(dirPath)) return;
      visited.add(dirPath);

      try {
        const entries = await this.webcontainer!.fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry.name}`.replace(/\/+/g, '/');
          
          if (entry.isDirectory()) {
            // Skip common directories that don't need indexing
            if (!['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'].includes(entry.name)) {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
            if (this.supportedExtensions.has(ext) && entry.name.length < 100) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Cannot read directory ${dirPath}:`, error);
      }
    };

    await traverse(rootPath);
    return files;
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<FileIndex | null> {
    if (!this.webcontainer) return null;

    try {
      const content = await this.webcontainer.fs.readFile(filePath, 'utf-8');
      const stats = await this.webcontainer.fs.stat(filePath);
      const language = this.detectLanguage(filePath);
      
      const symbols = await this.extractSymbols(filePath, content, language);

      const fileIndex: FileIndex = {
        filePath,
        language,
        symbols,
        content,
        lastModified: stats.mtime,
        size: stats.size
      };

      this.emit('fileIndexed', { filePath, symbolCount: symbols.length });
      
      return fileIndex;
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract symbols from file content
   */
  private async extractSymbols(filePath: string, content: string, language: string): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');

    if (language === 'typescript' || language === 'javascript') {
      symbols.push(...this.extractJavaScriptSymbols(filePath, lines));
    } else if (language === 'python') {
      symbols.push(...this.extractPythonSymbols(filePath, lines));
    } else if (language === 'css') {
      symbols.push(...this.extractCSSSymbols(filePath, lines));
    } else if (language === 'json') {
      symbols.push(...this.extractJSONSymbols(filePath, lines));
    }

    return symbols;
  }

  /**
   * Extract JavaScript/TypeScript symbols
   */
  private extractJavaScriptSymbols(filePath: string, lines: string[]): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Function declarations
      const functionMatch = trimmedLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
      if (functionMatch) {
        symbols.push({
          id: `${filePath}:${functionMatch[1]}:${index}`,
          name: functionMatch[1],
          kind: 'function',
          filePath,
          line: index,
          column: line.indexOf(functionMatch[1]),
          endLine: index,
          endColumn: line.indexOf(functionMatch[1]) + functionMatch[1].length,
          signature: trimmedLine
        });
      }

      // Arrow functions and const declarations
      const arrowFunctionMatch = trimmedLine.match(/^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
      if (arrowFunctionMatch) {
        symbols.push({
          id: `${filePath}:${arrowFunctionMatch[1]}:${index}`,
          name: arrowFunctionMatch[1],
          kind: 'function',
          filePath,
          line: index,
          column: line.indexOf(arrowFunctionMatch[1]),
          endLine: index,
          endColumn: line.indexOf(arrowFunctionMatch[1]) + arrowFunctionMatch[1].length,
          signature: trimmedLine
        });
      }

      // Class declarations
      const classMatch = trimmedLine.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          id: `${filePath}:${classMatch[1]}:${index}`,
          name: classMatch[1],
          kind: 'class',
          filePath,
          line: index,
          column: line.indexOf(classMatch[1]),
          endLine: index,
          endColumn: line.indexOf(classMatch[1]) + classMatch[1].length,
          signature: trimmedLine
        });
      }

      // Interface declarations
      const interfaceMatch = trimmedLine.match(/^(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          id: `${filePath}:${interfaceMatch[1]}:${index}`,
          name: interfaceMatch[1],
          kind: 'interface',
          filePath,
          line: index,
          column: line.indexOf(interfaceMatch[1]),
          endLine: index,
          endColumn: line.indexOf(interfaceMatch[1]) + interfaceMatch[1].length,
          signature: trimmedLine
        });
      }

      // Variable declarations
      const variableMatch = trimmedLine.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)/);
      if (variableMatch && !arrowFunctionMatch) {
        symbols.push({
          id: `${filePath}:${variableMatch[1]}:${index}`,
          name: variableMatch[1],
          kind: 'variable',
          filePath,
          line: index,
          column: line.indexOf(variableMatch[1]),
          endLine: index,
          endColumn: line.indexOf(variableMatch[1]) + variableMatch[1].length,
          signature: trimmedLine
        });
      }

      // Import statements
      const importMatch = trimmedLine.match(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        symbols.push({
          id: `${filePath}:import:${importMatch[1]}:${index}`,
          name: importMatch[1],
          kind: 'module',
          filePath,
          line: index,
          column: line.indexOf(importMatch[1]),
          endLine: index,
          endColumn: line.indexOf(importMatch[1]) + importMatch[1].length,
          signature: trimmedLine
        });
      }
    });

    return symbols;
  }

  /**
   * Extract Python symbols
   */
  private extractPythonSymbols(filePath: string, lines: string[]): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Function definitions
      const functionMatch = trimmedLine.match(/^def\s+(\w+)\s*\(/);
      if (functionMatch) {
        symbols.push({
          id: `${filePath}:${functionMatch[1]}:${index}`,
          name: functionMatch[1],
          kind: 'function',
          filePath,
          line: index,
          column: line.indexOf(functionMatch[1]),
          endLine: index,
          endColumn: line.indexOf(functionMatch[1]) + functionMatch[1].length,
          signature: trimmedLine
        });
      }

      // Class definitions
      const classMatch = trimmedLine.match(/^class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          id: `${filePath}:${classMatch[1]}:${index}`,
          name: classMatch[1],
          kind: 'class',
          filePath,
          line: index,
          column: line.indexOf(classMatch[1]),
          endLine: index,
          endColumn: line.indexOf(classMatch[1]) + classMatch[1].length,
          signature: trimmedLine
        });
      }

      // Variable assignments (simple case)
      const variableMatch = trimmedLine.match(/^(\w+)\s*=/);
      if (variableMatch && !functionMatch && !classMatch) {
        symbols.push({
          id: `${filePath}:${variableMatch[1]}:${index}`,
          name: variableMatch[1],
          kind: 'variable',
          filePath,
          line: index,
          column: line.indexOf(variableMatch[1]),
          endLine: index,
          endColumn: line.indexOf(variableMatch[1]) + variableMatch[1].length,
          signature: trimmedLine
        });
      }
    });

    return symbols;
  }

  /**
   * Extract CSS symbols
   */
  private extractCSSSymbols(filePath: string, lines: string[]): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // CSS selectors (basic)
      const selectorMatch = trimmedLine.match(/^([.#]?[\w-]+(?:\s*[>+~]\s*[\w-]+)*)\s*\{?/);
      if (selectorMatch && !trimmedLine.includes(':') && !trimmedLine.includes(';')) {
        const selectorName = selectorMatch[1].trim();
        if (selectorName && selectorName !== '{') {
          symbols.push({
            id: `${filePath}:${selectorName}:${index}`,
            name: selectorName,
            kind: 'property',
            filePath,
            line: index,
            column: line.indexOf(selectorName),
            endLine: index,
            endColumn: line.indexOf(selectorName) + selectorName.length,
            signature: trimmedLine
          });
        }
      }
    });

    return symbols;
  }

  /**
   * Extract JSON symbols (keys)
   */
  private extractJSONSymbols(filePath: string, lines: string[]): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // JSON keys
      const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
      if (keyMatch) {
        symbols.push({
          id: `${filePath}:${keyMatch[1]}:${index}`,
          name: keyMatch[1],
          kind: 'property',
          filePath,
          line: index,
          column: line.indexOf(`"${keyMatch[1]}"`),
          endLine: index,
          endColumn: line.indexOf(`"${keyMatch[1]}"`) + keyMatch[1].length + 2,
          signature: trimmedLine
        });
      }
    });

    return symbols;
  }

  /**
   * Update the symbol index for fast searching
   */
  private updateSymbolIndex(fileIndex: FileIndex): void {
    fileIndex.symbols.forEach(symbol => {
      const key = symbol.name.toLowerCase();
      if (!this.symbolIndex.has(key)) {
        this.symbolIndex.set(key, []);
      }
      this.symbolIndex.get(key)!.push(symbol);
    });
  }

  /**
   * Search for symbols by name
   */
  searchSymbols(query: string, maxResults: number = 50): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [symbolName, symbols] of this.symbolIndex) {
      if (results.length >= maxResults) break;

      symbols.forEach(symbol => {
        if (results.length >= maxResults) return;

        let relevanceScore = 0;
        let matchReason = '';

        // Exact match
        if (symbolName === queryLower) {
          relevanceScore = 100;
          matchReason = 'Exact match';
        }
        // Starts with query
        else if (symbolName.startsWith(queryLower)) {
          relevanceScore = 80;
          matchReason = 'Starts with query';
        }
        // Contains query
        else if (symbolName.includes(queryLower)) {
          relevanceScore = 60;
          matchReason = 'Contains query';
        }
        // Fuzzy match (basic)
        else if (this.fuzzyMatch(symbolName, queryLower)) {
          relevanceScore = 40;
          matchReason = 'Fuzzy match';
        }

        if (relevanceScore > 0) {
          const fileIndex = this.fileIndexes.get(symbol.filePath);
          if (fileIndex) {
            results.push({
              symbol,
              file: fileIndex,
              relevanceScore,
              matchReason
            });
          }
        }
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for content within files
   */
  async searchContent(query: string, maxResults: number = 50): Promise<ContentSearchResult[]> {
    const results: ContentSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [filePath, fileIndex] of this.fileIndexes) {
      if (results.length >= maxResults) break;

      const lines = fileIndex.content.split('\n');
      lines.forEach((line, index) => {
        if (results.length >= maxResults) return;

        const lineLower = line.toLowerCase();
        const matchIndex = lineLower.indexOf(queryLower);
        
        if (matchIndex !== -1) {
          const contextStart = Math.max(0, index - 2);
          const contextEnd = Math.min(lines.length - 1, index + 2);
          const context = lines.slice(contextStart, contextEnd + 1);

          // Simple relevance scoring
          let relevanceScore = 50;
          if (line.trim().startsWith(query)) relevanceScore += 30;
          if (matchIndex === 0) relevanceScore += 20;

          results.push({
            filePath,
            line: index,
            column: matchIndex,
            content: line,
            context,
            relevanceScore
          });
        }
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Basic fuzzy matching
   */
  private fuzzyMatch(text: string, query: string): boolean {
    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
        queryIndex++;
      }
      textIndex++;
    }

    return queryIndex === query.length;
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };

    return languageMap[ext] || 'text';
  }

  /**
   * Get index statistics
   */
  getStatistics() {
    const totalSymbols = Array.from(this.fileIndexes.values())
      .reduce((sum, file) => sum + file.symbols.length, 0);

    return {
      filesIndexed: this.fileIndexes.size,
      totalSymbols,
      symbolTypes: this.getSymbolTypeCounts(),
      languages: this.getLanguageCounts(),
      isIndexing: this.isIndexing
    };
  }

  /**
   * Get symbol type counts
   */
  private getSymbolTypeCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const fileIndex of this.fileIndexes.values()) {
      fileIndex.symbols.forEach(symbol => {
        counts[symbol.kind] = (counts[symbol.kind] || 0) + 1;
      });
    }

    return counts;
  }

  /**
   * Get language counts
   */
  private getLanguageCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const fileIndex of this.fileIndexes.values()) {
      counts[fileIndex.language] = (counts[fileIndex.language] || 0) + 1;
    }

    return counts;
  }

  /**
   * Clear all indexes
   */
  clearIndexes(): void {
    this.fileIndexes.clear();
    this.symbolIndex.clear();
    this.emit('indexesCleared');
  }

  /**
   * Remove file from index
   */
  removeFileFromIndex(filePath: string): void {
    this.fileIndexes.delete(filePath);
    
    // Remove symbols from symbol index
    for (const [key, symbols] of this.symbolIndex) {
      const filtered = symbols.filter(symbol => symbol.filePath !== filePath);
      if (filtered.length === 0) {
        this.symbolIndex.delete(key);
      } else {
        this.symbolIndex.set(key, filtered);
      }
    }

    this.emit('fileRemovedFromIndex', filePath);
  }
}
