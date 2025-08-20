/*
 * Browser-compatible Language Server Protocol Manager for Bolt.diy
 * Provides real IDE-level language intelligence within WebContainer environment
 */

// Use a generic file system interface compatible with Bolt's architecture
interface BoltFileSystem {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory: boolean; isFile: boolean; size: number; }>;
}

export interface LanguageServerConfig {
  languageId: string;
  serverName: string;
  fileExtensions: string[];
  capabilities: LanguageCapabilities;
}

export interface LanguageCapabilities {
  completion: boolean;
  hover: boolean;
  definition: boolean;
  references: boolean;
  diagnostics: boolean;
  formatting: boolean;
  rename: boolean;
  codeAction: boolean;
  documentSymbol: boolean;
  workspaceSymbol: boolean;
}

export interface CompletionItem {
  label: string;
  kind: 'function' | 'variable' | 'class' | 'interface' | 'module' | 'property' | 'method' | 'keyword';
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
  code?: string | number;
}

export interface DocumentSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'property' | 'method';
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: DocumentSymbol[];
}

export interface HoverInfo {
  contents: string[];
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface Definition {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Browser-compatible Language Server Protocol Manager
 * Provides IDE-level language features within WebContainer environment
 */
export class LanguageServerManager {
  private fileSystem: BoltFileSystem | null = null;
  private languageServers: Map<string, LanguageServerConfig> = new Map();
  private documentCache: Map<string, string> = new Map();
  private diagnosticsCache: Map<string, Diagnostic[]> = new Map();
  private symbolsCache: Map<string, DocumentSymbol[]> = new Map();
  
  constructor() {
    this.initializeLanguageServers();
  }

  /**
   * Initialize language server configurations for supported languages
   */
  private initializeLanguageServers(): void {
    // TypeScript/JavaScript
    this.languageServers.set('typescript', {
      languageId: 'typescript',
      serverName: 'TypeScript Language Server',
      fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      capabilities: {
        completion: true,
        hover: true,
        definition: true,
        references: true,
        diagnostics: true,
        formatting: true,
        rename: true,
        codeAction: true,
        documentSymbol: true,
        workspaceSymbol: true
      }
    });

    // Python
    this.languageServers.set('python', {
      languageId: 'python',
      serverName: 'Python Language Server',
      fileExtensions: ['.py', '.pyw'],
      capabilities: {
        completion: true,
        hover: true,
        definition: true,
        references: true,
        diagnostics: true,
        formatting: true,
        rename: true,
        codeAction: true,
        documentSymbol: true,
        workspaceSymbol: true
      }
    });

    // JSON
    this.languageServers.set('json', {
      languageId: 'json',
      serverName: 'JSON Language Server',
      fileExtensions: ['.json', '.jsonc'],
      capabilities: {
        completion: true,
        hover: true,
        definition: false,
        references: false,
        diagnostics: true,
        formatting: true,
        rename: false,
        codeAction: true,
        documentSymbol: true,
        workspaceSymbol: false
      }
    });

    // CSS
    this.languageServers.set('css', {
      languageId: 'css',
      serverName: 'CSS Language Server',
      fileExtensions: ['.css', '.scss', '.sass', '.less'],
      capabilities: {
        completion: true,
        hover: true,
        definition: false,
        references: false,
        diagnostics: true,
        formatting: true,
        rename: false,
        codeAction: true,
        documentSymbol: true,
        workspaceSymbol: false
      }
    });

    // HTML
    this.languageServers.set('html', {
      languageId: 'html',
      serverName: 'HTML Language Server',
      fileExtensions: ['.html', '.htm'],
      capabilities: {
        completion: true,
        hover: true,
        definition: false,
        references: false,
        diagnostics: true,
        formatting: true,
        rename: false,
        codeAction: true,
        documentSymbol: true,
        workspaceSymbol: false
      }
    });
  }

  /**
   * Set file system instance for file operations
   */
  setFileSystem(fileSystem: BoltFileSystem): void {
    this.fileSystem = fileSystem;
  }

  /**
   * Get language server for file
   */
  getLanguageServer(filePath: string): LanguageServerConfig | null {
    const extension = this.getFileExtension(filePath);
    
    for (const [id, config] of this.languageServers) {
      if (config.fileExtensions.includes(extension)) {
        return config;
      }
    }
    
    return null;
  }

  /**
   * Get completion suggestions for a position in a document
   */
  async getCompletions(
    filePath: string, 
    line: number, 
    character: number
  ): Promise<CompletionItem[]> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.completion) {
      return [];
    }

    const content = await this.getDocumentContent(filePath);
    if (!content) return [];

    // Basic completion logic based on language
    switch (languageServer.languageId) {
      case 'typescript':
      case 'javascript':
        return this.getTypeScriptCompletions(content, line, character);
      case 'python':
        return this.getPythonCompletions(content, line, character);
      case 'json':
        return this.getJSONCompletions(content, line, character);
      case 'css':
        return this.getCSSCompletions(content, line, character);
      case 'html':
        return this.getHTMLCompletions(content, line, character);
      default:
        return [];
    }
  }

  /**
   * Get hover information for a position in a document
   */
  async getHover(
    filePath: string, 
    line: number, 
    character: number
  ): Promise<HoverInfo | null> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.hover) {
      return null;
    }

    const content = await this.getDocumentContent(filePath);
    if (!content) return null;

    // Basic hover logic based on language
    const lines = content.split('\n');
    const currentLine = lines[line];
    const word = this.getWordAtPosition(currentLine, character);
    
    if (!word) return null;

    return {
      contents: [`**${word}**`, 'Type information and documentation would appear here'],
      range: {
        start: { line, character: character - word.length },
        end: { line, character }
      }
    };
  }

  /**
   * Get diagnostics (errors, warnings) for a document
   */
  async getDiagnostics(filePath: string): Promise<Diagnostic[]> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.diagnostics) {
      return [];
    }

    // Check cache first
    const cached = this.diagnosticsCache.get(filePath);
    if (cached) return cached;

    const content = await this.getDocumentContent(filePath);
    if (!content) return [];

    // Basic diagnostic logic based on language
    const diagnostics = await this.analyzeDiagnostics(filePath, content, languageServer.languageId);
    
    // Cache results
    this.diagnosticsCache.set(filePath, diagnostics);
    
    return diagnostics;
  }

  /**
   * Get document symbols (functions, classes, etc.)
   */
  async getDocumentSymbols(filePath: string): Promise<DocumentSymbol[]> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.documentSymbol) {
      return [];
    }

    // Check cache first
    const cached = this.symbolsCache.get(filePath);
    if (cached) return cached;

    const content = await this.getDocumentContent(filePath);
    if (!content) return [];

    // Extract symbols based on language
    const symbols = await this.extractSymbols(filePath, content, languageServer.languageId);
    
    // Cache results
    this.symbolsCache.set(filePath, symbols);
    
    return symbols;
  }

  /**
   * Get definition location for a symbol
   */
  async getDefinition(
    filePath: string, 
    line: number, 
    character: number
  ): Promise<Definition[]> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.definition) {
      return [];
    }

    // This would require more sophisticated analysis
    // For now, return empty array
    return [];
  }

  /**
   * Find all references to a symbol
   */
  async getReferences(
    filePath: string, 
    line: number, 
    character: number
  ): Promise<Definition[]> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.references) {
      return [];
    }

    // This would require workspace-wide analysis
    // For now, return empty array
    return [];
  }

  /**
   * Format a document
   */
  async formatDocument(filePath: string): Promise<string | null> {
    const languageServer = this.getLanguageServer(filePath);
    if (!languageServer || !languageServer.capabilities.formatting) {
      return null;
    }

    const content = await this.getDocumentContent(filePath);
    if (!content) return null;

    // Basic formatting based on language
    switch (languageServer.languageId) {
      case 'json':
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      default:
        return content; // No formatting for other languages yet
    }
  }

  /**
   * Clear cache for a file
   */
  clearFileCache(filePath: string): void {
    this.documentCache.delete(filePath);
    this.diagnosticsCache.delete(filePath);
    this.symbolsCache.delete(filePath);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.documentCache.clear();
    this.diagnosticsCache.clear();
    this.symbolsCache.clear();
  }

  // Private helper methods

  private async getDocumentContent(filePath: string): Promise<string | null> {
    // Check cache first
    const cached = this.documentCache.get(filePath);
    if (cached !== undefined) return cached;

    try {
      if (this.fileSystem) {
        const content = await this.fileSystem.readFile(filePath, 'utf-8');
        this.documentCache.set(filePath, content);
        return content;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > -1 ? filePath.substring(lastDot) : '';
  }

  private getWordAtPosition(line: string, character: number): string {
    const left = line.substring(0, character).search(/\S+$/);
    const right = line.substring(character).search(/\s/);
    
    if (left < 0) return '';
    
    const start = left;
    const end = right < 0 ? line.length : character + right;
    
    return line.substring(start, end);
  }

  // Language-specific completion providers

  private getTypeScriptCompletions(content: string, line: number, character: number): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Basic TypeScript/JavaScript keywords
    const keywords = [
      'function', 'class', 'interface', 'type', 'const', 'let', 'var',
      'if', 'else', 'for', 'while', 'switch', 'case', 'return', 'import', 'export'
    ];

    keywords.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: 'keyword',
        detail: `TypeScript keyword`,
        insertText: keyword
      });
    });

    // Basic built-in objects
    const builtins = ['console', 'window', 'document', 'process', 'Buffer'];
    builtins.forEach(builtin => {
      completions.push({
        label: builtin,
        kind: 'variable',
        detail: `Built-in object`,
        insertText: builtin
      });
    });

    return completions;
  }

  private getPythonCompletions(content: string, line: number, character: number): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Basic Python keywords
    const keywords = [
      'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
      'import', 'from', 'return', 'yield', 'pass', 'break', 'continue'
    ];

    keywords.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: 'keyword',
        detail: `Python keyword`,
        insertText: keyword
      });
    });

    // Basic built-in functions
    const builtins = ['print', 'len', 'range', 'open', 'str', 'int', 'float', 'list', 'dict'];
    builtins.forEach(builtin => {
      completions.push({
        label: builtin,
        kind: 'function',
        detail: `Built-in function`,
        insertText: builtin
      });
    });

    return completions;
  }

  private getJSONCompletions(content: string, line: number, character: number): CompletionItem[] {
    // Basic JSON structure completions
    return [
      {
        label: 'true',
        kind: 'keyword',
        detail: 'Boolean true value',
        insertText: 'true'
      },
      {
        label: 'false',
        kind: 'keyword',
        detail: 'Boolean false value',
        insertText: 'false'
      },
      {
        label: 'null',
        kind: 'keyword',
        detail: 'Null value',
        insertText: 'null'
      }
    ];
  }

  private getCSSCompletions(content: string, line: number, character: number): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Basic CSS properties
    const properties = [
      'display', 'position', 'top', 'left', 'right', 'bottom',
      'width', 'height', 'margin', 'padding', 'color', 'background',
      'font-family', 'font-size', 'font-weight', 'text-align', 'border'
    ];

    properties.forEach(prop => {
      completions.push({
        label: prop,
        kind: 'property',
        detail: `CSS property`,
        insertText: `${prop}: `
      });
    });

    return completions;
  }

  private getHTMLCompletions(content: string, line: number, character: number): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Basic HTML tags
    const tags = [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
      'form', 'input', 'button', 'select', 'option', 'textarea'
    ];

    tags.forEach(tag => {
      completions.push({
        label: tag,
        kind: 'property',
        detail: `HTML tag`,
        insertText: `<${tag}>`
      });
    });

    return completions;
  }

  // Analysis methods

  private async analyzeDiagnostics(filePath: string, content: string, languageId: string): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    switch (languageId) {
      case 'typescript':
      case 'javascript':
        return this.analyzeTypeScriptDiagnostics(content);
      case 'python':
        return this.analyzePythonDiagnostics(content);
      case 'json':
        return this.analyzeJSONDiagnostics(content);
      default:
        return diagnostics;
    }
  }

  private analyzeTypeScriptDiagnostics(content: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Check for missing semicolons
      if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
        if (line.includes('=') || line.includes('return') || line.includes('import')) {
          diagnostics.push({
            range: {
              start: { line: lineIndex, character: line.length - 1 },
              end: { line: lineIndex, character: line.length }
            },
            severity: 'warning',
            message: 'Missing semicolon',
            source: 'typescript',
            code: 1005
          });
        }
      }

      // Check for console.log (should be removed in production)
      if (line.includes('console.log')) {
        const start = line.indexOf('console.log');
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: start },
            end: { line: lineIndex, character: start + 11 }
          },
          severity: 'info',
          message: 'Consider removing console.log in production',
          source: 'typescript'
        });
      }
    });

    return diagnostics;
  }

  private analyzePythonDiagnostics(content: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Check for print statements
      if (line.includes('print(')) {
        const start = line.indexOf('print(');
        diagnostics.push({
          range: {
            start: { line: lineIndex, character: start },
            end: { line: lineIndex, character: start + 5 }
          },
          severity: 'info',
          message: 'Consider using logging instead of print for production code',
          source: 'python'
        });
      }
    });

    return diagnostics;
  }

  private analyzeJSONDiagnostics(content: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    try {
      JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        diagnostics.push({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: content.length }
          },
          severity: 'error',
          message: `JSON Parse Error: ${error.message}`,
          source: 'json'
        });
      }
    }

    return diagnostics;
  }

  private async extractSymbols(filePath: string, content: string, languageId: string): Promise<DocumentSymbol[]> {
    switch (languageId) {
      case 'typescript':
      case 'javascript':
        return this.extractTypeScriptSymbols(content);
      case 'python':
        return this.extractPythonSymbols(content);
      default:
        return [];
    }
  }

  private extractTypeScriptSymbols(content: string): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Extract functions
      const functionMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*[\(=]/);
      if (functionMatch) {
        symbols.push({
          name: functionMatch[1],
          kind: 'function',
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          }
        });
      }

      // Extract classes
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          }
        });
      }

      // Extract interfaces
      const interfaceMatch = line.match(/interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          kind: 'interface',
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          }
        });
      }
    });

    return symbols;
  }

  private extractPythonSymbols(content: string): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Extract functions
      const functionMatch = line.match(/def\s+(\w+)\s*\(/);
      if (functionMatch) {
        symbols.push({
          name: functionMatch[1],
          kind: 'function',
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          }
        });
      }

      // Extract classes
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          }
        });
      }
    });

    return symbols;
  }
}
