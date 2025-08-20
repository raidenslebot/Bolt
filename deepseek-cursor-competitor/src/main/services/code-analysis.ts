import * as ts from 'typescript'
import { readFile } from 'fs/promises'
import { join, extname, dirname } from 'path'

export interface SymbolInfo {
  name: string
  kind: string
  location: {
    file: string
    line: number
    column: number
  }
  type?: string
  documentation?: string
}

export interface FileAnalysis {
  file: string
  symbols: SymbolInfo[]
  imports: string[]
  exports: string[]
  dependencies: string[]
  errors: string[]
  functions: SymbolInfo[]
  classes: SymbolInfo[]
  interfaces: SymbolInfo[]
  variables: SymbolInfo[]
}

export interface ProjectAnalysis {
  files: Map<string, FileAnalysis>
  globalSymbols: Map<string, SymbolInfo[]>
  dependencyGraph: Map<string, string[]>
  lastUpdated: Date
}

export class CodeAnalysisService {
  private projectAnalysis: ProjectAnalysis | null = null
  private workingDirectory: string = ''

  async initialize(workingDirectory: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.workingDirectory = workingDirectory
      this.projectAnalysis = {
        files: new Map(),
        globalSymbols: new Map(),
        dependencyGraph: new Map(),
        lastUpdated: new Date()
      }
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async analyzeFile(filePath: string): Promise<{ success: boolean; analysis?: FileAnalysis; error?: string }> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const ext = extname(filePath).toLowerCase()
      
      let analysis: FileAnalysis

      switch (ext) {
        case '.ts':
        case '.tsx':
        case '.js':
        case '.jsx':
          analysis = await this.analyzeTypeScriptFile(filePath, content)
          break
        case '.py':
          analysis = await this.analyzePythonFile(filePath, content)
          break
        case '.java':
          analysis = await this.analyzeJavaFile(filePath, content)
          break
        case '.cs':
          analysis = await this.analyzeCSharpFile(filePath, content)
          break
        default:
          analysis = await this.analyzeGenericFile(filePath, content)
      }

      if (this.projectAnalysis) {
        this.projectAnalysis.files.set(filePath, analysis)
        this.updateGlobalSymbols(analysis)
        this.updateDependencyGraph(filePath, analysis.dependencies)
      }

      return { success: true, analysis }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  private async analyzeTypeScriptFile(filePath: string, content: string): Promise<FileAnalysis> {
    const analysis: FileAnalysis = {
      file: filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      errors: [],
      functions: [],
      classes: [],
      interfaces: [],
      variables: []
    }

    try {
      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      )

      // Walk the AST to extract symbols
      const visit = (node: ts.Node) => {
        switch (node.kind) {
          case ts.SyntaxKind.ImportDeclaration:
            this.handleImportDeclaration(node as ts.ImportDeclaration, analysis)
            break
          case ts.SyntaxKind.ExportDeclaration:
          case ts.SyntaxKind.ExportAssignment:
            this.handleExportDeclaration(node as ts.ExportDeclaration, analysis)
            break
          case ts.SyntaxKind.FunctionDeclaration:
            this.handleFunctionDeclaration(node as ts.FunctionDeclaration, analysis, sourceFile)
            break
          case ts.SyntaxKind.ClassDeclaration:
            this.handleClassDeclaration(node as ts.ClassDeclaration, analysis, sourceFile)
            break
          case ts.SyntaxKind.InterfaceDeclaration:
            this.handleInterfaceDeclaration(node as ts.InterfaceDeclaration, analysis, sourceFile)
            break
          case ts.SyntaxKind.VariableStatement:
            this.handleVariableStatement(node as ts.VariableStatement, analysis, sourceFile)
            break
          case ts.SyntaxKind.MethodDeclaration:
            this.handleMethodDeclaration(node as ts.MethodDeclaration, analysis, sourceFile)
            break
        }

        ts.forEachChild(node, visit)
      }

      visit(sourceFile)

      // Extract dependencies from imports
      analysis.dependencies = analysis.imports.filter(imp => 
        !imp.startsWith('.') && !imp.startsWith('/')
      )

    } catch (error) {
      analysis.errors.push(`Analysis error: ${error instanceof Error ? error.message : String(error)}`)
    }

    return analysis
  }

  private handleImportDeclaration(node: ts.ImportDeclaration, analysis: FileAnalysis) {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      analysis.imports.push(node.moduleSpecifier.text)
    }
  }

  private handleExportDeclaration(node: ts.ExportDeclaration, analysis: FileAnalysis) {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      analysis.exports.push(node.moduleSpecifier.text)
    }
  }

  private handleFunctionDeclaration(node: ts.FunctionDeclaration, analysis: FileAnalysis, sourceFile: ts.SourceFile) {
    if (node.name) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      const symbol: SymbolInfo = {
        name: node.name.getText(),
        kind: 'function',
        location: {
          file: analysis.file,
          line: pos.line + 1,
          column: pos.character + 1
        },
        type: this.getFunctionSignature(node)
      }
      analysis.functions.push(symbol)
      analysis.symbols.push(symbol)
    }
  }

  private handleClassDeclaration(node: ts.ClassDeclaration, analysis: FileAnalysis, sourceFile: ts.SourceFile) {
    if (node.name) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      const symbol: SymbolInfo = {
        name: node.name.getText(),
        kind: 'class',
        location: {
          file: analysis.file,
          line: pos.line + 1,
          column: pos.character + 1
        }
      }
      analysis.classes.push(symbol)
      analysis.symbols.push(symbol)
    }
  }

  private handleInterfaceDeclaration(node: ts.InterfaceDeclaration, analysis: FileAnalysis, sourceFile: ts.SourceFile) {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const symbol: SymbolInfo = {
      name: node.name.getText(),
      kind: 'interface',
      location: {
        file: analysis.file,
        line: pos.line + 1,
        column: pos.character + 1
      }
    }
    analysis.interfaces.push(symbol)
    analysis.symbols.push(symbol)
  }

  private handleVariableStatement(node: ts.VariableStatement, analysis: FileAnalysis, sourceFile: ts.SourceFile) {
    node.declarationList.declarations.forEach(declaration => {
      if (ts.isIdentifier(declaration.name)) {
        const pos = sourceFile.getLineAndCharacterOfPosition(declaration.getStart())
        const symbol: SymbolInfo = {
          name: declaration.name.getText(),
          kind: 'variable',
          location: {
            file: analysis.file,
            line: pos.line + 1,
            column: pos.character + 1
          },
          type: declaration.type ? declaration.type.getText() : 'any'
        }
        analysis.variables.push(symbol)
        analysis.symbols.push(symbol)
      }
    })
  }

  private handleMethodDeclaration(node: ts.MethodDeclaration, analysis: FileAnalysis, sourceFile: ts.SourceFile) {
    if (ts.isIdentifier(node.name)) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      const symbol: SymbolInfo = {
        name: node.name.getText(),
        kind: 'method',
        location: {
          file: analysis.file,
          line: pos.line + 1,
          column: pos.character + 1
        },
        type: this.getMethodSignature(node)
      }
      analysis.functions.push(symbol)
      analysis.symbols.push(symbol)
    }
  }

  private getFunctionSignature(node: ts.FunctionDeclaration): string {
    const params = node.parameters.map(param => {
      const name = param.name.getText()
      const type = param.type ? param.type.getText() : 'any'
      return `${name}: ${type}`
    }).join(', ')
    
    const returnType = node.type ? node.type.getText() : 'any'
    return `(${params}) => ${returnType}`
  }

  private getMethodSignature(node: ts.MethodDeclaration): string {
    const params = node.parameters.map(param => {
      const name = param.name.getText()
      const type = param.type ? param.type.getText() : 'any'
      return `${name}: ${type}`
    }).join(', ')
    
    const returnType = node.type ? node.type.getText() : 'any'
    return `(${params}) => ${returnType}`
  }

  private async analyzePythonFile(filePath: string, content: string): Promise<FileAnalysis> {
    // Basic Python analysis using regex patterns
    const analysis: FileAnalysis = {
      file: filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      errors: [],
      functions: [],
      classes: [],
      interfaces: [],
      variables: []
    }

    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Import statements
      const importMatch = trimmed.match(/^(?:from\s+(\S+)\s+)?import\s+(.+)/)
      if (importMatch) {
        const module = importMatch[1] || importMatch[2].split(',')[0].trim()
        analysis.imports.push(module)
        if (!module.startsWith('.')) {
          analysis.dependencies.push(module)
        }
      }
      
      // Function definitions
      const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\)/)
      if (funcMatch) {
        analysis.functions.push({
          name: funcMatch[1],
          kind: 'function',
          location: { file: filePath, line: index + 1, column: 1 },
          type: `(${funcMatch[2]}) -> any`
        })
      }
      
      // Class definitions
      const classMatch = trimmed.match(/^class\s+(\w+)/)
      if (classMatch) {
        analysis.classes.push({
          name: classMatch[1],
          kind: 'class',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
    })

    analysis.symbols = [...analysis.functions, ...analysis.classes, ...analysis.variables]
    return analysis
  }

  private async analyzeJavaFile(filePath: string, content: string): Promise<FileAnalysis> {
    // Basic Java analysis using regex patterns
    const analysis: FileAnalysis = {
      file: filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      errors: [],
      functions: [],
      classes: [],
      interfaces: [],
      variables: []
    }

    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Import statements
      const importMatch = trimmed.match(/^import\s+([^;]+);/)
      if (importMatch) {
        analysis.imports.push(importMatch[1])
      }
      
      // Class definitions
      const classMatch = trimmed.match(/^(?:public\s+)?class\s+(\w+)/)
      if (classMatch) {
        analysis.classes.push({
          name: classMatch[1],
          kind: 'class',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
      
      // Interface definitions
      const interfaceMatch = trimmed.match(/^(?:public\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        analysis.interfaces.push({
          name: interfaceMatch[1],
          kind: 'interface',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
      
      // Method definitions
      const methodMatch = trimmed.match(/^(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{?/)
      if (methodMatch && !classMatch && !interfaceMatch) {
        analysis.functions.push({
          name: methodMatch[1],
          kind: 'method',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
    })

    analysis.symbols = [...analysis.functions, ...analysis.classes, ...analysis.interfaces]
    return analysis
  }

  private async analyzeCSharpFile(filePath: string, content: string): Promise<FileAnalysis> {
    // Basic C# analysis using regex patterns
    const analysis: FileAnalysis = {
      file: filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      errors: [],
      functions: [],
      classes: [],
      interfaces: [],
      variables: []
    }

    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Using statements
      const usingMatch = trimmed.match(/^using\s+([^;]+);/)
      if (usingMatch) {
        analysis.imports.push(usingMatch[1])
      }
      
      // Class definitions
      const classMatch = trimmed.match(/^(?:public\s+)?(?:partial\s+)?class\s+(\w+)/)
      if (classMatch) {
        analysis.classes.push({
          name: classMatch[1],
          kind: 'class',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
      
      // Interface definitions
      const interfaceMatch = trimmed.match(/^(?:public\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        analysis.interfaces.push({
          name: interfaceMatch[1],
          kind: 'interface',
          location: { file: filePath, line: index + 1, column: 1 }
        })
      }
    })

    analysis.symbols = [...analysis.functions, ...analysis.classes, ...analysis.interfaces]
    return analysis
  }

  private async analyzeGenericFile(filePath: string, content: string): Promise<FileAnalysis> {
    return {
      file: filePath,
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
      errors: [],
      functions: [],
      classes: [],
      interfaces: [],
      variables: []
    }
  }

  private updateGlobalSymbols(analysis: FileAnalysis) {
    if (!this.projectAnalysis) return

    analysis.symbols.forEach(symbol => {
      if (!this.projectAnalysis!.globalSymbols.has(symbol.name)) {
        this.projectAnalysis!.globalSymbols.set(symbol.name, [])
      }
      this.projectAnalysis!.globalSymbols.get(symbol.name)!.push(symbol)
    })
  }

  private updateDependencyGraph(filePath: string, dependencies: string[]) {
    if (!this.projectAnalysis) return
    this.projectAnalysis.dependencyGraph.set(filePath, dependencies)
  }

  async findSymbol(name: string): Promise<{ success: boolean; symbols?: SymbolInfo[]; error?: string }> {
    try {
      if (!this.projectAnalysis) {
        return { success: false, error: 'Project not analyzed' }
      }

      const symbols = this.projectAnalysis.globalSymbols.get(name) || []
      return { success: true, symbols }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async findReferences(symbolName: string, filePath: string): Promise<{ success: boolean; references?: SymbolInfo[]; error?: string }> {
    try {
      if (!this.projectAnalysis) {
        return { success: false, error: 'Project not analyzed' }
      }

      const references: SymbolInfo[] = []
      
      // Search through all analyzed files for references
      for (const [file, analysis] of this.projectAnalysis.files) {
        const content = await readFile(file, 'utf-8')
        const lines = content.split('\n')
        
        lines.forEach((line, index) => {
          if (line.includes(symbolName)) {
            references.push({
              name: symbolName,
              kind: 'reference',
              location: { file, line: index + 1, column: line.indexOf(symbolName) + 1 }
            })
          }
        })
      }

      return { success: true, references }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async getProjectOverview(): Promise<{ success: boolean; overview?: any; error?: string }> {
    try {
      if (!this.projectAnalysis) {
        return { success: false, error: 'Project not analyzed' }
      }

      const overview = {
        totalFiles: this.projectAnalysis.files.size,
        totalSymbols: Array.from(this.projectAnalysis.globalSymbols.values()).flat().length,
        languages: this.getLanguageBreakdown(),
        dependencies: this.getDependencyBreakdown(),
        lastUpdated: this.projectAnalysis.lastUpdated
      }

      return { success: true, overview }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  private getLanguageBreakdown(): Record<string, number> {
    if (!this.projectAnalysis) return {}

    const languages: Record<string, number> = {}
    
    for (const filePath of this.projectAnalysis.files.keys()) {
      const ext = extname(filePath).toLowerCase()
      languages[ext] = (languages[ext] || 0) + 1
    }

    return languages
  }

  private getDependencyBreakdown(): Record<string, number> {
    if (!this.projectAnalysis) return {}

    const dependencies: Record<string, number> = {}
    
    for (const deps of this.projectAnalysis.dependencyGraph.values()) {
      deps.forEach(dep => {
        dependencies[dep] = (dependencies[dep] || 0) + 1
      })
    }

    return dependencies
  }
}
