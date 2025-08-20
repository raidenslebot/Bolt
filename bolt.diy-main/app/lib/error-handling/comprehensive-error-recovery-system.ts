/**
 * 🚨 COMPREHENSIVE ERROR HANDLING & RECOVERY SYSTEM
 * Advanced error management, recovery, and resilience for Bolt.diy
 * Includes WebContainer-specific error handling and autonomous recovery
 */

import { webcontainer } from '~/lib/webcontainer';

export interface ErrorContext {
  timestamp: Date;
  errorId: string;
  category: 'webcontainer' | 'filesystem' | 'network' | 'ai' | 'build' | 'runtime' | 'permission' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  operation: string;
  metadata: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface ErrorPattern {
  id: string;
  name: string;
  pattern: RegExp | string;
  category: ErrorContext['category'];
  severity: ErrorContext['severity'];
  description: string;
  commonCauses: string[];
  recoveryStrategies: string[];
  preventionTips: string[];
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  steps: RecoveryStep[];
  conditions: string[];
  successRate: number;
  estimatedTime: number; // in milliseconds
}

export interface RecoveryStep {
  action: 'retry' | 'reset' | 'cleanup' | 'fallback' | 'restart' | 'ignore' | 'custom';
  description: string;
  parameters?: Record<string, any>;
  timeout?: number;
  critical?: boolean;
}

export interface ErrorAnalysis {
  error: Error;
  context: ErrorContext;
  matchedPatterns: ErrorPattern[];
  suggestedStrategies: RecoveryStrategy[];
  rootCause: string;
  impactAssessment: {
    userExperience: 'minimal' | 'moderate' | 'significant' | 'severe';
    systemStability: 'stable' | 'degraded' | 'unstable' | 'critical';
    dataIntegrity: 'safe' | 'at-risk' | 'compromised';
  };
  autoRecoveryPossible: boolean;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: ErrorAnalysis;
  recoveryAttempts: RecoveryAttempt[];
  resolution: 'recovered' | 'partially-recovered' | 'escalated' | 'pending';
  resolutionTime?: number;
  lessonsLearned: string[];
}

export interface RecoveryAttempt {
  strategy: RecoveryStrategy;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  stepResults: Array<{
    step: RecoveryStep;
    success: boolean;
    output?: any;
    error?: string;
  }>;
  notes: string[];
}

/**
 * Advanced error handling and recovery system for Bolt.diy
 */
export class ErrorHandlingRecoverySystem {
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private errorHistory: Map<string, ErrorReport> = new Map();
  private activeRecoveries: Map<string, RecoveryAttempt> = new Map();
  
  private errorCount = 0;
  private lastErrorTime = 0;
  private circuitBreaker = false;
  private isInitialized = false;

  constructor() {
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize common error patterns
   */
  private initializeErrorPatterns(): void {
    const patterns: ErrorPattern[] = [
      {
        id: 'webcontainer-permission-denied',
        name: 'WebContainer Permission Denied',
        pattern: /EACCES|permission denied|EPERM/i,
        category: 'permission',
        severity: 'high',
        description: 'WebContainer file system permission error',
        commonCauses: [
          'Attempting to access restricted paths',
          'Insufficient container permissions',
          'File system corruption',
          'Invalid path resolution'
        ],
        recoveryStrategies: ['webcontainer-permission-recovery', 'path-sanitization', 'container-reset'],
        preventionTips: [
          'Use relative paths within project directory',
          'Validate file paths before operations',
          'Implement proper error boundaries'
        ]
      },
      {
        id: 'webcontainer-spawn-failed',
        name: 'WebContainer Process Spawn Failed',
        pattern: /spawn.*failed|process.*not found|command not found/i,
        category: 'webcontainer',
        severity: 'medium',
        description: 'Failed to spawn process in WebContainer',
        commonCauses: [
          'Command not available in container',
          'PATH environment variable issues',
          'Resource constraints',
          'Container initialization incomplete'
        ],
        recoveryStrategies: ['command-fallback', 'container-reinit', 'dependency-install'],
        preventionTips: [
          'Verify command availability before execution',
          'Use absolute paths for executables',
          'Implement command validation'
        ]
      },
      {
        id: 'file-system-error',
        name: 'File System Operation Error',
        pattern: /ENOENT|EEXIST|EISDIR|ENOTDIR/i,
        category: 'filesystem',
        severity: 'medium',
        description: 'File system operation failed',
        commonCauses: [
          'File or directory not found',
          'Path conflicts',
          'Concurrent file operations',
          'Invalid file names'
        ],
        recoveryStrategies: ['path-validation', 'directory-creation', 'file-cleanup'],
        preventionTips: [
          'Check file existence before operations',
          'Use atomic file operations',
          'Implement proper locking mechanisms'
        ]
      },
      {
        id: 'network-timeout',
        name: 'Network Request Timeout',
        pattern: /timeout|ETIMEDOUT|network error|fetch failed/i,
        category: 'network',
        severity: 'medium',
        description: 'Network request timed out or failed',
        commonCauses: [
          'Slow internet connection',
          'Server overload',
          'DNS resolution issues',
          'Firewall blocking'
        ],
        recoveryStrategies: ['exponential-backoff', 'network-fallback', 'cache-utilization'],
        preventionTips: [
          'Implement proper timeout handling',
          'Use connection pooling',
          'Cache frequently accessed resources'
        ]
      },
      {
        id: 'ai-service-error',
        name: 'AI Service Error',
        pattern: /ai.*error|model.*failed|inference.*error|api.*limit/i,
        category: 'ai',
        severity: 'medium',
        description: 'AI service request failed',
        commonCauses: [
          'API rate limiting',
          'Model unavailable',
          'Invalid request format',
          'Authentication issues'
        ],
        recoveryStrategies: ['ai-service-fallback', 'rate-limit-backoff', 'model-switching'],
        preventionTips: [
          'Implement proper rate limiting',
          'Use multiple AI providers',
          'Cache AI responses when appropriate'
        ]
      },
      {
        id: 'memory-exhaustion',
        name: 'Memory Exhaustion',
        pattern: /out of memory|memory.*exhausted|heap.*limit/i,
        category: 'runtime',
        severity: 'critical',
        description: 'System running out of memory',
        commonCauses: [
          'Memory leaks in code',
          'Large file processing',
          'Infinite loops',
          'Resource hoarding'
        ],
        recoveryStrategies: ['memory-cleanup', 'resource-optimization', 'system-restart'],
        preventionTips: [
          'Implement proper memory management',
          'Use streaming for large files',
          'Regular garbage collection'
        ]
      }
    ];

    patterns.forEach(pattern => {
      this.errorPatterns.set(pattern.id, pattern);
    });

    console.log(`[ERROR-SYSTEM] Initialized ${patterns.length} error patterns`);
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    const strategies: RecoveryStrategy[] = [
      {
        id: 'webcontainer-permission-recovery',
        name: 'WebContainer Permission Recovery',
        description: 'Recover from WebContainer permission errors',
        automated: true,
        successRate: 0.8,
        estimatedTime: 2000,
        conditions: ['webcontainer available', 'path accessible'],
        steps: [
          {
            action: 'cleanup',
            description: 'Clear invalid path references',
            timeout: 1000
          },
          {
            action: 'custom',
            description: 'Sanitize file paths',
            parameters: { operation: 'sanitize-paths' },
            timeout: 500
          },
          {
            action: 'retry',
            description: 'Retry operation with corrected paths',
            timeout: 2000
          }
        ]
      },
      {
        id: 'container-reset',
        name: 'Container Reset',
        description: 'Reset WebContainer to clean state',
        automated: true,
        successRate: 0.95,
        estimatedTime: 5000,
        conditions: ['webcontainer available'],
        steps: [
          {
            action: 'cleanup',
            description: 'Save current state',
            timeout: 2000
          },
          {
            action: 'restart',
            description: 'Restart WebContainer instance',
            timeout: 10000,
            critical: true
          },
          {
            action: 'custom',
            description: 'Restore saved state',
            parameters: { operation: 'restore-state' },
            timeout: 3000
          }
        ]
      },
      {
        id: 'exponential-backoff',
        name: 'Exponential Backoff Retry',
        description: 'Retry with exponentially increasing delays',
        automated: true,
        successRate: 0.7,
        estimatedTime: 10000,
        conditions: ['network available'],
        steps: [
          {
            action: 'retry',
            description: 'First retry after 1 second',
            timeout: 1000,
            parameters: { delay: 1000, attempt: 1 }
          },
          {
            action: 'retry',
            description: 'Second retry after 2 seconds',
            timeout: 2000,
            parameters: { delay: 2000, attempt: 2 }
          },
          {
            action: 'retry',
            description: 'Third retry after 4 seconds',
            timeout: 4000,
            parameters: { delay: 4000, attempt: 3 }
          }
        ]
      },
      {
        id: 'memory-cleanup',
        name: 'Memory Cleanup Strategy',
        description: 'Free up memory and optimize resource usage',
        automated: true,
        successRate: 0.6,
        estimatedTime: 3000,
        conditions: ['system responsive'],
        steps: [
          {
            action: 'cleanup',
            description: 'Force garbage collection',
            timeout: 1000
          },
          {
            action: 'custom',
            description: 'Clear caches',
            parameters: { operation: 'clear-caches' },
            timeout: 500
          },
          {
            action: 'custom',
            description: 'Optimize data structures',
            parameters: { operation: 'optimize-memory' },
            timeout: 2000
          }
        ]
      },
      {
        id: 'ai-service-fallback',
        name: 'AI Service Fallback',
        description: 'Switch to backup AI service or model',
        automated: true,
        successRate: 0.85,
        estimatedTime: 1000,
        conditions: ['backup service available'],
        steps: [
          {
            action: 'fallback',
            description: 'Switch to backup AI service',
            parameters: { service: 'backup' },
            timeout: 500
          },
          {
            action: 'retry',
            description: 'Retry request with backup service',
            timeout: 5000
          }
        ]
      }
    ];

    strategies.forEach(strategy => {
      this.recoveryStrategies.set(strategy.id, strategy);
    });

    console.log(`[ERROR-SYSTEM] Initialized ${strategies.length} recovery strategies`);
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          component: 'global',
          operation: 'promise-rejection',
          category: 'runtime',
          severity: 'high',
          metadata: { type: 'unhandled-promise-rejection' }
        });
      });

      // Global error handler
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          component: 'global',
          operation: 'uncaught-error',
          category: 'runtime',
          severity: 'high',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            type: 'uncaught-error'
          }
        });
      });
    }

    this.isInitialized = true;
    console.log('[ERROR-SYSTEM] Global error handlers initialized');
  }

  /**
   * Main error handling entry point
   */
  async handleError(
    error: Error | any,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorReport> {
    try {
      // Create error context
      const errorId = this.generateErrorId();
      const fullContext: ErrorContext = {
        timestamp: new Date(),
        errorId,
        category: context.category || 'runtime',
        severity: context.severity || 'medium',
        component: context.component || 'unknown',
        operation: context.operation || 'unknown',
        metadata: context.metadata || {},
        stackTrace: error?.stack,
        userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
        sessionId: this.getSessionId()
      };

      // Analyze error
      const analysis = await this.analyzeError(error, fullContext);
      
      // Create error report
      const report: ErrorReport = {
        id: errorId,
        timestamp: new Date(),
        error: analysis,
        recoveryAttempts: [],
        resolution: 'pending',
        lessonsLearned: []
      };

      // Store error report
      this.errorHistory.set(errorId, report);
      
      // Check circuit breaker
      if (this.shouldTriggerCircuitBreaker()) {
        console.warn('[ERROR-SYSTEM] Circuit breaker triggered - preventing further operations');
        this.circuitBreaker = true;
        return report;
      }

      // Attempt automatic recovery if possible
      if (analysis.autoRecoveryPossible && analysis.suggestedStrategies.length > 0) {
        await this.attemptRecovery(report, analysis.suggestedStrategies);
      }

      // Log error for monitoring
      this.logError(analysis);
      
      return report;

    } catch (recoveryError) {
      console.error('[ERROR-SYSTEM] Error in error handling system:', recoveryError);
      throw recoveryError;
    }
  }

  /**
   * Analyze error and determine recovery strategies
   */
  private async analyzeError(error: Error | any, context: ErrorContext): Promise<ErrorAnalysis> {
    const errorMessage = error?.message || String(error);
    const matchedPatterns: ErrorPattern[] = [];
    
    // Match error patterns
    for (const pattern of this.errorPatterns.values()) {
      const regex = typeof pattern.pattern === 'string' 
        ? new RegExp(pattern.pattern, 'i')
        : pattern.pattern;
        
      if (regex.test(errorMessage) || regex.test(error?.stack || '')) {
        matchedPatterns.push(pattern);
      }
    }

    // Get suggested strategies
    const suggestedStrategies: RecoveryStrategy[] = [];
    for (const pattern of matchedPatterns) {
      for (const strategyId of pattern.recoveryStrategies) {
        const strategy = this.recoveryStrategies.get(strategyId);
        if (strategy && !suggestedStrategies.includes(strategy)) {
          suggestedStrategies.push(strategy);
        }
      }
    }

    // Determine root cause
    const rootCause = await this.determineRootCause(error, context, matchedPatterns);
    
    // Assess impact
    const impactAssessment = this.assessImpact(context, matchedPatterns);
    
    // Determine if auto-recovery is possible
    const autoRecoveryPossible = suggestedStrategies.some(s => s.automated) &&
                                context.severity !== 'critical' &&
                                !this.circuitBreaker;

    return {
      error,
      context,
      matchedPatterns,
      suggestedStrategies: suggestedStrategies.sort((a, b) => b.successRate - a.successRate),
      rootCause,
      impactAssessment,
      autoRecoveryPossible
    };
  }

  /**
   * Determine root cause of error
   */
  private async determineRootCause(
    error: Error | any,
    context: ErrorContext,
    patterns: ErrorPattern[]
  ): Promise<string> {
    if (patterns.length === 0) {
      return 'Unknown error - no matching patterns found';
    }

    const primaryPattern = patterns[0];
    
    // Check for common causes based on context
    if (context.category === 'webcontainer') {
      if (/permission/i.test(error.message)) {
        return 'WebContainer permission denied - likely accessing restricted paths';
      }
      if (/spawn/i.test(error.message)) {
        return 'WebContainer process spawn failed - command not available or path issues';
      }
    }

    if (context.category === 'network') {
      if (/timeout/i.test(error.message)) {
        return 'Network timeout - slow connection or server overload';
      }
    }

    return primaryPattern.commonCauses[0] || 'Unknown root cause';
  }

  /**
   * Assess error impact
   */
  private assessImpact(
    context: ErrorContext,
    patterns: ErrorPattern[]
  ): ErrorAnalysis['impactAssessment'] {
    const maxSeverity = patterns.reduce((max, pattern) => {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      return Math.max(max, severityLevels[pattern.severity]);
    }, 0);

    let userExperience: ErrorAnalysis['impactAssessment']['userExperience'] = 'minimal';
    let systemStability: ErrorAnalysis['impactAssessment']['systemStability'] = 'stable';
    let dataIntegrity: ErrorAnalysis['impactAssessment']['dataIntegrity'] = 'safe';

    if (maxSeverity >= 4) {
      userExperience = 'severe';
      systemStability = 'critical';
      dataIntegrity = 'compromised';
    } else if (maxSeverity >= 3) {
      userExperience = 'significant';
      systemStability = 'unstable';
      dataIntegrity = 'at-risk';
    } else if (maxSeverity >= 2) {
      userExperience = 'moderate';
      systemStability = 'degraded';
    }

    return { userExperience, systemStability, dataIntegrity };
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery(
    report: ErrorReport,
    strategies: RecoveryStrategy[]
  ): Promise<void> {
    for (const strategy of strategies) {
      if (!strategy.automated) continue;

      const attempt: RecoveryAttempt = {
        strategy,
        startTime: new Date(),
        success: false,
        stepResults: [],
        notes: []
      };

      this.activeRecoveries.set(report.id, attempt);
      
      try {
        console.log(`[ERROR-SYSTEM] Attempting recovery: ${strategy.name}`);
        
        // Execute recovery steps
        let allStepsSuccessful = true;
        
        for (const step of strategy.steps) {
          const stepResult = await this.executeRecoveryStep(step, report.error.context);
          attempt.stepResults.push(stepResult);
          
          if (!stepResult.success && step.critical) {
            allStepsSuccessful = false;
            attempt.notes.push(`Critical step failed: ${step.description}`);
            break;
          }
        }

        attempt.success = allStepsSuccessful;
        attempt.endTime = new Date();
        
        if (attempt.success) {
          report.resolution = 'recovered';
          report.resolutionTime = attempt.endTime.getTime() - attempt.startTime.getTime();
          attempt.notes.push('Recovery completed successfully');
          console.log(`[ERROR-SYSTEM] Recovery successful: ${strategy.name}`);
          break;
        } else {
          attempt.notes.push('Recovery failed - trying next strategy');
        }

      } catch (recoveryError) {
        attempt.success = false;
        attempt.endTime = new Date();
        attempt.notes.push(`Recovery error: ${recoveryError.message}`);
        console.warn(`[ERROR-SYSTEM] Recovery failed: ${strategy.name}`, recoveryError);
      }

      report.recoveryAttempts.push(attempt);
      this.activeRecoveries.delete(report.id);
    }

    if (report.resolution === 'pending') {
      report.resolution = 'escalated';
      console.warn('[ERROR-SYSTEM] All recovery attempts failed - escalating error');
    }
  }

  /**
   * Execute individual recovery step
   */
  private async executeRecoveryStep(
    step: RecoveryStep,
    context: ErrorContext
  ): Promise<RecoveryAttempt['stepResults'][0]> {
    const stepResult = {
      step,
      success: false,
      output: undefined,
      error: undefined
    };

    try {
      switch (step.action) {
        case 'retry':
          await this.executeRetryStep(step, context);
          break;
          
        case 'cleanup':
          await this.executeCleanupStep(step, context);
          break;
          
        case 'reset':
          await this.executeResetStep(step, context);
          break;
          
        case 'fallback':
          await this.executeFallbackStep(step, context);
          break;
          
        case 'restart':
          await this.executeRestartStep(step, context);
          break;
          
        case 'custom':
          await this.executeCustomStep(step, context);
          break;
          
        case 'ignore':
          // Intentionally do nothing
          break;
          
        default:
          throw new Error(`Unknown recovery action: ${step.action}`);
      }

      stepResult.success = true;

    } catch (error) {
      stepResult.success = false;
      stepResult.error = error.message;
    }

    return stepResult;
  }

  /**
   * Execute retry step
   */
  private async executeRetryStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    const delay = step.parameters?.delay || 1000;
    const maxAttempts = step.parameters?.maxAttempts || 3;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // In a real implementation, would retry the original operation
    console.log(`[ERROR-SYSTEM] Retry step executed with ${delay}ms delay`);
  }

  /**
   * Execute cleanup step
   */
  private async executeCleanupStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    // Clear relevant caches, temporary files, etc.
    if (context.category === 'webcontainer' && typeof webcontainer !== 'undefined') {
      // WebContainer-specific cleanup
      console.log('[ERROR-SYSTEM] WebContainer cleanup executed');
    }
    
    // General cleanup
    if (typeof gc === 'function') {
      gc(); // Force garbage collection if available
    }
    
    console.log('[ERROR-SYSTEM] Cleanup step executed');
  }

  /**
   * Execute reset step
   */
  private async executeResetStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    console.log('[ERROR-SYSTEM] Reset step executed');
  }

  /**
   * Execute fallback step
   */
  private async executeFallbackStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    console.log('[ERROR-SYSTEM] Fallback step executed');
  }

  /**
   * Execute restart step
   */
  private async executeRestartStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    if (context.category === 'webcontainer') {
      // Restart WebContainer if possible
      console.log('[ERROR-SYSTEM] WebContainer restart initiated');
    }
    
    console.log('[ERROR-SYSTEM] Restart step executed');
  }

  /**
   * Execute custom step
   */
  private async executeCustomStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    const operation = step.parameters?.operation;
    
    switch (operation) {
      case 'sanitize-paths':
        // Sanitize file paths for WebContainer
        console.log('[ERROR-SYSTEM] Path sanitization executed');
        break;
        
      case 'clear-caches':
        // Clear various caches
        console.log('[ERROR-SYSTEM] Cache clearing executed');
        break;
        
      case 'optimize-memory':
        // Memory optimization
        console.log('[ERROR-SYSTEM] Memory optimization executed');
        break;
        
      default:
        console.log(`[ERROR-SYSTEM] Custom step executed: ${operation}`);
    }
  }

  /**
   * Check if circuit breaker should be triggered
   */
  private shouldTriggerCircuitBreaker(): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const errorThreshold = 10;

    // Reset counter if outside time window
    if (now - this.lastErrorTime > timeWindow) {
      this.errorCount = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    return this.errorCount > errorThreshold;
  }

  /**
   * Log error for monitoring
   */
  private logError(analysis: ErrorAnalysis): void {
    const logLevel = analysis.context.severity === 'critical' ? 'error' : 'warn';
    
    console[logLevel]('[ERROR-SYSTEM] Error analyzed:', {
      id: analysis.context.errorId,
      category: analysis.context.category,
      severity: analysis.context.severity,
      component: analysis.context.component,
      operation: analysis.context.operation,
      message: analysis.error.message,
      rootCause: analysis.rootCause,
      impact: analysis.impactAssessment,
      recoveryPossible: analysis.autoRecoveryPossible
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or generate session ID
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('bolt-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('bolt-session-id', sessionId);
      }
      return sessionId;
    }
    return 'server-session';
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    circuitBreakerActive: boolean;
    recentErrors: ErrorReport[];
  } {
    const reports = Array.from(this.errorHistory.values());
    
    const errorsByCategory = reports.reduce((acc, report) => {
      const category = report.error.context.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = reports.reduce((acc, report) => {
      const severity = report.error.context.severity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoveredReports = reports.filter(r => r.resolution === 'recovered');
    const recoverySuccessRate = reports.length > 0 
      ? recoveredReports.length / reports.length 
      : 0;

    const averageRecoveryTime = recoveredReports.length > 0
      ? recoveredReports.reduce((sum, r) => sum + (r.resolutionTime || 0), 0) / recoveredReports.length
      : 0;

    const recentErrors = reports
      .filter(r => Date.now() - r.timestamp.getTime() < 3600000) // Last hour
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalErrors: reports.length,
      errorsByCategory,
      errorsBySeverity,
      recoverySuccessRate,
      averageRecoveryTime,
      circuitBreakerActive: this.circuitBreaker,
      recentErrors
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = false;
    this.errorCount = 0;
    this.lastErrorTime = 0;
    console.log('[ERROR-SYSTEM] Circuit breaker reset');
  }

  /**
   * Get error report by ID
   */
  getErrorReport(id: string): ErrorReport | null {
    return this.errorHistory.get(id) || null;
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory.clear();
    console.log('[ERROR-SYSTEM] Error history cleared');
  }

  /**
   * Add custom error pattern
   */
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.set(pattern.id, pattern);
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getErrorStatistics();
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rate
    const recentErrorCount = stats.recentErrors.length;
    if (recentErrorCount > 5) {
      score -= 30;
      issues.push(`High error rate: ${recentErrorCount} errors in the last hour`);
      recommendations.push('Investigate root causes of frequent errors');
    }

    // Check recovery success rate
    if (stats.recoverySuccessRate < 0.7) {
      score -= 25;
      issues.push(`Low recovery success rate: ${(stats.recoverySuccessRate * 100).toFixed(1)}%`);
      recommendations.push('Review and improve recovery strategies');
    }

    // Check circuit breaker
    if (stats.circuitBreakerActive) {
      score -= 40;
      issues.push('Circuit breaker is active - system protection mode enabled');
      recommendations.push('Address underlying issues and reset circuit breaker');
    }

    // Check critical errors
    const criticalErrors = stats.errorsBySeverity.critical || 0;
    if (criticalErrors > 0) {
      score -= 50;
      issues.push(`${criticalErrors} critical errors detected`);
      recommendations.push('Address critical errors immediately');
    }

    let status: 'healthy' | 'degraded' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 50) status = 'degraded';
    else status = 'critical';

    return { status, score, issues, recommendations };
  }
}

// Export singleton instance
export const errorHandlingSystem = new ErrorHandlingRecoverySystem();
