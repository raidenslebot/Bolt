import { EventEmitter } from 'events'
import * as os from 'os'

export interface PerformanceMetrics {
  timestamp: Date
  memory: {
    used: number // MB
    total: number // MB
    percentage: number
  }
  cpu: {
    usage: number // percentage
    loadAverage: number[]
  }
  disk: {
    reads: number
    writes: number
  }
  network: {
    bytesReceived: number
    bytesSent: number
  }
  ide: {
    activeLanguageServers: number
    indexedFiles: number
    activeConnections: number
    responseTime: number // ms
    errorRate: number // percentage
  }
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'disk' | 'network' | 'ide'
  severity: 'info' | 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: Date
}

export interface OptimizationSuggestion {
  id: string
  type: 'memory' | 'cpu' | 'indexing' | 'caching' | 'configuration'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  estimatedImpact: string
  implementation: string[]
}

/**
 * Real-time performance monitoring and optimization for the IDE
 * Provides intelligent insights to maintain competitive performance
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private isMonitoring = false
  private monitorInterval: NodeJS.Timeout | null = null
  private thresholds = {
    memory: { warning: 70, critical: 85 },
    cpu: { warning: 70, critical: 90 },
    responseTime: { warning: 1000, critical: 3000 },
    errorRate: { warning: 5, critical: 15 }
  }
  
  // Track IDE-specific metrics
  private ideMetrics = {
    requestTimes: [] as number[],
    errors: 0,
    totalRequests: 0,
    lastReset: Date.now()
  }

  constructor() {
    super()
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.emit('monitoringStarted')

    this.monitorInterval = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    console.log('Performance monitoring started')
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }

    this.emit('monitoringStopped')
    console.log('Performance monitoring stopped')
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      const loadAvg = os.loadavg()

      const metric: PerformanceMetrics = {
        timestamp: new Date(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: {
          usage: this.calculateCpuUsage(cpuUsage),
          loadAverage: loadAvg
        },
        disk: {
          reads: 0, // Would be tracked with real disk monitoring
          writes: 0
        },
        network: {
          bytesReceived: 0, // Would be tracked with real network monitoring
          bytesSent: 0
        },
        ide: {
          activeLanguageServers: 1, // Would get from orchestrator
          indexedFiles: 0, // Would get from indexing service
          activeConnections: 0, // Would get from connection manager
          responseTime: this.getAverageResponseTime(),
          errorRate: this.getErrorRate()
        }
      }

      this.metrics.push(metric)
      
      // Keep only last 1000 metrics (about 1.5 hours at 5s intervals)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000)
      }

      // Check for alerts
      this.checkAlerts(metric)

      this.emit('metricsCollected', metric)

    } catch (error) {
      console.error('Failed to collect metrics:', error)
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU calculation - would be more sophisticated in real implementation
    const totalUsage = cpuUsage.user + cpuUsage.system
    return Math.min(100, totalUsage / 1000000) // Convert microseconds to percentage
  }

  /**
   * Get average response time from recent requests
   */
  private getAverageResponseTime(): number {
    if (this.ideMetrics.requestTimes.length === 0) return 0
    
    const sum = this.ideMetrics.requestTimes.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.ideMetrics.requestTimes.length)
  }

  /**
   * Calculate error rate
   */
  private getErrorRate(): number {
    if (this.ideMetrics.totalRequests === 0) return 0
    return Math.round((this.ideMetrics.errors / this.ideMetrics.totalRequests) * 100)
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metric: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = []

    // Memory alerts
    if (metric.memory.percentage >= this.thresholds.memory.critical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${metric.memory.percentage}%`,
        value: metric.memory.percentage,
        threshold: this.thresholds.memory.critical,
        timestamp: new Date()
      })
    } else if (metric.memory.percentage >= this.thresholds.memory.warning) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${metric.memory.percentage}%`,
        value: metric.memory.percentage,
        threshold: this.thresholds.memory.warning,
        timestamp: new Date()
      })
    }

    // CPU alerts
    if (metric.cpu.usage >= this.thresholds.cpu.critical) {
      alerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${metric.cpu.usage}%`,
        value: metric.cpu.usage,
        threshold: this.thresholds.cpu.critical,
        timestamp: new Date()
      })
    } else if (metric.cpu.usage >= this.thresholds.cpu.warning) {
      alerts.push({
        type: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${metric.cpu.usage}%`,
        value: metric.cpu.usage,
        threshold: this.thresholds.cpu.warning,
        timestamp: new Date()
      })
    }

    // Response time alerts
    if (metric.ide.responseTime >= this.thresholds.responseTime.critical) {
      alerts.push({
        type: 'ide',
        severity: 'critical',
        message: `Critical response time: ${metric.ide.responseTime}ms`,
        value: metric.ide.responseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: new Date()
      })
    } else if (metric.ide.responseTime >= this.thresholds.responseTime.warning) {
      alerts.push({
        type: 'ide',
        severity: 'warning',
        message: `High response time: ${metric.ide.responseTime}ms`,
        value: metric.ide.responseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: new Date()
      })
    }

    // Error rate alerts
    if (metric.ide.errorRate >= this.thresholds.errorRate.critical) {
      alerts.push({
        type: 'ide',
        severity: 'critical',
        message: `Critical error rate: ${metric.ide.errorRate}%`,
        value: metric.ide.errorRate,
        threshold: this.thresholds.errorRate.critical,
        timestamp: new Date()
      })
    } else if (metric.ide.errorRate >= this.thresholds.errorRate.warning) {
      alerts.push({
        type: 'ide',
        severity: 'warning',
        message: `High error rate: ${metric.ide.errorRate}%`,
        value: metric.ide.errorRate,
        threshold: this.thresholds.errorRate.warning,
        timestamp: new Date()
      })
    }

    // Emit alerts
    for (const alert of alerts) {
      this.alerts.push(alert)
      this.emit('alert', alert)
    }

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  /**
   * Record a request completion time
   */
  recordRequest(responseTimeMs: number, isError = false): void {
    this.ideMetrics.requestTimes.push(responseTimeMs)
    this.ideMetrics.totalRequests++
    
    if (isError) {
      this.ideMetrics.errors++
    }

    // Keep only last 100 request times
    if (this.ideMetrics.requestTimes.length > 100) {
      this.ideMetrics.requestTimes = this.ideMetrics.requestTimes.slice(-100)
    }

    // Reset counters every hour
    if (Date.now() - this.ideMetrics.lastReset > 3600000) {
      this.ideMetrics.errors = 0
      this.ideMetrics.totalRequests = 0
      this.ideMetrics.lastReset = Date.now()
    }
  }

  /**
   * Get current performance summary
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(lastMinutes = 30): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - lastMinutes * 60 * 1000)
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    return this.alerts.filter(a => a.timestamp >= cutoff)
  }

  /**
   * Generate optimization suggestions based on current performance
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const current = this.getCurrentMetrics()
    
    if (!current) return suggestions

    // Memory optimization suggestions
    if (current.memory.percentage > 60) {
      suggestions.push({
        id: 'memory-optimization',
        type: 'memory',
        priority: current.memory.percentage > 80 ? 'high' : 'medium',
        title: 'Optimize Memory Usage',
        description: 'Memory usage is high. Consider optimizing caching and garbage collection.',
        estimatedImpact: `Reduce memory usage by 20-30% (${Math.round(current.memory.percentage * 0.3)}MB)`,
        implementation: [
          'Implement LRU cache for indexing results',
          'Reduce symbol cache size',
          'Enable incremental garbage collection',
          'Optimize LSP message buffers'
        ]
      })
    }

    // Response time optimization
    if (current.ide.responseTime > 500) {
      suggestions.push({
        id: 'response-time-optimization',
        type: 'caching',
        priority: current.ide.responseTime > 1500 ? 'high' : 'medium',
        title: 'Improve Response Times',
        description: 'AI response times are slower than optimal.',
        estimatedImpact: `Reduce response time by 40-60% (${Math.round(current.ide.responseTime * 0.5)}ms target)`,
        implementation: [
          'Implement context caching',
          'Use streaming responses',
          'Optimize database queries',
          'Pre-compute common symbol lookups'
        ]
      })
    }

    // Indexing optimization
    if (current.ide.indexedFiles > 10000) {
      suggestions.push({
        id: 'indexing-optimization',
        type: 'indexing',
        priority: 'medium',
        title: 'Optimize Large Project Indexing',
        description: 'Large project detected. Optimize indexing strategy.',
        estimatedImpact: 'Reduce indexing time by 50% and improve search speed',
        implementation: [
          'Implement incremental indexing',
          'Use worker threads for parsing',
          'Add smart file filtering',
          'Implement index compression'
        ]
      })
    }

    // Error rate optimization
    if (current.ide.errorRate > 3) {
      suggestions.push({
        id: 'error-rate-optimization',
        type: 'configuration',
        priority: current.ide.errorRate > 10 ? 'high' : 'medium',
        title: 'Reduce Error Rate',
        description: 'Error rate is higher than expected.',
        estimatedImpact: `Reduce errors by 80% (target: <1% error rate)`,
        implementation: [
          'Add retry logic for LSP requests',
          'Improve error handling in AI service',
          'Add request validation',
          'Implement graceful degradation'
        ]
      })
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Update monitoring thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    this.emit('thresholdsUpdated', this.thresholds)
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: {
      status: 'excellent' | 'good' | 'needs-improvement' | 'critical'
      score: number // 0-100
      primaryIssues: string[]
    }
    metrics: PerformanceMetrics | null
    alerts: PerformanceAlert[]
    suggestions: OptimizationSuggestion[]
  } {
    const current = this.getCurrentMetrics()
    const alerts = this.getActiveAlerts()
    const suggestions = this.getOptimizationSuggestions()

    // Calculate performance score
    let score = 100
    if (current) {
      if (current.memory.percentage > 70) score -= 20
      if (current.cpu.usage > 70) score -= 20
      if (current.ide.responseTime > 1000) score -= 30
      if (current.ide.errorRate > 5) score -= 30
    }
    score = Math.max(0, score)

    // Determine status
    let status: 'excellent' | 'good' | 'needs-improvement' | 'critical'
    if (score >= 90) status = 'excellent'
    else if (score >= 70) status = 'good'
    else if (score >= 50) status = 'needs-improvement'
    else status = 'critical'

    // Identify primary issues
    const primaryIssues: string[] = []
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    if (criticalAlerts.length > 0) {
      primaryIssues.push(...criticalAlerts.map(a => a.message))
    } else {
      const warningAlerts = alerts.filter(a => a.severity === 'warning')
      primaryIssues.push(...warningAlerts.slice(0, 3).map(a => a.message))
    }

    return {
      summary: { status, score, primaryIssues },
      metrics: current,
      alerts,
      suggestions
    }
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    this.stopMonitoring()
    this.metrics = []
    this.alerts = []
    this.removeAllListeners()
  }
}
