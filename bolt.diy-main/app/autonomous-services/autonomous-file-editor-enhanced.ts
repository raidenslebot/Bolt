/**
 * 🤖🗂️ AUTONOMOUS FILE EDITOR WITH WEBCONTAINER INTEGRATION
 * Advanced AI-powered file analysis, editing, and refactoring with full WebContainer support
 */

import type { WebContainer } from '@webcontainer/api'
import { Buffer } from 'node:buffer'
import { AIModelManager } from './ai-model-manager'
import { webcontainer } from '~/lib/webcontainer'
import type { FileMap } from '~/lib/stores/files'

// Enhanced file analysis with WebContainer integration
export interface FileAnalysis {
  filePath: string
  webContainerPath: string
  language: string
  size: number
  issues: Issue[]
  complexity: number
  maintainabilityIndex: number
  suggestions: string[]
  metrics: {
    linesOfCode: number
    cyclomaticComplexity: number
    cognitiveComplexity: number
    technicalDebt: number
    dependencies: string[]
    exports: string[]
    imports: string[]
  }
  lastModified: Date
}

export interface Issue {
  type: 'error' | 'warning' | 'suggestion' | 'performance' | 'security'
  severity: 'low' | 'medium' | 'high' | 'critical'
  line: number
  column?: number
  message: string
  rule?: string
  fix?: {
    description: string
    replacement: string
  }
}

export interface RefactorPlan {
  id: string
  filePaths: string[]
  targetImprovements: string[]
  operations: RefactorOperation[]
  estimatedImpact: {
    complexity: number
    maintainability: number
    performance: number
    riskLevel: 'low' | 'medium' | 'high'
  }
  createdAt: Date
  webContainerOperations: WebContainerFileOperation[]
}

export interface RefactorOperation {
  id: string
  type: 'extract-function' | 'rename-variable' | 'simplify-condition' | 'optimize-imports' | 'custom'
  filePath: string
  webContainerPath: string
  description: string
  changes: CodeChange[]
  reasoning: string
  confidence: number
  backup?: {
    path: string
    content: string
    timestamp: Date
  }
}

export interface CodeChange {
  startLine: number
  endLine: number
  oldCode: string
  newCode: string
  description: string
}

export interface WebContainerFileOperation {
  type: 'read' | 'write' | 'create' | 'delete' | 'backup' | 'restore'
  path: string
  content?: string
  encoding?: 'utf8' | 'binary'
  backup?: {
    path: string
    timestamp: Date
  }
}

export class AutonomousFileEditor {
  private aiModel: AIModelManager
  private analysisCache: Map<string, FileAnalysis> = new Map()
  private operationHistory: RefactorOperation[] = []
  private backupHistory: Map<string, string[]> = new Map()
  private isProcessing: boolean = false

  constructor(aiModelConfig?: any) {
    this.aiModel = new AIModelManager(aiModelConfig)
  }

  /**
   * 🔍 ANALYZE FILE WITH FULL WEBCONTAINER INTEGRATION
   */
  async analyzeFile(filePath: string, content?: string): Promise<FileAnalysis> {
    try {
      // Get WebContainer instance
      const wc = await webcontainer

      // Normalize path for WebContainer
      const webContainerPath = this.normalizeWebContainerPath(filePath)
      
      // Get content from WebContainer if not provided
      let fileContent = content
      if (!fileContent) {
        try {
          const fileData = await wc.fs.readFile(webContainerPath, 'utf8')
          fileContent = fileData.toString()
        } catch (error) {
          throw new Error(`Could not read file from WebContainer: ${webContainerPath}`)
        }
      }

      // Check cache
      const cacheKey = `${webContainerPath}:${this.getContentHash(fileContent)}`
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey)!
      }

      // Get file stats
      const stats = await wc.fs.stat(webContainerPath)
      
      // Perform AI-powered analysis
      const aiAnalysis = await this.aiModel.analyzeCode(fileContent, filePath)

      // Detect programming language
      const language = this.detectLanguage(filePath)

      // Calculate comprehensive metrics
      const analysis: FileAnalysis = {
        filePath,
        webContainerPath,
        language,
        size: stats.size,
        issues: aiAnalysis.issues || [],
        complexity: aiAnalysis.complexity || this.calculateComplexity(fileContent),
        maintainabilityIndex: this.calculateMaintainabilityIndex(fileContent),
        suggestions: aiAnalysis.suggestions || [],
        metrics: {
          linesOfCode: this.countLinesOfCode(fileContent),
          cyclomaticComplexity: this.calculateCyclomaticComplexity(fileContent),
          cognitiveComplexity: this.calculateCognitiveComplexity(fileContent),
          technicalDebt: this.assessTechnicalDebt(fileContent),
          dependencies: this.extractDependencies(fileContent),
          exports: this.extractExports(fileContent),
          imports: this.extractImports(fileContent)
        },
        lastModified: new Date(stats.mtime)
      }

      // Cache the analysis
      this.analysisCache.set(cacheKey, analysis)
      
      return analysis
    } catch (error) {
      throw new Error(`File analysis failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 📊 ANALYZE MULTIPLE FILES IN PARALLEL
   */
  async analyzeMultipleFiles(filePaths: string[]): Promise<Map<string, FileAnalysis>> {
    const analyses = new Map<string, FileAnalysis>()
    
    try {
      const analysisPromises = filePaths.map(async (filePath) => {
        try {
          const analysis = await this.analyzeFile(filePath)
          return { filePath, analysis }
        } catch (error) {
          console.error(`[AUTONOMOUS FILE EDITOR] Failed to analyze ${filePath}:`, error)
          return null
        }
      })

      const results = await Promise.all(analysisPromises)
      
      for (const result of results) {
        if (result) {
          analyses.set(result.filePath, result.analysis)
        }
      }

      return analyses
    } catch (error) {
      throw new Error(`Multi-file analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 📋 GENERATE COMPREHENSIVE REFACTOR PLAN WITH WEBCONTAINER OPERATIONS
   */
  async generateRefactorPlan(filePaths: string[], targetImprovements: string[] = []): Promise<RefactorPlan> {
    try {
      const planId = `refactor-${Date.now()}`
      const operations: RefactorOperation[] = []
      const webContainerOperations: WebContainerFileOperation[] = []

      // Analyze all files first
      const analyses = await this.analyzeMultipleFiles(filePaths)

      // Generate operations for each file
      for (const [filePath, analysis] of analyses) {
        const fileOperations = await this.generateFileOperations(analysis, targetImprovements)
        operations.push(...fileOperations)

        // Prepare backup operations
        webContainerOperations.push({
          type: 'backup',
          path: analysis.webContainerPath,
          backup: {
            path: `${analysis.webContainerPath}.backup.${Date.now()}`,
            timestamp: new Date()
          }
        })
      }

      // Calculate estimated impact
      const estimatedImpact = this.calculateEstimatedImpact(operations, analyses)

      const plan: RefactorPlan = {
        id: planId,
        filePaths,
        targetImprovements,
        operations,
        estimatedImpact,
        createdAt: new Date(),
        webContainerOperations
      }

      return plan
    } catch (error) {
      throw new Error(`Refactor plan generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * ⚡ EXECUTE REFACTOR PLAN WITH FULL WEBCONTAINER INTEGRATION
   */
  async executeRefactorPlan(plan: RefactorPlan): Promise<{
    success: boolean
    executedOperations: string[]
    failedOperations: string[]
    backups: string[]
    webContainerResults: any[]
  }> {
    if (this.isProcessing) {
      throw new Error('Another refactoring operation is in progress')
    }

    this.isProcessing = true
    const executedOperations: string[] = []
    const failedOperations: string[] = []
    const backups: string[] = []
    const webContainerResults: any[] = []

    try {
      const wc = await webcontainer

      // Phase 1: Create backups
      for (const wcOp of plan.webContainerOperations) {
        if (wcOp.type === 'backup' && wcOp.backup) {
          try {
            const originalContent = await wc.fs.readFile(wcOp.path, 'utf8')
            await wc.fs.writeFile(wcOp.backup.path, originalContent)
            backups.push(wcOp.backup.path)
            
            // Track backup for this file
            if (!this.backupHistory.has(wcOp.path)) {
              this.backupHistory.set(wcOp.path, [])
            }
            this.backupHistory.get(wcOp.path)!.push(wcOp.backup.path)

            webContainerResults.push({
              operation: 'backup',
              path: wcOp.path,
              backupPath: wcOp.backup.path,
              success: true
            })
          } catch (error) {
            webContainerResults.push({
              operation: 'backup',
              path: wcOp.path,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

      // Phase 2: Execute refactor operations
      for (const operation of plan.operations) {
        try {
          await this.executeOperationWithWebContainer(operation)
          executedOperations.push(operation.id)
          this.operationHistory.push(operation)

          webContainerResults.push({
            operation: 'refactor',
            operationId: operation.id,
            path: operation.webContainerPath,
            success: true,
            description: operation.description
          })
        } catch (error) {
          failedOperations.push(operation.id)
          console.error(`[AUTONOMOUS FILE EDITOR] Operation failed: ${operation.id}`, error)
          
          webContainerResults.push({
            operation: 'refactor',
            operationId: operation.id,
            path: operation.webContainerPath,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // Clear analysis cache for modified files
      this.clearAnalysisCacheForFiles(plan.filePaths)

      return {
        success: failedOperations.length === 0,
        executedOperations,
        failedOperations,
        backups,
        webContainerResults
      }
    } catch (error) {
      throw new Error(`Refactor plan execution failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 📁 WEBCONTAINER FILE OPERATIONS
   */
  async createFileInWebContainer(filePath: string, content: string): Promise<{
    success: boolean
    webContainerPath?: string
    backup?: string
    error?: string
  }> {
    try {
      const wc = await webcontainer
      const webContainerPath = this.normalizeWebContainerPath(filePath)
      
      // Check if file already exists and create backup
      let backup: string | undefined
      try {
        await wc.fs.stat(webContainerPath)
        // File exists, create backup
        const backupPath = `${webContainerPath}.backup.${Date.now()}`
        const existingContent = await wc.fs.readFile(webContainerPath, 'utf8')
        await wc.fs.writeFile(backupPath, existingContent)
        backup = backupPath
      } catch {
        // File doesn't exist, no backup needed
      }
      
      // Write new content
      await wc.fs.writeFile(webContainerPath, content, 'utf8')
      
      // Clear cache
      this.clearAnalysisCacheForFiles([filePath])
      
      return {
        success: true,
        webContainerPath,
        backup
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async readFileFromWebContainer(filePath: string): Promise<{
    success: boolean
    content?: string
    analysis?: FileAnalysis
    error?: string
  }> {
    try {
      const wc = await webcontainer
      const webContainerPath = this.normalizeWebContainerPath(filePath)
      
      const content = await wc.fs.readFile(webContainerPath, 'utf8')
      const contentString = content.toString()
      
      // Optionally generate analysis
      const analysis = await this.analyzeFile(filePath, contentString)
      
      return {
        success: true,
        content: contentString,
        analysis
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async modifyFileInWebContainer(filePath: string, newContent: string, createBackup: boolean = true): Promise<{
    success: boolean
    backupPath?: string
    changes?: {
      linesAdded: number
      linesRemoved: number
      linesModified: number
    }
    error?: string
  }> {
    try {
      const wc = await webcontainer
      const webContainerPath = this.normalizeWebContainerPath(filePath)
      
      let backupPath: string | undefined
      let changes: any = undefined
      
      if (createBackup) {
        try {
          const originalContent = await wc.fs.readFile(webContainerPath, 'utf8')
          backupPath = `${webContainerPath}.backup.${Date.now()}`
          await wc.fs.writeFile(backupPath, originalContent)
          
          // Calculate changes
          changes = this.calculateContentChanges(originalContent.toString(), newContent)
          
          // Track backup
          if (!this.backupHistory.has(webContainerPath)) {
            this.backupHistory.set(webContainerPath, [])
          }
          this.backupHistory.get(webContainerPath)!.push(backupPath)
        } catch (backupError) {
          console.warn(`[AUTONOMOUS FILE EDITOR] Could not create backup: ${backupError}`)
        }
      }
      
      // Write new content
      await wc.fs.writeFile(webContainerPath, newContent, 'utf8')
      
      // Clear cache
      this.clearAnalysisCacheForFiles([filePath])
      
      return {
        success: true,
        backupPath,
        changes
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async deleteFileFromWebContainer(filePath: string, createBackup: boolean = true): Promise<{
    success: boolean
    backupPath?: string
    error?: string
  }> {
    try {
      const wc = await webcontainer
      const webContainerPath = this.normalizeWebContainerPath(filePath)
      
      let backupPath: string | undefined
      
      if (createBackup) {
        try {
          const content = await wc.fs.readFile(webContainerPath, 'utf8')
          backupPath = `${webContainerPath}.deleted.backup.${Date.now()}`
          await wc.fs.writeFile(backupPath, content)
          
          // Track backup
          if (!this.backupHistory.has(webContainerPath)) {
            this.backupHistory.set(webContainerPath, [])
          }
          this.backupHistory.get(webContainerPath)!.push(backupPath)
        } catch (backupError) {
          console.warn(`[AUTONOMOUS FILE EDITOR] Could not create backup before deletion: ${backupError}`)
        }
      }
      
      await wc.fs.unlink(webContainerPath)
      
      // Clear cache
      this.clearAnalysisCacheForFiles([filePath])
      
      return {
        success: true,
        backupPath
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 🔄 COMPREHENSIVE ROLLBACK WITH WEBCONTAINER
   */
  async rollbackOperations(operationIds: string[]): Promise<{
    success: boolean
    rolledBack: string[]
    failed: string[]
    restoredFiles: string[]
  }> {
    const rolledBack: string[] = []
    const failed: string[] = []
    const restoredFiles: string[] = []

    try {
      const wc = await webcontainer

      for (const operationId of operationIds) {
        const operation = this.operationHistory.find(op => op.id === operationId)
        if (!operation) {
          failed.push(operationId)
          continue
        }

        try {
          // Find the most recent backup for this file
          const backups = this.backupHistory.get(operation.webContainerPath) || []
          const latestBackup = backups[backups.length - 1]
          
          if (latestBackup) {
            try {
              const backupContent = await wc.fs.readFile(latestBackup, 'utf8')
              await wc.fs.writeFile(operation.webContainerPath, backupContent)
              
              // Remove the used backup
              await wc.fs.unlink(latestBackup)
              this.backupHistory.get(operation.webContainerPath)!.pop()
              
              restoredFiles.push(operation.webContainerPath)
              rolledBack.push(operationId)
            } catch (restoreError) {
              // Try manual rollback using operation changes
              await this.manualRollbackWithWebContainer(operation)
              rolledBack.push(operationId)
            }
          } else {
            // Manual rollback
            await this.manualRollbackWithWebContainer(operation)
            rolledBack.push(operationId)
          }

          // Clear cache for rolled back file
          this.clearAnalysisCacheForFiles([operation.filePath])
        } catch (error) {
          failed.push(operationId)
          console.error(`[AUTONOMOUS FILE EDITOR] Rollback failed for ${operationId}:`, error)
        }
      }

      return {
        success: failed.length === 0,
        rolledBack,
        failed,
        restoredFiles
      }
    } catch (error) {
      return {
        success: false,
        rolledBack,
        failed: operationIds,
        restoredFiles
      }
    }
  }

  /**
   * 📊 STATUS AND MONITORING
   */
  isProcessingOperations(): boolean {
    return this.isProcessing
  }

  getActiveOperations(): RefactorOperation[] {
    return this.operationHistory.slice(-10)
  }

  getBackupHistory(): Map<string, string[]> {
    return new Map(this.backupHistory)
  }

  getAnalysisCache(): Map<string, FileAnalysis> {
    return new Map(this.analysisCache)
  }

  clearAnalysisCache(): void {
    this.analysisCache.clear()
  }

  clearAnalysisCacheForFiles(filePaths: string[]): void {
    for (const [key] of this.analysisCache) {
      if (filePaths.some(path => key.includes(path))) {
        this.analysisCache.delete(key)
      }
    }
  }

  /**
   * 🔧 PRIVATE HELPER METHODS
   */
  private normalizeWebContainerPath(filePath: string): string {
    // Ensure path starts with / for WebContainer
    return filePath.startsWith('/') ? filePath : `/${filePath}`
  }

  private getContentHash(content: string): string {
    // Simple hash function for caching
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript', 
      'jsx': 'javascript',
      'py': 'python',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml'
    }
    return languageMap[ext || ''] || 'text'
  }

  private countLinesOfCode(content: string): number {
    return content.split('\n').filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      !line.trim().startsWith('*') &&
      !line.trim().startsWith('*/')
    ).length
  }

  private extractDependencies(content: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g
    const dependencies: string[] = []
    
    let match
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1])
    }
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1])
    }
    
    return [...new Set(dependencies)]
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:function\s+|class\s+|const\s+|let\s+|var\s+)?(\w+)/g
    const exports: string[] = []
    
    let match
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1])
    }
    
    return [...new Set(exports)]
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from/g
    const imports: string[] = []
    
    let match
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Named imports
        imports.push(...match[1].split(',').map(s => s.trim()))
      } else if (match[2]) {
        // Namespace import
        imports.push(match[2])
      } else if (match[3]) {
        // Default import
        imports.push(match[3])
      }
    }
    
    return [...new Set(imports)]
  }

  private calculateContentChanges(oldContent: string, newContent: string): {
    linesAdded: number
    linesRemoved: number
    linesModified: number
  } {
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    
    const maxLines = Math.max(oldLines.length, newLines.length)
    let linesAdded = 0
    let linesRemoved = 0
    let linesModified = 0
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]
      
      if (oldLine === undefined) {
        linesAdded++
      } else if (newLine === undefined) {
        linesRemoved++
      } else if (oldLine !== newLine) {
        linesModified++
      }
    }
    
    return { linesAdded, linesRemoved, linesModified }
  }

  private async generateFileOperations(analysis: FileAnalysis, targetImprovements: string[]): Promise<RefactorOperation[]> {
    const operations: RefactorOperation[] = []

    // Generate AI-powered refactoring suggestions
    const suggestions = await this.aiModel.generateRefactoringSuggestions(
      analysis.filePath, 
      targetImprovements
    )

    if (suggestions.success) {
      for (const suggestion of suggestions.suggestions) {
        const operation: RefactorOperation = {
          id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: suggestion.type as any,
          filePath: analysis.filePath,
          webContainerPath: analysis.webContainerPath,
          description: suggestion.description,
          changes: [], // Would be populated with actual code changes by AI
          reasoning: `AI-generated improvement: ${suggestion.description}`,
          confidence: suggestion.confidence
        }
        operations.push(operation)
      }
    }

    // Add operations based on analysis issues
    if (analysis.issues.length > 0) {
      const highPriorityIssues = analysis.issues.filter(issue => 
        issue.severity === 'high' || issue.severity === 'critical'
      )
      
      if (highPriorityIssues.length > 0) {
        operations.push({
          id: `op-${Date.now()}-critical-fixes`,
          type: 'custom',
          filePath: analysis.filePath,
          webContainerPath: analysis.webContainerPath,
          description: `Fix ${highPriorityIssues.length} critical issues`,
          changes: [],
          reasoning: 'Address high-priority issues found during analysis',
          confidence: 9
        })
      }
    }

    return operations
  }

  private calculateEstimatedImpact(operations: RefactorOperation[], analyses: Map<string, FileAnalysis>): {
    complexity: number
    maintainability: number
    performance: number
    riskLevel: 'low' | 'medium' | 'high'
  } {
    const avgConfidence = operations.reduce((sum, op) => sum + op.confidence, 0) / operations.length
    const operationCount = operations.length
    const fileCount = analyses.size
    
    // Factor in file complexity
    const avgComplexity = Array.from(analyses.values())
      .reduce((sum, analysis) => sum + analysis.complexity, 0) / fileCount

    return {
      complexity: Math.min(10, avgConfidence - (avgComplexity / 10)),
      maintainability: Math.min(10, avgConfidence * 1.2),
      performance: Math.min(10, avgConfidence * 0.8),
      riskLevel: operationCount > 15 || avgComplexity > 15 ? 'high' : 
                operationCount > 8 || avgComplexity > 10 ? 'medium' : 'low'
    }
  }

  private async executeOperationWithWebContainer(operation: RefactorOperation): Promise<void> {
    try {
      const wc = await webcontainer
      
      // Read current content
      const currentContent = await wc.fs.readFile(operation.webContainerPath, 'utf8')
      let modifiedContent = currentContent.toString()
      
      // Apply changes if available
      if (operation.changes.length > 0) {
        for (const change of operation.changes) {
          modifiedContent = modifiedContent.replace(change.oldCode, change.newCode)
        }
        
        // Write modified content back
        await wc.fs.writeFile(operation.webContainerPath, modifiedContent)
      }
      
      console.log(`[AUTONOMOUS FILE EDITOR] Executed operation: ${operation.description}`)
    } catch (error) {
      throw new Error(`WebContainer operation failed: ${error}`)
    }
  }

  private async manualRollbackWithWebContainer(operation: RefactorOperation): Promise<void> {
    try {
      const wc = await webcontainer
      
      if (operation.changes.length > 0) {
        const currentContent = await wc.fs.readFile(operation.webContainerPath, 'utf8')
        let restoredContent = currentContent.toString()
        
        // Reverse changes
        for (const change of operation.changes.reverse()) {
          restoredContent = restoredContent.replace(change.newCode, change.oldCode)
        }
        
        await wc.fs.writeFile(operation.webContainerPath, restoredContent)
      }
    } catch (error) {
      throw new Error(`Manual rollback failed: ${error}`)
    }
  }

  // Reuse existing complexity calculation methods
  private calculateComplexity(code: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'try', 'catch']
    let complexity = 1
    
    for (const keyword of complexityKeywords) {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'))
      if (matches) {
        complexity += matches.length
      }
    }
    
    return Math.min(complexity, 20)
  }

  private calculateCyclomaticComplexity(code: string): number {
    const decisionPoints = ['if', 'else if', 'while', 'for', 'case', '&&', '||', '?', 'catch']
    let complexity = 1
    
    for (const point of decisionPoints) {
      const matches = code.match(new RegExp(point.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
      if (matches) {
        complexity += matches.length
      }
    }
    
    return complexity
  }

  private calculateCognitiveComplexity(code: string): number {
    const cognitiveFactors = ['if', 'else', 'while', 'for', 'switch', 'try', 'catch', 'finally']
    let complexity = 0
    
    for (const factor of cognitiveFactors) {
      const matches = code.match(new RegExp(`\\b${factor}\\b`, 'g'))
      if (matches) {
        complexity += matches.length
      }
    }
    
    return complexity
  }

  private calculateMaintainabilityIndex(code: string): number {
    const lines = code.split('\n').length
    const complexity = this.calculateComplexity(code)
    
    const maintainability = Math.max(0, 100 - (complexity * 2) - (lines / 10))
    return Math.round(maintainability)
  }

  private assessTechnicalDebt(code: string): number {
    let debt = 0
    
    if (code.includes('TODO')) debt += 1
    if (code.includes('FIXME')) debt += 2
    if (code.includes('HACK')) debt += 3
    if (code.includes('console.log')) debt += 0.5
    if (code.includes('debugger')) debt += 1
    
    const functions = code.match(/function\s+\w+|=>\s*{/g)
    if (functions && functions.length > 0) {
      const avgFunctionLength = code.split('\n').length / functions.length
      if (avgFunctionLength > 50) debt += 2
    }
    
    return Math.min(Math.round(debt), 10)
  }
}
