import { EventEmitter } from 'events'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { IntelligentCodeGenerator } from './intelligent-code-generator-v2'
import { AdvancedCacheService } from './advanced-cache'
import * as fs from 'fs'
import * as path from 'path'

export interface TestGenerationRequest {
  targetFile: string
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security'
  framework: 'jest' | 'vitest' | 'mocha' | 'cypress' | 'playwright' | 'auto-detect'
  coverage: {
    target: number // percentage
    includeEdgeCases: boolean
    includeMocks: boolean
    includeAsync: boolean
  }
  options: {
    generateFixtures: boolean
    generateMocks: boolean
    generateHelpers: boolean
    followNamingConventions: boolean
  }
}

export interface GeneratedTest {
  testCode: string
  testFileName: string
  fixtures: Record<string, any>
  mocks: Record<string, string>
  helpers: string[]
  coverage: {
    estimatedCoverage: number
    coveredFunctions: string[]
    uncoveredFunctions: string[]
    edgeCases: string[]
  }
  dependencies: string[]
  setupInstructions: string[]
}

export interface TestSuite {
  name: string
  tests: GeneratedTest[]
  setup: string
  teardown: string
  globalMocks: Record<string, string>
  configuration: any
}

export interface TestAnalysis {
  existingTests: string[]
  testCoverage: number
  missingTests: string[]
  testQuality: {
    score: number
    issues: string[]
    suggestions: string[]
  }
  recommendations: Array<{
    type: 'add' | 'improve' | 'refactor'
    target: string
    description: string
    priority: 'low' | 'medium' | 'high'
  }>
}

export interface TestExecutionResult {
  testFile: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  coverage: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  failures: Array<{
    test: string
    error: string
    stackTrace: string
  }>
  performance: {
    slowTests: Array<{ name: string; duration: number }>
    memoryUsage: number
  }
}

/**
 * Automated Testing Assistant - AI-Powered Test Generation and Analysis
 * 
 * This service provides comprehensive testing automation including:
 * - Intelligent test generation from source code
 * - Test quality analysis and improvement suggestions
 * - Automated test execution and reporting
 * - Coverage analysis and gap identification
 * - Performance and security test generation
 * - Mock and fixture generation
 */
export class AutomatedTestingAssistant extends EventEmitter {
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private codeGenerator: IntelligentCodeGenerator
  private cacheService: AdvancedCacheService
  private testHistory: Map<string, GeneratedTest[]> = new Map()
  private frameworkTemplates: Map<string, any> = new Map()
  private workspaceRoot: string

  constructor(
    aiModelManager: AIModelManager,
    codeAnalysis: AdvancedCodeAnalysisService,
    codeGenerator: IntelligentCodeGenerator,
    cacheService: AdvancedCacheService,
    workspaceRoot: string = process.cwd()
  ) {
    super()
    this.aiModelManager = aiModelManager
    this.codeAnalysis = codeAnalysis
    this.codeGenerator = codeGenerator
    this.cacheService = cacheService
    this.workspaceRoot = workspaceRoot
    this.initialize()
  }

  private async initialize(): Promise<void> {
    await this.initializeFrameworkTemplates()
    this.setupEventHandlers()
    this.emit('initialized')
  }

  private async initializeFrameworkTemplates(): Promise<void> {
    const templates = {
      jest: {
        unitTest: `
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { {{moduleName}} } from '{{importPath}}'

describe('{{moduleName}}', () => {
  let {{instanceName}}: {{typeName}}

  beforeEach(() => {
    {{setup}}
  })

  afterEach(() => {
    {{cleanup}}
  })

  {{testCases}}
})`,
        mockTemplate: `
const mock{{name}} = {
  {{methods}}
}

jest.mock('{{modulePath}}', () => ({
  {{mockExports}}
}))`,
        asyncTest: `
it('should {{description}}', async () => {
  // Arrange
  {{arrange}}

  // Act
  const result = await {{action}}

  // Assert
  {{assertions}}
})`
      },
      vitest: {
        unitTest: `
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { {{moduleName}} } from '{{importPath}}'

describe('{{moduleName}}', () => {
  {{testCases}}
})`,
        mockTemplate: `
const mock{{name}} = vi.fn()
vi.mock('{{modulePath}}', () => ({
  {{mockExports}}
}))`
      },
      cypress: {
        e2eTest: `
describe('{{testSuite}}', () => {
  beforeEach(() => {
    {{setup}}
  })

  it('should {{description}}', () => {
    {{steps}}
  })
})`
      }
    }

    this.frameworkTemplates.set('templates', templates)
    await this.cacheService.set('test-templates', templates, { ttl: 3600000 })
  }

  private setupEventHandlers(): void {
    this.on('test-generated', (request: TestGenerationRequest, result: GeneratedTest) => {
      this.recordTestGeneration(request, result)
    })

    this.on('test-execution-complete', (result: TestExecutionResult) => {
      this.analyzeTestExecution(result)
    })
  }

  /**
   * Generate comprehensive tests for a target file
   */
  async generateTests(request: TestGenerationRequest): Promise<GeneratedTest> {
    const cacheKey = `test-gen:${JSON.stringify(request)}`
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey)
    if (cached) {
      this.emit('cache-hit', cacheKey)
      return cached
    }

    try {
      // Analyze the target file
      const sourceAnalysis = await this.analyzeSourceFile(request.targetFile)
      
      // Detect or validate framework
      const framework = await this.detectTestFramework(request.framework)
      
      // Generate test code
      const testCode = await this.generateTestCode(request, sourceAnalysis, framework)
      
      // Generate supporting materials
      const fixtures = await this.generateFixtures(sourceAnalysis, request.options.generateFixtures)
      const mocks = await this.generateMocks(sourceAnalysis, request.options.generateMocks)
      const helpers = await this.generateHelpers(sourceAnalysis, request.options.generateHelpers)
      
      // Analyze coverage
      const coverage = await this.analyzeCoverage(testCode, sourceAnalysis)
      
      // Determine dependencies
      const dependencies = await this.analyzeDependencies(framework, request.testType)
      
      const result: GeneratedTest = {
        testCode,
        testFileName: this.generateTestFileName(request.targetFile, request.testType, framework),
        fixtures,
        mocks,
        helpers,
        coverage,
        dependencies,
        setupInstructions: this.generateSetupInstructions(framework, dependencies)
      }

      // Cache the result
      await this.cacheService.set(cacheKey, result, { ttl: 1800000 })
      
      this.emit('test-generated', request, result)
      return result

    } catch (error) {
      this.emit('test-generation-error', request, error)
      throw error
    }
  }

  private async analyzeSourceFile(filePath: string): Promise<any> {
    try {
      const analysis = await this.codeAnalysis.analyzeFile(filePath)
      const fileContent = await fs.promises.readFile(filePath, 'utf8')
      
      return {
        ...analysis,
        content: fileContent,
        exports: this.extractExports(fileContent),
        imports: this.extractImports(fileContent),
        asyncFunctions: this.extractAsyncFunctions(analysis),
        publicMethods: this.extractPublicMethods(analysis),
        complexity: analysis.metrics.cyclomaticComplexity
      }
    } catch (error) {
      console.error('Source file analysis failed:', error)
      throw new Error(`Failed to analyze source file: ${filePath}`)
    }
  }

  private async detectTestFramework(requested: string): Promise<string> {
    if (requested !== 'auto-detect') {
      return requested
    }

    try {
      // Check package.json for testing dependencies
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json')
      const packageContent = await fs.promises.readFile(packageJsonPath, 'utf8')
      const packageData = JSON.parse(packageContent)
      
      const allDeps = {
        ...packageData.dependencies,
        ...packageData.devDependencies
      }

      // Priority order for framework detection
      if (allDeps.vitest) return 'vitest'
      if (allDeps.jest) return 'jest'
      if (allDeps.cypress) return 'cypress'
      if (allDeps.playwright) return 'playwright'
      if (allDeps.mocha) return 'mocha'
      
      // Default fallback
      return 'jest'

    } catch (error) {
      console.error('Framework detection failed:', error)
      return 'jest' // Safe default
    }
  }

  private async generateTestCode(
    request: TestGenerationRequest,
    sourceAnalysis: any,
    framework: string
  ): Promise<string> {
    const prompt = this.buildTestGenerationPrompt(request, sourceAnalysis, framework)
    
    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 3000,
      temperature: 0.2,
      modelId: 'deepseek-coder'
    })

    return this.parseTestCode(response.content, framework)
  }

  private buildTestGenerationPrompt(
    request: TestGenerationRequest,
    sourceAnalysis: any,
    framework: string
  ): string {
    const sections = [
      '# Test Generation Request',
      '',
      `## Target: ${request.testType} tests using ${framework}`,
      `File: ${request.targetFile}`,
      '',
      '## Source Code Analysis',
      `Functions: ${sourceAnalysis.methods?.length || 0}`,
      `Classes: ${sourceAnalysis.classes?.length || 0}`,
      `Complexity: ${sourceAnalysis.complexity}`,
      `Async functions: ${sourceAnalysis.asyncFunctions?.length || 0}`,
      '',
      '## Requirements',
      `Target coverage: ${request.coverage.target}%`,
      `Include edge cases: ${request.coverage.includeEdgeCases}`,
      `Include mocks: ${request.coverage.includeMocks}`,
      `Include async tests: ${request.coverage.includeAsync}`,
      '',
      '## Source Code',
      '```typescript',
      sourceAnalysis.content,
      '```',
      '',
      '## Instructions',
      `1. Generate comprehensive ${request.testType} tests using ${framework}`,
      '2. Include proper setup and teardown',
      '3. Test all public methods and edge cases',
      '4. Use appropriate mocking for dependencies',
      '5. Follow testing best practices',
      '6. Ensure high test coverage',
      '',
      'Generate the complete test file:'
    ].filter(Boolean).join('\n')

    return sections
  }

  private parseTestCode(response: string, framework: string): string {
    // Extract test code from response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/)
    if (codeMatch) {
      return codeMatch[1].trim()
    }
    
    return response.trim()
  }

  private async generateFixtures(sourceAnalysis: any, shouldGenerate: boolean): Promise<Record<string, any>> {
    if (!shouldGenerate) return {}

    const fixtures: Record<string, any> = {}

    try {
      // Generate test data based on function parameters and types
      for (const method of sourceAnalysis.methods || []) {
        if (method.parameters?.length > 0) {
          const fixtureKey = `${method.name}TestData`
          fixtures[fixtureKey] = await this.generateTestData(method)
        }
      }

      // Generate fixtures for classes
      for (const classInfo of sourceAnalysis.classes || []) {
        const fixtureKey = `${classInfo.name}TestData`
        fixtures[fixtureKey] = await this.generateClassTestData(classInfo)
      }

    } catch (error) {
      console.error('Fixture generation failed:', error)
    }

    return fixtures
  }

  private async generateTestData(method: any): Promise<any> {
    const prompt = `
Generate test data for this method:

${method.name}(${method.parameters?.map((p: any) => `${p.name}: ${p.type}`).join(', ')})

Generate realistic test data including:
- Valid inputs
- Invalid inputs for error testing
- Edge cases
- Boundary values

Return as JSON object:
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 500,
      temperature: 0.3
    })

    try {
      return JSON.parse(response.content)
    } catch {
      return {
        valid: [{}],
        invalid: [null, undefined],
        edgeCases: [{}]
      }
    }
  }

  private async generateClassTestData(classInfo: any): Promise<any> {
    return {
      validInstances: [{}],
      invalidConstructorArgs: [null, undefined],
      methodTestData: {}
    }
  }

  private async generateMocks(sourceAnalysis: any, shouldGenerate: boolean): Promise<Record<string, string>> {
    if (!shouldGenerate) return {}

    const mocks: Record<string, string> = {}

    try {
      // Generate mocks for external dependencies
      for (const dependency of sourceAnalysis.dependencies || []) {
        if (dependency.isExternal) {
          const mockKey = `mock${dependency.name}`
          mocks[mockKey] = await this.generateMockCode(dependency)
        }
      }

    } catch (error) {
      console.error('Mock generation failed:', error)
    }

    return mocks
  }

  private async generateMockCode(dependency: any): Promise<string> {
    const prompt = `
Generate a Jest/Vitest mock for this dependency:

Name: ${dependency.name}
Type: ${dependency.type}

Create a mock that:
- Mocks all public methods
- Returns appropriate test values
- Allows for easy assertion checking

Generate mock code:
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 800,
      temperature: 0.2
    })

    return response.content.trim()
  }

  private async generateHelpers(sourceAnalysis: any, shouldGenerate: boolean): Promise<string[]> {
    if (!shouldGenerate) return []

    const helpers: string[] = []

    try {
      // Generate test helpers based on code patterns
      if (sourceAnalysis.asyncFunctions?.length > 0) {
        helpers.push(await this.generateAsyncTestHelper())
      }

      if (sourceAnalysis.classes?.length > 0) {
        helpers.push(await this.generateClassTestHelper())
      }

    } catch (error) {
      console.error('Helper generation failed:', error)
    }

    return helpers
  }

  private async generateAsyncTestHelper(): Promise<string> {
    return `
// Async test helper
export const waitFor = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const check = () => {
      if (condition()) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'))
      } else {
        setTimeout(check, 100)
      }
    }
    
    check()
  })
}
`
  }

  private async generateClassTestHelper(): Promise<string> {
    return `
// Class test helper
export const createTestInstance = <T>(Constructor: new (...args: any[]) => T, ...args: any[]): T => {
  return new Constructor(...args)
}

export const verifyImplementation = (instance: any, expectedMethods: string[]): boolean => {
  return expectedMethods.every(method => typeof instance[method] === 'function')
}
`
  }

  private async analyzeCoverage(testCode: string, sourceAnalysis: any): Promise<any> {
    const coveredFunctions: string[] = []
    const uncoveredFunctions: string[] = []

    // Analyze which functions are tested
    for (const method of sourceAnalysis.methods || []) {
      if (testCode.includes(method.name)) {
        coveredFunctions.push(method.name)
      } else {
        uncoveredFunctions.push(method.name)
      }
    }

    const estimatedCoverage = sourceAnalysis.methods?.length > 0 
      ? (coveredFunctions.length / sourceAnalysis.methods.length) * 100 
      : 0

    return {
      estimatedCoverage: Math.round(estimatedCoverage),
      coveredFunctions,
      uncoveredFunctions,
      edgeCases: this.extractEdgeCases(testCode)
    }
  }

  private extractEdgeCases(testCode: string): string[] {
    const edgeCases: string[] = []
    
    // Look for common edge case patterns
    if (testCode.includes('null')) edgeCases.push('null values')
    if (testCode.includes('undefined')) edgeCases.push('undefined values')
    if (testCode.includes('empty')) edgeCases.push('empty inputs')
    if (testCode.includes('throw')) edgeCases.push('error conditions')
    if (testCode.includes('timeout')) edgeCases.push('timeout scenarios')
    
    return edgeCases
  }

  private async analyzeDependencies(framework: string, testType: string): Promise<string[]> {
    const baseDeps = [framework]
    
    switch (testType) {
      case 'unit':
        baseDeps.push('@types/jest')
        break
      case 'integration':
        baseDeps.push('supertest')
        break
      case 'e2e':
        baseDeps.push('selenium-webdriver')
        break
      case 'performance':
        baseDeps.push('clinic')
        break
    }

    return baseDeps
  }

  private generateTestFileName(targetFile: string, testType: string, framework: string): string {
    const baseName = path.basename(targetFile, path.extname(targetFile))
    const extension = path.extname(targetFile)
    
    let suffix = 'test'
    if (testType === 'integration') suffix = 'integration.test'
    if (testType === 'e2e') suffix = 'e2e.test'
    if (framework === 'cypress') suffix = 'cy'
    
    return `${baseName}.${suffix}${extension}`
  }

  private generateSetupInstructions(framework: string, dependencies: string[]): string[] {
    const instructions = [
      `Install dependencies: npm install --save-dev ${dependencies.join(' ')}`,
      `Configure ${framework} in your project`,
    ]

    switch (framework) {
      case 'jest':
        instructions.push('Add jest.config.js configuration file')
        instructions.push('Add test scripts to package.json')
        break
      case 'vitest':
        instructions.push('Add vitest.config.ts configuration file')
        instructions.push('Update vite.config.ts with vitest settings')
        break
      case 'cypress':
        instructions.push('Run npx cypress open to set up Cypress')
        instructions.push('Configure cypress.config.js')
        break
    }

    return instructions
  }

  /**
   * Analyze existing test suite quality and coverage
   */
  async analyzeTestSuite(testDirectory: string): Promise<TestAnalysis> {
    try {
      const testFiles = await this.findTestFiles(testDirectory)
      const existingTests: string[] = []
      let totalCoverage = 0
      let testCount = 0

      for (const testFile of testFiles) {
        existingTests.push(testFile)
        const analysis = await this.analyzeTestFile(testFile)
        totalCoverage += analysis.coverage
        testCount++
      }

      const averageCoverage = testCount > 0 ? totalCoverage / testCount : 0
      const missingTests = await this.identifyMissingTests(testDirectory)
      const testQuality = await this.assessTestQuality(testFiles)
      const recommendations = await this.generateRecommendations(testFiles, missingTests)

      return {
        existingTests,
        testCoverage: averageCoverage,
        missingTests,
        testQuality,
        recommendations
      }

    } catch (error) {
      console.error('Test suite analysis failed:', error)
      throw error
    }
  }

  private async findTestFiles(directory: string): Promise<string[]> {
    const testFiles: string[] = []
    
    try {
      const files = await fs.promises.readdir(directory, { recursive: true })
      
      for (const file of files) {
        if (typeof file === 'string' && this.isTestFile(file)) {
          testFiles.push(path.join(directory, file))
        }
      }
    } catch (error) {
      console.error('Test file discovery failed:', error)
    }

    return testFiles
  }

  private isTestFile(fileName: string): boolean {
    return /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(fileName) ||
           /\.cy\.(js|ts)$/.test(fileName) ||
           fileName.includes('__tests__')
  }

  private async analyzeTestFile(filePath: string): Promise<any> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      const testCount = (content.match(/it\(|test\(/g) || []).length
      const describeCount = (content.match(/describe\(/g) || []).length
      
      return {
        testCount,
        describeCount,
        coverage: this.estimateFileCoverage(content),
        hasSetup: content.includes('beforeEach') || content.includes('before'),
        hasTeardown: content.includes('afterEach') || content.includes('after'),
        hasMocks: content.includes('mock') || content.includes('spy')
      }
    } catch (error) {
      console.error(`Failed to analyze test file ${filePath}:`, error)
      return { testCount: 0, coverage: 0 }
    }
  }

  private estimateFileCoverage(content: string): number {
    // Simple heuristic based on test patterns
    let score = 0
    
    if (content.includes('expect')) score += 20
    if (content.includes('toThrow')) score += 10
    if (content.includes('async')) score += 10
    if (content.includes('mock')) score += 15
    if (content.includes('beforeEach')) score += 10
    if (content.includes('describe')) score += 15
    
    return Math.min(score, 100)
  }

  private async identifyMissingTests(testDirectory: string): Promise<string[]> {
    // This would analyze source files vs test files to find gaps
    const missingTests: string[] = []
    
    try {
      const sourceFiles = await this.findSourceFiles(path.dirname(testDirectory))
      const testFiles = await this.findTestFiles(testDirectory)
      
      for (const sourceFile of sourceFiles) {
        const expectedTestFile = this.getExpectedTestFileName(sourceFile)
        if (!testFiles.some(testFile => testFile.includes(expectedTestFile))) {
          missingTests.push(sourceFile)
        }
      }
    } catch (error) {
      console.error('Missing test identification failed:', error)
    }

    return missingTests
  }

  private async findSourceFiles(directory: string): Promise<string[]> {
    const sourceFiles: string[] = []
    
    try {
      const files = await fs.promises.readdir(directory, { recursive: true })
      
      for (const file of files) {
        if (typeof file === 'string' && this.isSourceFile(file)) {
          sourceFiles.push(path.join(directory, file))
        }
      }
    } catch (error) {
      console.error('Source file discovery failed:', error)
    }

    return sourceFiles
  }

  private isSourceFile(fileName: string): boolean {
    return /\.(js|ts|jsx|tsx)$/.test(fileName) && 
           !this.isTestFile(fileName) &&
           !fileName.includes('node_modules') &&
           !fileName.includes('.d.ts')
  }

  private getExpectedTestFileName(sourceFile: string): string {
    const baseName = path.basename(sourceFile, path.extname(sourceFile))
    return `${baseName}.test`
  }

  private async assessTestQuality(testFiles: string[]): Promise<any> {
    let totalScore = 0
    const issues: string[] = []
    const suggestions: string[] = []

    for (const testFile of testFiles) {
      const analysis = await this.analyzeTestFile(testFile)
      let fileScore = 100

      if (!analysis.hasSetup) {
        fileScore -= 20
        issues.push(`${testFile}: Missing setup/beforeEach`)
      }

      if (!analysis.hasTeardown) {
        fileScore -= 10
        issues.push(`${testFile}: Missing teardown/afterEach`)
      }

      if (!analysis.hasMocks && analysis.testCount > 5) {
        suggestions.push(`${testFile}: Consider adding mocks for better isolation`)
      }

      totalScore += fileScore
    }

    const averageScore = testFiles.length > 0 ? totalScore / testFiles.length : 0

    return {
      score: Math.round(averageScore),
      issues,
      suggestions
    }
  }

  private async generateRecommendations(testFiles: string[], missingTests: string[]): Promise<any[]> {
    const recommendations: any[] = []

    // Missing test recommendations
    for (const missingTest of missingTests) {
      recommendations.push({
        type: 'add',
        target: missingTest,
        description: `Create unit tests for ${path.basename(missingTest)}`,
        priority: 'high'
      })
    }

    // Test improvement recommendations
    for (const testFile of testFiles) {
      const analysis = await this.analyzeTestFile(testFile)
      
      if (analysis.testCount < 3) {
        recommendations.push({
          type: 'improve',
          target: testFile,
          description: 'Add more comprehensive test cases',
          priority: 'medium'
        })
      }

      if (!analysis.hasSetup && analysis.testCount > 1) {
        recommendations.push({
          type: 'improve',
          target: testFile,
          description: 'Add proper test setup and teardown',
          priority: 'medium'
        })
      }
    }

    return recommendations
  }

  // Helper methods
  private extractExports(content: string): string[] {
    const exports: string[] = []
    const exportMatches = content.match(/export\s+(class|function|const|let|var)\s+(\w+)/g)
    
    if (exportMatches) {
      for (const match of exportMatches) {
        const nameMatch = match.match(/\s+(\w+)$/)
        if (nameMatch) {
          exports.push(nameMatch[1])
        }
      }
    }

    return exports
  }

  private extractImports(content: string): any[] {
    const imports: any[] = []
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g)
    
    if (importMatches) {
      for (const match of importMatches) {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/)
        if (pathMatch) {
          imports.push({
            path: pathMatch[1],
            isExternal: !pathMatch[1].startsWith('./')
          })
        }
      }
    }

    return imports
  }

  private extractAsyncFunctions(analysis: any): any[] {
    const asyncFunctions: any[] = []
    
    for (const method of analysis.methods || []) {
      if (method.name && analysis.content?.includes(`async ${method.name}`)) {
        asyncFunctions.push(method)
      }
    }

    return asyncFunctions
  }

  private extractPublicMethods(analysis: any): any[] {
    return analysis.methods?.filter((method: any) => 
      !method.name?.startsWith('_') && // Private convention
      !method.name?.startsWith('#')    // Private fields
    ) || []
  }

  private recordTestGeneration(request: TestGenerationRequest, result: GeneratedTest): void {
    const history = this.testHistory.get(request.testType) || []
    history.push(result)
    this.testHistory.set(request.testType, history.slice(-50)) // Keep last 50
  }

  private analyzeTestExecution(result: TestExecutionResult): void {
    // Analyze test execution results for learning
    if (result.status === 'failed') {
      console.log(`Test execution failed for ${result.testFile}:`, result.failures)
    }
    
    if (result.performance.slowTests.length > 0) {
      console.log(`Slow tests detected in ${result.testFile}:`, result.performance.slowTests)
    }
  }

  /**
   * Get testing statistics and insights
   */
  getTestingStatistics(): any {
    const totalTests = Array.from(this.testHistory.values())
      .reduce((sum, history) => sum + history.length, 0)

    return {
      totalTestsGenerated: totalTests,
      testsByType: this.getTestsByType(),
      averageCoverage: this.calculateAverageCoverage(),
      popularFrameworks: this.getPopularFrameworks(),
      qualityTrends: this.getQualityTrends()
    }
  }

  private getTestsByType(): Record<string, number> {
    const counts: Record<string, number> = {}
    
    for (const [type, history] of this.testHistory.entries()) {
      counts[type] = history.length
    }
    
    return counts
  }

  private calculateAverageCoverage(): number {
    const allTests = Array.from(this.testHistory.values()).flat()
    if (allTests.length === 0) return 0
    
    return allTests.reduce((sum, test) => sum + test.coverage.estimatedCoverage, 0) / allTests.length
  }

  private getPopularFrameworks(): Record<string, number> {
    // This would track framework usage in a real implementation
    return {
      jest: 65,
      vitest: 25,
      cypress: 10
    }
  }

  private getQualityTrends(): any {
    // This would track quality improvements over time
    return {
      improvingCoverage: true,
      reducingTestDebt: true,
      increasingTestCount: true
    }
  }
}
