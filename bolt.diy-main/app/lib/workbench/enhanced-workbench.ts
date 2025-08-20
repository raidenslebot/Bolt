import { atom, map } from 'nanostores';
import { webcontainer } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';

// Enhanced IDE capabilities for Bolt.diy WebContainer environment
export interface IDECapability {
  name: string;
  status: 'initializing' | 'ready' | 'error' | 'disabled';
  version: string;
  lastUpdated: number;
}

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property';
  location: {
    file: string;
    line: number;
    column: number;
  };
  scope: string;
  documentation?: string;
}

export interface ContextItem {
  id: string;
  type: 'file' | 'symbol' | 'error' | 'suggestion';
  content: string;
  relevance: number;
  metadata: Record<string, any>;
}

export interface SmartCompletion {
  text: string;
  detail: string;
  kind: 'function' | 'variable' | 'class' | 'interface' | 'keyword' | 'snippet';
  insertText: string;
  documentation?: string;
  sortText?: string;
}

/**
 * Enhanced Workbench with IDE capabilities
 * Extends Bolt's existing workbench with advanced features
 */
export class EnhancedWorkbench {
  private webcontainer: any = null;
  private capabilities = new Map<string, IDECapability>();
  private symbolIndex = new Map<string, CodeSymbol[]>();
  private contextCache = new Map<string, ContextItem[]>();
  private fileWatchers = new Set<string>();
  
  // Reactive stores
  public ideStatus = atom<'initializing' | 'ready' | 'error'>('initializing');
  public currentCapabilities = map<Record<string, IDECapability>>({});
  public activeSymbols = atom<CodeSymbol[]>([]);
  public smartSuggestions = atom<string[]>([]);

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.webcontainer = await webcontainer;
      this.initializeCapabilities();
      this.setupFileWatchers();
      this.ideStatus.set('ready');
    } catch (error) {
      console.error('Failed to initialize Enhanced Workbench:', error);
      this.ideStatus.set('error');
    }
  }

  private initializeCapabilities() {
    // Language Server Protocol capability
    this.capabilities.set('lsp', {
      name: 'Language Server Protocol',
      status: 'ready',
      version: '1.0.0',
      lastUpdated: Date.now()
    });

    // Code Intelligence capability
    this.capabilities.set('intelligence', {
      name: 'Code Intelligence',
      status: 'ready',
      version: '1.0.0',
      lastUpdated: Date.now()
    });

    // Smart Context capability
    this.capabilities.set('context', {
      name: 'Smart Context',
      status: 'ready',
      version: '1.0.0',
      lastUpdated: Date.now()
    });

    // File Operations capability
    this.capabilities.set('fileops', {
      name: 'Advanced File Operations',
      status: 'ready',
      version: '1.0.0',
      lastUpdated: Date.now()
    });

    // Update reactive store
    this.currentCapabilities.set(Object.fromEntries(this.capabilities));
  }

  private setupFileWatchers() {
    // Watch for file changes in workbench
    workbenchStore.files.subscribe((files) => {
      this.updateSymbolIndex(files);
    });

    // Watch for current file changes
    workbenchStore.selectedFile.subscribe((filePath) => {
      if (filePath) {
        this.updateCurrentFileContext(filePath);
      }
    });
  }

  /**
   * Smart Code Completion
   */
  async getCompletions(filePath: string, position: { line: number; column: number }): Promise<SmartCompletion[]> {
    if (!this.webcontainer || !this.isCapabilityReady('lsp')) {
      return [];
    }

    try {
      const content = await this.webcontainer.fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const currentLine = lines[position.line] || '';
      const textBeforeCursor = currentLine.substring(0, position.column);
      
      const completions: SmartCompletion[] = [];

      // JavaScript/TypeScript specific completions
      if (filePath.match(/\.(js|jsx|ts|tsx)$/)) {
        completions.push(...this.getJavaScriptCompletions(textBeforeCursor, content));
      }

      // CSS completions
      if (filePath.match(/\.(css|scss|sass)$/)) {
        completions.push(...this.getCSSCompletions(textBeforeCursor));
      }

      // HTML completions
      if (filePath.match(/\.(html|htm)$/)) {
        completions.push(...this.getHTMLCompletions(textBeforeCursor));
      }

      // Context-aware completions from symbol index
      completions.push(...this.getContextualCompletions(textBeforeCursor, filePath));

      return completions.sort((a, b) => (a.sortText || a.text).localeCompare(b.sortText || b.text));

    } catch (error) {
      console.error('Error getting completions:', error);
      return [];
    }
  }

  private getJavaScriptCompletions(textBeforeCursor: string, fileContent: string): SmartCompletion[] {
    const completions: SmartCompletion[] = [];

    // Common JavaScript patterns
    if (textBeforeCursor.match(/\bcon(st)?$/)) {
      completions.push({
        text: 'const',
        detail: 'const declaration',
        kind: 'keyword',
        insertText: 'const ${1:name} = ${2:value};',
        sortText: '0000'
      });
    }

    if (textBeforeCursor.match(/\bfun(ction)?$/)) {
      completions.push({
        text: 'function',
        detail: 'function declaration',
        kind: 'function',
        insertText: 'function ${1:name}(${2:params}) {\n  ${3:// body}\n}',
        sortText: '0001'
      });
    }

    // React patterns
    if (fileContent.includes('import React') || fileContent.includes('from \'react\'')) {
      if (textBeforeCursor.match(/\buse/)) {
        completions.push({
          text: 'useState',
          detail: 'React useState hook',
          kind: 'function',
          insertText: 'useState(${1:initialValue})',
          documentation: 'Returns a stateful value and a function to update it',
          sortText: '0002'
        });
        
        completions.push({
          text: 'useEffect',
          detail: 'React useEffect hook',
          kind: 'function',
          insertText: 'useEffect(() => {\n  ${1:// effect}\n}, [${2:dependencies}])',
          documentation: 'Accepts a function that contains imperative, possibly effectful code',
          sortText: '0003'
        });
      }

      if (textBeforeCursor.match(/\bcomp/)) {
        completions.push({
          text: 'component',
          detail: 'React functional component',
          kind: 'snippet',
          insertText: 'export const ${1:ComponentName} = (${2:props}) => {\n  return (\n    <div>\n      ${3:// JSX content}\n    </div>\n  );\n};',
          sortText: '0004'
        });
      }
    }

    return completions;
  }

  private getCSSCompletions(textBeforeCursor: string): SmartCompletion[] {
    const completions: SmartCompletion[] = [];

    // CSS properties
    const cssProperties = [
      { name: 'display', values: ['block', 'inline', 'flex', 'grid', 'none'] },
      { name: 'position', values: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
      { name: 'flex-direction', values: ['row', 'column', 'row-reverse', 'column-reverse'] },
      { name: 'justify-content', values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'] },
      { name: 'align-items', values: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'] }
    ];

    for (const prop of cssProperties) {
      if (prop.name.startsWith(textBeforeCursor.trim())) {
        completions.push({
          text: prop.name,
          detail: `CSS property`,
          kind: 'property',
          insertText: `${prop.name}: ${prop.values[0]};`,
          documentation: `CSS ${prop.name} property`
        });
      }
    }

    return completions;
  }

  private getHTMLCompletions(textBeforeCursor: string): SmartCompletion[] {
    const completions: SmartCompletion[] = [];

    if (textBeforeCursor.match(/<[a-zA-Z]*$/)) {
      const htmlElements = [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'button', 'input', 'form', 'section', 'article', 'header', 'footer'
      ];

      for (const element of htmlElements) {
        completions.push({
          text: element,
          detail: `HTML ${element} element`,
          kind: 'snippet',
          insertText: `${element}>\${1:content}</${element}>`,
          documentation: `HTML ${element} element`
        });
      }
    }

    return completions;
  }

  private getContextualCompletions(textBeforeCursor: string, currentFilePath: string): SmartCompletion[] {
    const completions: SmartCompletion[] = [];
    const symbols = this.symbolIndex.get(currentFilePath) || [];

    // Find symbols that match the current typing
    const partialMatch = textBeforeCursor.split(/\W/).pop() || '';
    if (partialMatch.length > 0) {
      for (const symbol of symbols) {
        if (symbol.name.toLowerCase().startsWith(partialMatch.toLowerCase())) {
          completions.push({
            text: symbol.name,
            detail: `${symbol.kind} from ${symbol.scope}`,
            kind: symbol.kind,
            insertText: symbol.name,
            documentation: symbol.documentation,
            sortText: `1_${symbol.name}`
          });
        }
      }
    }

    return completions;
  }

  /**
   * Get intelligent context for current workspace
   */
  async getSmartContext(query: string, currentFile?: string): Promise<ContextItem[]> {
    if (!this.isCapabilityReady('context')) {
      return [];
    }

    const cacheKey = `${query}_${currentFile || 'global'}`;
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    const contextItems: ContextItem[] = [];

    try {
      // Get file-based context
      if (currentFile) {
        const fileContext = await this.getFileContext(currentFile, query);
        contextItems.push(...fileContext);
      }

      // Get symbol-based context
      const symbolContext = this.getSymbolContext(query);
      contextItems.push(...symbolContext);

      // Get workspace-wide context
      const workspaceContext = await this.getWorkspaceContext(query);
      contextItems.push(...workspaceContext);

      // Sort by relevance
      contextItems.sort((a, b) => b.relevance - a.relevance);

      // Cache results
      this.contextCache.set(cacheKey, contextItems);
      
      return contextItems.slice(0, 20); // Limit to top 20 items

    } catch (error) {
      console.error('Error getting smart context:', error);
      return [];
    }
  }

  private async getFileContext(filePath: string, query: string): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];

    try {
      const content = await this.webcontainer.fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Find relevant lines
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          contextItems.push({
            id: `file_${filePath}_${index}`,
            type: 'file',
            content: line.trim(),
            relevance: 80,
            metadata: {
              filePath,
              lineNumber: index + 1,
              context: lines.slice(Math.max(0, index - 2), index + 3).join('\n')
            }
          });
        }
      });

    } catch (error) {
      // File might not exist or be readable
    }

    return contextItems;
  }

  private getSymbolContext(query: string): ContextItem[] {
    const contextItems: ContextItem[] = [];

    for (const [filePath, symbols] of this.symbolIndex) {
      for (const symbol of symbols) {
        if (symbol.name.toLowerCase().includes(query.toLowerCase()) ||
            symbol.documentation?.toLowerCase().includes(query.toLowerCase())) {
          contextItems.push({
            id: `symbol_${filePath}_${symbol.name}`,
            type: 'symbol',
            content: symbol.name,
            relevance: 70,
            metadata: {
              kind: symbol.kind,
              location: symbol.location,
              documentation: symbol.documentation,
              scope: symbol.scope
            }
          });
        }
      }
    }

    return contextItems;
  }

  private async getWorkspaceContext(query: string): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];
    const files = workbenchStore.files.get();

    // Search through files for query matches
    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        try {
          const content = dirent.content || '';
          if (content.toLowerCase().includes(query.toLowerCase())) {
            contextItems.push({
              id: `workspace_${filePath}`,
              type: 'file',
              content: filePath,
              relevance: 60,
              metadata: {
                filePath,
                hasMatch: true,
                fileType: filePath.split('.').pop() || 'unknown'
              }
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return contextItems;
  }

  /**
   * Update symbol index for files
   */
  private updateSymbolIndex(files: any) {
    this.symbolIndex.clear();

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent && typeof dirent === 'object' && 'type' in dirent) {
        if (dirent.type === 'file' && !dirent.isBinary) {
          const content = dirent.content || '';
          const symbols = this.extractSymbols(filePath, content);
          if (symbols.length > 0) {
            this.symbolIndex.set(filePath, symbols);
          }
        }
      }
    }

    // Update active symbols for current file
    const currentFile = workbenchStore.selectedFile.get();
    if (currentFile) {
      const symbols = this.symbolIndex.get(currentFile) || [];
      this.activeSymbols.set(symbols);
    }
  }

  private extractSymbols(filePath: string, content: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // JavaScript/TypeScript symbols
      if (filePath.match(/\.(js|jsx|ts|tsx)$/)) {
        // Functions
        const functionMatch = trimmedLine.match(/(?:function\s+|const\s+|let\s+)(\w+)\s*[=\(]/);
        if (functionMatch) {
          symbols.push({
            name: functionMatch[1],
            kind: 'function',
            location: { file: filePath, line: index + 1, column: line.indexOf(functionMatch[1]) },
            scope: 'global',
            documentation: this.extractDocumentation(lines, index)
          });
        }

        // Classes
        const classMatch = trimmedLine.match(/class\s+(\w+)/);
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            kind: 'class',
            location: { file: filePath, line: index + 1, column: line.indexOf(classMatch[1]) },
            scope: 'global',
            documentation: this.extractDocumentation(lines, index)
          });
        }

        // Interfaces
        const interfaceMatch = trimmedLine.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
          symbols.push({
            name: interfaceMatch[1],
            kind: 'interface',
            location: { file: filePath, line: index + 1, column: line.indexOf(interfaceMatch[1]) },
            scope: 'global',
            documentation: this.extractDocumentation(lines, index)
          });
        }

        // Variables
        const variableMatch = trimmedLine.match(/(?:const|let|var)\s+(\w+)\s*=/);
        if (variableMatch) {
          symbols.push({
            name: variableMatch[1],
            kind: 'variable',
            location: { file: filePath, line: index + 1, column: line.indexOf(variableMatch[1]) },
            scope: 'global'
          });
        }
      }
    });

    return symbols;
  }

  private extractDocumentation(lines: string[], symbolLineIndex: number): string | undefined {
    // Look for JSDoc comments above the symbol
    let docLines: string[] = [];
    let currentIndex = symbolLineIndex - 1;

    while (currentIndex >= 0) {
      const line = lines[currentIndex].trim();
      if (line === '*/') {
        // End of JSDoc comment, continue collecting
        currentIndex--;
        continue;
      } else if (line.startsWith('*')) {
        // JSDoc line
        docLines.unshift(line.replace(/^\*\s?/, ''));
        currentIndex--;
      } else if (line === '/**') {
        // Start of JSDoc comment
        break;
      } else if (line === '') {
        // Empty line, continue
        currentIndex--;
      } else {
        // Non-doc line, stop
        break;
      }
    }

    return docLines.length > 0 ? docLines.join(' ') : undefined;
  }

  private updateCurrentFileContext(filePath: string) {
    // Update active symbols
    const symbols = this.symbolIndex.get(filePath) || [];
    this.activeSymbols.set(symbols);

    // Generate smart suggestions
    const suggestions = this.generateSmartSuggestions(filePath, symbols);
    this.smartSuggestions.set(suggestions);
  }

  private generateSmartSuggestions(filePath: string, symbols: CodeSymbol[]): string[] {
    const suggestions: string[] = [];
    const fileExt = filePath.split('.').pop()?.toLowerCase();

    // File-type specific suggestions
    if (fileExt === 'tsx' || fileExt === 'jsx') {
      if (!symbols.some(s => s.name === 'React')) {
        suggestions.push('Consider importing React for JSX support');
      }
      
      const hasProps = symbols.some(s => s.name.includes('Props'));
      if (!hasProps && symbols.some(s => s.kind === 'function')) {
        suggestions.push('Consider defining TypeScript interfaces for component props');
      }
    }

    if (fileExt === 'ts' || fileExt === 'js') {
      const functionCount = symbols.filter(s => s.kind === 'function').length;
      if (functionCount > 5) {
        suggestions.push('Consider breaking this file into smaller modules');
      }
    }

    // Code quality suggestions
    const undocumentedFunctions = symbols.filter(s => s.kind === 'function' && !s.documentation).length;
    if (undocumentedFunctions > 0) {
      suggestions.push(`${undocumentedFunctions} functions could benefit from documentation`);
    }

    return suggestions;
  }

  /**
   * Smart file operations
   */
  async createFromTemplate(templateName: string, targetPath: string, variables: Record<string, string> = {}): Promise<boolean> {
    if (!this.isCapabilityReady('fileops')) {
      return false;
    }

    const templates = this.getBuiltInTemplates();
    const template = templates[templateName];
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    let content = template.content;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });

    try {
      // Ensure directory exists
      const directory = targetPath.split('/').slice(0, -1).join('/');
      if (directory) {
        await this.ensureDirectory(directory);
      }

      await this.webcontainer.fs.writeFile(targetPath, content, 'utf-8');
      
      // Update workbench files
      workbenchStore.files.setKey(targetPath, {
        type: 'file',
        content,
        isBinary: false
      });

      return true;
    } catch (error) {
      console.error('Error creating file from template:', error);
      return false;
    }
  }

  private getBuiltInTemplates(): Record<string, { content: string; description: string }> {
    return {
      'react-component': {
        content: `import React from 'react';

interface {{ComponentName}}Props {
  // Add your props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = () => {
  return (
    <div className="{{componentName}}">
      <h1>{{ComponentName}}</h1>
      {/* Add your component content here */}
    </div>
  );
};

export default {{ComponentName}};
`,
        description: 'React functional component with TypeScript'
      },
      
      'node-module': {
        content: `/**
 * {{ModuleName}} module
 * {{description}}
 */

export class {{ModuleName}} {
  constructor() {
    // Initialize {{ModuleName}}
  }

  // Add your methods here
}

export default {{ModuleName}};
`,
        description: 'Node.js module with TypeScript'
      },

      'express-route': {
        content: `import { Router, Request, Response } from 'express';

const router = Router();

// GET {{route}}
router.get('/', async (req: Request, res: Response) => {
  try {
    // Implementation here
    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error in {{route}} route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`,
        description: 'Express.js route with TypeScript'
      }
    };
  }

  private async ensureDirectory(path: string): Promise<void> {
    if (!path || path === '/') return;

    try {
      await this.webcontainer.fs.stat(path);
    } catch (error) {
      // Directory doesn't exist, create it
      const parentPath = path.split('/').slice(0, -1).join('/');
      if (parentPath !== path) {
        await this.ensureDirectory(parentPath);
      }
      await this.webcontainer.fs.mkdir(path);
    }
  }

  /**
   * Utility methods
   */
  private isCapabilityReady(capability: string): boolean {
    return this.capabilities.get(capability)?.status === 'ready';
  }

  getCapabilities(): Record<string, IDECapability> {
    return Object.fromEntries(this.capabilities);
  }

  getActiveSymbols(): CodeSymbol[] {
    return this.activeSymbols.get();
  }

  getSmartSuggestions(): string[] {
    return this.smartSuggestions.get();
  }

  getStatus() {
    return {
      ideStatus: this.ideStatus.get(),
      capabilitiesCount: this.capabilities.size,
      symbolsCount: Array.from(this.symbolIndex.values()).flat().length,
      contextCacheSize: this.contextCache.size,
      webcontainerReady: !!this.webcontainer
    };
  }
}

// Export singleton instance
export const enhancedWorkbench = new EnhancedWorkbench();
