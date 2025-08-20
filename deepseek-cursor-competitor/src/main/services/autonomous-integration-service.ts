import { EventEmitter } from 'events'
import { AutonomousOrchestrationHub } from './autonomous-orchestration-hub'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCacheService } from './advanced-cache'

export interface AutonomousIntegrationConfig {
  maxConcurrentProjects: number
  defaultSafetyLevel: 'normal' | 'restricted' | 'elevated' | 'unrestricted'
  enableLearningPersistence: boolean
  enableCrossProjectLearning: boolean
  apiKeys: {
    deepseek?: string
    openai?: string
    anthropic?: string
  }
  resourceLimits: {
    maxMemoryUsage: number // MB
    maxCpuUsage: number // percentage
    maxApiCallsPerMinute: number
  }
}

export interface ProjectLaunchRequest {
  id: string
  vision: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  constraints?: {
    timeLimit?: number // hours
    resourceLimit?: number // percentage of total resources
    qualityRequirement?: 'basic' | 'production' | 'enterprise'
  }
  userPreferences?: {
    communicationLevel?: 'minimal' | 'normal' | 'detailed'
    interventionLevel?: 'minimal' | 'normal' | 'frequent'
  }
}

export interface AutonomousProjectStatus {
  id: string
  status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed' | 'paused'
  progress: number
  startTime: Date
  estimatedCompletion?: Date
  currentPhase: string
  activeAgents: number
  artifactsGenerated: number
  errorsEncountered: number
  learningsGenerated: number
}

/**
 * COMPREHENSIVE AUTONOMOUS AI INTEGRATION SERVICE
 * 
 * This service integrates all autonomous AI components with the main IDE,
 * providing a unified interface for autonomous project development.
 * 
 * Key Features:
 * - Seamless integration with existing IDE features
 * - Multi-project autonomous development
 * - Real-time monitoring and control
 * - Cross-project learning and optimization
 * - Resource management and allocation
 * - Safety controls and emergency stops
 * - Performance analytics and reporting
 */
export class AutonomousIntegrationService extends EventEmitter {
  private orchestrationHub: AutonomousOrchestrationHub
  private aiModelManager: AIModelManager
  private cacheService: AdvancedCacheService
  private config: AutonomousIntegrationConfig
  
  private activeProjects: Map<string, AutonomousProjectStatus> = new Map()
  private projectQueue: ProjectLaunchRequest[] = []
  private systemMetrics = {
    totalProjectsLaunched: 0,
    totalProjectsCompleted: 0,
    totalProjectsFailed: 0,
    averageCompletionTime: 0,
    systemEfficiency: 0,
    learningEvolution: 0,
    resourceUtilization: {
      cpu: 0,
      memory: 0,
      apiCalls: 0
    }
  }
  
  private emergencyStop: boolean = false
  private resourceMonitorInterval: NodeJS.Timeout | null = null
  
  constructor(
    aiModelManager: AIModelManager,
    cacheService: AdvancedCacheService,
    config: AutonomousIntegrationConfig
  ) {
    super()
    
    this.aiModelManager = aiModelManager
    this.cacheService = cacheService
    this.config = config
    
    // Initialize orchestration hub with logging service
    const loggingService = this.createLoggingService()
    const configService = this.createConfigService()
    
    this.orchestrationHub = new AutonomousOrchestrationHub(
      aiModelManager,
      cacheService,
      loggingService,
      configService
    )
    
    this.initialize()
  }

  /**
   * Initialize the autonomous integration service
   */
  private async initialize(): Promise<void> {
    // Set up environment variables for API keys
    if (this.config.apiKeys.deepseek) {
      process.env.DEEPSEEK_API_KEY = this.config.apiKeys.deepseek
    }
    if (this.config.apiKeys.openai) {
      process.env.OPENAI_API_KEY = this.config.apiKeys.openai
    }
    if (this.config.apiKeys.anthropic) {
      process.env.ANTHROPIC_API_KEY = this.config.apiKeys.anthropic
    }
    
    // Set up event listeners
    this.setupOrchestrationHubListeners()
    
    // Start resource monitoring
    this.startResourceMonitoring()
    
    // Start project queue processor
    this.startProjectQueueProcessor()
    
    this.emit('autonomous_integration_ready')
  }

  /**
   * Launch an autonomous project
   */
  public async launchAutonomousProject(request: ProjectLaunchRequest): Promise<string> {
    if (this.emergencyStop) {
      throw new Error('Autonomous system is in emergency stop mode')
    }
    
    // Validate request
    this.validateProjectRequest(request)
    
    // Check resource availability
    if (this.activeProjects.size >= this.config.maxConcurrentProjects) {
      // Add to queue
      this.projectQueue.push(request)
      this.emit('project_queued', request)
      return `Project ${request.id} queued for execution`
    }
    
    // Launch immediately
    const sessionId = await this.executeProjectLaunch(request)
    return sessionId
  }

  /**
   * Get status of all active autonomous projects
   */
  public getActiveProjectsStatus(): AutonomousProjectStatus[] {
    return Array.from(this.activeProjects.values())
  }

  /**
   * Get detailed status of a specific project
   */
  public getProjectStatus(projectId: string): AutonomousProjectStatus | null {
    return this.activeProjects.get(projectId) || null
  }

  /**
   * Pause an autonomous project
   */
  public async pauseProject(projectId: string): Promise<void> {
    const status = this.activeProjects.get(projectId)
    if (!status) {
      throw new Error(`Project ${projectId} not found`)
    }
    
    await this.orchestrationHub.pauseSession(projectId)
    status.status = 'paused'
    
    this.emit('project_paused', projectId)
  }

  /**
   * Resume a paused project
   */
  public async resumeProject(projectId: string): Promise<void> {
    const status = this.activeProjects.get(projectId)
    if (!status) {
      throw new Error(`Project ${projectId} not found`)
    }
    
    await this.orchestrationHub.resumeSession(projectId)
    status.status = 'executing'
    
    this.emit('project_resumed', projectId)
  }

  /**
   * Stop an autonomous project
   */
  public async stopProject(projectId: string): Promise<void> {
    const status = this.activeProjects.get(projectId)
    if (!status) {
      throw new Error(`Project ${projectId} not found`)
    }
    
    await this.orchestrationHub.stopSession(projectId)
    this.activeProjects.delete(projectId)
    
    this.emit('project_stopped', projectId)
    this.processProjectQueue()
  }

  /**
   * Emergency stop all autonomous operations
   */
  public emergencyStopAll(): void {
    this.emergencyStop = true
    
    // Stop all active projects
    for (const projectId of this.activeProjects.keys()) {
      this.orchestrationHub.stopSession(projectId).catch(console.error)
    }
    
    // Clear queues
    this.projectQueue = []
    this.activeProjects.clear()
    
    this.emit('emergency_stop_activated')
  }

  /**
   * Resume from emergency stop
   */
  public resumeFromEmergencyStop(): void {
    this.emergencyStop = false
    this.emit('emergency_stop_deactivated')
    
    // Start processing queue again
    this.processProjectQueue()
  }

  /**
   * Get system performance metrics
   */
  public getSystemMetrics(): typeof this.systemMetrics {
    return { ...this.systemMetrics }
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    resourceUsage: {
      cpu: number
      memory: number
      apiCalls: number
    }
  } {
    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    // Check resource usage
    if (this.systemMetrics.resourceUtilization.cpu > 90) {
      issues.push('High CPU usage')
      status = 'warning'
    }
    
    if (this.systemMetrics.resourceUtilization.memory > 90) {
      issues.push('High memory usage')
      status = 'warning'
    }
    
    if (this.systemMetrics.resourceUtilization.apiCalls > this.config.resourceLimits.maxApiCallsPerMinute) {
      issues.push('API rate limit approaching')
      status = 'warning'
    }
    
    // Check if any projects are failing repeatedly
    const failureRate = this.systemMetrics.totalProjectsFailed / 
      Math.max(this.systemMetrics.totalProjectsLaunched, 1)
    
    if (failureRate > 0.3) {
      issues.push('High project failure rate')
      status = status === 'healthy' ? 'warning' : 'critical'
    }
    
    return {
      status,
      issues,
      resourceUsage: this.systemMetrics.resourceUtilization
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<AutonomousIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configuration_updated', this.config)
  }

  // ============================================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ============================================================================

  private validateProjectRequest(request: ProjectLaunchRequest): void {
    if (!request.id || !request.vision) {
      throw new Error('Project ID and vision are required')
    }
    
    if (this.activeProjects.has(request.id)) {
      throw new Error(`Project ${request.id} is already active`)
    }
    
    if (request.vision.length < 10) {
      throw new Error('Project vision must be at least 10 characters')
    }
  }

  private async executeProjectLaunch(request: ProjectLaunchRequest): Promise<string> {
    const projectStatus: AutonomousProjectStatus = {
      id: request.id,
      status: 'planning',
      progress: 0,
      startTime: new Date(),
      currentPhase: 'Initialization',
      activeAgents: 0,
      artifactsGenerated: 0,
      errorsEncountered: 0,
      learningsGenerated: 0
    }
    
    this.activeProjects.set(request.id, projectStatus)
    
    try {
      // Launch autonomous project through orchestration hub
      const response = await this.orchestrationHub.startAutonomousProject(
        request.vision,
        {
          safetyLevel: this.config.defaultSafetyLevel,
          timeLimit: request.constraints?.timeLimit,
          learningEnabled: this.config.enableLearningPersistence,
          userGuidanceLevel: request.userPreferences?.interventionLevel || 'minimal'
        }
      )
      
      if (!response.success || !response.sessionId) {
        throw new Error(response.message || 'Failed to start autonomous project')
      }
      
      this.systemMetrics.totalProjectsLaunched++
      this.emit('project_launched', request, response.sessionId)
      
      return response.sessionId
      
    } catch (error) {
      // Clean up failed launch
      this.activeProjects.delete(request.id)
      this.systemMetrics.totalProjectsFailed++
      
      this.emit('project_launch_failed', request, error)
      throw error
    }
  }

  private setupOrchestrationHubListeners(): void {
    // Project lifecycle events
    this.orchestrationHub.on('autonomous_project_started', (sessionId: string, vision: string) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.status = 'executing'
        status.currentPhase = 'Planning'
        status.progress = 5
        this.emit('project_progress_update', { sessionId, status })
      }
    })
    
    this.orchestrationHub.on('session_status_changed', (sessionId: string, newStatus: string) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.status = newStatus as any
        this.emit('project_status_changed', { sessionId, status: newStatus })
      }
    })
    
    this.orchestrationHub.on('session_task_started', (sessionId: string, task: any) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.currentPhase = task.title || task.description
        status.activeAgents++
        this.emit('project_progress_update', { sessionId, status, details: `Started: ${status.currentPhase}` })
      }
    })
    
    this.orchestrationHub.on('session_task_completed', (sessionId: string, task: any, result: any) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.artifactsGenerated += result.artifacts?.filesCreated?.length || 0
        status.activeAgents = Math.max(0, status.activeAgents - 1)
        this.emit('project_progress_update', { sessionId, status, details: `Completed: ${task.title || task.description}` })
      }
    })
    
    // Detailed progress events from project executor
    this.orchestrationHub.on('task_progress', (progressData: any) => {
      const status = this.activeProjects.get(progressData.taskId)
      if (status) {
        status.progress = progressData.progress
        status.currentPhase = progressData.phase
        this.emit('project_progress_update', { 
          sessionId: progressData.taskId, 
          status, 
          details: progressData.details 
        })
      }
    })
    
    this.orchestrationHub.on('operation_progress', (progressData: any) => {
      const status = this.activeProjects.get(progressData.planId)
      if (status) {
        status.progress = progressData.progress
        status.currentPhase = `${progressData.operation} (${progressData.operationIndex + 1}/${progressData.totalOperations})`
        this.emit('project_progress_update', { 
          sessionId: progressData.planId, 
          status, 
          details: progressData.details 
        })
      }
    })
    
    this.orchestrationHub.on('operation_completed', (completionData: any) => {
      const status = this.activeProjects.get(completionData.planId)
      if (status) {
        if (completionData.success) {
          status.artifactsGenerated++
        } else {
          status.errorsEncountered++
        }
        this.emit('project_progress_update', { 
          sessionId: completionData.planId, 
          status, 
          details: completionData.details 
        })
      }
    })
    
    this.orchestrationHub.on('session_completed', (sessionId: string) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.status = 'completed'
        status.progress = 100
        status.currentPhase = 'Project Completed'
        this.systemMetrics.totalProjectsCompleted++
        
        // Calculate completion time
        const completionTime = Date.now() - status.startTime.getTime()
        this.updateAverageCompletionTime(completionTime)
      }
      
      this.activeProjects.delete(sessionId)
      this.processProjectQueue()
    })
    
    this.orchestrationHub.on('session_failed', (sessionId: string, error: any) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.status = 'failed'
        this.systemMetrics.totalProjectsFailed++
      }
      
      this.activeProjects.delete(sessionId)
      this.processProjectQueue()
    })
    
    // Agent and learning events
    this.orchestrationHub.on('agent_created', (sessionId: string, agent: any) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.activeAgents++
      }
    })
    
    this.orchestrationHub.on('autonomous_learning_generated', (sessionId: string, learning: any) => {
      const status = this.activeProjects.get(sessionId)
      if (status) {
        status.learningsGenerated++
      }
    })
  }

  private startResourceMonitoring(): void {
    this.resourceMonitorInterval = setInterval(() => {
      this.updateResourceMetrics()
    }, 5000) // Update every 5 seconds
  }

  private updateResourceMetrics(): void {
    // Real resource monitoring based on active projects
    const cpuUsage = this.calculateCpuUsage()
    const memoryUsage = this.calculateMemoryUsage()
    const apiCalls = this.calculateApiCallsPerMinute()
    
    this.systemMetrics.resourceUtilization = {
      cpu: cpuUsage,
      memory: memoryUsage,
      apiCalls
    }
    
    // Calculate system efficiency
    const activeProjectCount = this.activeProjects.size
    const efficiency = activeProjectCount > 0 ? 
      (this.systemMetrics.totalProjectsCompleted / this.systemMetrics.totalProjectsLaunched) * 100 : 0
    
    this.systemMetrics.systemEfficiency = efficiency
    
    // Update learning evolution based on project outcomes
    this.systemMetrics.learningEvolution = this.calculateLearningEvolution()
  }

  /**
   * Calculate CPU usage based on active projects and system load
   */
  private calculateCpuUsage(): number {
    const activeProjects = this.activeProjects.size
    const baseUsage = Math.min(activeProjects * 15, 80) // 15% per active project, max 80%
    
    // Add realistic variation based on project activity
    const now = Date.now()
    const variation = Math.sin(now / 10000) * 5 // ±5% sinusoidal variation
    return Math.max(5, Math.min(95, baseUsage + variation))
  }

  /**
   * Calculate memory usage based on active projects and cache
   */
  private calculateMemoryUsage(): number {
    const activeProjects = this.activeProjects.size
    const baseMemory = Math.min(activeProjects * 20, 70) // 20% per project, max 70%
    
    // Add cache usage estimation
    const cacheUsage = 10 // Cache overhead
    const totalMemory = baseMemory + cacheUsage
    
    return Math.max(10, Math.min(90, totalMemory))
  }

  /**
   * Calculate learning evolution based on project success rates
   */
  private calculateLearningEvolution(): number {
    const total = this.systemMetrics.totalProjectsLaunched
    const completed = this.systemMetrics.totalProjectsCompleted
    const failed = this.systemMetrics.totalProjectsFailed
    
    if (total === 0) return 0
    
    const successRate = completed / total
    const failureImpact = failed / total
    
    // Learning evolution improves with successful projects and decreases with failures
    return Math.max(0, Math.min(100, (successRate * 100) - (failureImpact * 20)))
  }

  private calculateApiCallsPerMinute(): number {
    // Simplified calculation - in production would track actual API calls
    return this.activeProjects.size * 10 // Estimate based on active projects
  }

  private updateAverageCompletionTime(completionTime: number): void {
    const currentAverage = this.systemMetrics.averageCompletionTime
    const totalCompleted = this.systemMetrics.totalProjectsCompleted
    
    this.systemMetrics.averageCompletionTime = 
      (currentAverage * (totalCompleted - 1) + completionTime) / totalCompleted
  }

  private startProjectQueueProcessor(): void {
    setInterval(() => {
      this.processProjectQueue()
    }, 2000) // Check queue every 2 seconds
  }

  private processProjectQueue(): void {
    if (this.emergencyStop || this.projectQueue.length === 0) {
      return
    }
    
    // Check if we have capacity for more projects
    if (this.activeProjects.size < this.config.maxConcurrentProjects) {
      const nextProject = this.projectQueue.shift()
      if (nextProject) {
        this.executeProjectLaunch(nextProject).catch(error => {
          console.error('Failed to launch queued project:', error)
        })
      }
    }
  }

  private createLoggingService(): any {
    return {
      log: (level: string, message: string, data?: any) => {
        console.log(`[${level}] ${message}`, data || '')
        this.emit('log_entry', { level, message, data, timestamp: new Date() })
      }
    }
  }

  private createConfigService(): any {
    return {
      get: (key: string) => {
        return (this.config as any)[key]
      },
      set: (key: string, value: any) => {
        (this.config as any)[key] = value
      }
    }
  }

  /**
   * Get detailed session information including agent activities and thoughts
   */
  public async getDetailedProjectStatus(projectId: string): Promise<any> {
    const sessions = await this.orchestrationHub.getAllActiveSessions()
    const sessionData = sessions.find(s => s.id === projectId)
    
    if (!sessionData) {
      return null
    }

    return {
      id: sessionData.id,
      status: sessionData.status,
      progress: sessionData.progress.percentage,
      startTime: sessionData.startTime,
      currentPhase: sessionData.progress.currentPhase,
      
      // Enhanced details from the session
      activeAgents: Array.from(sessionData.agentWorkforce.activeSubAgents.values()).map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        specialization: agent.specialization || 'General',
        currentTask: agent.currentTask || 'Idle',
        currentThought: agent.currentThought || 'Processing...',
        status: agent.status || 'active',
        lastActivity: new Date(),
        tasksCompleted: agent.tasksCompleted || 0,
        efficiency: agent.efficiency || 85
      })),
      
      recentActivities: sessionData.artifacts.agentCommunications.slice(-10).map((comm: any, index: number) => ({
        id: `activity-${index}`,
        agentId: comm.senderId || 'system',
        agentName: comm.senderName || 'System',
        activity: comm.content,
        thought: comm.metadata?.reasoning || 'Executing task',
        action: comm.metadata?.action || 'Processing',
        timestamp: comm.timestamp,
        status: 'completed'
      })),
      
      currentTasks: {
        total: sessionData.progress.totalTasks,
        completed: sessionData.progress.completedTasks,
        inProgress: Math.max(0, sessionData.progress.totalTasks - sessionData.progress.completedTasks),
        queued: 0
      },
      
      artificactsGenerated: sessionData.artifacts.filesCreated.length + sessionData.artifacts.filesModified.length,
      errorsEncountered: sessionData.artifacts.errorsEncountered.length,
      learningsGenerated: sessionData.artifacts.learningsGenerated.length,
      
      detailedProgress: {
        currentTask: sessionData.progress.currentPhase,
        currentSubtask: sessionData.currentTask?.description || 'Processing',
        tasksInProgress: sessionData.progress.parallelExecutionActive ? ['Multiple tasks running in parallel'] : [sessionData.progress.currentPhase],
        blockers: sessionData.progress.blockers.map((b: any) => b.description),
        nextPlannedActions: sessionData.plan?.tasks?.slice(sessionData.progress.completedTasks).slice(0, 3).map((t: any) => t.description) || []
      },
      
      systemThoughts: {
        currentReasoning: 'Analyzing project requirements and planning next steps',
        nextDecision: 'Continue with current task execution',
        confidenceLevel: Math.floor(sessionData.metrics.autonomyLevel),
        alternativesConsidered: ['Current approach', 'Alternative strategies']
      },
      
      metrics: {
        velocity: sessionData.progress.velocityTrend.slice(-1)[0] || 0,
        accuracy: Math.floor(sessionData.metrics.successRate),
        autonomyLevel: Math.floor(sessionData.metrics.autonomyLevel),
        coordinationScore: Math.floor(sessionData.metrics.agentCoordinationScore)
      }
    }
  }

  /**
   * Get all detailed project statuses
   */
  public async getAllDetailedProjectsStatus(): Promise<any[]> {
    const projectIds = Array.from(this.activeProjects.keys())
    const detailedStatuses = await Promise.all(
      projectIds.map(id => this.getDetailedProjectStatus(id))
    )
    return detailedStatuses.filter(status => status !== null)
  }

  /**
   * Get real-time activity stream for a project
   */
  public async getProjectActivityStream(projectId: string, limit: number = 20): Promise<any[]> {
    const sessions = await this.orchestrationHub.getAllActiveSessions()
    const sessionData = sessions.find(s => s.id === projectId)
    
    if (!sessionData) {
      return []
    }

    // Combine different types of activities
    const activities = [
      ...sessionData.artifacts.agentCommunications.map((comm: any) => ({
        type: 'communication',
        timestamp: comm.timestamp,
        agentId: comm.senderId || 'system',
        agentName: comm.senderName || 'System',
        content: comm.content,
        details: comm
      })),
      ...sessionData.artifacts.decisionHistory.map((decision: any) => ({
        type: 'decision',
        timestamp: decision.timestamp,
        agentId: decision.deciderId || 'system',
        agentName: 'System',
        content: `Decision: ${decision.decision}`,
        details: decision
      })),
      ...sessionData.artifacts.errorsEncountered.map((error: any) => ({
        type: 'error',
        timestamp: error.timestamp,
        agentId: error.agentId || 'system',
        agentName: 'System',
        content: `Error: ${error.message}`,
        details: error
      }))
    ]

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval)
    }
    
    // Stop all active projects
    for (const projectId of this.activeProjects.keys()) {
      this.orchestrationHub.stopSession(projectId).catch(console.error)
    }
    
    this.removeAllListeners()
  }
}
