import { EventEmitter } from 'events'

export interface CodeIssue {
  id: string
  type: 'security' | 'performance' | 'maintainability' | 'bug'
  severity: 'critical' | 'high' | 'medium' | 'low'
  line: number
  message: string
  description: string
  suggestion: string
  autoFixAvailable: boolean
  references: string[]
}

export interface CodeReviewResult {
  issues: CodeIssue[]
  metrics: {
    complexity: number
    maintainability: number
    documentation: number
    security: number
    performance: number
    testCoverage: number
    codeSmells: number
    technicalDebt: number
  }
  suggestions: string[]
  autoFixes: Array<{
    issueId: string
    fix: string
    description: string
  }>
}

export interface SecurityPattern {
  pattern: RegExp
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  description: string
  suggestion: string
}

/**
 * AI-Powered Code Review Assistant
 * 
 * Provides comprehensive automated code review with:
 * - Security vulnerability detection
 * - Performance analysis and optimization suggestions
 * - Code quality metrics and maintainability scoring
 * - Automated fix generation for common issues
 * - Technical debt identification and tracking
 */
export class AICodeReviewAssistant extends EventEmitter {
  private securityPatterns: SecurityPattern[] = []

  constructor() {
    super()
    this.initializeSecurityPatterns()
  }

  /**
   * Perform comprehensive code review
   */
  async reviewCode(filePath: string, code: string, options: {
    includeSecurityScan?: boolean
    includePerformanceAnalysis?: boolean
    generateAutoFixes?: boolean
    severityThreshold?: 'critical' | 'high' | 'medium' | 'low'
  } = {}): Promise<CodeReviewResult> {
    const {
      includeSecurityScan = true,
      includePerformanceAnalysis = true,
      generateAutoFixes = true,
      severityThreshold = 'low'
    } = options

    try {
      // Analyze code and collect issues
      const issues: CodeIssue[] = []
      const lines = code.split('\n')

      // Security analysis
      if (includeSecurityScan) {
        const securityIssues = await this.performSecurityAnalysis(lines)
        issues.push(...securityIssues.filter(issue => 
          this.meetsSeverityThreshold(issue.severity, severityThreshold)
        ))
      }

      // Performance analysis
      if (includePerformanceAnalysis) {
        const performanceIssues = this.analyzePerformance(lines)
        issues.push(...performanceIssues.filter(issue => 
          this.meetsSeverityThreshold(issue.severity, severityThreshold)
        ))
      }

      // Code quality analysis
      const qualityIssues = this.analyzeCodeQuality(lines)
      issues.push(...qualityIssues.filter(issue => 
        this.meetsSeverityThreshold(issue.severity, severityThreshold)
      ))

      // Calculate metrics
      const metrics = {
        complexity: this.calculateComplexity(code),
        maintainability: this.calculateMaintainability(code, lines.length),
        documentation: this.calculateDocumentationScore(code),
        security: await this.calculateSecurityScore(code),
        performance: this.calculatePerformanceScore(code),
        testCoverage: await this.calculateTestCoverage(filePath),
        codeSmells: this.calculateCodeSmells(code),
        technicalDebt: this.calculateTechnicalDebt(code, this.calculateCodeSmells(code))
      }

      // Generate suggestions
      const suggestions = this.generateSuggestions(issues, metrics)

      // Generate auto-fixes
      const autoFixes = generateAutoFixes ? this.generateAutoFixes(issues) : []

      this.emit('reviewCompleted', {
        filePath,
        issuesFound: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        metrics
      })

      return {
        issues,
        metrics,
        suggestions,
        autoFixes
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('reviewError', { filePath, error: errorMessage });
      throw error;
    }
  }

  /**
   * 🔒 PERFORM SECURITY ANALYSIS
   */
  private async performSecurityAnalysis(lines: string[]): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check against security patterns
      for (const pattern of this.securityPatterns) {
        if (pattern.pattern.test(line)) {
          issues.push({
            id: `security-${pattern.message.toLowerCase().replace(/\s+/g, '-')}-${lineNumber}`,
            type: 'security',
            severity: pattern.severity,
            line: lineNumber,
            message: pattern.message,
            description: pattern.description,
            suggestion: pattern.suggestion,
            autoFixAvailable: this.canAutoFixSecurityIssue(pattern),
            references: ['https://owasp.org/www-project-top-ten/']
          })
        }
      }

      // Additional security checks
      issues.push(...this.checkSecurityIssues(line, lineNumber))
    }

    return issues
  }

  /**
   * 🚀 ANALYZE PERFORMANCE
   */
  private analyzePerformance(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      issues.push(...this.checkPerformanceIssues(line, lineNumber))
    }

    return issues
  }

  /**
   * 📊 ANALYZE CODE QUALITY
   */
  private analyzeCodeQuality(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      issues.push(...this.checkLogicIssues(line, lineNumber))
      issues.push(...this.checkMaintainabilityIssues(line, lineNumber))
    }

    return issues
  }

  /**
   * 🔒 CHECK SECURITY ISSUES
   */
  private checkSecurityIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = []

    // SQL Injection patterns
    if (line.includes('SELECT') && line.includes('+') && line.includes('\'')) {
      issues.push({
        id: `security-sql-injection-${lineNumber}`,
        type: 'security',
        severity: 'critical',
        line: lineNumber,
        message: 'Potential SQL injection vulnerability',
        description: 'String concatenation in SQL queries can lead to SQL injection attacks',
        suggestion: 'Use parameterized queries or prepared statements instead',
        autoFixAvailable: true,
        references: ['https://owasp.org/www-community/attacks/SQL_Injection']
      })
    }

    // XSS patterns
    if (line.includes('innerHTML') && line.includes('+')) {
      issues.push({
        id: `security-xss-${lineNumber}`,
        type: 'security',
        severity: 'high',
        line: lineNumber,
        message: 'Potential XSS vulnerability',
        description: 'Direct HTML injection without sanitization',
        suggestion: 'Use textContent or sanitize input before setting innerHTML',
        autoFixAvailable: true,
        references: ['https://owasp.org/www-community/attacks/xss/']
      })
    }

    // Hardcoded secrets
    if (/(?:password|secret|key|token)\s*[=:]\s*[\'\"]\w+[\'\"]/i.test(line)) {
      issues.push({
        id: `security-hardcoded-secret-${lineNumber}`,
        type: 'security',
        severity: 'critical',
        line: lineNumber,
        message: 'Hardcoded secret detected',
        description: 'Secrets should not be hardcoded in source code',
        suggestion: 'Use environment variables or a secure configuration system',
        autoFixAvailable: false,
        references: ['https://owasp.org/www-top-10/A07_2021-Identification_and_Authentication_Failures/']
      })
    }

    return issues
  }

  /**
   * 🚀 CHECK PERFORMANCE ISSUES
   */
  private checkPerformanceIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = []

    // Inefficient loops
    if (line.includes('for') && line.includes('.length')) {
      issues.push({
        id: `performance-loop-length-${lineNumber}`,
        type: 'performance',
        severity: 'low',
        line: lineNumber,
        message: 'Inefficient loop condition',
        description: 'Accessing .length property in loop condition on every iteration',
        suggestion: 'Cache the length value before the loop',
        autoFixAvailable: true,
        references: []
      })
    }

    // Synchronous operations that could be async
    if (line.includes('readFileSync') || line.includes('writeFileSync')) {
      issues.push({
        id: `performance-sync-operation-${lineNumber}`,
        type: 'performance',
        severity: 'medium',
        line: lineNumber,
        message: 'Synchronous file operation',
        description: 'Synchronous file operations block the event loop',
        suggestion: 'Use asynchronous file operations instead',
        autoFixAvailable: true,
        references: []
      })
    }

    // Memory leaks - event listeners not removed
    if (line.includes('addEventListener') && !line.includes('removeEventListener')) {
      issues.push({
        id: `performance-memory-leak-${lineNumber}`,
        type: 'performance',
        severity: 'medium',
        line: lineNumber,
        message: 'Potential memory leak',
        description: 'Event listener added without corresponding removal',
        suggestion: 'Ensure event listeners are removed when no longer needed',
        autoFixAvailable: false,
        references: []
      })
    }

    return issues
  }

  /**
   * 🧠 CHECK LOGIC ISSUES
   */
  private checkLogicIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = []

    // TODO comments
    if (line.includes('TODO')) {
      issues.push({
        id: `logic-todo-${lineNumber}`,
        type: 'maintainability',
        severity: 'low',
        line: lineNumber,
        message: 'TODO comment found',
        description: 'Unfinished implementation detected',
        suggestion: 'Complete the implementation or create a proper issue',
        autoFixAvailable: false,
        references: []
      })
    }

    // FIXME comments
    if (line.includes('FIXME')) {
      issues.push({
        id: `logic-fixme-${lineNumber}`,
        type: 'maintainability',
        severity: 'medium',
        line: lineNumber,
        message: 'FIXME comment found',
        description: 'Code marked for fixing',
        suggestion: 'Address the issue mentioned in the FIXME comment',
        autoFixAvailable: false,
        references: []
      })
    }

    // Magic numbers
    if (/\b(?<!\.)(\d{2,})\b(?!\s*[%\]])/.test(line) && !line.includes('//')) {
      issues.push({
        id: `logic-magic-number-${lineNumber}`,
        type: 'maintainability',
        severity: 'low',
        line: lineNumber,
        message: 'Magic number detected',
        description: 'Numeric literal without clear meaning',
        suggestion: 'Replace with a named constant',
        autoFixAvailable: false,
        references: []
      })
    }

    return issues
  }

  /**
   * 🛠️ CHECK MAINTAINABILITY ISSUES
   */
  private checkMaintainabilityIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = []

    // Long lines
    if (line.length > 120) {
      issues.push({
        id: `maintainability-long-line-${lineNumber}`,
        type: 'maintainability',
        severity: 'low',
        line: lineNumber,
        message: 'Line too long',
        description: `Line has ${line.length} characters, recommended maximum is 120`,
        suggestion: 'Break long lines into multiple shorter lines',
        autoFixAvailable: false,
        references: []
      })
    }

    // Complex boolean expressions
    if ((line.match(/&&|\|\|/g) || []).length > 3) {
      issues.push({
        id: `maintainability-complex-boolean-${lineNumber}`,
        type: 'maintainability',
        severity: 'medium',
        line: lineNumber,
        message: 'Complex boolean expression',
        description: 'Boolean expression is too complex and hard to read',
        suggestion: 'Break into smaller, well-named boolean variables',
        autoFixAvailable: false,
        references: []
      })
    }

    // Missing error handling
    if (line.includes('await') && !line.includes('try') && !line.includes('catch')) {
      issues.push({
        id: `maintainability-missing-error-handling-${lineNumber}`,
        type: 'bug',
        severity: 'medium',
        line: lineNumber,
        message: 'Missing error handling',
        description: 'Async operation without proper error handling',
        suggestion: 'Wrap in try-catch block or handle promise rejection',
        autoFixAvailable: true,
        references: []
      })
    }

    return issues
  }

  /**
   * 🔧 GENERATE AUTO FIXES
   */
  private generateAutoFixes(issues: CodeIssue[]): Array<{
    issueId: string
    fix: string
    description: string
  }> {
    return issues
      .filter(issue => issue.autoFixAvailable)
      .map(issue => ({
        issueId: issue.id,
        fix: this.generateAutoFix(issue),
        description: `Auto-fix for: ${issue.message}`
      }))
  }

  private generateAutoFix(issue: CodeIssue): string {
    if (issue.id.includes('sql-injection')) {
      return 'Replace string concatenation with parameterized query'
    }
    
    if (issue.id.includes('xss')) {
      return 'Replace innerHTML with textContent or sanitize input'
    }
    
    if (issue.id.includes('sync-operation')) {
      return 'Replace synchronous operation with asynchronous equivalent'
    }
    
    if (issue.id.includes('missing-error-handling')) {
      return 'Wrap in try-catch block'
    }
    
    return 'Manual fix required'
  }

  /**
   * 💡 GENERATE SUGGESTIONS
   */
  private generateSuggestions(issues: CodeIssue[], metrics: any): string[] {
    const suggestions: string[] = []

    if (metrics.complexity > 15) {
      suggestions.push('Consider breaking down complex functions into smaller, more focused functions')
    }

    if (metrics.documentation < 0.5) {
      suggestions.push('Add more comprehensive documentation and comments')
    }

    if (metrics.security < 0.7) {
      suggestions.push('Review and improve security practices')
    }

    if (metrics.testCoverage < 0.8) {
      suggestions.push('Increase test coverage to ensure reliability')
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      suggestions.push(`Address ${criticalIssues.length} critical security issues immediately`)
    }

    const performanceIssues = issues.filter(i => i.type === 'performance')
    if (performanceIssues.length > 5) {
      suggestions.push('Review performance optimizations - multiple issues detected')
    }

    return suggestions
  }

  /**
   * 📊 CALCULATE METRICS
   */
  private calculateComplexity(code: string): number {
    // Cyclomatic complexity approximation
    const complexityPatterns = [
      /if\s*\(/g, /else\s+if\s*\(/g, /for\s*\(/g, /while\s*\(/g,
      /catch\s*\(/g, /case\s+/g, /&&/g, /\|\|/g, /\?/g
    ]
    
    let complexity = 1 // Base complexity
    
    for (const pattern of complexityPatterns) {
      const matches = code.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }
    
    return Math.min(complexity, 50) // Cap at 50
  }

  private calculateMaintainability(code: string, linesOfCode: number): number {
    const complexity = this.calculateComplexity(code)
    const commentLines = (code.match(/\/\/|\/\*|\*/g) || []).length
    const commentRatio = commentLines / linesOfCode
    
    // Simple maintainability index approximation
    const maintainability = Math.max(0, 171 - 5.2 * Math.log(linesOfCode) - 0.23 * complexity + 16.2 * Math.log(commentRatio + 1))
    
    return Math.min(maintainability / 171, 1) // Normalize to 0-1
  }

  private calculateDocumentationScore(code: string): number {
    const lines = code.split('\n')
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('/*') || 
      line.trim().startsWith('*') ||
      line.trim().startsWith('/**')
    ).length
    
    const functionLines = lines.filter(line => 
      /function\s+\w+|const\s+\w+\s*=.*=>|class\s+\w+/.test(line)
    ).length
    
    if (functionLines === 0) return 0.5
    
    return Math.min(commentLines / (functionLines * 2), 1) // 2 comment lines per function ideally
  }

  private async calculateSecurityScore(code: string): Promise<number> {
    const securityIssues = await this.performSecurityAnalysis(code.split('\n'))
    const criticalIssues = securityIssues.filter(i => i.severity === 'critical').length
    const highIssues = securityIssues.filter(i => i.severity === 'high').length
    
    // Penalize based on severity
    const penalty = (criticalIssues * 0.3) + (highIssues * 0.1)
    
    return Math.max(0, 1 - penalty)
  }

  private calculatePerformanceScore(code: string): number {
    const performancePatterns = [
      /readFileSync|writeFileSync/g, // Sync operations
      /for\s*\([^)]*\.length[^)]*\)/g, // Inefficient loops
      /document\.getElementById\s*\(\s*[^)]+\s*\)/g, // Repeated DOM queries
      /JSON\.parse\s*\(\s*JSON\.stringify/g // Unnecessary serialization
    ]
    
    let issues = 0
    for (const pattern of performancePatterns) {
      const matches = code.match(pattern)
      if (matches) {
        issues += matches.length
      }
    }
    
    return Math.max(0, 1 - (issues * 0.1))
  }

  private async calculateTestCoverage(filePath: string): Promise<number> {
    // Mock implementation for WebContainer environment
    // In real environment, this would integrate with coverage tools
    return 0.75 // Assume 75% coverage as baseline
  }

  private calculateCodeSmells(code: string): number {
    const smellPatterns = [
      /TODO|FIXME|HACK/g, // Technical debt markers
      /function\s+\w+\s*\([^)]{50,}\)/, // Long parameter lists
      /if\s*\([^{]{100,}\)/, // Complex conditions
      /\.length\s*>\s*\d{2,}/, // Magic numbers in conditions
    ]
    
    let smells = 0
    for (const pattern of smellPatterns) {
      const matches = code.match(pattern)
      if (matches) {
        smells += matches.length
      }
    }
    
    return smells
  }

  private calculateTechnicalDebt(code: string, codeSmells: number): number {
    const linesOfCode = code.split('\n').length
    const complexity = this.calculateComplexity(code)
    
    // Technical debt approximation based on complexity, code smells, and size
    const debtScore = (codeSmells * 2) + (complexity * 0.5) + (linesOfCode * 0.01)
    
    return Math.min(debtScore, 100) // Cap at 100
  }

  private meetsSeverityThreshold(issueSeverity: string, threshold: string): boolean {
    const severityLevels: Record<string, number> = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    return (severityLevels[issueSeverity] ?? 0) >= (severityLevels[threshold] ?? 0);
  }

  /**
   * 🔧 INITIALIZE SECURITY PATTERNS
   */
  private initializeSecurityPatterns(): void {
    this.securityPatterns = [
      {
        pattern: /eval\s*\(/,
        severity: 'critical',
        message: 'Use of eval() detected',
        description: 'eval() can execute arbitrary code and is a major security risk',
        suggestion: 'Avoid eval() and use safer alternatives like JSON.parse() for data'
      },
      {
        pattern: /document\.write\s*\(/,
        severity: 'high',
        message: 'Use of document.write() detected',
        description: 'document.write() can lead to XSS vulnerabilities',
        suggestion: 'Use modern DOM manipulation methods instead'
      },
      {
        pattern: /localStorage\.setItem\([^,]*,\s*[^)]*password[^)]*\)/i,
        severity: 'critical',
        message: 'Password stored in localStorage',
        description: 'Storing passwords in localStorage is insecure',
        suggestion: 'Never store sensitive data in localStorage'
      },
      {
        pattern: /Math\.random\(\)/,
        severity: 'medium',
        message: 'Cryptographically insecure random number generation',
        description: 'Math.random() is not cryptographically secure',
        suggestion: 'Use crypto.getRandomValues() for security-critical randomness'
      }
    ]
  }

  private canAutoFixSecurityIssue(pattern: SecurityPattern): boolean {
    return pattern.message.includes('Math.random') || 
           pattern.message.includes('document.write')
  }

  /**
   * Apply auto-fix to code
   */
  async applyAutoFix(code: string, issueId: string): Promise<string> {
    if (issueId.includes('sql-injection')) {
      // Convert string concatenation to template literals as first step
      return code.replace(/['"].*\+.*['"]/, '`${parameterized_query}`')
    }
    
    if (issueId.includes('xss')) {
      return code.replace(/\.innerHTML\s*=/, '.textContent =')
    }
    
    if (issueId.includes('sync-operation')) {
      return code
        .replace(/readFileSync/, 'await readFile')
        .replace(/writeFileSync/, 'await writeFile')
    }
    
    if (issueId.includes('missing-error-handling')) {
      const lines = code.split('\n')
      return lines.map(line => {
        if (line.includes('await') && !line.trim().startsWith('try')) {
          const indent = line.match(/^\s*/)?.[0] || ''
          return `${indent}try {\n${line}\n${indent}} catch (error) {\n${indent}  console.error('Error:', error)\n${indent}}`
        }
        return line
      }).join('\n')
    }
    
    return code
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(codebase: Map<string, string>): Promise<{
    summary: {
      totalFiles: number
      filesWithIssues: number
      criticalIssues: number
      highIssues: number
      mediumIssues: number
      lowIssues: number
    }
    detailedResults: Array<{
      filePath: string
      issues: CodeIssue[]
      riskScore: number
    }>
    recommendations: string[]
  }> {
    const results: Array<{
      filePath: string
      issues: CodeIssue[]
      riskScore: number
    }> = []

    let totalCritical = 0
    let totalHigh = 0
    let totalMedium = 0
    let totalLow = 0

    for (const [filePath, code] of codebase.entries()) {
      const review = await this.reviewCode(filePath, code, {
        includeSecurityScan: true,
        includePerformanceAnalysis: false,
        generateAutoFixes: false,
        severityThreshold: 'low'
      })

      const securityIssues = review.issues.filter(issue => issue.type === 'security')
      
      if (securityIssues.length > 0) {
        const criticalCount = securityIssues.filter(i => i.severity === 'critical').length
        const highCount = securityIssues.filter(i => i.severity === 'high').length
        const mediumCount = securityIssues.filter(i => i.severity === 'medium').length
        const lowCount = securityIssues.filter(i => i.severity === 'low').length

        totalCritical += criticalCount
        totalHigh += highCount
        totalMedium += mediumCount
        totalLow += lowCount

        const riskScore = (criticalCount * 10) + (highCount * 5) + (mediumCount * 2) + (lowCount * 1)

        results.push({
          filePath,
          issues: securityIssues,
          riskScore
        })
      }
    }

    // Generate recommendations
    const recommendations: string[] = []
    
    if (totalCritical > 0) {
      recommendations.push(`🚨 CRITICAL: Address ${totalCritical} critical security vulnerabilities immediately`)
    }
    
    if (totalHigh > 5) {
      recommendations.push(`⚠️ HIGH PRIORITY: ${totalHigh} high-severity security issues require attention`)
    }
    
    recommendations.push('🔒 Implement regular security code reviews')
    recommendations.push('🛡️ Consider integrating automated security scanning in CI/CD')
    recommendations.push('📚 Provide security training for development team')

    return {
      summary: {
        totalFiles: codebase.size,
        filesWithIssues: results.length,
        criticalIssues: totalCritical,
        highIssues: totalHigh,
        mediumIssues: totalMedium,
        lowIssues: totalLow
      },
      detailedResults: results.sort((a, b) => b.riskScore - a.riskScore),
      recommendations
    }
  }
}
