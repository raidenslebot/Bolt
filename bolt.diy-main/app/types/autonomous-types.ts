/**
 * 🤖 AUTONOMOUS AI SYSTEM TYPES
 * 
 * Complete type definitions for the autonomous AI system that enables
 * self-evolution, multi-agent coordination, and autonomous project execution.
 */

// =====================================================================================
// CORE AUTONOMOUS SESSION TYPES
// =====================================================================================

export interface AutonomousSession {
  id: string
  projectPath: string
  objective: string
  status: 'initializing' | 'executing' | 'paused' | 'completed' | 'failed'
  autonomyLevel: number // 0-100, higher = more autonomous
  startTime: Date
  endTime?: Date
  
  // 🧠 AGENT WORKFORCE MANAGEMENT
  agentWorkforce: {
    primaryAgent: AutonomousAgent
    activeSubAgents: Map<string, AutonomousAgent>
    reserveAgentPool: AutonomousAgent[]
    maxConcurrentAgents: number
    predictedAgentRequirement: number
    actualAgentUsage: number
    agentSpecializationMap: Map<string, string[]> // specialization -> agent IDs
    coordinationStyle: 'hierarchical' | 'peer_to_peer' | 'hierarchical_with_peer_communication'
  }
  
  // 📊 PROGRESS TRACKING
  progress: {
    percentage: number
    completedTasks: number
    totalTasks: number
    velocityTrend: number[] // tasks per hour over time
    estimatedCompletion: Date | null
    currentPhase: string
    phaseDetails: string
  }
  
  // 🧠 MEMORY & KNOWLEDGE MANAGEMENT
  memoryManager: any // Memory system for learning persistence
  
  // 🏗️ PROJECT EXECUTION
  executor: any // Project execution engine
  
  // 📋 TASK MANAGEMENT
  taskQueue: AutonomousTask[]
  taskHistory: AutonomousTask[]
  
  // 🎯 SESSION ARTIFACTS
  artifacts: {
    filesCreated: string[]
    filesModified: string[]
    commandsExecuted: string[]
    decisionsTraced: AutonomousDecision[]
    learningsGenerated: AutonomousLearning[]
    errorsEncountered: AutonomousError[]
  }
  
  // ⚙️ CONFIGURATION
  configuration: {
    projectPath: string
    objective: string
    autonomyLevel: number
    maxAgents?: number
    specializations?: string[]
    memoryPersistence?: boolean
    selfEvolutionEnabled?: boolean
    enabledCapabilities: string[]
    learningMode: boolean
    errorRecoveryMode: boolean
    communicationVerbosity: 'minimal' | 'normal' | 'detailed' | 'verbose'
  }
}

// =====================================================================================
// AUTONOMOUS AGENT TYPES
// =====================================================================================

export interface AutonomousAgent {
  id: string
  name: string
  type: 'primary' | 'specialist' | 'utility'
  status: 'idle' | 'active' | 'busy' | 'error' | 'learning'
  specializations: string[] // 'frontend', 'backend', 'database', 'testing', etc.
  
  // 🧠 AGENT CAPABILITIES
  capabilities: {
    codeGeneration: number // 0-100 skill level
    debugging: number
    testing: number
    documentation: number
    projectManagement: number
    errorAnalysis: number
    learningAdaptation: number
    communication: number
  }
  
  // 📋 CURRENT WORK
  currentTask?: AutonomousTask
  
  // 🧠 AGENT MEMORY SYSTEM
  memory: {
    workingMemory: Map<string, any> // Current task context
    shortTermMemory: AutonomousMemoryItem[] // Recent learnings/experiences
    memoryQuota: number // Maximum memory capacity
    memoryUsage: number // Current memory usage
  }
  
  // 📊 PERFORMANCE METRICS
  performance: {
    tasksCompleted: number
    successRate: number // 0-100%
    errorCount: number
    communicationEfficiency: number // How well it communicates with other agents
    learningRate: number // How quickly it adapts and improves
  }
  
  // 🤖 AI MODEL CONFIGURATION
  modelConfig: {
    modelId: string // 'gpt-4', 'claude-3', 'deepseek-coder', etc.
    temperature: number
    maxTokens: number
    specialPromptModifiers: string[] // Agent-specific prompt adjustments
  }
  
  // 🕒 LIFECYCLE
  lastActive: Date
  createdAt: Date
  parentAgentId?: string // For hierarchical relationships
  subordinateAgentIds: string[] // Agents this agent manages
}

export interface AutonomousMemoryItem {
  type: 'task_completion' | 'error_encounter' | 'learning' | 'communication' | 'shared_learning' | 'task_failure'
  content: any
  timestamp: Date
  source?: string // Agent ID that created this memory
}

// =====================================================================================
// TASK MANAGEMENT TYPES
// =====================================================================================

export interface AutonomousTask {
  id: string
  title: string
  type: 'coding' | 'testing' | 'debugging' | 'documentation' | 'analysis' | 'deployment' | 'optimization'
  description: string
  priority: number // 1-10, higher = more urgent
  complexity: number // 1-10, higher = more complex
  estimatedHours: number
  
  // 📋 TASK REQUIREMENTS
  requiredSkills: string[]
  dependencies: string[] // Task IDs that must complete first
  
  // 📊 TASK STATUS
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'blocked'
  assignedAgentId?: string
  
  // 🎯 TASK ARTIFACTS
  artifacts: TaskArtifact[]
  issues: TaskIssue[]
  
  // 🕒 LIFECYCLE
  createdAt: Date
  lastUpdated: Date
  startedAt?: Date
  completedAt?: Date
}

export interface TaskArtifact {
  id: string
  type: 'code' | 'documentation' | 'test' | 'config' | 'design' | 'analysis'
  path: string
  content: string
  version: number
  createdBy: string // Agent ID
  createdAt: Date
}

export interface TaskIssue {
  id: string
  type: 'blocker' | 'error' | 'warning' | 'question'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reportedBy: string // Agent ID
  reportedAt: Date
  resolved: boolean
  resolution?: string
  resolvedBy?: string
  resolvedAt?: Date
}

export interface TaskResult {
  success: boolean
  result: string
  error?: string
  artifacts: {
    filesCreated: string[]
    filesModified: string[]
    commandsExecuted: string[]
  }
  duration: number // milliseconds
}

export interface TaskExecution {
  taskId: string
  agentId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed'
}

// =====================================================================================
// AI-TO-AI COMMUNICATION TYPES
// =====================================================================================

export interface AutonomousAgentMessage {
  id: string
  fromAgentId: string
  toAgentId: string
  type: 'task_assignment' | 'error_report' | 'learning_share' | 'resource_request' | 'status_update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  
  content: {
    subject: string
    body: string
    actionRequired: boolean
  }
  
  timestamp: Date
  acknowledged: boolean
  response?: AutonomousAgentMessage
}

// =====================================================================================
// LEARNING & MEMORY TYPES
// =====================================================================================

export interface AutonomousLearning {
  id: string
  sessionId: string
  timestamp: Date
  type: 'pattern_recognition' | 'error_prevention' | 'optimization' | 'communication_improvement'
  description: string
  
  // 📍 LEARNING CONTEXT
  sourceContext: {
    agentId?: string
    taskId?: string
    situation: string
  }
  
  // 🎯 APPLICABILITY
  applicability: string[] // Which specializations/contexts this applies to
  confidence: number // 0-100, how confident we are in this learning
  
  // ✅ VERIFICATION
  verificationRequired: boolean
  verified: boolean
  
  // 📊 USAGE TRACKING
  usageCount: number
  effectiveness: number // 0-100, how effective this learning has been
  
  // 💾 PERSISTENCE
  shouldPersistToMemory: boolean
  relatedLearnings: string[] // IDs of related learnings
}

// =====================================================================================
// ERROR HANDLING TYPES
// =====================================================================================

export interface AutonomousError {
  id: string
  type: 'syntax' | 'runtime' | 'logical' | 'communication' | 'resource' | 'dependency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  
  // 📍 ERROR CONTEXT
  context: {
    agentId?: string
    taskId?: string
    environmentState: any
  }
  
  // 🕒 LIFECYCLE
  timestamp: Date
  resolutionStatus: 'unresolved' | 'in_progress' | 'resolved' | 'deferred'
  resolutionAttempts: AutonomousErrorResolution[]
  
  // 🧠 LEARNING
  shouldPersistToMemory: boolean
  recurrenceProbability: number // 0-1, likelihood this will happen again
}

export interface AutonomousErrorResolution {
  id: string
  attemptedBy: string // Agent ID
  timestamp: Date
  strategy: string
  success: boolean
  description: string
  learningsGenerated: string[] // Learning IDs
}

// =====================================================================================
// DECISION TRACKING TYPES
// =====================================================================================

export interface AutonomousDecision {
  id: string
  timestamp: Date
  decisionMaker: string // Agent ID
  context: string
  options: string[]
  chosenOption: string
  reasoning: string
  confidence: number // 0-100
  outcome?: 'positive' | 'negative' | 'neutral'
  outcomeDescription?: string
}

// =====================================================================================
// SYSTEM ARTIFACT TYPES
// =====================================================================================

export interface AutonomousArtifact {
  id: string
  type: 'file' | 'command' | 'decision' | 'learning' | 'communication' | 'error'
  description: string
  content: any
  createdBy: string // Agent ID
  createdAt: Date
  tags: string[]
  importance: number // 1-10
}

// =====================================================================================
// CONFIGURATION TYPES
// =====================================================================================

export interface AutonomousConfig {
  // 🎯 PROJECT CONFIGURATION
  projectPath: string
  objective: string
  
  // 🤖 AGENT CONFIGURATION
  maxAgents: number
  autonomyLevel: number // 0-100
  specializations: string[]
  
  // 🧠 LEARNING CONFIGURATION
  memoryPersistence: boolean
  learningMode: boolean
  errorRecoveryMode: boolean
  
  // 🔧 SYSTEM CONFIGURATION
  selfEvolutionEnabled: boolean
  communicationVerbosity: 'minimal' | 'normal' | 'detailed' | 'verbose'
  enabledCapabilities: string[]
  
  // 🏗️ INFRASTRUCTURE
  containerEnabled: boolean
  cloudDeploymentEnabled: boolean
  securityScanningEnabled: boolean
  databaseManagementEnabled: boolean
}

// =====================================================================================
// EXECUTION RESULT TYPES (for compatibility)
// =====================================================================================

export interface ExecutionResult {
  success: boolean
  artifacts: ExecutionArtifact[]
  issues: ExecutionIssue[]
  learnings: AutonomousLearning[]
}

export interface ExecutionArtifact {
  id: string
  type: 'file' | 'package' | 'service' | 'database' | 'configuration'
  path: string
  description: string
}

export interface ExecutionIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// =====================================================================================
// HELPER TYPES
// =====================================================================================

export type AgentSpecialization = 
  | 'frontend' 
  | 'backend' 
  | 'database' 
  | 'testing' 
  | 'security' 
  | 'devops' 
  | 'ui_ux' 
  | 'api_design' 
  | 'documentation' 
  | 'project_management'
  | 'debugging'
  | 'optimization'
  | 'general'

export type TaskType = 
  | 'coding' 
  | 'testing' 
  | 'debugging' 
  | 'documentation' 
  | 'analysis' 
  | 'deployment' 
  | 'optimization'
  | 'planning'
  | 'review'

export type SessionStatus = 
  | 'initializing' 
  | 'executing' 
  | 'paused' 
  | 'completed' 
  | 'failed'

export type AgentStatus = 
  | 'idle' 
  | 'active' 
  | 'busy' 
  | 'error' 
  | 'learning'
