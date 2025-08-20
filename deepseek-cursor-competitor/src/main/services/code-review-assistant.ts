import { EventEmitter } from 'events'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { IntelligentCodeGenerator } from './intelligent-code-generator-v2'
import { AdvancedCacheService } from './advanced-cache'
import { AutomatedTestingAssistant } from './automated-testing-assistant'
import * as fs from 'fs'
import * as path from 'path'

export interface CodeReviewRequest {
  filePath: string
  changes?: string[]
  reviewType: 'full' | 'diff' | 'focused' | 'security' | 'performance' | 'style'
  severity: 'low' | 'medium' | 'high' | 'critical'
  standards: {
    codingStandard?: 'airbnb' | 'google' | 'microsoft' | 'custom'
    language: string
    framework?: string
    customRules?: string[]
  }
  context: {
    projectType: string
    teamSize: 'small' | 'medium' | 'large'
    experience: 'junior' | 'mid' | 'senior'
    deadline: 'urgent' | 'normal' | 'relaxed'
  }
}

export interface ReviewResult {
  score: number // 0-100
  issues: Issue[]
  suggestions: Suggestion[]
  compliments: string[]
  summary: ReviewSummary
  metrics: CodeMetrics
  actionItems: ActionItem[]
  reviewTime: number
}

export interface Issue {
  id: string
  type: 'bug' | 'vulnerability' | 'performance' | 'maintainability' | 'style' | 'logic'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location: {
    file: string
    line: number
    column?: number
    snippet?: string
  }
  suggestion: string
  autoFixable: boolean
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  confidence: number // 0-100
  categories: string[]
  relatedIssues?: string[]
}

export interface Suggestion {
  id: string
  type: 'enhancement' | 'optimization' | 'refactoring' | 'best-practice' | 'documentation'
  title: string
  description: string
  implementation: string
  benefits: string[]
  effort: 'low' | 'medium' | 'high'
  priority: number // 1-10
  examples?: string[]
}

export interface ReviewSummary {
  totalIssues: number
  criticalIssues: number
  highPriorityIssues: number
  autoFixableIssues: number
  estimatedFixTime: string
  codeQuality: 'poor' | 'fair' | 'good' | 'excellent'
  maintainabilityIndex: number
  technicalDebt: 'low' | 'medium' | 'high'
  readabilityScore: number
}

export interface CodeMetrics {
  linesOfCode: number
  cyclomaticComplexity: number
  cognitiveComplexity: number
  duplicateLines: number
  testCoverage?: number
  documentationCoverage: number
  dependencyCount: number
  codeSmells: number
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  estimatedHours: number
  dependencies: string[]
  dueDate?: Date
}

export interface ReviewTemplate {
  name: string
  focus: string[]
  rules: ReviewRule[]
  weights: Record<string, number>
  thresholds: Record<string, number>
}

export interface ReviewRule {
  id: string
  name: string
  description: string
  severity: string
  category: string
  pattern?: RegExp
  check: (code: string, context?: any) => boolean
  message: string
  autoFix?: (code: string) => string
}

/**
 * AI-Powered Code Review Assistant
 * 
 * This service provides comprehensive automated code review capabilities including:
 * - Intelligent issue detection and classification
 * - Security vulnerability scanning
 * - Performance optimization suggestions
 * - Code style and best practices enforcement
 * - Automated fix suggestions with confidence scoring
 * - Team-specific review templates and standards
 * - Integration with existing review workflows
 */
export class CodeReviewAssistant extends EventEmitter {
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private codeGenerator: IntelligentCodeGenerator
  private cacheService: AdvancedCacheService
  private testingAssistant: AutomatedTestingAssistant
  private reviewHistory: Map<string, ReviewResult[]> = new Map()
  private reviewTemplates: Map<string, ReviewTemplate> = new Map()
  private customRules: Map<string, ReviewRule[]> = new Map()
  private teamStandards: Map<string, any> = new Map()

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
    await this.loadReviewTemplates()
    await this.loadCustomRules()
    this.setupEventHandlers()
    this.emit('initialized')
  }

  private async loadReviewTemplates(): Promise<void> {
    const templates: ReviewTemplate[] = [
      {
        name: 'comprehensive',
        focus: ['bugs', 'security', 'performance', 'maintainability', 'style'],
        rules: [],
        weights: {
          bugs: 0.3,
          security: 0.25,
          performance: 0.2,
          maintainability: 0.15,
          style: 0.1
        },
        thresholds: {
          minScore: 70,
          maxIssues: 20,
          maxCritical: 0
        }
      },
      {
        name: 'security-focused',
        focus: ['security', 'vulnerabilities', 'data-protection'],
        rules: [],
        weights: {
          security: 0.6,
          bugs: 0.25,
          performance: 0.1,
          maintainability: 0.05
        },
        thresholds: {
          minScore: 80,
          maxCritical: 0,
          maxHigh: 3
        }
      },
      {
        name: 'performance-focused',
        focus: ['performance', 'optimization', 'scalability'],
        rules: [],
        weights: {
          performance: 0.5,
          bugs: 0.3,
          maintainability: 0.15,
          style: 0.05
        },
        thresholds: {
          minScore: 75,
          maxPerformanceIssues: 5
        }
      },
      {
        name: 'style-focused',
        focus: ['style', 'consistency', 'readability'],
        rules: [],
        weights: {
          style: 0.4,
          maintainability: 0.3,
          readability: 0.2,
          bugs: 0.1
        },
        thresholds: {
          minScore: 85,
          minReadability: 80
        }
      }
    ]

    for (const template of templates) {
      this.reviewTemplates.set(template.name, template)
    }

    await this.cacheService.set('review-templates', templates, { ttl: 3600000 })
  }

  private async loadCustomRules(): Promise<void> {
    const commonRules: ReviewRule[] = [
      {
        id: 'no-console-log',
        name: 'No Console Logging',
        description: 'Console.log statements should not be present in production code',
        severity: 'medium',
        category: 'style',
        pattern: /console\.(log|debug|info|warn|error)/,
        check: (code: string) => !/console\.(log|debug|info|warn|error)/.test(code),
        message: 'Remove console logging statements before production',
        autoFix: (code: string) => code.replace(/console\.(log|debug|info|warn|error)\([^)]*\);?\n?/g, '')
      },
      {
        id: 'no-hardcoded-secrets',
        name: 'No Hardcoded Secrets',
        description: 'API keys, passwords, and secrets should not be hardcoded',
        severity: 'critical',
        category: 'security',
        pattern: /(api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']+["']/i,
        check: (code: string) => !/(api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']+["']/i.test(code),
        message: 'Move secrets to environment variables or secure configuration'
      },
      {
        id: 'prefer-const',
        name: 'Prefer Const Over Let',
        description: 'Use const for variables that are not reassigned',
        severity: 'low',
        category: 'style',
        check: (code: string) => true, // Complex logic would be implemented
        message: 'Use const instead of let when variable is not reassigned',
        autoFix: (code: string) => code.replace(/\blet\s+(\w+)\s*=\s*([^;]+);(?![^=]*=)/g, 'const $1 = $2;')
      },
      {
        id: 'no-var',
        name: 'No Var Declarations',
        description: 'Use let or const instead of var',
        severity: 'medium',
        category: 'style',
        pattern: /\bvar\s+/,
        check: (code: string) => !/\bvar\s+/.test(code),
        message: 'Use let or const instead of var',
        autoFix: (code: string) => code.replace(/\bvar\b/g, 'let')
      },
      {
        id: 'function-complexity',
        name: 'Function Complexity',
        description: 'Functions should not be overly complex',
        severity: 'high',
        category: 'maintainability',
        check: (code: string) => {
          // Simplified complexity check
          const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]+}/g)
          if (!functionMatches) return true
          
          return functionMatches.every(func => {
            const ifCount = (func.match(/\bif\b/g) || []).length
            const forCount = (func.match(/\bfor\b/g) || []).length
            const whileCount = (func.match(/\bwhile\b/g) || []).length
            const switchCount = (func.match(/\bswitch\b/g) || []).length
            
            return (ifCount + forCount + whileCount + switchCount) <= 10
          })
        },
        message: 'Consider breaking down complex functions into smaller, more manageable pieces'
      }
    ]

    this.customRules.set('common', commonRules)
    await this.cacheService.set('custom-rules', commonRules, { ttl: 3600000 })
  }

  private setupEventHandlers(): void {
    this.on('review-completed', (request: CodeReviewRequest, result: ReviewResult) => {
      this.recordReviewHistory(request, result)
    })

    this.on('issue-detected', (issue: Issue) => {
      this.trackIssuePattern(issue)
    })

    this.on('fix-applied', (issueId: string, success: boolean) => {
      this.trackFixSuccess(issueId, success)
    })
  }

  /**
   * Perform comprehensive code review
   */
  async reviewCode(request: CodeReviewRequest): Promise<ReviewResult> {
    const startTime = Date.now()
    const cacheKey = `review:${request.filePath}:${JSON.stringify(request)}`
    
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
      
      // Perform different types of review based on request
      const issues = await this.detectIssues(codeContent, request, codeAnalysis)
      const suggestions = await this.generateSuggestions(codeContent, request, codeAnalysis)
      const compliments = await this.findPositiveAspects(codeContent, codeAnalysis)
      const metrics = await this.calculateMetrics(codeContent, codeAnalysis)
      
      // Calculate overall score
      const score = this.calculateOverallScore(issues, metrics, request)
      
      // Generate summary
      const summary = this.generateReviewSummary(issues, metrics, score)
      
      // Create action items
      const actionItems = this.createActionItems(issues, suggestions)
      
      const result: ReviewResult = {
        score,
        issues,
        suggestions,
        compliments,
        summary,
        metrics,
        actionItems,
        reviewTime: Date.now() - startTime
      }

      // Cache the result
      await this.cacheService.set(cacheKey, result, { ttl: 1800000 })
      
      this.emit('review-completed', request, result)
      return result

    } catch (error) {
      this.emit('review-error', request, error)
      throw error
    }
  }

  private async detectIssues(code: string, request: CodeReviewRequest, analysis: any): Promise<Issue[]> {
    const issues: Issue[] = []
    
    // Get applicable rules
    const rules = await this.getApplicableRules(request)
    
    // Run rule-based checks
    for (const rule of rules) {
      const ruleIssues = await this.applyRule(rule, code, request.filePath, analysis)
      issues.push(...ruleIssues)
    }
    
    // AI-powered issue detection
    const aiIssues = await this.detectIssuesWithAI(code, request, analysis)
    issues.push(...aiIssues)
    
    // Security-specific checks
    if (request.reviewType === 'security' || request.reviewType === 'full') {
      const securityIssues = await this.detectSecurityIssues(code, request.filePath)
      issues.push(...securityIssues)
    }
    
    // Performance-specific checks
    if (request.reviewType === 'performance' || request.reviewType === 'full') {
      const performanceIssues = await this.detectPerformanceIssues(code, analysis)
      issues.push(...performanceIssues)
    }

    // Deduplicate and sort by severity
    return this.deduplicateAndSortIssues(issues)
  }

  private async getApplicableRules(request: CodeReviewRequest): Promise<ReviewRule[]> {
    const rules: ReviewRule[] = []
    
    // Get common rules
    const commonRules = this.customRules.get('common') || []
    rules.push(...commonRules)
    
    // Get language-specific rules
    const languageRules = this.customRules.get(request.standards.language) || []
    rules.push(...languageRules)
    
    // Get custom rules if specified
    if (request.standards.customRules) {
      for (const ruleId of request.standards.customRules) {
        const customRule = await this.loadCustomRule(ruleId)
        if (customRule) rules.push(customRule)
      }
    }

    return rules
  }

  private async loadCustomRule(ruleId: string): Promise<ReviewRule | null> {
    try {
      // This would load custom rules from a database or file system
      const cached = await this.cacheService.get(`custom-rule:${ruleId}`)
      return cached || null
    } catch {
      return null
    }
  }

  private async applyRule(rule: ReviewRule, code: string, filePath: string, analysis: any): Promise<Issue[]> {
    const issues: Issue[] = []
    
    try {
      // Apply pattern-based checks
      if (rule.pattern) {
        const matches = code.matchAll(new RegExp(rule.pattern.source, 'gm'))
        
        for (const match of matches) {
          if (match.index !== undefined) {
            const lineInfo = this.getLineInfo(code, match.index)
            
            issues.push({
              id: `${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: this.categorizeIssueType(rule.category),
              severity: rule.severity as any,
              title: rule.name,
              description: rule.description,
              location: {
                file: filePath,
                line: lineInfo.line,
                column: lineInfo.column,
                snippet: lineInfo.snippet
              },
              suggestion: rule.message,
              autoFixable: !!rule.autoFix,
              effort: this.estimateEffort(rule),
              impact: this.estimateImpact(rule),
              confidence: 85,
              categories: [rule.category]
            })
          }
        }
      }
      
      // Apply function-based checks
      if (rule.check && !rule.check(code, analysis)) {
        issues.push({
          id: `${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: this.categorizeIssueType(rule.category),
          severity: rule.severity as any,
          title: rule.name,
          description: rule.description,
          location: {
            file: filePath,
            line: 1,
            snippet: 'General issue'
          },
          suggestion: rule.message,
          autoFixable: !!rule.autoFix,
          effort: this.estimateEffort(rule),
          impact: this.estimateImpact(rule),
          confidence: 80,
          categories: [rule.category]
        })
      }

    } catch (error) {
      console.error(`Rule application failed for ${rule.id}:`, error)
    }

    return issues
  }

  private getLineInfo(code: string, index: number): { line: number; column: number; snippet: string } {
    const beforeMatch = code.substring(0, index)
    const lines = beforeMatch.split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1
    
    const allLines = code.split('\n')
    const snippet = allLines[line - 1] || ''
    
    return { line, column, snippet }
  }

  private categorizeIssueType(category: string): Issue['type'] {
    const mapping: Record<string, Issue['type']> = {
      'security': 'vulnerability',
      'performance': 'performance',
      'style': 'style',
      'maintainability': 'maintainability',
      'logic': 'logic'
    }
    
    return mapping[category] || 'bug'
  }

  private estimateEffort(rule: ReviewRule): 'low' | 'medium' | 'high' {
    if (rule.autoFix) return 'low'
    if (rule.severity === 'critical' || rule.severity === 'high') return 'high'
    return 'medium'
  }

  private estimateImpact(rule: ReviewRule): 'low' | 'medium' | 'high' {
    if (rule.severity === 'critical') return 'high'
    if (rule.severity === 'high') return 'high'
    if (rule.severity === 'medium') return 'medium'
    return 'low'
  }

  private async detectIssuesWithAI(code: string, request: CodeReviewRequest, analysis: any): Promise<Issue[]> {
    const prompt = this.buildAIReviewPrompt(code, request, analysis)
    
    try {
      const response = await this.aiModelManager.makeRequest(prompt, {
        maxTokens: 2000,
        temperature: 0.2,
        modelId: 'deepseek-coder'
      })

      return this.parseAIResponse(response.content, request.filePath)

    } catch (error) {
      console.error('AI issue detection failed:', error)
      return []
    }
  }

  private buildAIReviewPrompt(code: string, request: CodeReviewRequest, analysis: any): string {
    return `
# Code Review Analysis

## Code to Review
\`\`\`${request.standards.language}
${code}
\`\`\`

## Review Context
- Review Type: ${request.reviewType}
- Language: ${request.standards.language}
- Framework: ${request.standards.framework || 'None'}
- Team Experience: ${request.context.experience}
- Project Type: ${request.context.projectType}

## Code Analysis
- Lines of Code: ${analysis.metrics?.linesOfCode || 0}
- Complexity: ${analysis.metrics?.cyclomaticComplexity || 0}
- Functions: ${analysis.methods?.length || 0}
- Classes: ${analysis.classes?.length || 0}

## Instructions
Analyze the code and identify issues in the following categories:
1. Bugs and Logic Errors
2. Security Vulnerabilities
3. Performance Issues
4. Maintainability Problems
5. Code Style Violations

For each issue found, provide:
- Type (bug/vulnerability/performance/maintainability/style)
- Severity (low/medium/high/critical)
- Description
- Line number (if applicable)
- Specific suggestion for improvement
- Whether it's auto-fixable

Format your response as JSON with this structure:
{
  "issues": [
    {
      "type": "bug",
      "severity": "high",
      "title": "Issue Title",
      "description": "Detailed description",
      "line": 10,
      "suggestion": "How to fix it",
      "autoFixable": false
    }
  ]
}
`
  }

  private parseAIResponse(response: string, filePath: string): Issue[] {
    try {
      const parsed = JSON.parse(response)
      const issues: Issue[] = []
      
      if (parsed.issues && Array.isArray(parsed.issues)) {
        for (const aiIssue of parsed.issues) {
          issues.push({
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: aiIssue.type || 'bug',
            severity: aiIssue.severity || 'medium',
            title: aiIssue.title,
            description: aiIssue.description,
            location: {
              file: filePath,
              line: aiIssue.line || 1,
              snippet: aiIssue.snippet || ''
            },
            suggestion: aiIssue.suggestion,
            autoFixable: aiIssue.autoFixable || false,
            effort: this.mapSeverityToEffort(aiIssue.severity),
            impact: this.mapSeverityToImpact(aiIssue.severity),
            confidence: 75, // AI confidence is generally lower
            categories: [aiIssue.type]
          })
        }
      }
      
      return issues

    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return []
    }
  }

  private mapSeverityToEffort(severity: string): 'low' | 'medium' | 'high' {
    if (severity === 'critical' || severity === 'high') return 'high'
    if (severity === 'medium') return 'medium'
    return 'low'
  }

  private mapSeverityToImpact(severity: string): 'low' | 'medium' | 'high' {
    if (severity === 'critical') return 'high'
    if (severity === 'high') return 'high'
    if (severity === 'medium') return 'medium'
    return 'low'
  }

  private async detectSecurityIssues(code: string, filePath: string): Promise<Issue[]> {
    const issues: Issue[] = []
    
    // SQL Injection patterns
    const sqlInjectionPattern = /[\w\s]*=[\s]*["'].*\+.*["']/g
    const sqlMatches = code.matchAll(sqlInjectionPattern)
    
    for (const match of sqlMatches) {
      if (match.index !== undefined) {
        const lineInfo = this.getLineInfo(code, match.index)
        issues.push({
          id: `sec-sql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'vulnerability',
          severity: 'high',
          title: 'Potential SQL Injection',
          description: 'String concatenation in SQL queries can lead to SQL injection vulnerabilities',
          location: {
            file: filePath,
            line: lineInfo.line,
            column: lineInfo.column,
            snippet: lineInfo.snippet
          },
          suggestion: 'Use parameterized queries or prepared statements',
          autoFixable: false,
          effort: 'medium',
          impact: 'high',
          confidence: 80,
          categories: ['security', 'vulnerability']
        })
      }
    }

    // XSS patterns
    const xssPattern = /innerHTML\s*=\s*.*\+/g
    const xssMatches = code.matchAll(xssPattern)
    
    for (const match of xssMatches) {
      if (match.index !== undefined) {
        const lineInfo = this.getLineInfo(code, match.index)
        issues.push({
          id: `sec-xss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'vulnerability',
          severity: 'medium',
          title: 'Potential XSS Vulnerability',
          description: 'Dynamic HTML generation can lead to XSS attacks',
          location: {
            file: filePath,
            line: lineInfo.line,
            column: lineInfo.column,
            snippet: lineInfo.snippet
          },
          suggestion: 'Sanitize user input or use textContent instead of innerHTML',
          autoFixable: false,
          effort: 'medium',
          impact: 'medium',
          confidence: 75,
          categories: ['security', 'vulnerability']
        })
      }
    }

    return issues
  }

  private async detectPerformanceIssues(code: string, analysis: any): Promise<Issue[]> {
    const issues: Issue[] = []
    
    // Inefficient loops
    const nestedLoopPattern = /for\s*\([^)]*\)[^{]*{[^}]*for\s*\([^)]*\)/g
    const nestedLoopMatches = code.matchAll(nestedLoopPattern)
    
    for (const match of nestedLoopMatches) {
      if (match.index !== undefined) {
        const lineInfo = this.getLineInfo(code, match.index)
        issues.push({
          id: `perf-loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'performance',
          severity: 'medium',
          title: 'Nested Loop Performance Issue',
          description: 'Nested loops can cause performance issues with large datasets',
          location: {
            file: '',
            line: lineInfo.line,
            column: lineInfo.column,
            snippet: lineInfo.snippet
          },
          suggestion: 'Consider using more efficient algorithms or data structures',
          autoFixable: false,
          effort: 'high',
          impact: 'medium',
          confidence: 70,
          categories: ['performance']
        })
      }
    }

    // Synchronous operations
    const syncPattern = /fs\.readFileSync|fs\.writeFileSync/g
    const syncMatches = code.matchAll(syncPattern)
    
    for (const match of syncMatches) {
      if (match.index !== undefined) {
        const lineInfo = this.getLineInfo(code, match.index)
        issues.push({
          id: `perf-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'performance',
          severity: 'medium',
          title: 'Synchronous File Operation',
          description: 'Synchronous file operations can block the event loop',
          location: {
            file: '',
            line: lineInfo.line,
            column: lineInfo.column,
            snippet: lineInfo.snippet
          },
          suggestion: 'Use asynchronous file operations (fs.promises or callbacks)',
          autoFixable: true,
          effort: 'low',
          impact: 'medium',
          confidence: 90,
          categories: ['performance']
        })
      }
    }

    return issues
  }

  private deduplicateAndSortIssues(issues: Issue[]): Issue[] {
    // Remove duplicates based on location and type
    const unique = issues.filter((issue, index, self) => 
      index === self.findIndex(other => 
        other.location.line === issue.location.line &&
        other.type === issue.type &&
        other.title === issue.title
      )
    )

    // Sort by severity and impact
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    const impactOrder = { high: 3, medium: 2, low: 1 }

    return unique.sort((a, b) => {
      const aSeverityScore = severityOrder[a.severity] || 0
      const bSeverityScore = severityOrder[b.severity] || 0
      
      if (aSeverityScore !== bSeverityScore) {
        return bSeverityScore - aSeverityScore
      }
      
      const aImpactScore = impactOrder[a.impact] || 0
      const bImpactScore = impactOrder[b.impact] || 0
      
      return bImpactScore - aImpactScore
    })
  }

  private async generateSuggestions(code: string, request: CodeReviewRequest, analysis: any): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    // AI-generated suggestions
    const aiSuggestions = await this.generateAISuggestions(code, request, analysis)
    suggestions.push(...aiSuggestions)
    
    // Best practice suggestions
    const bestPracticeSuggestions = await this.generateBestPracticeSuggestions(code, analysis)
    suggestions.push(...bestPracticeSuggestions)
    
    // Performance optimization suggestions
    const performanceSuggestions = await this.generatePerformanceSuggestions(code, analysis)
    suggestions.push(...performanceSuggestions)

    return suggestions.sort((a, b) => b.priority - a.priority)
  }

  private async generateAISuggestions(code: string, request: CodeReviewRequest, analysis: any): Promise<Suggestion[]> {
    const prompt = `
# Generate Code Improvement Suggestions

## Code
\`\`\`${request.standards.language}
${code}
\`\`\`

## Context
- Experience Level: ${request.context.experience}
- Project Type: ${request.context.projectType}
- Team Size: ${request.context.teamSize}

## Instructions
Generate improvement suggestions focusing on:
1. Code readability and maintainability
2. Performance optimizations
3. Best practices
4. Architecture improvements
5. Documentation enhancements

For each suggestion, provide:
- Title
- Description
- Implementation approach
- Benefits
- Effort required (low/medium/high)
- Priority (1-10)

Format as JSON:
{
  "suggestions": [
    {
      "title": "Suggestion Title",
      "description": "Detailed description",
      "implementation": "How to implement",
      "benefits": ["Benefit 1", "Benefit 2"],
      "effort": "medium",
      "priority": 7
    }
  ]
}
`

    try {
      const response = await this.aiModelManager.makeRequest(prompt, {
        maxTokens: 1500,
        temperature: 0.4
      })

      const parsed = JSON.parse(response.content)
      return this.parseAISuggestions(parsed.suggestions || [])

    } catch (error) {
      console.error('AI suggestion generation failed:', error)
      return []
    }
  }

  private parseAISuggestions(aiSuggestions: any[]): Suggestion[] {
    return aiSuggestions.map(suggestion => ({
      id: `ai-suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'enhancement',
      title: suggestion.title,
      description: suggestion.description,
      implementation: suggestion.implementation,
      benefits: suggestion.benefits || [],
      effort: suggestion.effort || 'medium',
      priority: suggestion.priority || 5,
      examples: suggestion.examples || []
    }))
  }

  private async generateBestPracticeSuggestions(code: string, analysis: any): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    // Check for missing error handling
    if (!code.includes('try') && !code.includes('catch')) {
      suggestions.push({
        id: `bp-error-handling-${Date.now()}`,
        type: 'best-practice',
        title: 'Add Error Handling',
        description: 'Consider adding try-catch blocks for better error handling',
        implementation: 'Wrap potentially failing operations in try-catch blocks',
        benefits: ['Improved reliability', 'Better user experience', 'Easier debugging'],
        effort: 'low',
        priority: 7
      })
    }

    // Check for missing documentation
    const functionCount = (code.match(/function\s+\w+/g) || []).length
    const commentCount = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length
    
    if (functionCount > 0 && commentCount < functionCount) {
      suggestions.push({
        id: `bp-documentation-${Date.now()}`,
        type: 'documentation',
        title: 'Add Function Documentation',
        description: 'Add JSDoc comments to document function parameters and return values',
        implementation: 'Add /** */ comments above each function with @param and @returns tags',
        benefits: ['Better code maintainability', 'Improved team collaboration', 'Auto-generated documentation'],
        effort: 'medium',
        priority: 6
      })
    }

    return suggestions
  }

  private async generatePerformanceSuggestions(code: string, analysis: any): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    // Check for potential memoization opportunities
    if (code.includes('function') && code.includes('return')) {
      suggestions.push({
        id: `perf-memoization-${Date.now()}`,
        type: 'optimization',
        title: 'Consider Memoization',
        description: 'Functions with expensive calculations could benefit from memoization',
        implementation: 'Use memoization libraries or implement caching for expensive operations',
        benefits: ['Improved performance', 'Reduced computation time', 'Better user experience'],
        effort: 'medium',
        priority: 5
      })
    }

    return suggestions
  }

  private async findPositiveAspects(code: string, analysis: any): Promise<string[]> {
    const compliments: string[] = []
    
    // Check for good practices
    if (code.includes('const ')) {
      compliments.push('Good use of const for immutable variables')
    }
    
    if (code.includes('async') && code.includes('await')) {
      compliments.push('Proper use of async/await for asynchronous operations')
    }
    
    if (code.includes('/**')) {
      compliments.push('Well-documented code with JSDoc comments')
    }
    
    if (analysis.metrics?.cyclomaticComplexity && analysis.metrics.cyclomaticComplexity < 5) {
      compliments.push('Low cyclomatic complexity indicates well-structured code')
    }

    return compliments
  }

  private async calculateMetrics(code: string, analysis: any): Promise<CodeMetrics> {
    const lines = code.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)
    
    return {
      linesOfCode: nonEmptyLines.length,
      cyclomaticComplexity: analysis.metrics?.cyclomaticComplexity || 0,
      cognitiveComplexity: this.calculateCognitiveComplexity(code),
      duplicateLines: this.findDuplicateLines(lines),
      testCoverage: analysis.testCoverage,
      documentationCoverage: this.calculateDocumentationCoverage(code),
      dependencyCount: this.countDependencies(code),
      codeSmells: this.detectCodeSmells(code)
    }
  }

  private calculateCognitiveComplexity(code: string): number {
    // Simplified cognitive complexity calculation
    let complexity = 0
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcatch\b/g,
      /&&|\|\|/g
    ]
    
    for (const pattern of patterns) {
      const matches = code.match(pattern)
      if (matches) complexity += matches.length
    }
    
    return complexity
  }

  private findDuplicateLines(lines: string[]): number {
    const lineMap = new Map<string, number>()
    let duplicates = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length > 5) { // Ignore very short lines
        const count = lineMap.get(trimmed) || 0
        lineMap.set(trimmed, count + 1)
        
        if (count === 1) { // First duplicate
          duplicates += 2 // Count both original and duplicate
        } else if (count > 1) {
          duplicates += 1
        }
      }
    }
    
    return duplicates
  }

  private calculateDocumentationCoverage(code: string): number {
    const functionMatches = code.match(/function\s+\w+|=>\s*{|class\s+\w+/g) || []
    const commentMatches = code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm) || []
    
    if (functionMatches.length === 0) return 100
    
    return Math.round((commentMatches.length / functionMatches.length) * 100)
  }

  private countDependencies(code: string): number {
    const importMatches = code.match(/import\s+.*from|require\s*\(/g) || []
    return importMatches.length
  }

  private detectCodeSmells(code: string): number {
    let smells = 0
    
    // Long parameter lists
    const longParamMatches = code.match(/function\s+\w+\s*\([^)]{50,}\)/g)
    if (longParamMatches) smells += longParamMatches.length
    
    // Large functions (>50 lines)
    const functionBodies = code.match(/function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?^}/gm) || []
    for (const func of functionBodies) {
      if (func.split('\n').length > 50) smells++
    }
    
    // Magic numbers
    const magicNumbers = code.match(/\b\d{3,}\b/g) || []
    smells += magicNumbers.length
    
    return smells
  }

  private calculateOverallScore(issues: Issue[], metrics: CodeMetrics, request: CodeReviewRequest): number {
    let score = 100
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20
          break
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    }
    
    // Deduct points for complexity
    if (metrics.cyclomaticComplexity > 10) {
      score -= Math.min(20, metrics.cyclomaticComplexity - 10)
    }
    
    // Deduct points for code smells
    score -= Math.min(15, metrics.codeSmells * 2)
    
    // Bonus for documentation
    if (metrics.documentationCoverage > 80) {
      score += 5
    }
    
    return Math.max(0, Math.round(score))
  }

  private generateReviewSummary(issues: Issue[], metrics: CodeMetrics, score: number): ReviewSummary {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    const highPriorityIssues = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length
    const autoFixableIssues = issues.filter(i => i.autoFixable).length
    
    // Estimate fix time
    let totalHours = 0
    for (const issue of issues) {
      switch (issue.effort) {
        case 'low': totalHours += 0.5; break
        case 'medium': totalHours += 2; break
        case 'high': totalHours += 8; break
      }
    }
    
    const estimatedFixTime = totalHours > 8 ? `${Math.ceil(totalHours / 8)} days` : `${totalHours} hours`
    
    // Determine quality grade
    let codeQuality: ReviewSummary['codeQuality']
    if (score >= 90) codeQuality = 'excellent'
    else if (score >= 75) codeQuality = 'good'
    else if (score >= 60) codeQuality = 'fair'
    else codeQuality = 'poor'
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(0, 100 - (metrics.cyclomaticComplexity * 2) - (metrics.codeSmells * 3))
    
    // Determine technical debt
    let technicalDebt: ReviewSummary['technicalDebt']
    if (criticalIssues > 0 || highPriorityIssues > 5) technicalDebt = 'high'
    else if (highPriorityIssues > 2 || issues.length > 10) technicalDebt = 'medium'
    else technicalDebt = 'low'
    
    return {
      totalIssues: issues.length,
      criticalIssues,
      highPriorityIssues,
      autoFixableIssues,
      estimatedFixTime,
      codeQuality,
      maintainabilityIndex,
      technicalDebt,
      readabilityScore: metrics.documentationCoverage
    }
  }

  private createActionItems(issues: Issue[], suggestions: Suggestion[]): ActionItem[] {
    const actionItems: ActionItem[] = []
    
    // Create action items for critical and high severity issues
    const priorityIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high')
    
    for (const issue of priorityIssues) {
      actionItems.push({
        id: `action-${issue.id}`,
        title: `Fix: ${issue.title}`,
        description: issue.description,
        priority: issue.severity === 'critical' ? 'critical' : 'high',
        estimatedHours: this.getEffortHours(issue.effort),
        dependencies: []
      })
    }
    
    // Create action items for high-priority suggestions
    const topSuggestions = suggestions.filter(s => s.priority >= 7).slice(0, 3)
    
    for (const suggestion of topSuggestions) {
      actionItems.push({
        id: `action-suggestion-${suggestion.id}`,
        title: `Implement: ${suggestion.title}`,
        description: suggestion.description,
        priority: 'medium',
        estimatedHours: this.getEffortHours(suggestion.effort),
        dependencies: []
      })
    }
    
    return actionItems.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    })
  }

  private getEffortHours(effort: 'low' | 'medium' | 'high'): number {
    switch (effort) {
      case 'low': return 1
      case 'medium': return 4
      case 'high': return 16
      default: return 2
    }
  }

  /**
   * Apply automatic fixes to code
   */
  async applyAutomaticFixes(filePath: string, issueIds: string[]): Promise<{ success: boolean; fixedIssues: string[]; errors: string[] }> {
    const result = {
      success: false,
      fixedIssues: [] as string[],
      errors: [] as string[]
    }

    try {
      let code = await fs.promises.readFile(filePath, 'utf8')
      
      // Get applicable rules with auto-fix capabilities
      const rules = this.customRules.get('common') || []
      const autoFixRules = rules.filter(rule => rule.autoFix)
      
      for (const rule of autoFixRules) {
        try {
          const fixedCode = rule.autoFix!(code)
          if (fixedCode !== code) {
            code = fixedCode
            result.fixedIssues.push(rule.id)
            this.emit('fix-applied', rule.id, true)
          }
        } catch (error) {
          result.errors.push(`Failed to apply fix for ${rule.id}: ${error}`)
          this.emit('fix-applied', rule.id, false)
        }
      }
      
      // Write back the fixed code
      if (result.fixedIssues.length > 0) {
        await fs.promises.writeFile(filePath, code, 'utf8')
        result.success = true
      }

    } catch (error) {
      result.errors.push(`Failed to apply fixes: ${error}`)
    }

    return result
  }

  // Helper methods
  private recordReviewHistory(request: CodeReviewRequest, result: ReviewResult): void {
    const history = this.reviewHistory.get(request.filePath) || []
    history.push(result)
    this.reviewHistory.set(request.filePath, history.slice(-10)) // Keep last 10 reviews
  }

  private trackIssuePattern(issue: Issue): void {
    // Track issue patterns for learning and improvement
    console.log(`Issue pattern tracked: ${issue.type} - ${issue.title}`)
  }

  private trackFixSuccess(issueId: string, success: boolean): void {
    // Track fix success rates for improvement
    console.log(`Fix ${success ? 'succeeded' : 'failed'} for issue: ${issueId}`)
  }

  /**
   * Get review statistics and insights
   */
  getReviewStatistics(): any {
    const allReviews = Array.from(this.reviewHistory.values()).flat()
    
    return {
      totalReviews: allReviews.length,
      averageScore: this.calculateAverageScore(allReviews),
      commonIssues: this.getCommonIssues(allReviews),
      improvementTrends: this.getImprovementTrends(allReviews),
      reviewVelocity: this.calculateReviewVelocity(allReviews)
    }
  }

  private calculateAverageScore(reviews: ReviewResult[]): number {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length
  }

  private getCommonIssues(reviews: ReviewResult[]): Record<string, number> {
    const issueCounts: Record<string, number> = {}
    
    for (const review of reviews) {
      for (const issue of review.issues) {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1
      }
    }
    
    return issueCounts
  }

  private getImprovementTrends(reviews: ReviewResult[]): any {
    // Calculate trends in code quality over time
    const recentReviews = reviews.slice(-10)
    const earlierReviews = reviews.slice(-20, -10)
    
    const recentAvg = this.calculateAverageScore(recentReviews)
    const earlierAvg = this.calculateAverageScore(earlierReviews)
    
    return {
      improving: recentAvg > earlierAvg,
      trend: recentAvg - earlierAvg,
      scoreHistory: reviews.map(r => r.score)
    }
  }

  private calculateReviewVelocity(reviews: ReviewResult[]): number {
    if (reviews.length === 0) return 0
    
    const totalTime = reviews.reduce((sum, review) => sum + review.reviewTime, 0)
    return totalTime / reviews.length // Average review time in ms
  }
}
