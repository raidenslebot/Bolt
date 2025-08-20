import { EventEmitter } from 'events'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { IntelligentCodeGenerator } from './intelligent-code-generator-v2'
import { AdvancedCacheService } from './advanced-cache'
import { AutomatedTestingAssistant } from './automated-testing-assistant'
import * as fs from 'fs'
import * as path from 'path'

export interface DebuggingRequest {
  filePath: string
  errorMessage?: string
  stackTrace?: string
  expectedBehavior?: string
  actualBehavior?: string
  reproducibilitySteps?: string[]
  environment: {
    language: string
    framework?: string
    version?: string
    platform: string
  }
  context: {
    userInput?: any
    systemState?: any
    logs?: string[]
    variables?: Record<string, any>
  }
  assistanceLevel: 'hint' | 'guided' | 'solution' | 'explanation'
}

export interface DebugAnalysis {
  problemType: 'syntax' | 'logic' | 'runtime' | 'performance' | 'concurrency' | 'memory'
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number // 0-100
  rootCause: RootCause
  affectedComponents: string[]
  potentialSideEffects: string[]
  debuggingStrategy: DebuggingStrategy
  solutions: DebugSolution[]
  diagnostics: DiagnosticInfo[]
  recommendations: string[]
}

export interface RootCause {
  description: string
  location: {
    file: string
    line?: number
    column?: number
    function?: string
  }
  category: string
  evidence: string[]
  relatedCauses?: RootCause[]
}

export interface DebugSolution {
  id: string
  type: 'quick-fix' | 'refactor' | 'redesign' | 'configuration'
  title: string
  description: string
  implementation: SolutionStep[]
  codeChanges: CodeChange[]
  testChanges?: CodeChange[]
  effort: 'low' | 'medium' | 'high'
  risk: 'low' | 'medium' | 'high'
  confidence: number
  tradeoffs: string[]
  verification: VerificationStep[]
}

export interface SolutionStep {
  step: number
  description: string
  action: 'modify' | 'add' | 'remove' | 'move' | 'test'
  details: string
  code?: string
}

export interface CodeChange {
  file: string
  operation: 'replace' | 'insert' | 'delete' | 'move'
  location: {
    line: number
    column?: number
  }
  oldCode?: string
  newCode: string
  reason: string
}

export interface VerificationStep {
  step: number
  description: string
  type: 'test' | 'check' | 'monitor'
  command?: string
  expectedResult: string
}

export interface DebuggingStrategy {
  approach: 'top-down' | 'bottom-up' | 'divide-conquer' | 'trace-back' | 'hypothesis-test'
  steps: StrategyStep[]
  tools: string[]
  techniques: string[]
  estimatedTime: string
}

export interface StrategyStep {
  step: number
  description: string
  action: string
  tools: string[]
  expectedOutcome: string
}

export interface DiagnosticInfo {
  type: 'variable-state' | 'flow-control' | 'memory-usage' | 'performance' | 'dependencies'
  description: string
  value: any
  analysis: string
  recommendations: string[]
}

export interface DebugSession {
  id: string
  request: DebuggingRequest
  analysis: DebugAnalysis
  progress: SessionProgress
  interactions: DebugInteraction[]
  appliedSolutions: string[]
  status: 'active' | 'resolved' | 'paused' | 'abandoned'
  startTime: Date
  endTime?: Date
}

export interface SessionProgress {
  stepsCompleted: number
  totalSteps: number
  currentPhase: 'analysis' | 'hypothesis' | 'testing' | 'implementation' | 'verification'
  issuesFound: number
  issuesResolved: number
  blockers: string[]
}

export interface DebugInteraction {
  timestamp: Date
  type: 'question' | 'analysis' | 'suggestion' | 'implementation' | 'test'
  content: string
  userResponse?: string
  outcome: 'helpful' | 'neutral' | 'unhelpful'
}

/**
 * AI-Powered Debugging Assistant
 * 
 * This service provides comprehensive debugging assistance including:
 * - Intelligent error analysis and root cause identification
 * - Step-by-step debugging guidance and strategies
 * - Automated solution generation with implementation details
 * - Interactive debugging sessions with AI assistance
 * - Performance issue detection and optimization
 * - Memory leak and concurrency problem analysis
 * - Integration with testing and code analysis services
 */
export class DebuggingAssistant extends EventEmitter {
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private codeGenerator: IntelligentCodeGenerator
  private cacheService: AdvancedCacheService
  private testingAssistant: AutomatedTestingAssistant
  private activeSessions: Map<string, DebugSession> = new Map()
  private debugHistory: Map<string, DebugAnalysis[]> = new Map()
  private knowledgeBase: Map<string, any> = new Map()
  private patterns: Map<string, any> = new Map()

  constructor(
    aiModelManager: AIModelManager,
    codeAnalysis: AdvancedCodeAnalysisService,
    codeGenerator: IntelligentCodeGenerator,
    cacheService: AdvancedCacheService,
    testingAssistant: AutomatedTestingAssistant
  ) {
    super()
    this.aiModelManager = aiModelManager
    this.codeAnalysis = codeAnalysis
    this.codeGenerator = codeGenerator
    this.cacheService = cacheService
    this.testingAssistant = testingAssistant
    this.initialize()
  }

  private async initialize(): Promise<void> {
    await this.loadKnowledgeBase()
    await this.loadErrorPatterns()
    this.setupEventHandlers()
    this.emit('initialized')
  }

  private async loadKnowledgeBase(): Promise<void> {
    const knowledgeBase = {
      commonErrors: {
        'TypeError: Cannot read property': {
          causes: ['undefined variable', 'null reference', 'async timing'],
          solutions: ['null checks', 'optional chaining', 'proper initialization']
        },
        'ReferenceError: is not defined': {
          causes: ['typo in variable name', 'scope issue', 'missing import'],
          solutions: ['check spelling', 'verify scope', 'add import statement']
        },
        'SyntaxError: Unexpected token': {
          causes: ['missing bracket', 'invalid syntax', 'encoding issue'],
          solutions: ['check brackets', 'verify syntax', 'check file encoding']
        }
      },
      performancePatterns: {
        'slow-loop': {
          pattern: /for.*length/,
          issue: 'Recalculating array length in loop',
          solution: 'Cache array length in variable'
        },
        'memory-leak': {
          pattern: /addEventListener.*removeEventListener/,
          issue: 'Event listeners not removed',
          solution: 'Add proper cleanup in componentWillUnmount or equivalent'
        }
      },
      debuggingStrategies: {
        'console-debugging': {
          description: 'Using console.log statements to trace execution',
          pros: ['Simple', 'Quick', 'Works everywhere'],
          cons: ['Clutters code', 'Manual cleanup', 'Limited info'],
          when: 'Quick debugging, simple issues'
        },
        'debugger-tool': {
          description: 'Using IDE or browser debugger with breakpoints',
          pros: ['Full variable inspection', 'Step-through execution', 'Call stack'],
          cons: ['Setup required', 'Can be slow', 'Environment dependent'],
          when: 'Complex logic, need detailed inspection'
        },
        'unit-testing': {
          description: 'Writing targeted tests to isolate issues',
          pros: ['Permanent verification', 'Regression prevention', 'Clear requirements'],
          cons: ['Time consuming', 'Requires test setup', 'May not catch integration issues'],
          when: 'Logic bugs, function-level issues, critical paths'
        }
      }
    }

    for (const [key, value] of Object.entries(knowledgeBase)) {
      this.knowledgeBase.set(key, value)
    }

    await this.cacheService.set('debug-knowledge-base', knowledgeBase, { ttl: 3600000 })
  }

  private async loadErrorPatterns(): Promise<void> {
    const patterns = {
      syntaxErrors: [
        {
          pattern: /SyntaxError.*Unexpected token/,
          type: 'syntax',
          commonCauses: ['missing brackets', 'invalid syntax', 'encoding issues'],
          quickFixes: ['check parentheses/brackets', 'verify syntax', 'check file encoding']
        },
        {
          pattern: /SyntaxError.*Unexpected end of input/,
          type: 'syntax',
          commonCauses: ['unclosed brackets', 'incomplete statements'],
          quickFixes: ['check for unclosed brackets', 'complete statements']
        }
      ],
      runtimeErrors: [
        {
          pattern: /TypeError.*Cannot read propert.*of (undefined|null)/,
          type: 'runtime',
          commonCauses: ['undefined variable', 'async timing', 'missing initialization'],
          quickFixes: ['add null checks', 'use optional chaining', 'verify initialization']
        },
        {
          pattern: /ReferenceError.*is not defined/,
          type: 'runtime',
          commonCauses: ['typo', 'scope issue', 'missing import'],
          quickFixes: ['check spelling', 'verify scope', 'add import']
        }
      ],
      logicErrors: [
        {
          pattern: /infinite.*loop/i,
          type: 'logic',
          commonCauses: ['incorrect loop condition', 'missing increment', 'logical error'],
          quickFixes: ['check loop condition', 'verify increment/decrement', 'add safeguards']
        }
      ]
    }

    for (const [category, patternList] of Object.entries(patterns)) {
      this.patterns.set(category, patternList)
    }
  }

  private setupEventHandlers(): void {
    this.on('debug-session-started', (sessionId: string) => {
      this.trackSessionStart(sessionId)
    })

    this.on('solution-applied', (sessionId: string, solutionId: string, success: boolean) => {
      this.trackSolutionApplication(sessionId, solutionId, success)
    })

    this.on('debug-session-completed', (sessionId: string, outcome: string) => {
      this.trackSessionCompletion(sessionId, outcome)
    })
  }

  /**
   * Start a new debugging session
   */
  async startDebuggingSession(request: DebuggingRequest): Promise<string> {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Perform initial analysis
      const analysis = await this.analyzeDebugRequest(request)
      
      // Create debug session
      const session: DebugSession = {
        id: sessionId,
        request,
        analysis,
        progress: {
          stepsCompleted: 0,
          totalSteps: analysis.solutions.length + analysis.debuggingStrategy.steps.length,
          currentPhase: 'analysis',
          issuesFound: 1,
          issuesResolved: 0,
          blockers: []
        },
        interactions: [],
        appliedSolutions: [],
        status: 'active',
        startTime: new Date()
      }

      this.activeSessions.set(sessionId, session)
      this.emit('debug-session-started', sessionId)
      
      return sessionId

    } catch (error) {
      this.emit('debug-error', request, error)
      throw error
    }
  }

  /**
   * Analyze debugging request and provide comprehensive analysis
   */
  async analyzeDebugRequest(request: DebuggingRequest): Promise<DebugAnalysis> {
    const cacheKey = `debug-analysis:${JSON.stringify(request)}`
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey)
    if (cached) {
      this.emit('cache-hit', cacheKey)
      return cached
    }

    try {
      // Read and analyze the code
      const codeContent = await fs.promises.readFile(request.filePath, 'utf8')
      const codeAnalysis = await this.codeAnalysis.analyzeFile(request.filePath)
      
      // Classify the problem type
      const problemType = await this.classifyProblem(request, codeContent)
      
      // Identify root cause
      const rootCause = await this.identifyRootCause(request, codeContent, problemType)
      
      // Determine affected components
      const affectedComponents = await this.findAffectedComponents(request, codeAnalysis)
      
      // Analyze potential side effects
      const potentialSideEffects = await this.analyzeSideEffects(rootCause, codeAnalysis)
      
      // Generate debugging strategy
      const debuggingStrategy = await this.generateDebuggingStrategy(request, problemType, rootCause)
      
      // Generate solutions
      const solutions = await this.generateSolutions(request, rootCause, codeContent)
      
      // Collect diagnostic information
      const diagnostics = await this.collectDiagnostics(request, codeContent, codeAnalysis)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(request, rootCause, solutions)
      
      const analysis: DebugAnalysis = {
        problemType,
        severity: this.assessSeverity(request, rootCause),
        confidence: this.calculateConfidence(rootCause, solutions),
        rootCause,
        affectedComponents,
        potentialSideEffects,
        debuggingStrategy,
        solutions,
        diagnostics,
        recommendations
      }

      // Cache the result
      await this.cacheService.set(cacheKey, analysis, { ttl: 1800000 })
      
      return analysis

    } catch (error) {
      console.error('Debug analysis failed:', error)
      throw error
    }
  }

  private async classifyProblem(request: DebuggingRequest, code: string): Promise<DebugAnalysis['problemType']> {
    // Check for syntax errors
    if (request.errorMessage?.includes('SyntaxError')) {
      return 'syntax'
    }
    
    // Check for runtime errors
    if (request.errorMessage?.includes('TypeError') || request.errorMessage?.includes('ReferenceError')) {
      return 'runtime'
    }
    
    // Check for performance issues
    if (request.actualBehavior?.includes('slow') || request.actualBehavior?.includes('timeout')) {
      return 'performance'
    }
    
    // Check for memory issues
    if (request.errorMessage?.includes('memory') || request.actualBehavior?.includes('crash')) {
      return 'memory'
    }
    
    // Default to logic error
    return 'logic'
  }

  private async identifyRootCause(request: DebuggingRequest, code: string, problemType: string): Promise<RootCause> {
    // Use AI to identify root cause
    const prompt = this.buildRootCausePrompt(request, code, problemType)
    
    try {
      const response = await this.aiModelManager.makeRequest(prompt, {
        maxTokens: 1500,
        temperature: 0.2,
        modelId: 'deepseek-coder'
      })

      return this.parseRootCauseResponse(response.content, request.filePath)

    } catch (error) {
      console.error('AI root cause analysis failed:', error)
      
      // Fallback to pattern matching
      return this.identifyRootCauseWithPatterns(request, code)
    }
  }

  private buildRootCausePrompt(request: DebuggingRequest, code: string, problemType: string): string {
    return `
# Root Cause Analysis

## Problem Information
- Type: ${problemType}
- Error Message: ${request.errorMessage || 'Not provided'}
- Expected: ${request.expectedBehavior || 'Not specified'}
- Actual: ${request.actualBehavior || 'Not specified'}

## Code to Analyze
\`\`\`${request.environment.language}
${code}
\`\`\`

## Stack Trace
${request.stackTrace || 'Not provided'}

## Environment
- Language: ${request.environment.language}
- Framework: ${request.environment.framework || 'None'}
- Platform: ${request.environment.platform}

## Context
- User Input: ${JSON.stringify(request.context.userInput) || 'Not provided'}
- System State: ${JSON.stringify(request.context.systemState) || 'Not provided'}
- Variables: ${JSON.stringify(request.context.variables) || 'Not provided'}

## Instructions
Analyze the code and context to identify the root cause of the issue. Consider:
1. Direct causes (what immediately caused the error)
2. Indirect causes (what led to the direct cause)
3. Environmental factors
4. Logic errors
5. State management issues

Provide:
- Clear description of the root cause
- Evidence supporting your analysis
- Location in code (file, line, function)
- Category of the problem

Format your response as JSON:
{
  "description": "Clear description of root cause",
  "location": {
    "file": "filename",
    "line": 10,
    "function": "functionName"
  },
  "category": "category name",
  "evidence": ["evidence1", "evidence2"],
  "confidence": 85
}
`
  }

  private parseRootCauseResponse(response: string, filePath: string): RootCause {
    try {
      const parsed = JSON.parse(response)
      
      return {
        description: parsed.description || 'Unknown root cause',
        location: {
          file: parsed.location?.file || filePath,
          line: parsed.location?.line,
          column: parsed.location?.column,
          function: parsed.location?.function
        },
        category: parsed.category || 'unknown',
        evidence: parsed.evidence || []
      }

    } catch (error) {
      console.error('Failed to parse root cause response:', error)
      
      return {
        description: 'Unable to determine root cause automatically',
        location: { file: filePath },
        category: 'unknown',
        evidence: ['AI analysis failed', 'Manual investigation required']
      }
    }
  }

  private identifyRootCauseWithPatterns(request: DebuggingRequest, code: string): RootCause {
    // Pattern-based fallback analysis
    const errorMessage = request.errorMessage || ''
    
    // Check syntax error patterns
    const syntaxPatterns = this.patterns.get('syntaxErrors') || []
    for (const pattern of syntaxPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return {
          description: `Syntax error: ${pattern.commonCauses[0]}`,
          location: { file: request.filePath },
          category: 'syntax',
          evidence: [`Error message: ${errorMessage}`, `Pattern: ${pattern.pattern}`]
        }
      }
    }
    
    // Check runtime error patterns
    const runtimePatterns = this.patterns.get('runtimeErrors') || []
    for (const pattern of runtimePatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return {
          description: `Runtime error: ${pattern.commonCauses[0]}`,
          location: { file: request.filePath },
          category: 'runtime',
          evidence: [`Error message: ${errorMessage}`, `Pattern: ${pattern.pattern}`]
        }
      }
    }
    
    // Default unknown cause
    return {
      description: 'Unable to determine root cause from available information',
      location: { file: request.filePath },
      category: 'unknown',
      evidence: ['Insufficient information for pattern matching']
    }
  }

  private async findAffectedComponents(request: DebuggingRequest, codeAnalysis: any): Promise<string[]> {
    const affected: string[] = []
    
    // Add the main file
    affected.push(request.filePath)
    
    // Find dependencies and imports
    if (codeAnalysis.imports) {
      for (const importPath of codeAnalysis.imports) {
        affected.push(importPath)
      }
    }
    
    // Find functions and classes that might be affected
    if (codeAnalysis.functions) {
      const errorLine = this.extractLineFromError(request.errorMessage)
      if (errorLine) {
        const affectedFunction = codeAnalysis.functions.find((fn: any) => 
          fn.startLine <= errorLine && fn.endLine >= errorLine
        )
        if (affectedFunction) {
          affected.push(`Function: ${affectedFunction.name}`)
        }
      }
    }
    
    return affected
  }

  private extractLineFromError(errorMessage?: string): number | null {
    if (!errorMessage) return null
    
    const lineMatch = errorMessage.match(/:(\d+):\d+/)
    return lineMatch ? parseInt(lineMatch[1]) : null
  }

  private async analyzeSideEffects(rootCause: RootCause, codeAnalysis: any): Promise<string[]> {
    const sideEffects: string[] = []
    
    // Analyze based on root cause category
    switch (rootCause.category) {
      case 'memory':
        sideEffects.push('Potential memory leaks in related components')
        sideEffects.push('Performance degradation over time')
        break
        
      case 'concurrency':
        sideEffects.push('Data corruption in shared state')
        sideEffects.push('Race conditions in related operations')
        break
        
      case 'logic':
        sideEffects.push('Incorrect calculations in dependent functions')
        sideEffects.push('Data integrity issues')
        break
        
      case 'runtime':
        sideEffects.push('Application crashes')
        sideEffects.push('User experience degradation')
        break
    }
    
    // Analyze function dependencies
    if (codeAnalysis.functions && rootCause.location.function) {
      const callers = codeAnalysis.functions.filter((fn: any) => 
        fn.calls?.includes(rootCause.location.function)
      )
      
      if (callers.length > 0) {
        sideEffects.push(`Potential issues in ${callers.length} calling function(s)`)
      }
    }
    
    return sideEffects
  }

  private async generateDebuggingStrategy(request: DebuggingRequest, problemType: string, rootCause: RootCause): Promise<DebuggingStrategy> {
    // Determine best approach based on problem type
    let approach: DebuggingStrategy['approach']
    let techniques: string[]
    let tools: string[]
    
    switch (problemType) {
      case 'syntax':
        approach = 'top-down'
        techniques = ['syntax checking', 'linting', 'static analysis']
        tools = ['ESLint', 'TypeScript compiler', 'IDE syntax highlighting']
        break
        
      case 'runtime':
        approach = 'trace-back'
        techniques = ['stack trace analysis', 'breakpoint debugging', 'console logging']
        tools = ['debugger', 'console', 'error monitoring']
        break
        
      case 'logic':
        approach = 'hypothesis-test'
        techniques = ['unit testing', 'assertion checking', 'input validation']
        tools = ['test framework', 'debugger', 'logging']
        break
        
      case 'performance':
        approach = 'divide-conquer'
        techniques = ['profiling', 'benchmarking', 'code analysis']
        tools = ['profiler', 'performance monitor', 'timing utilities']
        break
        
      default:
        approach = 'top-down'
        techniques = ['systematic investigation', 'elimination process']
        tools = ['debugger', 'logging', 'testing']
    }
    
    // Generate strategy steps
    const steps = await this.generateStrategySteps(approach, rootCause, request)
    
    return {
      approach,
      steps,
      tools,
      techniques,
      estimatedTime: this.estimateDebuggingTime(problemType, rootCause)
    }
  }

  private async generateStrategySteps(approach: string, rootCause: RootCause, request: DebuggingRequest): Promise<StrategyStep[]> {
    const steps: StrategyStep[] = []
    
    switch (approach) {
      case 'trace-back':
        steps.push(
          {
            step: 1,
            description: 'Analyze the stack trace to identify the call sequence',
            action: 'Examine stack trace and identify entry point',
            tools: ['debugger', 'stack trace'],
            expectedOutcome: 'Understand execution path leading to error'
          },
          {
            step: 2,
            description: 'Set breakpoints at key points in the execution path',
            action: 'Place breakpoints before the error location',
            tools: ['debugger'],
            expectedOutcome: 'Ability to inspect state at critical points'
          },
          {
            step: 3,
            description: 'Execute code and inspect variables at each breakpoint',
            action: 'Run code with debugger and examine variable values',
            tools: ['debugger', 'variable inspector'],
            expectedOutcome: 'Identify the point where values become incorrect'
          }
        )
        break
        
      case 'hypothesis-test':
        steps.push(
          {
            step: 1,
            description: 'Form hypothesis about the root cause',
            action: 'Based on symptoms, create testable hypothesis',
            tools: ['analysis', 'documentation'],
            expectedOutcome: 'Clear hypothesis to test'
          },
          {
            step: 2,
            description: 'Create test case to validate hypothesis',
            action: 'Write minimal test that reproduces the issue',
            tools: ['test framework'],
            expectedOutcome: 'Reproducible test case'
          },
          {
            step: 3,
            description: 'Implement fix based on hypothesis',
            action: 'Apply the proposed solution',
            tools: ['code editor'],
            expectedOutcome: 'Modified code with potential fix'
          },
          {
            step: 4,
            description: 'Verify fix with test case',
            action: 'Run test to confirm issue is resolved',
            tools: ['test framework'],
            expectedOutcome: 'Passing test or refined hypothesis'
          }
        )
        break
        
      default:
        steps.push(
          {
            step: 1,
            description: 'Gather all available information about the issue',
            action: 'Collect error messages, logs, and reproduction steps',
            tools: ['logging', 'error monitoring'],
            expectedOutcome: 'Complete picture of the problem'
          },
          {
            step: 2,
            description: 'Isolate the problematic code section',
            action: 'Narrow down the location of the issue',
            tools: ['debugger', 'binary search'],
            expectedOutcome: 'Identified code section containing the bug'
          },
          {
            step: 3,
            description: 'Implement and test the solution',
            action: 'Apply fix and verify it resolves the issue',
            tools: ['code editor', 'testing'],
            expectedOutcome: 'Working solution'
          }
        )
    }
    
    return steps
  }

  private estimateDebuggingTime(problemType: string, rootCause: RootCause): string {
    const baseTime: Record<string, number> = {
      'syntax': 15, // minutes
      'runtime': 45,
      'logic': 90,
      'performance': 120,
      'concurrency': 180,
      'memory': 150
    }
    
    const time = baseTime[problemType] || 60
    
    // Adjust based on complexity
    const complexityMultiplier = rootCause.evidence.length > 3 ? 1.5 : 1
    const adjustedTime = time * complexityMultiplier
    
    if (adjustedTime < 60) {
      return `${Math.round(adjustedTime)} minutes`
    } else {
      return `${Math.round(adjustedTime / 60)} hours`
    }
  }

  private async generateSolutions(request: DebuggingRequest, rootCause: RootCause, code: string): Promise<DebugSolution[]> {
    const solutions: DebugSolution[] = []
    
    // Generate AI-powered solutions
    const aiSolutions = await this.generateAISolutions(request, rootCause, code)
    solutions.push(...aiSolutions)
    
    // Generate pattern-based solutions
    const patternSolutions = await this.generatePatternBasedSolutions(request, rootCause)
    solutions.push(...patternSolutions)
    
    // Sort by confidence and effort
    return solutions.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence
      }
      
      const effortOrder = { low: 1, medium: 2, high: 3 }
      return effortOrder[a.effort] - effortOrder[b.effort]
    })
  }

  private async generateAISolutions(request: DebuggingRequest, rootCause: RootCause, code: string): Promise<DebugSolution[]> {
    const prompt = `
# Generate Debug Solutions

## Problem Analysis
- Root Cause: ${rootCause.description}
- Category: ${rootCause.category}
- Location: ${rootCause.location.file}:${rootCause.location.line || 'unknown'}
- Evidence: ${rootCause.evidence.join(', ')}

## Current Code
\`\`\`${request.environment.language}
${code}
\`\`\`

## Error Information
- Message: ${request.errorMessage || 'Not provided'}
- Expected: ${request.expectedBehavior || 'Not specified'}
- Actual: ${request.actualBehavior || 'Not specified'}

## Assistance Level
${request.assistanceLevel}

## Instructions
Generate solutions to fix the identified issue. For each solution, provide:
1. Type (quick-fix, refactor, redesign, configuration)
2. Title and description
3. Step-by-step implementation
4. Code changes with exact line references
5. Effort and risk assessment
6. Verification steps

Consider multiple approaches:
- Quick fixes for immediate resolution
- Robust solutions for long-term stability
- Preventive measures to avoid similar issues

Format as JSON:
{
  "solutions": [
    {
      "type": "quick-fix",
      "title": "Solution Title",
      "description": "Detailed description",
      "implementation": [
        {
          "step": 1,
          "description": "Step description",
          "action": "modify",
          "details": "What to do",
          "code": "code snippet"
        }
      ],
      "codeChanges": [
        {
          "file": "filename",
          "operation": "replace",
          "location": {"line": 10},
          "oldCode": "old code",
          "newCode": "new code",
          "reason": "why this change"
        }
      ],
      "effort": "low",
      "risk": "low",
      "confidence": 90,
      "tradeoffs": ["tradeoff1"],
      "verification": [
        {
          "step": 1,
          "description": "How to verify",
          "type": "test",
          "expectedResult": "Expected outcome"
        }
      ]
    }
  ]
}
`

    try {
      const response = await this.aiModelManager.makeRequest(prompt, {
        maxTokens: 3000,
        temperature: 0.3,
        modelId: 'deepseek-coder'
      })

      return this.parseAISolutions(response.content)

    } catch (error) {
      console.error('AI solution generation failed:', error)
      return []
    }
  }

  private parseAISolutions(response: string): DebugSolution[] {
    try {
      const parsed = JSON.parse(response)
      const solutions: DebugSolution[] = []
      
      if (parsed.solutions && Array.isArray(parsed.solutions)) {
        for (const aiSolution of parsed.solutions) {
          solutions.push({
            id: `ai-solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: aiSolution.type || 'quick-fix',
            title: aiSolution.title,
            description: aiSolution.description,
            implementation: aiSolution.implementation || [],
            codeChanges: aiSolution.codeChanges || [],
            testChanges: aiSolution.testChanges || [],
            effort: aiSolution.effort || 'medium',
            risk: aiSolution.risk || 'medium',
            confidence: aiSolution.confidence || 70,
            tradeoffs: aiSolution.tradeoffs || [],
            verification: aiSolution.verification || []
          })
        }
      }
      
      return solutions

    } catch (error) {
      console.error('Failed to parse AI solutions:', error)
      return []
    }
  }

  private async generatePatternBasedSolutions(request: DebuggingRequest, rootCause: RootCause): Promise<DebugSolution[]> {
    const solutions: DebugSolution[] = []
    
    // Check for common error patterns and their solutions
    const errorMessage = request.errorMessage || ''
    
    if (errorMessage.includes('Cannot read property') && errorMessage.includes('undefined')) {
      solutions.push({
        id: `pattern-null-check-${Date.now()}`,
        type: 'quick-fix',
        title: 'Add Null Check',
        description: 'Add null/undefined check before property access',
        implementation: [
          {
            step: 1,
            description: 'Identify the variable causing undefined error',
            action: 'modify',
            details: 'Find the line with property access on undefined',
            code: ''
          },
          {
            step: 2,
            description: 'Add null check before property access',
            action: 'modify',
            details: 'Wrap property access in conditional check',
            code: 'if (variable && variable.property) { /* use variable.property */ }'
          }
        ],
        codeChanges: [
          {
            file: request.filePath,
            operation: 'replace',
            location: { line: rootCause.location.line || 1 },
            newCode: 'if (variable && variable.property) { /* existing code */ }',
            reason: 'Prevent undefined property access'
          }
        ],
        effort: 'low',
        risk: 'low',
        confidence: 85,
        tradeoffs: ['Adds conditional logic', 'May mask deeper initialization issues'],
        verification: [
          {
            step: 1,
            description: 'Test with the same input that caused the error',
            type: 'test',
            expectedResult: 'No more undefined property errors'
          }
        ]
      })
    }
    
    return solutions
  }

  private async collectDiagnostics(request: DebuggingRequest, code: string, codeAnalysis: any): Promise<DiagnosticInfo[]> {
    const diagnostics: DiagnosticInfo[] = []
    
    // Variable state diagnostics
    if (request.context.variables) {
      diagnostics.push({
        type: 'variable-state',
        description: 'Current variable values at time of error',
        value: request.context.variables,
        analysis: 'Variables may contain unexpected values or types',
        recommendations: ['Verify variable initialization', 'Check type consistency', 'Add validation']
      })
    }
    
    // Flow control diagnostics
    if (codeAnalysis.metrics?.cyclomaticComplexity > 10) {
      diagnostics.push({
        type: 'flow-control',
        description: 'High cyclomatic complexity detected',
        value: codeAnalysis.metrics.cyclomaticComplexity,
        analysis: 'Complex control flow increases bug likelihood',
        recommendations: ['Break down complex functions', 'Reduce nesting levels', 'Add unit tests']
      })
    }
    
    // Performance diagnostics
    if (request.actualBehavior?.includes('slow')) {
      diagnostics.push({
        type: 'performance',
        description: 'Performance issue detected',
        value: 'Slow execution reported',
        analysis: 'Code may contain performance bottlenecks',
        recommendations: ['Profile execution time', 'Check for inefficient loops', 'Optimize algorithms']
      })
    }
    
    return diagnostics
  }

  private async generateRecommendations(request: DebuggingRequest, rootCause: RootCause, solutions: DebugSolution[]): Promise<string[]> {
    const recommendations: string[] = []
    
    // Based on root cause category
    switch (rootCause.category) {
      case 'syntax':
        recommendations.push('Enable syntax highlighting and linting in your IDE')
        recommendations.push('Use TypeScript for better compile-time error detection')
        break
        
      case 'runtime':
        recommendations.push('Add comprehensive error handling with try-catch blocks')
        recommendations.push('Implement input validation for all function parameters')
        recommendations.push('Use defensive programming practices')
        break
        
      case 'logic':
        recommendations.push('Write unit tests to verify function behavior')
        recommendations.push('Use test-driven development (TDD) approach')
        recommendations.push('Add assertions to verify assumptions')
        break
        
      case 'performance':
        recommendations.push('Implement performance monitoring and profiling')
        recommendations.push('Use efficient algorithms and data structures')
        recommendations.push('Consider caching for expensive operations')
        break
    }
    
    // Based on assistance level
    if (request.assistanceLevel === 'hint') {
      recommendations.push('Break down the problem into smaller parts')
      recommendations.push('Use systematic debugging approach')
    } else if (request.assistanceLevel === 'solution') {
      recommendations.push('Implement the suggested solutions step by step')
      recommendations.push('Test each change thoroughly before proceeding')
    }
    
    // Based on solutions available
    if (solutions.some(s => s.type === 'refactor')) {
      recommendations.push('Consider refactoring to improve code maintainability')
    }
    
    if (solutions.some(s => s.risk === 'high')) {
      recommendations.push('Test high-risk changes in a separate branch first')
      recommendations.push('Have the changes reviewed by a team member')
    }
    
    return recommendations
  }

  private assessSeverity(request: DebuggingRequest, rootCause: RootCause): DebugAnalysis['severity'] {
    // Critical: System crashes, data loss, security issues
    if (rootCause.category === 'memory' || 
        request.errorMessage?.includes('crash') ||
        request.actualBehavior?.includes('data loss')) {
      return 'critical'
    }
    
    // High: Application errors, functional failures
    if (rootCause.category === 'runtime' ||
        request.errorMessage?.includes('Error') ||
        request.actualBehavior?.includes('fail')) {
      return 'high'
    }
    
    // Medium: Performance issues, logic errors
    if (rootCause.category === 'performance' || 
        rootCause.category === 'logic') {
      return 'medium'
    }
    
    // Low: Style issues, minor problems
    return 'low'
  }

  private calculateConfidence(rootCause: RootCause, solutions: DebugSolution[]): number {
    let confidence = 50 // Base confidence
    
    // Increase confidence based on evidence
    confidence += rootCause.evidence.length * 10
    
    // Increase confidence if multiple solutions agree
    if (solutions.length > 1) {
      confidence += 15
    }
    
    // Decrease confidence for unknown categories
    if (rootCause.category === 'unknown') {
      confidence -= 30
    }
    
    return Math.min(100, Math.max(0, confidence))
  }

  /**
   * Get debugging session status and progress
   */
  getSessionStatus(sessionId: string): DebugSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Apply a solution from the debugging session
   */
  async applySolution(sessionId: string, solutionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      return { success: false, message: 'Session not found' }
    }

    const solution = session.analysis.solutions.find(s => s.id === solutionId)
    if (!solution) {
      return { success: false, message: 'Solution not found' }
    }

    try {
      // Apply code changes
      for (const change of solution.codeChanges) {
        await this.applyCodeChange(change)
      }
      
      // Mark solution as applied
      session.appliedSolutions.push(solutionId)
      session.progress.stepsCompleted++
      
      // Update session
      this.activeSessions.set(sessionId, session)
      
      this.emit('solution-applied', sessionId, solutionId, true)
      
      return { success: true, message: 'Solution applied successfully' }

    } catch (error) {
      this.emit('solution-applied', sessionId, solutionId, false)
      return { success: false, message: `Failed to apply solution: ${error}` }
    }
  }

  private async applyCodeChange(change: CodeChange): Promise<void> {
    const content = await fs.promises.readFile(change.file, 'utf8')
    const lines = content.split('\n')
    
    switch (change.operation) {
      case 'replace':
        if (change.oldCode && lines[change.location.line - 1] === change.oldCode) {
          lines[change.location.line - 1] = change.newCode
        } else {
          lines[change.location.line - 1] = change.newCode
        }
        break
        
      case 'insert':
        lines.splice(change.location.line - 1, 0, change.newCode)
        break
        
      case 'delete':
        lines.splice(change.location.line - 1, 1)
        break
    }
    
    await fs.promises.writeFile(change.file, lines.join('\n'), 'utf8')
  }

  /**
   * Complete debugging session
   */
  async completeSession(sessionId: string, outcome: 'resolved' | 'abandoned'): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.status = outcome
    session.endTime = new Date()
    
    // Update progress
    if (outcome === 'resolved') {
      session.progress.issuesResolved = session.progress.issuesFound
      session.progress.currentPhase = 'verification'
    }
    
    // Store in history
    const history = this.debugHistory.get(session.request.filePath) || []
    history.push(session.analysis)
    this.debugHistory.set(session.request.filePath, history.slice(-10))
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId)
    
    this.emit('debug-session-completed', sessionId, outcome)
  }

  // Helper methods
  private trackSessionStart(sessionId: string): void {
    console.log(`Debug session started: ${sessionId}`)
  }

  private trackSolutionApplication(sessionId: string, solutionId: string, success: boolean): void {
    console.log(`Solution ${solutionId} ${success ? 'applied' : 'failed'} in session ${sessionId}`)
  }

  private trackSessionCompletion(sessionId: string, outcome: string): void {
    console.log(`Debug session ${sessionId} completed with outcome: ${outcome}`)
  }

  /**
   * Get debugging statistics and insights
   */
  getDebuggingStatistics(): any {
    const allSessions = Array.from(this.activeSessions.values())
    const allHistory = Array.from(this.debugHistory.values()).flat()
    
    return {
      activeSessions: allSessions.length,
      totalDebugSessions: allHistory.length,
      mostCommonIssues: this.getMostCommonIssues(allHistory),
      averageResolutionTime: this.calculateAverageResolutionTime(allSessions),
      successRate: this.calculateSuccessRate(allSessions)
    }
  }

  private getMostCommonIssues(history: DebugAnalysis[]): Record<string, number> {
    const issues: Record<string, number> = {}
    
    for (const analysis of history) {
      const category = analysis.rootCause.category
      issues[category] = (issues[category] || 0) + 1
    }
    
    return issues
  }

  private calculateAverageResolutionTime(sessions: DebugSession[]): number {
    const completedSessions = sessions.filter(s => s.endTime)
    if (completedSessions.length === 0) return 0
    
    const totalTime = completedSessions.reduce((sum, session) => {
      return sum + (session.endTime!.getTime() - session.startTime.getTime())
    }, 0)
    
    return totalTime / completedSessions.length / 1000 / 60 // Convert to minutes
  }

  private calculateSuccessRate(sessions: DebugSession[]): number {
    const completedSessions = sessions.filter(s => s.status !== 'active')
    if (completedSessions.length === 0) return 0
    
    const resolvedSessions = completedSessions.filter(s => s.status === 'resolved')
    return (resolvedSessions.length / completedSessions.length) * 100
  }
}
