/**
 * 🔍 AI-POWERED CODE REVIEW ASSISTANT
 * 
 * Advanced autonomous code review system with:
 * ✅ Automated issue detection and classification
 * ✅ Security vulnerability scanning
 * ✅ Performance optimization suggestions
 * ✅ Code quality metrics and scoring
 * ✅ Automated fix generation
 * ✅ Best practices enforcement
 */

// WebContainer type from workbench store
type WebContainer = any;

export interface CodeReviewOptions {
  includeSecurityScan: boolean;
  includePerformanceAnalysis: boolean;
  includeStyleGuide: boolean;
  generateFixes: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frameworks: string[];
}

export interface CodeIssue {
  id: string;
  type: 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  column?: number;
  message: string;
  description: string;
  suggestion: string;
  autoFixAvailable: boolean;
  autoFix?: string;
  references: string[];
}

export interface SecurityVulnerability {
  id: string;
  type: 'xss' | 'sql_injection' | 'csrf' | 'insecure_dependencies' | 'hardcoded_secrets' | 'weak_crypto';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  code: string;
  description: string;
  fix: string;
  cve?: string;
}

export interface PerformanceIssue {
  id: string;
  type: 'memory_leak' | 'inefficient_loop' | 'blocking_operation' | 'large_bundle' | 'unused_code';
  impact: 'low' | 'medium' | 'high';
  line: number;
  description: string;
  optimization: string;
  estimatedImprovement: string;
}

export interface CodeQualityMetrics {
  overallScore: number; // 0-100
  maintainabilityScore: number;
  complexityScore: number;
  testCoverageScore: number;
  documentationScore: number;
  securityScore: number;
  performanceScore: number;
  codeSmells: number;
  technicalDebt: number; // in hours
}

export interface CodeReviewResult {
  filePath: string;
  timestamp: string;
  metrics: CodeQualityMetrics;
  issues: CodeIssue[];
  securityVulnerabilities: SecurityVulnerability[];
  performanceIssues: PerformanceIssue[];
  suggestions: string[];
  autoFixes: {[line: number]: string};
  dependencies: DependencyAnalysis;
}

export interface DependencyAnalysis {
  outdated: {name: string; current: string; latest: string}[];
  vulnerable: {name: string; severity: string; description: string}[];
  unused: string[];
  duplicates: {name: string; versions: string[]}[];
}

export class AICodeReviewAssistant {
  private webContainer: WebContainer;
  private reviewHistory: Map<string, CodeReviewResult[]> = new Map();
  private securityPatterns: Map<string, RegExp> = new Map();
  private performancePatterns: Map<string, RegExp> = new Map();

  constructor(webContainer: WebContainer) {
    this.webContainer = webContainer;
    this.initializeSecurityPatterns();
    this.initializePerformancePatterns();
  }

  /**
   * 🔍 COMPREHENSIVE CODE REVIEW
   */
  async reviewCode(filePath: string, options: CodeReviewOptions): Promise<CodeReviewResult> {
    const code = await this.webContainer.fs.readFile(filePath, 'utf8');
    const timestamp = new Date().toISOString();

    // Parallel analysis for speed
    const [
      issues,
      securityVulnerabilities,
      performanceIssues,
      metrics,
      dependencies
    ] = await Promise.all([
      this.analyzeCodeIssues(code, filePath, options),
      options.includeSecurityScan ? this.scanSecurity(code, filePath) : [],
      options.includePerformanceAnalysis ? this.analyzePerformance(code, filePath) : [],
      this.calculateQualityMetrics(code, filePath),
      this.analyzeDependencies(filePath)
    ]);

    const suggestions = this.generateSuggestions(issues, securityVulnerabilities, performanceIssues);
    const autoFixes = options.generateFixes ? this.generateAutoFixes(issues) : {};

    const result: CodeReviewResult = {
      filePath,
      timestamp,
      metrics,
      issues,
      securityVulnerabilities,
      performanceIssues,
      suggestions,
      autoFixes,
      dependencies
    };

    // Store in history
    if (!this.reviewHistory.has(filePath)) {
      this.reviewHistory.set(filePath, []);
    }
    this.reviewHistory.get(filePath)!.push(result);

    return result;
  }

  /**
   * 🔧 APPLY AUTO-FIXES
   */
  async applyAutoFixes(filePath: string, result: CodeReviewResult): Promise<{
    applied: number;
    failed: number;
    updatedCode: string;
  }> {
    const originalCode = await this.webContainer.fs.readFile(filePath, 'utf8');
    const lines = originalCode.split('\n');
    let applied = 0;
    let failed = 0;

    // Apply fixes in reverse order to maintain line numbers
    const sortedFixes = Object.entries(result.autoFixes)
      .sort(([a], [b]) => parseInt(b) - parseInt(a));

    for (const [lineNumber, fix] of sortedFixes) {
      try {
        const lineIndex = parseInt(lineNumber) - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
          lines[lineIndex] = fix;
          applied++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    const updatedCode = lines.join('\n');
    
    // Save the updated code
    await this.webContainer.fs.writeFile(filePath, updatedCode);

    return { applied, failed, updatedCode };
  }

  /**
   * 🛡️ SECURITY VULNERABILITY SCANNING
   */
  private async scanSecurity(code: string, filePath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for XSS vulnerabilities
      if (this.securityPatterns.get('xss')?.test(line)) {
        vulnerabilities.push({
          id: `xss-${lineNumber}`,
          type: 'xss',
          severity: 'high',
          line: lineNumber,
          code: line.trim(),
          description: 'Potential XSS vulnerability detected',
          fix: 'Use proper input sanitization and escape user data'
        });
      }

      // Check for SQL injection
      if (this.securityPatterns.get('sql_injection')?.test(line)) {
        vulnerabilities.push({
          id: `sql-${lineNumber}`,
          type: 'sql_injection',
          severity: 'critical',
          line: lineNumber,
          code: line.trim(),
          description: 'Potential SQL injection vulnerability detected',
          fix: 'Use parameterized queries or prepared statements'
        });
      }

      // Check for hardcoded secrets
      if (this.securityPatterns.get('hardcoded_secrets')?.test(line)) {
        vulnerabilities.push({
          id: `secret-${lineNumber}`,
          type: 'hardcoded_secrets',
          severity: 'high',
          line: lineNumber,
          code: line.trim(),
          description: 'Hardcoded secret or API key detected',
          fix: 'Move secrets to environment variables or secure vault'
        });
      }

      // Check for weak cryptography
      if (this.securityPatterns.get('weak_crypto')?.test(line)) {
        vulnerabilities.push({
          id: `crypto-${lineNumber}`,
          type: 'weak_crypto',
          severity: 'medium',
          line: lineNumber,
          code: line.trim(),
          description: 'Weak cryptographic algorithm detected',
          fix: 'Use modern cryptographic algorithms (AES-256, SHA-256)'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * ⚡ PERFORMANCE ANALYSIS
   */
  private async analyzePerformance(code: string, filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Detect inefficient loops
      if (this.performancePatterns.get('inefficient_loop')?.test(line)) {
        issues.push({
          id: `loop-${lineNumber}`,
          type: 'inefficient_loop',
          impact: 'medium',
          line: lineNumber,
          description: 'Potentially inefficient loop detected',
          optimization: 'Consider using more efficient iteration methods',
          estimatedImprovement: '20-50% faster execution'
        });
      }

      // Detect blocking operations
      if (this.performancePatterns.get('blocking_operation')?.test(line)) {
        issues.push({
          id: `blocking-${lineNumber}`,
          type: 'blocking_operation',
          impact: 'high',
          line: lineNumber,
          description: 'Blocking operation in async context',
          optimization: 'Use non-blocking alternatives or proper async/await',
          estimatedImprovement: 'Prevent UI blocking'
        });
      }

      // Detect potential memory leaks
      if (this.performancePatterns.get('memory_leak')?.test(line)) {
        issues.push({
          id: `memory-${lineNumber}`,
          type: 'memory_leak',
          impact: 'high',
          line: lineNumber,
          description: 'Potential memory leak detected',
          optimization: 'Ensure proper cleanup of event listeners and references',
          estimatedImprovement: 'Prevent memory accumulation'
        });
      }
    }

    return issues;
  }

  /**
   * 📊 CODE QUALITY METRICS CALCULATION
   */
  private async calculateQualityMetrics(code: string, filePath: string): Promise<CodeQualityMetrics> {
    const lines = code.split('\n');
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    
    // Calculate complexity (simplified cyclomatic complexity)
    const complexityScore = this.calculateComplexity(code);
    
    // Calculate maintainability
    const maintainabilityScore = this.calculateMaintainability(code, linesOfCode);
    
    // Calculate documentation score
    const documentationScore = this.calculateDocumentationScore(code);
    
    // Calculate security score
    const securityScore = await this.calculateSecurityScore(code);
    
    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(code);
    
    // Calculate test coverage (simplified)
    const testCoverageScore = await this.calculateTestCoverage(filePath);
    
    // Calculate code smells
    const codeSmells = this.calculateCodeSmells(code);
    
    // Calculate technical debt
    const technicalDebt = this.calculateTechnicalDebt(code, codeSmells);
    
    const overallScore = Math.round(
      (maintainabilityScore + documentationScore + securityScore + 
       performanceScore + testCoverageScore) / 5
    );

    return {
      overallScore,
      maintainabilityScore,
      complexityScore,
      testCoverageScore,
      documentationScore,
      securityScore,
      performanceScore,
      codeSmells,
      technicalDebt
    };
  }

  /**
   * 🔍 ANALYZE CODE ISSUES
   */
  private async analyzeCodeIssues(code: string, filePath: string, options: CodeReviewOptions): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for common code issues
      issues.push(...this.checkStyleIssues(line, lineNumber));
      issues.push(...this.checkLogicIssues(line, lineNumber));
      issues.push(...this.checkMaintainabilityIssues(line, lineNumber, code));
    }

    return issues.filter(issue => 
      this.meetsSeverityThreshold(issue.severity, options.severity)
    );
  }

  /**
   * 🎨 CHECK STYLE ISSUES
   */
  private checkStyleIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Line too long
    if (line.length > 120) {
      issues.push({
        id: `style-long-line-${lineNumber}`,
        type: 'style',
        severity: 'low',
        line: lineNumber,
        message: 'Line too long',
        description: `Line exceeds 120 characters (${line.length})`,
        suggestion: 'Break long lines into multiple lines for better readability',
        autoFixAvailable: false,
        references: ['https://github.com/airbnb/javascript#whitespace--max-len']
      });
    }

    // Missing semicolon (for JavaScript/TypeScript)
    if (line.match(/^\s*[a-zA-Z_$].*[^;{}\s]$/)) {
      issues.push({
        id: `style-semicolon-${lineNumber}`,
        type: 'style',
        severity: 'low',
        line: lineNumber,
        message: 'Missing semicolon',
        description: 'Statement should end with semicolon',
        suggestion: 'Add semicolon at the end of the statement',
        autoFixAvailable: true,
        autoFix: line + ';',
        references: ['https://eslint.org/docs/rules/semi']
      });
    }

    return issues;
  }

  /**
   * 🧠 CHECK LOGIC ISSUES
   */
  private checkLogicIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = [];

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
      });
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
        suggestion: 'Address the issue mentioned in the comment',
        autoFixAvailable: false,
        references: []
      });
    }

    // console.log in production
    if (line.includes('console.log') || line.includes('console.debug')) {
      issues.push({
        id: `logic-console-${lineNumber}`,
        type: 'logic',
        severity: 'medium',
        line: lineNumber,
        message: 'Debug statement in production code',
        description: 'Console statements should be removed from production',
        suggestion: 'Remove console statements or use proper logging',
        autoFixAvailable: true,
        autoFix: line.replace(/console\.(log|debug)\([^)]*\);?/, ''),
        references: []
      });
    }

    return issues;
  }

  /**
   * 🔧 CHECK MAINTAINABILITY ISSUES
   */
  private checkMaintainabilityIssues(line: string, lineNumber: number, fullCode: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Long parameter list
    const functionMatch = line.match(/function\s+\w+\s*\(([^)]*)\)/);
    if (functionMatch && functionMatch[1]) {
      const params = functionMatch[1].split(',').length;
      if (params > 5) {
        issues.push({
          id: `maintainability-params-${lineNumber}`,
          type: 'maintainability',
          severity: 'medium',
          line: lineNumber,
          message: `Too many parameters (${params})`,
          description: 'Functions with many parameters are hard to use and maintain',
          suggestion: 'Consider using an options object or breaking into smaller functions',
          autoFixAvailable: false,
          references: ['https://refactoring.guru/smells/long-parameter-list']
        });
      }
    }

    // Deep nesting
    const indentLevel = (line.match(/^\s*/)?.[0].length || 0) / 2;
    if (indentLevel > 4) {
      issues.push({
        id: `maintainability-nesting-${lineNumber}`,
        type: 'maintainability',
        severity: 'medium',
        line: lineNumber,
        message: `Deep nesting (level ${indentLevel})`,
        description: 'Deeply nested code is hard to read and maintain',
        suggestion: 'Extract nested logic into separate functions',
        autoFixAvailable: false,
        references: ['https://refactoring.guru/smells/long-method']
      });
    }

    return issues;
  }

  /**
   * 🔗 ANALYZE DEPENDENCIES
   */
  private async analyzeDependencies(filePath: string): Promise<DependencyAnalysis> {
    try {
      // Read package.json if it exists
      const packageJsonPath = filePath.replace(/[^/]*$/, 'package.json');
      const packageJson = JSON.parse(await this.webContainer.fs.readFile(packageJsonPath, 'utf8'));
      
      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      // For now, return mock analysis
      // In a real implementation, this would check npm registry
      return {
        outdated: [],
        vulnerable: [],
        unused: [],
        duplicates: []
      };
    } catch (error) {
      return {
        outdated: [],
        vulnerable: [],
        unused: [],
        duplicates: []
      };
    }
  }

  /**
   * 💡 GENERATE SUGGESTIONS
   */
  private generateSuggestions(
    issues: CodeIssue[],
    securityVulnerabilities: SecurityVulnerability[],
    performanceIssues: PerformanceIssue[]
  ): string[] {
    const suggestions: string[] = [];

    // Priority suggestions based on critical issues
    const criticalIssues = [
      ...issues.filter(i => i.severity === 'critical'),
      ...securityVulnerabilities.filter(v => v.severity === 'critical'),
      ...performanceIssues.filter(p => p.impact === 'high')
    ];

    if (criticalIssues.length > 0) {
      suggestions.push(`🚨 Address ${criticalIssues.length} critical issues immediately`);
    }

    // Code quality suggestions
    const styleIssues = issues.filter(i => i.type === 'style');
    if (styleIssues.length > 5) {
      suggestions.push(`🎨 Fix ${styleIssues.length} style issues for better consistency`);
    }

    // Security suggestions
    if (securityVulnerabilities.length > 0) {
      suggestions.push(`🛡️ Review ${securityVulnerabilities.length} security vulnerabilities`);
    }

    // Performance suggestions
    if (performanceIssues.length > 0) {
      suggestions.push(`⚡ Optimize ${performanceIssues.length} performance bottlenecks`);
    }

    return suggestions;
  }

  /**
   * 🔧 GENERATE AUTO-FIXES
   */
  private generateAutoFixes(issues: CodeIssue[]): {[line: number]: string} {
    const fixes: {[line: number]: string} = {};

    for (const issue of issues) {
      if (issue.autoFixAvailable && issue.autoFix) {
        fixes[issue.line] = issue.autoFix;
      }
    }

    return fixes;
  }

  /**
   * 📊 HELPER METHODS FOR METRICS CALCULATION
   */
  private calculateComplexity(code: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1;

    for (const keyword of complexityKeywords) {
      const matches = code.split(keyword).length - 1;
      complexity += matches;
    }

    return Math.min(100, Math.max(0, 100 - complexity * 2));
  }

  private calculateMaintainability(code: string, linesOfCode: number): number {
    let score = 100;
    
    // Penalize large files
    if (linesOfCode > 500) score -= 20;
    if (linesOfCode > 1000) score -= 20;
    
    // Penalize TODO/FIXME
    const todos = (code.match(/TODO|FIXME/g) || []).length;
    score -= todos * 5;
    
    return Math.max(0, score);
  }

  private calculateDocumentationScore(code: string): number {
    const lines = code.split('\n');
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('/*') || 
      line.trim().startsWith('*')
    ).length;
    
    const ratio = commentLines / lines.length;
    return Math.min(100, ratio * 400); // 25% comments = 100 score
  }

  private async calculateSecurityScore(code: string): Promise<number> {
    let score = 100;
    
    // Check for common security issues
    if (code.includes('eval(')) score -= 20;
    if (code.includes('innerHTML')) score -= 10;
    if (code.includes('document.write')) score -= 15;
    if (code.match(/password.*=.*["'][^"']*["']/i)) score -= 25;
    
    return Math.max(0, score);
  }

  private calculatePerformanceScore(code: string): number {
    let score = 100;
    
    // Check for performance issues
    const nestedLoops = (code.match(/for.*for/g) || []).length;
    score -= nestedLoops * 10;
    
    const syncOperations = (code.match(/fs\.readFileSync|fs\.writeFileSync/g) || []).length;
    score -= syncOperations * 15;
    
    return Math.max(0, score);
  }

  private async calculateTestCoverage(filePath: string): Promise<number> {
    // This would integrate with actual test runners
    // For now, return a mock score
    return 75;
  }

  private calculateCodeSmells(code: string): number {
    let smells = 0;
    
    // Count various code smells
    smells += (code.match(/TODO|FIXME|HACK/g) || []).length;
    smells += (code.match(/console\.log/g) || []).length;
    smells += (code.match(/var\s+/g) || []).length; // prefer let/const
    
    return smells;
  }

  private calculateTechnicalDebt(code: string, codeSmells: number): number {
    // Estimate technical debt in hours
    const lines = code.split('\n').length;
    let debt = 0;
    
    debt += codeSmells * 0.5; // 30 minutes per code smell
    debt += Math.max(0, (lines - 500) / 100); // Large files
    
    return Math.round(debt * 10) / 10; // Round to 1 decimal
  }

  private meetsSeverityThreshold(issueSeverity: string, threshold: string): boolean {
    const levels = ['low', 'medium', 'high', 'critical'];
    const issueLevel = levels.indexOf(issueSeverity);
    const thresholdLevel = levels.indexOf(threshold);
    return issueLevel >= thresholdLevel;
  }

  /**
   * 🔧 INITIALIZE SECURITY PATTERNS
   */
  private initializeSecurityPatterns(): void {
    this.securityPatterns.set('xss', /innerHTML\s*=.*\+|document\.write\s*\(/);
    this.securityPatterns.set('sql_injection', /query\s*\+.*\+|execute\s*\(.*\+/);
    this.securityPatterns.set('hardcoded_secrets', /(password|secret|key|token)\s*=\s*["'][^"']+["']/i);
    this.securityPatterns.set('weak_crypto', /MD5|SHA1|DES/i);
  }

  /**
   * ⚡ INITIALIZE PERFORMANCE PATTERNS
   */
  private initializePerformancePatterns(): void {
    this.performancePatterns.set('inefficient_loop', /for.*for.*for/);
    this.performancePatterns.set('blocking_operation', /readFileSync|writeFileSync/);
    this.performancePatterns.set('memory_leak', /addEventListener.*(?!removeEventListener)/);
  }

  /**
   * 📊 GET REVIEW HISTORY
   */
  getReviewHistory(filePath?: string): CodeReviewResult[] {
    if (filePath) {
      return this.reviewHistory.get(filePath) || [];
    }
    
    const allReviews: CodeReviewResult[] = [];
    for (const reviews of this.reviewHistory.values()) {
      allReviews.push(...reviews);
    }
    
    return allReviews.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

/**
 * 🎯 EXPORT DEFAULT CODE REVIEW ASSISTANT
 */
export default AICodeReviewAssistant;
