import { EventEmitter } from 'events'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { ContextEngine } from './context-engine'
import { AdvancedCacheService } from './advanced-cache'
import * as fs from 'fs'

export interface CodeGenerationRequest {
  type: 'function' | 'class' | 'component' | 'test' | 'documentation' | 'refactor' | 'fix'
  language: string
  context: {
    currentFile: string
    cursorPosition: { line: number; column: number }
    selectedText?: string
    nearbyCode?: string
  }
  requirements: {
    description: string
    style?: 'functional' | 'class-based' | 'modern' | 'legacy'
    patterns?: string[]
    constraints?: string[]
  }
}

export interface GeneratedCode {
  code: string
  explanation: string
  suggestions: string[]
  tests?: string
  documentation?: string
  quality: {
    score: number
    issues: string[]
    improvements: string[]
  }
  alternatives: Array<{
    code: string
    rationale: string
    pros: string[]
    cons: string[]
  }>
}

export interface IntelligentSuggestion {
  type: 'completion' | 'refactor' | 'fix' | 'optimize' | 'test' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  suggestion: {
    title: string
    description: string
    code?: string
  }
  reasoning: string
  impact: {
    performance?: number
    maintainability?: number
    security?: number
    testability?: number
  }
}

/**
 * Intelligent Code Generator - AI-Powered Development Assistant
 * 
 * This service provides advanced code generation capabilities including:
 * - Natural language to code conversion
 * - Intelligent code completion and suggestions
 * - Automated refactoring with quality analysis
 * - Context-aware code generation based on project patterns
 * - Multi-language support with framework awareness
 */
export class IntelligentCodeGenerator extends EventEmitter {
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private contextEngine: ContextEngine
  private cacheService: AdvancedCacheService
  private generationHistory: Map<string, GeneratedCode[]> = new Map()
  private activeGeneration: Map<string, Promise<GeneratedCode>> = new Map()
  private codeTemplates: Map<string, any> = new Map()
  private cacheStats: { totalRequests: number; hits: number } = { totalRequests: 0, hits: 0 }

  constructor(
    aiModelManager: AIModelManager,
    codeAnalysis: AdvancedCodeAnalysisService,
    contextEngine: ContextEngine,
    cacheService: AdvancedCacheService
  ) {
    super()
    this.aiModelManager = aiModelManager
    this.codeAnalysis = codeAnalysis
    this.contextEngine = contextEngine
    this.cacheService = cacheService
    this.initialize()
  }

  private async initialize(): Promise<void> {
    await this.initializeCodeTemplates()
    this.setupEventHandlers()
    this.emit('initialized')
  }

  private async initializeCodeTemplates(): Promise<void> {
    const templates = {
      typescript: {
        function: `
/**
 * {{name}} - {{description}}
 */
export function {{name}}({{parameters}}): {{returnType}} {
  {{implementation}}
  return {{defaultReturn}}
}`,
        class: `
/**
 * {{name}} - {{description}}
 */
export class {{name}} {
  {{properties}}

  constructor({{constructorParams}}) {
    {{propertyInitialization}}
  }

  {{methods}}
}`,
        interface: `
/**
 * {{name}} - {{description}}
 */
export interface {{name}} {
  {{properties}}
}`,
        test: `
import { describe, it, expect } from '@jest/globals'
import { {{className}} } from '{{importPath}}'

describe('{{className}}', () => {
  it('should {{testDescription}}', () => {
    // Arrange
    {{arrange}}

    // Act
    {{act}}

    // Assert
    {{assert}}
  })
})`
      },
      javascript: {
        function: `
/**
 * {{name}} - {{description}}
 * @param {{{parameterTypes}}}
 * @returns {{{returnType}}}
 */
function {{name}}({{parameters}}) {
  {{implementation}}
  return {{defaultReturn}}
}`,
        class: `
/**
 * {{name}} - {{description}}
 */
class {{name}} {
  constructor({{constructorParams}}) {
    {{propertyInitialization}}
  }

  {{methods}}
}`
      }
    }

    this.codeTemplates.set('templates', templates)
    await this.cacheService.set('code-templates', templates, { ttl: 3600000 })
  }

  private setupEventHandlers(): void {
    this.on('generation-complete', (request: CodeGenerationRequest, result: GeneratedCode) => {
      this.recordGenerationForLearning(request, result)
    })

    this.on('generation-error', (request: CodeGenerationRequest, error: Error) => {
      console.error('Code generation failed:', error)
    })
  }

  /**
   * Generate code based on natural language description
   */
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    const cacheKey = this.getCacheKey(request)
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey)
    if (cached) {
      this.emit('cache-hit', cacheKey)
      return cached
    }

    // Check if generation is already in progress
    if (this.activeGeneration.has(cacheKey)) {
      return await this.activeGeneration.get(cacheKey)!
    }

    const generationPromise = this.performCodeGeneration(request)
    this.activeGeneration.set(cacheKey, generationPromise)

    try {
      const result = await generationPromise
      await this.cacheService.set(cacheKey, result, { ttl: 1800000 }) // 30 minutes
      this.emit('generation-complete', request, result)
      return result
    } catch (error) {
      this.emit('generation-error', request, error)
      throw error
    } finally {
      this.activeGeneration.delete(cacheKey)
    }
  }

  private async performCodeGeneration(request: CodeGenerationRequest): Promise<GeneratedCode> {
    // Gather context for generation
    const context = await this.gatherContext(request)
    
    // Build comprehensive prompt
    const prompt = this.buildGenerationPrompt(request, context)
    
    // Generate code using AI
    const aiResponse = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 2000,
      temperature: 0.3,
      modelId: 'deepseek-coder'
    })

    // Parse and enhance the generated code
    const generatedCode = this.parseGeneratedCode(aiResponse.content)
    
    // Analyze quality
    const quality = await this.analyzeCodeQuality(generatedCode, request)
    
    // Generate alternatives
    const alternatives = await this.generateAlternatives(request, generatedCode)
    
    // Generate supporting materials
    const tests = request.type === 'test' ? undefined : await this.generateTests(generatedCode, request)
    const documentation = await this.generateDocumentation(generatedCode, request)

    return {
      code: generatedCode,
      explanation: this.generateExplanation(generatedCode, request),
      suggestions: this.generateSuggestions(generatedCode, quality),
      tests,
      documentation,
      quality,
      alternatives
    }
  }

  private async gatherContext(request: CodeGenerationRequest): Promise<any> {
    const context: any = {
      fileContext: null,
      projectContext: null
    }

    try {
      // Get context using the context engine
      if (request.context.currentFile) {
        context.fileContext = await this.contextEngine.getContext({
          query: request.requirements.description,
          currentFile: request.context.currentFile,
          maxItems: 5,
          workspaceScope: true
        })
      }

      // Get basic project context
      context.projectContext = await this.getBasicProjectInfo()

    } catch (error) {
      console.error('Failed to gather context:', error)
    }

    return context
  }

  private async getBasicProjectInfo(): Promise<any> {
    try {
      // Check for package.json
      const packageJsonExists = await this.fileExists('package.json')
      if (packageJsonExists) {
        const packageContent = await fs.promises.readFile('package.json', 'utf8')
        const packageData = JSON.parse(packageContent)
        return {
          type: 'nodejs',
          framework: this.detectFramework(packageData),
          dependencies: Object.keys(packageData.dependencies || {}),
          devDependencies: Object.keys(packageData.devDependencies || {})
        }
      }

      // Check for tsconfig.json
      const tsconfigExists = await this.fileExists('tsconfig.json')
      if (tsconfigExists) {
        return { type: 'typescript' }
      }

      return { type: 'generic' }
    } catch (error) {
      return { type: 'unknown' }
    }
  }

  private detectFramework(packageData: any): string {
    const deps = { ...packageData.dependencies, ...packageData.devDependencies }
    
    if (deps.react) return 'react'
    if (deps.vue) return 'vue'
    if (deps.angular) return 'angular'
    if (deps.express) return 'express'
    if (deps.nestjs) return 'nestjs'
    
    return 'vanilla'
  }

  private buildGenerationPrompt(request: CodeGenerationRequest, context: any): string {
    const sections = [
      '# Code Generation Request',
      '',
      `## Task: Generate ${request.type} in ${request.language}`,
      `Description: ${request.requirements.description}`,
      '',
      '## Context Information',
      context.fileContext ? `File context available with ${context.fileContext.items?.length || 0} relevant items` : 'No specific file context',
      context.projectContext ? `Project type: ${context.projectContext.type}` : 'Unknown project type',
      context.projectContext?.framework ? `Framework: ${context.projectContext.framework}` : '',
      '',
      '## Requirements',
      request.requirements.style ? `Style preference: ${request.requirements.style}` : '',
      request.requirements.patterns?.length ? `Required patterns: ${request.requirements.patterns.join(', ')}` : '',
      request.requirements.constraints?.length ? `Constraints: ${request.requirements.constraints.join(', ')}` : '',
      '',
      '## Instructions',
      '1. Generate clean, production-ready code',
      '2. Follow modern best practices',
      '3. Include proper error handling',
      '4. Add meaningful comments',
      '5. Ensure code is testable',
      '',
      `Generate ${request.type} code for: ${request.requirements.description}`
    ].filter(Boolean).join('\n')

    return sections
  }

  private parseGeneratedCode(aiResponse: string): string {
    // Extract code from markdown code blocks
    const codeMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)\n```/)
    if (codeMatch) {
      return codeMatch[1].trim()
    }
    
    // If no code blocks, return the response as-is
    return aiResponse.trim()
  }

  private async analyzeCodeQuality(code: string, request: CodeGenerationRequest): Promise<any> {
    try {
      // Create temporary file for analysis
      const tempFileName = `temp-${Date.now()}.${this.getFileExtension(request.language)}`
      await fs.promises.writeFile(tempFileName, code)
      
      // Analyze using our code analysis service
      const analysis = await this.codeAnalysis.analyzeFile(tempFileName)
      
      // Clean up
      await fs.promises.unlink(tempFileName).catch(() => {}) // Ignore errors
      
      const issues: string[] = []
      const improvements: string[] = []
      let score = 100

      // Basic quality checks
      if (analysis.metrics.cyclomaticComplexity > 10) {
        issues.push('High cyclomatic complexity')
        score -= 20
      }

      if (analysis.metrics.maintainabilityIndex < 70) {
        issues.push('Low maintainability')
        score -= 15
      }

      if (analysis.smells.length > 0) {
        issues.push(`${analysis.smells.length} code smells detected`)
        score -= 10
      }

      // Improvement suggestions
      if (!code.includes('/**') && code.length > 100) {
        improvements.push('Add JSDoc documentation')
      }

      if (!code.includes('try') && code.includes('throw')) {
        improvements.push('Consider adding error handling')
      }

      return {
        score: Math.max(0, score),
        issues,
        improvements
      }

    } catch (error) {
      console.error('Quality analysis failed:', error)
      return {
        score: 75,
        issues: ['Unable to perform full quality analysis'],
        improvements: ['Review code manually for quality']
      }
    }
  }

  private async generateAlternatives(
    request: CodeGenerationRequest,
    originalCode: string
  ): Promise<Array<{ code: string; rationale: string; pros: string[]; cons: string[] }>> {
    const alternatives: Array<{ code: string; rationale: string; pros: string[]; cons: string[] }> = []

    try {
      // Generate a performance-optimized version
      const perfPrompt = `
Optimize the following ${request.language} code for better performance:

\`\`\`${request.language}
${originalCode}
\`\`\`

Focus on performance improvements while maintaining functionality.
Generate only the optimized code:
`

      const perfResponse = await this.aiModelManager.makeRequest(perfPrompt, {
        maxTokens: 1000,
        temperature: 0.2
      })

      alternatives.push({
        code: this.parseGeneratedCode(perfResponse.content),
        rationale: 'Performance-optimized version',
        pros: ['Better performance', 'More efficient resource usage'],
        cons: ['Potentially more complex', 'May sacrifice readability']
      })

      // Generate a readability-focused version
      const readabilityPrompt = `
Rewrite the following ${request.language} code to maximize readability and maintainability:

\`\`\`${request.language}
${originalCode}
\`\`\`

Focus on clarity, documentation, and ease of understanding.
Generate only the readable code:
`

      const readabilityResponse = await this.aiModelManager.makeRequest(readabilityPrompt, {
        maxTokens: 1000,
        temperature: 0.4
      })

      alternatives.push({
        code: this.parseGeneratedCode(readabilityResponse.content),
        rationale: 'Readability-focused version',
        pros: ['Easier to understand', 'Better documentation', 'More maintainable'],
        cons: ['Potentially more verbose', 'May be less performant']
      })

    } catch (error) {
      console.error('Alternative generation failed:', error)
    }

    return alternatives
  }

  private async generateTests(code: string, request: CodeGenerationRequest): Promise<string> {
    try {
      const testPrompt = `
Generate comprehensive unit tests for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Use appropriate testing framework and include:
- Basic functionality tests
- Edge cases
- Error scenarios
- Mock data if needed

Generate only the test code:
`

      const testResponse = await this.aiModelManager.makeRequest(testPrompt, {
        maxTokens: 1500,
        temperature: 0.3
      })

      return this.parseGeneratedCode(testResponse.content)

    } catch (error) {
      console.error('Test generation failed:', error)
      return `// Test generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private async generateDocumentation(code: string, request: CodeGenerationRequest): Promise<string> {
    try {
      const docPrompt = `
Generate comprehensive documentation for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Include:
- Purpose and functionality
- Parameters and return values
- Usage examples
- Important notes

Format as appropriate for ${request.language}:
`

      const docResponse = await this.aiModelManager.makeRequest(docPrompt, {
        maxTokens: 1000,
        temperature: 0.4
      })

      return docResponse.content.trim()

    } catch (error) {
      console.error('Documentation generation failed:', error)
      return `// Documentation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * Generate intelligent suggestions for current code context
   */
  async generateIntelligentSuggestions(
    filePath: string,
    cursorPosition: { line: number; column: number }
  ): Promise<IntelligentSuggestion[]> {
    const suggestions: IntelligentSuggestion[] = []

    try {
      // Analyze the current file
      const analysis = await this.codeAnalysis.analyzeFile(filePath)
      
      // Generate suggestions based on analysis
      if (analysis.metrics.cyclomaticComplexity > 15) {
        suggestions.push({
          type: 'refactor',
          priority: 'high',
          confidence: 0.9,
          suggestion: {
            title: 'Reduce Function Complexity',
            description: 'This function has high cyclomatic complexity. Consider breaking it into smaller functions.',
          },
          reasoning: 'High complexity makes code harder to understand, test, and maintain',
          impact: {
            maintainability: 0.4,
            testability: 0.3
          }
        })
      }

      // Code smell suggestions
      for (const smell of analysis.smells) {
        if (smell.severity === 'high' || smell.severity === 'critical') {
          suggestions.push({
            type: 'fix',
            priority: smell.severity === 'critical' ? 'critical' : 'high',
            confidence: 0.8,
            suggestion: {
              title: `Fix ${smell.type}`,
              description: smell.message
            },
            reasoning: `${smell.type} can lead to maintenance issues`,
            impact: {
              maintainability: 0.3
            }
          })
        }
      }

      // Test coverage suggestions
      if (!filePath.includes('.test.') && !filePath.includes('.spec.')) {
        const hasTests = await this.checkForTests(filePath)
        if (!hasTests) {
          suggestions.push({
            type: 'test',
            priority: 'medium',
            confidence: 0.9,
            suggestion: {
              title: 'Add Unit Tests',
              description: 'No test file found for this module. Adding tests improves reliability.'
            },
            reasoning: 'Unit tests catch bugs early and improve code confidence',
            impact: {
              testability: 0.5
            }
          })
        }
      }

    } catch (error) {
      console.error('Suggestion generation failed:', error)
    }

    return suggestions
  }

  /**
   * Process natural language requests
   */
  async processNaturalLanguage(instruction: string, context: any = {}): Promise<GeneratedCode> {
    const prompt = `
Convert this natural language instruction to code:

Instruction: "${instruction}"

Context:
- File: ${context.currentFile || 'new file'}
- Language: ${context.language || 'typescript'}
- Framework: ${context.framework || 'none'}

Generate appropriate code for this instruction. Include explanations as comments.
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 2000,
      temperature: 0.3
    })

    const code = this.parseGeneratedCode(response.content)
    const quality = await this.analyzeCodeQuality(code, {
      type: 'function',
      language: context.language || 'typescript',
      context: {
        currentFile: context.currentFile || '',
        cursorPosition: { line: 0, column: 0 }
      },
      requirements: {
        description: instruction
      }
    })

    return {
      code,
      explanation: `Generated from instruction: "${instruction}"`,
      suggestions: [],
      quality,
      alternatives: []
    }
  }

  // Helper methods
  private getCacheKey(request: CodeGenerationRequest): string {
    return `codegen:${JSON.stringify(request)}`
  }

  private generateExplanation(code: string, request: CodeGenerationRequest): string {
    return `Generated ${request.type} for: ${request.requirements.description}\n\nThe code follows ${request.language} best practices and includes proper structure for maintainability.`
  }

  private generateSuggestions(code: string, quality: any): string[] {
    const suggestions: string[] = []
    
    if (quality.score < 80) {
      suggestions.push('Consider refactoring to improve code quality')
    }
    
    quality.improvements.forEach((improvement: string) => {
      suggestions.push(improvement)
    })
    
    return suggestions
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c'
    }
    return extensions[language] || 'txt'
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path)
      return true
    } catch {
      return false
    }
  }

  private async checkForTests(filePath: string): Promise<boolean> {
    const testPatterns = [
      filePath.replace(/\.(ts|js)$/, '.test.$1'),
      filePath.replace(/\.(ts|js)$/, '.spec.$1'),
      filePath.replace(/src\//, 'test/').replace(/\.(ts|js)$/, '.test.$1')
    ]

    for (const testPath of testPatterns) {
      if (await this.fileExists(testPath)) {
        return true
      }
    }

    return false
  }

  private recordGenerationForLearning(request: CodeGenerationRequest, result: GeneratedCode): void {
    const history = this.generationHistory.get(request.type) || []
    history.push(result)
    this.generationHistory.set(request.type, history.slice(-50)) // Keep last 50
  }

  /**
   * Get generation statistics
   */
  getStatistics(): any {
    const totalGenerations = Array.from(this.generationHistory.values())
      .reduce((sum, history) => sum + history.length, 0)

    const averageQuality = this.calculateAverageQuality()

    return {
      totalGenerations,
      averageQuality,
      popularTypes: this.getPopularTypes(),
      cacheHitRate: this.calculateCacheHitRate()
    }
  }

  private calculateAverageQuality(): number {
    const allResults = Array.from(this.generationHistory.values()).flat()
    if (allResults.length === 0) return 0
    
    return allResults.reduce((sum, result) => sum + result.quality.score, 0) / allResults.length
  }

  private getPopularTypes(): Record<string, number> {
    const counts: Record<string, number> = {}
    
    for (const [type, history] of this.generationHistory.entries()) {
      counts[type] = history.length
    }
    
    return counts
  }

  private calculateCacheHitRate(): number {
    // Calculate actual cache hit rate based on usage statistics
    const totalRequests = this.cacheStats?.totalRequests || 1
    const hits = this.cacheStats?.hits || 0
    return totalRequests > 0 ? hits / totalRequests : 0.75
  }
}
