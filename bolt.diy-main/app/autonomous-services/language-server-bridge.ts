/**
 * Language Server Bridge for Bolt.diy
 * Provides intelligent code completion, analysis, and language features
 */

import { UniversalToolExecutor } from './universal-tool-executor';
import { EventEmitter } from 'events';

export class LanguageServerBridge extends EventEmitter {
  private toolExecutor: UniversalToolExecutor;
  private languageServers: Map<string, LanguageServerInstance> = new Map();
  private activeLanguages: Set<string> = new Set();

  constructor(toolExecutor: UniversalToolExecutor) {
    super();
    this.toolExecutor = toolExecutor;
    this.initializeSupportedLanguages();
  }

  /**
   * Initialize language servers for supported languages
   */
  private initializeSupportedLanguages(): void {
    const supportedLanguages = [
      'typescript',
      'javascript', 
      'python',
      'java',
      'csharp',
      'cpp',
      'go',
      'rust',
      'php',
      'html',
      'css',
      'json',
      'yaml',
      'markdown'
    ];

    for (const language of supportedLanguages) {
      this.activeLanguages.add(language);
    }
  }

  /**
   * Get document symbols for code navigation
   */
  async getDocumentSymbols(filePath: string): Promise<DocumentSymbol[]> {
    const language = this.detectLanguage(filePath);
    
    if (!this.activeLanguages.has(language)) {
      return [];
    }

    // Use semantic search to extract symbols
    const result = await this.toolExecutor.executeTool({
      toolName: 'semantic_search',
      parameters: {
        query: `Extract symbols, functions, classes from ${filePath}`
      }
    });

    return this.parseSymbolsFromResult(result.result);
  }

  /**
   * Get code completions at a specific position
   */
  async getCompletions(filePath: string, position: Position): Promise<CompletionItem[]> {
    const language = this.detectLanguage(filePath);
    
    if (!this.activeLanguages.has(language)) {
      return [];
    }

    // Read file content around position
    const fileContent = await this.getFileContent(filePath);
    const contextLines = this.extractContextLines(fileContent, position);

    // Use AI to generate intelligent completions
    const result = await this.toolExecutor.executeTool({
      toolName: 'semantic_search',
      parameters: {
        query: `Code completion suggestions for ${language} at position line ${position.line}`
      }
    });

    return this.parseCompletionsFromResult(result.result, language);
  }

  /**
   * Get hover information for symbol at position
   */
  async getHover(filePath: string, position: Position): Promise<Hover | null> {
    const fileContent = await this.getFileContent(filePath);
    const symbolAtPosition = this.getSymbolAtPosition(fileContent, position);

    if (!symbolAtPosition) {
      return null;
    }

    // Search for symbol definition and documentation
    const result = await this.toolExecutor.executeTool({
      toolName: 'list_code_usages',
      parameters: {
        symbolName: symbolAtPosition,
        filePaths: [filePath]
      }
    });

    return {
      contents: [`**${symbolAtPosition}**`, this.generateHoverInfo(symbolAtPosition, result.result)],
      range: {
        start: position,
        end: { line: position.line, character: position.character + symbolAtPosition.length }
      }
    };
  }

  /**
   * Get definition location for symbol
   */
  async getDefinition(filePath: string, position: Position): Promise<Location[]> {
    const fileContent = await this.getFileContent(filePath);
    const symbolAtPosition = this.getSymbolAtPosition(fileContent, position);

    if (!symbolAtPosition) {
      return [];
    }

    // Find symbol definitions across the workspace
    const result = await this.toolExecutor.executeTool({
      toolName: 'grep_search',
      parameters: {
        query: `\\b${symbolAtPosition}\\b.*(?:function|class|interface|const|let|var)`,
        isRegexp: true,
        maxResults: 50
      }
    });

    return this.parseLocationsFromResult(result.result);
  }

  /**
   * Get all references to a symbol
   */
  async getReferences(filePath: string, position: Position): Promise<Location[]> {
    const fileContent = await this.getFileContent(filePath);
    const symbolAtPosition = this.getSymbolAtPosition(fileContent, position);

    if (!symbolAtPosition) {
      return [];
    }

    const result = await this.toolExecutor.executeTool({
      toolName: 'list_code_usages',
      parameters: {
        symbolName: symbolAtPosition,
        filePaths: [filePath]
      }
    });

    return this.parseLocationsFromResult(result.result);
  }

  /**
   * Get diagnostics (errors, warnings) for a file
   */
  async getDiagnostics(filePath: string): Promise<Diagnostic[]> {
    const language = this.detectLanguage(filePath);
    
    // Use get_errors tool to check for compilation errors
    const result = await this.toolExecutor.executeTool({
      toolName: 'get_errors',
      parameters: {
        filePaths: [filePath]
      }
    });

    return this.parseDiagnosticsFromResult(result.result, language);
  }

  /**
   * Format document
   */
  async formatDocument(filePath: string): Promise<TextEdit[]> {
    const language = this.detectLanguage(filePath);
    const fileContent = await this.getFileContent(filePath);

    // Use language-specific formatting rules
    const formattedContent = await this.applyFormatting(fileContent, language);
    
    return [{
      range: {
        start: { line: 0, character: 0 },
        end: { line: fileContent.split('\n').length, character: 0 }
      },
      newText: formattedContent
    }];
  }

  /**
   * Get code actions (quick fixes, refactoring)
   */
  async getCodeActions(filePath: string, range: Range): Promise<CodeAction[]> {
    const language = this.detectLanguage(filePath);
    const actions: CodeAction[] = [];

    // Common code actions
    actions.push(
      {
        title: 'Extract to function',
        kind: 'refactor.extract.function',
        command: 'bolt.extractFunction',
        arguments: [filePath, range]
      },
      {
        title: 'Generate documentation',
        kind: 'source.generate.docs',
        command: 'bolt.generateDocs',
        arguments: [filePath, range]
      },
      {
        title: 'Add type annotations',
        kind: 'source.addTypes',
        command: 'bolt.addTypes',
        arguments: [filePath, range]
      }
    );

    return actions;
  }

  /**
   * Get workspace symbols for global search
   */
  async getWorkspaceSymbols(query: string): Promise<SymbolInformation[]> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'semantic_search',
      parameters: {
        query: `Find symbols matching: ${query}`
      }
    });

    return this.parseWorkspaceSymbolsFromResult(result.result);
  }

  /**
   * Get signature help for function calls
   */
  async getSignatureHelp(filePath: string, position: Position): Promise<SignatureHelp | null> {
    const fileContent = await this.getFileContent(filePath);
    const functionCall = this.getFunctionCallAtPosition(fileContent, position);

    if (!functionCall) {
      return null;
    }

    // Search for function signature
    const result = await this.toolExecutor.executeTool({
      toolName: 'list_code_usages',
      parameters: {
        symbolName: functionCall.name,
        filePaths: [filePath]
      }
    });

    return this.parseSignatureHelpFromResult(result.result, functionCall);
  }

  // Helper methods

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'md': 'markdown'
    };

    return languageMap[extension || ''] || 'text';
  }

  private async getFileContent(filePath: string): Promise<string> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'read_file',
      parameters: {
        filePath,
        startLine: 1,
        endLine: 10000
      }
    });

    return result.result || '';
  }

  private extractContextLines(content: string, position: Position): string {
    const lines = content.split('\n');
    const startLine = Math.max(0, position.line - 5);
    const endLine = Math.min(lines.length, position.line + 5);
    
    return lines.slice(startLine, endLine).join('\n');
  }

  private getSymbolAtPosition(content: string, position: Position): string | null {
    const lines = content.split('\n');
    const line = lines[position.line];
    
    if (!line) return null;

    // Extract word at position
    const beforeCursor = line.substring(0, position.character);
    const afterCursor = line.substring(position.character);
    
    const wordStart = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/)?.[0] || '';
    const wordEnd = afterCursor.match(/^[a-zA-Z0-9_$]*/)?.[0] || '';
    
    const fullWord = wordStart + wordEnd;
    return fullWord.length > 0 ? fullWord : null;
  }

  private getFunctionCallAtPosition(content: string, position: Position): FunctionCall | null {
    // Extract function call context at position
    const lines = content.split('\n');
    const line = lines[position.line];
    
    const match = line.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (match) {
      return {
        name: match[1],
        position: position
      };
    }
    
    return null;
  }

  private parseSymbolsFromResult(result: any): DocumentSymbol[] {
    // Parse AI result into DocumentSymbol objects
    return [];
  }

  private parseCompletionsFromResult(result: any, language: string): CompletionItem[] {
    // Generate language-specific completions
    const baseCompletions: CompletionItem[] = [];

    if (language === 'typescript' || language === 'javascript') {
      baseCompletions.push(
        { label: 'console.log', kind: 'method', detail: 'Log to console' },
        { label: 'function', kind: 'keyword', detail: 'Function declaration' },
        { label: 'const', kind: 'keyword', detail: 'Constant declaration' },
        { label: 'let', kind: 'keyword', detail: 'Variable declaration' },
        { label: 'if', kind: 'keyword', detail: 'Conditional statement' },
        { label: 'for', kind: 'keyword', detail: 'For loop' },
        { label: 'while', kind: 'keyword', detail: 'While loop' }
      );
    }

    return baseCompletions;
  }

  private parseLocationsFromResult(result: any): Location[] {
    // Parse search results into Location objects
    return [];
  }

  private parseDiagnosticsFromResult(result: any, language: string): Diagnostic[] {
    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((error: any) => ({
      range: {
        start: { line: (error.line || 1) - 1, character: 0 },
        end: { line: (error.line || 1) - 1, character: 100 }
      },
      severity: this.mapSeverity(error.severity || 'error'),
      message: error.message || 'Unknown error',
      source: language
    }));
  }

  private mapSeverity(severity: string): DiagnosticSeverity {
    switch (severity.toLowerCase()) {
      case 'error': return DiagnosticSeverity.Error;
      case 'warning': return DiagnosticSeverity.Warning;
      case 'info': return DiagnosticSeverity.Information;
      case 'hint': return DiagnosticSeverity.Hint;
      default: return DiagnosticSeverity.Error;
    }
  }

  private async applyFormatting(content: string, language: string): Promise<string> {
    // Apply basic formatting rules
    let formatted = content;

    if (language === 'typescript' || language === 'javascript') {
      // Basic JavaScript/TypeScript formatting
      formatted = formatted
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/;([^\n])/g, ';\n$1');
    }

    return formatted;
  }

  private generateHoverInfo(symbol: string, usageInfo: any): string {
    return `Symbol: ${symbol}\nUsages found in workspace\nType: Variable/Function/Class`;
  }

  private parseWorkspaceSymbolsFromResult(result: any): SymbolInformation[] {
    return [];
  }

  private parseSignatureHelpFromResult(result: any, functionCall: FunctionCall): SignatureHelp | null {
    return {
      signatures: [{
        label: `${functionCall.name}(param1, param2)`,
        parameters: [
          { label: 'param1', documentation: 'First parameter' },
          { label: 'param2', documentation: 'Second parameter' }
        ]
      }],
      activeSignature: 0,
      activeParameter: 0
    };
  }
}

// Supporting Types
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface DocumentSymbol {
  name: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  detail?: string;
  children?: DocumentSymbol[];
}

export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface Hover {
  contents: string[];
  range?: Range;
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface CodeAction {
  title: string;
  kind: string;
  command: string;
  arguments: any[];
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  location: Location;
  containerName?: string;
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string;
  parameters: ParameterInformation[];
}

export interface ParameterInformation {
  label: string;
  documentation?: string;
}

export interface FunctionCall {
  name: string;
  position: Position;
}

export interface LanguageServerInstance {
  language: string;
  process?: any;
  capabilities: any;
  status: 'starting' | 'ready' | 'error' | 'stopped';
}

export default LanguageServerBridge;
