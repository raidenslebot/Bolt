import { EventEmitter } from 'events'
import { AutonomousTask, TaskArtifact, TaskIssue } from './autonomous-ai-director'

export interface TaskDependency {
  taskId: string
  dependsOn: string
  type: 'sequential' | 'parallel' | 'conditional'
  condition?: string
}

export interface TaskExecution {
  taskId: string
  agentId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'paused'
  progress: number // 0-100
  logs: TaskExecutionLog[]
  metrics: TaskExecutionMetric[]
}

export interface TaskExecutionLog {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: any
}

export interface TaskExecutionMetric {
  timestamp: Date
  type: 'cpu_usage' | 'memory_usage' | 'api_calls' | 'progress' | 'quality_score'
  value: number
  unit: string
}

/**
 * Advanced Task Management System for Autonomous AI Orchestration
 * 
 * Manages the entire lifecycle of autonomous tasks including:
 * - Task dependency resolution and scheduling
 * - Parallel execution coordination
 * - Real-time progress tracking
 * - Dynamic priority adjustment
 * - Resource allocation and optimization
 * - Automatic retry and error recovery
 */
export class AutonomousTaskManager extends EventEmitter {
  private tasks: Map<string, AutonomousTask> = new Map()
  private dependencies: Map<string, TaskDependency[]> = new Map()
  private executions: Map<string, TaskExecution> = new Map()
  private executionQueue: string[] = []
  private runningTasks: Set<string> = new Set()
  private completedTasks: Set<string> = new Set()
  private failedTasks: Set<string> = new Set()
  private maxConcurrentTasks: number = 5
  private retryAttempts: Map<string, number> = new Map()
  private maxRetries: number = 3

  constructor() {
    super()
    this.startTaskProcessor()
  }

  /**
   * Add a new task to the management system
   */
  public addTask(task: AutonomousTask, dependencies: string[] = []): void {
    this.tasks.set(task.id, task)
    
    // Set up dependencies
    const taskDeps: TaskDependency[] = dependencies.map(depId => ({
      taskId: task.id,
      dependsOn: depId,
      type: 'sequential'
    }))
    
    this.dependencies.set(task.id, taskDeps)
    
    // Add to execution queue if no dependencies
    if (dependencies.length === 0) {
      this.queueTask(task.id)
    }
    
    this.emit('task_added', task)
  }

  /**
   * Add multiple tasks with complex dependency graph
   */
  public addTaskBatch(tasks: AutonomousTask[], dependencyGraph: Map<string, string[]>): void {
    // First add all tasks
    for (const task of tasks) {
      this.tasks.set(task.id, task)
    }
    
    // Then set up dependencies
    for (const [taskId, deps] of dependencyGraph) {
      const taskDeps: TaskDependency[] = deps.map(depId => ({
        taskId,
        dependsOn: depId,
        type: 'sequential'
      }))
      this.dependencies.set(taskId, taskDeps)
    }
    
    // Queue tasks with no dependencies
    for (const task of tasks) {
      if (!dependencyGraph.has(task.id) || dependencyGraph.get(task.id)?.length === 0) {
        this.queueTask(task.id)
      }
    }
    
    this.emit('task_batch_added', tasks.length)
  }

  /**
   * Start execution of a specific task
   */
  public async executeTask(taskId: string, agentId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (!this.canExecuteTask(taskId)) {
      throw new Error(`Task ${taskId} dependencies not met`)
    }

    const execution: TaskExecution = {
      taskId,
      agentId,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      logs: [],
      metrics: []
    }

    this.executions.set(taskId, execution)
    this.runningTasks.add(taskId)
    
    // Update task status
    task.status = 'in_progress'
    task.assignedAgent = agentId
    task.startedAt = new Date()
    task.lastUpdated = new Date()

    this.emit('task_execution_started', execution)
    
    return execution
  }

  /**
   * Mark task as completed with results
   */
  public completeTask(taskId: string, artifacts: TaskArtifact[] = []): void {
    const task = this.tasks.get(taskId)
    const execution = this.executions.get(taskId)
    
    if (!task || !execution) {
      throw new Error(`Task ${taskId} not found or not executing`)
    }

    // Update task
    task.status = 'completed'
    task.completedAt = new Date()
    task.lastUpdated = new Date()
    task.artifacts.push(...artifacts)
    
    // Update execution
    execution.status = 'completed'
    execution.endTime = new Date()
    execution.progress = 100
    
    // Move to completed
    this.runningTasks.delete(taskId)
    this.completedTasks.add(taskId)
    
    // Queue dependent tasks
    this.queueDependentTasks(taskId)
    
    this.emit('task_completed', task, execution)
  }

  /**
   * Mark task as failed with error information
   */
  public failTask(taskId: string, error: string, shouldRetry: boolean = true): void {
    const task = this.tasks.get(taskId)
    const execution = this.executions.get(taskId)
    
    if (!task || !execution) {
      throw new Error(`Task ${taskId} not found or not executing`)
    }

    const currentRetries = this.retryAttempts.get(taskId) || 0
    
    if (shouldRetry && currentRetries < this.maxRetries) {
      // Schedule retry
      this.retryAttempts.set(taskId, currentRetries + 1)
      task.status = 'pending'
      execution.status = 'failed'
      execution.endTime = new Date()
      
      this.runningTasks.delete(taskId)
      
      // Add error to task issues
      task.issues.push({
        id: `retry-${currentRetries + 1}-${Date.now()}`,
        type: 'execution_failure',
        severity: 'medium',
        description: error,
        context: `Retry attempt ${currentRetries + 1}`,
        reportedAt: new Date(),
        reportedBy: execution.agentId,
        escalatedToPrimary: false,
        memoryWorthy: true
      })
      
      // Re-queue after delay
      setTimeout(() => {
        this.queueTask(taskId)
      }, Math.pow(2, currentRetries) * 1000) // Exponential backoff
      
      this.emit('task_retry_scheduled', task, currentRetries + 1)
    } else {
      // Mark as permanently failed
      task.status = 'failed'
      execution.status = 'failed'
      execution.endTime = new Date()
      
      this.runningTasks.delete(taskId)
      this.failedTasks.add(taskId)
      
      // Add final error to task issues
      task.issues.push({
        id: `final-failure-${Date.now()}`,
        type: 'execution_failure',
        severity: 'high',
        description: `Task failed after ${currentRetries} retries: ${error}`,
        context: 'Final failure after all retry attempts',
        reportedAt: new Date(),
        reportedBy: execution.agentId,
        escalatedToPrimary: true,
        memoryWorthy: true
      })
      
      this.emit('task_failed', task, execution)
    }
  }

  /**
   * Update task progress
   */
  public updateTaskProgress(taskId: string, progress: number, message?: string): void {
    const execution = this.executions.get(taskId)
    if (!execution) {
      return
    }

    execution.progress = Math.max(0, Math.min(100, progress))
    
    if (message) {
      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message,
        context: { progress }
      })
    }

    this.emit('task_progress_updated', taskId, progress)
  }

  /**
   * Get all pending tasks that can be executed
   */
  public getExecutableTasks(): AutonomousTask[] {
    const executable: AutonomousTask[] = []
    
    for (const taskId of this.executionQueue) {
      if (this.canExecuteTask(taskId) && 
          this.runningTasks.size < this.maxConcurrentTasks) {
        const task = this.tasks.get(taskId)
        if (task) {
          executable.push(task)
        }
      }
    }
    
    return executable
  }

  /**
   * Get current execution status
   */
  public getExecutionStatus(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    progress: number
  } {
    const total = this.tasks.size
    const pending = this.executionQueue.length
    const running = this.runningTasks.size
    const completed = this.completedTasks.size
    const failed = this.failedTasks.size
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, pending, running, completed, failed, progress }
  }

  /**
   * Get task execution details
   */
  public getTaskExecution(taskId: string): TaskExecution | undefined {
    return this.executions.get(taskId)
  }

  /**
   * Get task performance metrics
   */
  public getTaskMetrics(taskId: string): TaskExecutionMetric[] {
    const execution = this.executions.get(taskId)
    return execution?.metrics || []
  }

  /**
   * Check if task can be executed (all dependencies met)
   */
  private canExecuteTask(taskId: string): boolean {
    const deps = this.dependencies.get(taskId) || []
    
    for (const dep of deps) {
      if (dep.type === 'sequential' && !this.completedTasks.has(dep.dependsOn)) {
        return false
      }
      if (dep.type === 'conditional' && dep.condition) {
        // Evaluate condition (simplified)
        if (!this.evaluateCondition(dep.condition)) {
          return false
        }
      }
    }
    
    return true
  }

  /**
   * Queue a task for execution
   */
  private queueTask(taskId: string): void {
    if (!this.executionQueue.includes(taskId) && 
        !this.runningTasks.has(taskId) && 
        !this.completedTasks.has(taskId)) {
      this.executionQueue.push(taskId)
      this.sortExecutionQueue()
    }
  }

  /**
   * Queue tasks that depend on completed task
   */
  private queueDependentTasks(completedTaskId: string): void {
    for (const [taskId, deps] of this.dependencies) {
      const hasDependency = deps.some(dep => dep.dependsOn === completedTaskId)
      if (hasDependency && this.canExecuteTask(taskId)) {
        this.queueTask(taskId)
      }
    }
  }

  /**
   * Sort execution queue by priority
   */
  private sortExecutionQueue(): void {
    this.executionQueue.sort((a, b) => {
      const taskA = this.tasks.get(a)
      const taskB = this.tasks.get(b)
      
      if (!taskA || !taskB) return 0
      
      // Higher priority first
      return taskB.priority - taskA.priority
    })
  }

  /**
   * Evaluate conditional dependency
   */
  private evaluateCondition(condition: string): boolean {
    // Simplified condition evaluation - would be more sophisticated in real implementation
    return true
  }

  /**
   * Background task processor
   */
  private startTaskProcessor(): void {
    setInterval(() => {
      this.processTaskQueue()
    }, 1000) // Check every second
  }

  /**
   * Process pending tasks in queue
   */
  private processTaskQueue(): void {
    const executableTasks = this.getExecutableTasks()
    
    for (const task of executableTasks) {
      if (this.runningTasks.size >= this.maxConcurrentTasks) {
        break
      }
      
      // Remove from queue
      const index = this.executionQueue.indexOf(task.id)
      if (index !== -1) {
        this.executionQueue.splice(index, 1)
      }
      
      this.emit('task_ready_for_assignment', task)
    }
  }

  /**
   * Set maximum concurrent tasks
   */
  public setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = Math.max(1, max)
  }

  /**
   * Get critical path analysis
   */
  public getCriticalPath(): string[] {
    // Simplified critical path calculation
    const criticalPath: string[] = []
    const longestPaths = new Map<string, number>()
    
    // Calculate longest path to each task
    for (const [taskId] of this.tasks) {
      this.calculateLongestPath(taskId, longestPaths, new Set())
    }
    
    // Find the path with maximum duration
    let maxDuration = 0
    let endTask = ''
    
    for (const [taskId, duration] of longestPaths) {
      if (duration > maxDuration) {
        maxDuration = duration
        endTask = taskId
      }
    }
    
    // Trace back the critical path
    if (endTask) {
      this.traceCriticalPath(endTask, criticalPath, new Set())
    }
    
    return criticalPath.reverse()
  }

  private calculateLongestPath(taskId: string, paths: Map<string, number>, visited: Set<string>): number {
    if (visited.has(taskId)) {
      return paths.get(taskId) || 0
    }
    
    visited.add(taskId)
    const task = this.tasks.get(taskId)
    if (!task) return 0
    
    const deps = this.dependencies.get(taskId) || []
    let maxDepDuration = 0
    
    for (const dep of deps) {
      const depDuration = this.calculateLongestPath(dep.dependsOn, paths, visited)
      maxDepDuration = Math.max(maxDepDuration, depDuration)
    }
    
    const totalDuration = maxDepDuration + task.estimatedHours
    paths.set(taskId, totalDuration)
    
    return totalDuration
  }

  private traceCriticalPath(taskId: string, path: string[], visited: Set<string>): void {
    if (visited.has(taskId)) return
    
    visited.add(taskId)
    path.push(taskId)
    
    const deps = this.dependencies.get(taskId) || []
    for (const dep of deps) {
      this.traceCriticalPath(dep.dependsOn, path, visited)
    }
  }
}
