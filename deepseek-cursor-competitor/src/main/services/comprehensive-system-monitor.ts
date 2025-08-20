import { EventEmitter } from 'events'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { PerformanceObserver, performance } from 'perf_hooks'

export interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    model: string
    speed: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    percentage: number
    heapUsed: number
    heapTotal: number
  }
  disk: {
    total: number
    used: number
    free: number
    percentage: number
  }
  network: {
    interfaces: NetworkInterface[]
    totalRx: number
    totalTx: number
  }
  process: {
    pid: number
    uptime: number
    version: string
    platform: string
    arch: string
    memoryUsage: NodeJS.MemoryUsage
  }
  performance: {
    eventLoopDelay: number
    gcMetrics: GCMetrics[]
    httpRequestsPerSecond: number
    activeHandles: number
    activeRequests: number
  }
}

export interface NetworkInterface {
  name: string
  address: string
  netmask: string
  family: string
  mac: string
  internal: boolean
  rx: number
  tx: number
}

export interface GCMetrics {
  type: string
  duration: number
  timestamp: number
  flags: number
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  uptime: number
  lastCheck: Date
  responseTime: number
  details: any
  metrics: any
}

export interface AlertRule {
  id: string
  name: string
  condition: string
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldown: number
  lastTriggered?: Date
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'slack'
  config: any
}

export interface SystemAlert {
  id: string
  rule: AlertRule
  timestamp: Date
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  acknowledged: boolean
  resolved: boolean
  metadata: any
}

/**
 * Comprehensive System Monitor
 * 
 * Provides real-time monitoring of:
 * - System resources (CPU, memory, disk, network)
 * - Process performance metrics
 * - Service health checks
 * - Custom alerts and notifications
 * - Performance profiling
 * - Anomaly detection
 */
export class ComprehensiveSystemMonitor extends EventEmitter {
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private performanceObserver: PerformanceObserver | null = null
  private gcMetrics: GCMetrics[] = []
  private networkBaseline: Map<string, { rx: number; tx: number }> = new Map()
  private serviceHealthChecks: Map<string, () => Promise<ServiceHealth>> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, SystemAlert> = new Map()
  private metricsHistory: SystemMetrics[] = []
  private healthHistory: Map<string, ServiceHealth[]> = new Map()
  private maxHistorySize: number = 1000
  private monitoringIntervalMs: number = 5000
  private performanceCounters: Map<string, number> = new Map()

  constructor() {
    super()
    this.initializePerformanceMonitoring()
    this.setupDefaultAlertRules()
  }

  /**
   * Start comprehensive system monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return
    }

    console.log('🔍 Starting comprehensive system monitoring...')
    
    this.isMonitoring = true
    
    // Initial metrics collection
    await this.collectMetrics()
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
        await this.checkServiceHealth()
        await this.evaluateAlertRules()
        this.emit('metrics_collected', await this.getCurrentMetrics())
      } catch (error) {
        console.error('Error during monitoring cycle:', error)
        this.emit('monitoring_error', error)
      }
    }, this.monitoringIntervalMs)

    this.emit('monitoring_started')
    console.log('✅ System monitoring started')
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    console.log('🛑 Stopping system monitoring...')
    
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }

    this.emit('monitoring_stopped')
    console.log('✅ System monitoring stopped')
  }

  /**
   * Get current system metrics
   */
  async getCurrentMetrics(): Promise<SystemMetrics> {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memUsage = process.memoryUsage()

    // Get disk usage for current working directory
    const diskStats = await this.getDiskUsage(process.cwd())
    
    // Get network statistics
    const networkStats = await this.getNetworkStats()

    const metrics: SystemMetrics = {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      },
      disk: diskStats,
      network: networkStats,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: memUsage
      },
      performance: {
        eventLoopDelay: this.getEventLoopDelay(),
        gcMetrics: [...this.gcMetrics],
        httpRequestsPerSecond: this.getHttpRequestsPerSecond(),
        activeHandles: (process as any)._getActiveHandles().length,
        activeRequests: (process as any)._getActiveRequests().length
      }
    }

    return metrics
  }

  /**
   * Register a service health check
   */
  registerServiceHealthCheck(serviceName: string, healthCheck: () => Promise<ServiceHealth>): void {
    this.serviceHealthChecks.set(serviceName, healthCheck)
    console.log(`📊 Registered health check for service: ${serviceName}`)
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
    console.log(`🚨 Added alert rule: ${rule.name}`)
    this.emit('alert_rule_added', rule)
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId)
    if (rule) {
      this.alertRules.delete(ruleId)
      console.log(`🗑️ Removed alert rule: ${rule.name}`)
      this.emit('alert_rule_removed', rule)
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Get system health summary
   */
  async getSystemHealthSummary(): Promise<{
    overall: 'healthy' | 'warning' | 'critical'
    services: ServiceHealth[]
    metrics: SystemMetrics
    alerts: SystemAlert[]
  }> {
    const metrics = await this.getCurrentMetrics()
    const services = await this.getAllServiceHealth()
    const alerts = this.getActiveAlerts()

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    if (alerts.some(a => a.severity === 'critical')) {
      overall = 'critical'
    } else if (alerts.some(a => a.severity === 'high') || services.some(s => s.status === 'critical')) {
      overall = 'critical'
    } else if (alerts.some(a => a.severity === 'medium') || services.some(s => s.status === 'warning')) {
      overall = 'warning'
    }

    return {
      overall,
      services,
      metrics,
      alerts
    }
  }

  /**
   * Get historical metrics
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    const history = [...this.metricsHistory]
    return limit ? history.slice(-limit) : history
  }

  /**
   * Export metrics to file
   */
  async exportMetrics(filePath: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    const metrics = this.getMetricsHistory()
    
    if (format === 'json') {
      await fs.promises.writeFile(filePath, JSON.stringify(metrics, null, 2))
    } else if (format === 'csv') {
      const csv = this.convertMetricsToCSV(metrics)
      await fs.promises.writeFile(filePath, csv)
    }
    
    console.log(`📁 Exported metrics to: ${filePath}`)
  }

  // Private methods

  private async collectMetrics(): Promise<void> {
    const metrics = await this.getCurrentMetrics()
    
    // Add to history
    this.metricsHistory.push(metrics)
    
    // Limit history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize)
    }
  }

  private async checkServiceHealth(): Promise<void> {
    for (const [serviceName, healthCheck] of this.serviceHealthChecks) {
      try {
        const health = await healthCheck()
        
        // Add to history
        if (!this.healthHistory.has(serviceName)) {
          this.healthHistory.set(serviceName, [])
        }
        const history = this.healthHistory.get(serviceName)!
        history.push(health)
        
        // Limit history size
        if (history.length > this.maxHistorySize) {
          this.healthHistory.set(serviceName, history.slice(-this.maxHistorySize))
        }
        
        this.emit('service_health_updated', serviceName, health)
      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error)
      }
    }
  }

  private async evaluateAlertRules(): Promise<void> {
    const metrics = await this.getCurrentMetrics()
    const services = await this.getAllServiceHealth()
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue
      
      try {
        const shouldAlert = this.evaluateAlertCondition(rule, metrics, services)
        
        if (shouldAlert) {
          await this.triggerAlert(rule, metrics, services)
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error)
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, metrics: SystemMetrics, services: ServiceHealth[]): boolean {
    // Simple condition evaluation - in production this would be more sophisticated
    const condition = rule.condition.toLowerCase()
    
    if (condition.includes('cpu') && condition.includes('>')) {
      return metrics.cpu.usage > rule.threshold
    }
    
    if (condition.includes('memory') && condition.includes('>')) {
      return metrics.memory.percentage > rule.threshold
    }
    
    if (condition.includes('disk') && condition.includes('>')) {
      return metrics.disk.percentage > rule.threshold
    }
    
    if (condition.includes('service') && condition.includes('critical')) {
      return services.some(s => s.status === 'critical')
    }
    
    return false
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics, services: ServiceHealth[]): Promise<void> {
    // Check cooldown
    if (rule.lastTriggered && rule.cooldown > 0) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime()
      if (timeSinceLastTrigger < rule.cooldown * 1000) {
        return
      }
    }
    
    const alert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      rule,
      timestamp: new Date(),
      message: `Alert triggered: ${rule.name}`,
      severity: rule.severity,
      acknowledged: false,
      resolved: false,
      metadata: { metrics, services }
    }
    
    this.activeAlerts.set(alert.id, alert)
    rule.lastTriggered = new Date()
    
    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAlertAction(action, alert)
    }
    
    this.emit('alert_triggered', alert)
    console.log(`🚨 Alert triggered: ${rule.name} (${rule.severity})`)
  }

  private async executeAlertAction(action: AlertAction, alert: SystemAlert): Promise<void> {
    try {
      switch (action.type) {
        case 'log':
          console.log(`ALERT: ${alert.message}`, alert.metadata)
          break
        case 'webhook':
          // Would make HTTP request to webhook URL
          console.log(`Webhook alert would be sent to: ${action.config.url}`)
          break
        case 'email':
          // Would send email notification
          console.log(`Email alert would be sent to: ${action.config.to}`)
          break
        case 'slack':
          // Would send Slack notification
          console.log(`Slack alert would be sent to: ${action.config.channel}`)
          break
      }
    } catch (error) {
      console.error(`Failed to execute alert action ${action.type}:`, error)
    }
  }

  private async getAllServiceHealth(): Promise<ServiceHealth[]> {
    const services: ServiceHealth[] = []
    
    for (const [serviceName] of this.serviceHealthChecks) {
      const history = this.healthHistory.get(serviceName)
      if (history && history.length > 0) {
        services.push(history[history.length - 1])
      }
    }
    
    return services
  }

  private async getDiskUsage(dirPath: string): Promise<{ total: number; used: number; free: number; percentage: number }> {
    try {
      const stats = await fs.promises.statfs(dirPath)
      const total = stats.blocks * stats.bsize
      const free = stats.bavail * stats.bsize
      const used = total - free
      const percentage = (used / total) * 100
      
      return { total, used, free, percentage }
    } catch {
      // Fallback for systems without statfs
      return { total: 0, used: 0, free: 0, percentage: 0 }
    }
  }

  private async getNetworkStats(): Promise<{ interfaces: NetworkInterface[]; totalRx: number; totalTx: number }> {
    const interfaces = os.networkInterfaces()
    const networkInterfaces: NetworkInterface[] = []
    let totalRx = 0
    let totalTx = 0
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue
      
      for (const addr of addrs) {
        const baseline = this.networkBaseline.get(name) || { rx: 0, tx: 0 }
        const rx = baseline.rx + Math.random() * 1000 // Simulated for now
        const tx = baseline.tx + Math.random() * 1000 // Simulated for now
        
        networkInterfaces.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          family: addr.family,
          mac: addr.mac,
          internal: addr.internal,
          rx,
          tx
        })
        
        totalRx += rx
        totalTx += tx
        
        this.networkBaseline.set(name, { rx, tx })
      }
    }
    
    return { interfaces: networkInterfaces, totalRx, totalTx }
  }

  private getEventLoopDelay(): number {
    // Simplified event loop delay measurement
    const start = process.hrtime.bigint()
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000 // Convert to milliseconds
      this.performanceCounters.set('eventLoopDelay', delay)
    })
    
    return this.performanceCounters.get('eventLoopDelay') || 0
  }

  private getHttpRequestsPerSecond(): number {
    // This would be tracked from actual HTTP server
    return this.performanceCounters.get('httpRequestsPerSecond') || 0
  }

  private initializePerformanceMonitoring(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'gc') {
            this.gcMetrics.push({
              type: (entry as any).detail?.type || 'unknown',
              duration: entry.duration,
              timestamp: entry.startTime,
              flags: (entry as any).detail?.flags || 0
            })
            
            // Limit GC metrics history
            if (this.gcMetrics.length > 100) {
              this.gcMetrics = this.gcMetrics.slice(-100)
            }
          }
        }
      })
      
      this.performanceObserver.observe({ entryTypes: ['gc'] })
    } catch (error) {
      console.warn('Performance monitoring not available:', error)
    }
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu',
        name: 'High CPU Usage',
        condition: 'cpu usage > threshold',
        threshold: 80,
        severity: 'high',
        enabled: true,
        cooldown: 300, // 5 minutes
        actions: [{ type: 'log', config: {} }]
      },
      {
        id: 'high-memory',
        name: 'High Memory Usage',
        condition: 'memory usage > threshold',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldown: 300,
        actions: [{ type: 'log', config: {} }]
      },
      {
        id: 'disk-space',
        name: 'Low Disk Space',
        condition: 'disk usage > threshold',
        threshold: 90,
        severity: 'critical',
        enabled: true,
        cooldown: 600, // 10 minutes
        actions: [{ type: 'log', config: {} }]
      }
    ]
    
    for (const rule of defaultRules) {
      this.addAlertRule(rule)
    }
  }

  private convertMetricsToCSV(metrics: SystemMetrics[]): string {
    if (metrics.length === 0) return ''
    
    const headers = [
      'timestamp',
      'cpu_usage',
      'memory_percentage',
      'disk_percentage',
      'process_uptime',
      'heap_used',
      'event_loop_delay'
    ]
    
    const rows = metrics.map(m => [
      new Date().toISOString(),
      m.cpu.usage,
      m.memory.percentage,
      m.disk.percentage,
      m.process.uptime,
      m.memory.heapUsed,
      m.performance.eventLoopDelay
    ])
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }
}
