import { EventEmitter } from 'events'
import { AutonomousAIDirector, MemoryEntry, AutonomousTask, TaskIssue } from './autonomous-ai-director'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCacheService } from './advanced-cache'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

export interface MemoryHierarchy {
  temporary: Map<string, TemporaryMemory>
  session: Map<string, SessionMemory>
  permanent: Map<string, PermanentMemory>
  working: Map<string, WorkingMemory>
}

export interface TemporaryMemory {
  id: string
  agentId: string
  context: string
  data: any
  ttl: number // Time to live in milliseconds
  createdAt: Date
  lastAccessed: Date
  accessCount: number
  autoExpire: boolean
}

export interface SessionMemory {
  id: string
  sessionId: string
  projectId: string
  type: 'state' | 'progress' | 'context' | 'interim_results'
  data: any
  importance: number // 1-10
  dependencies: string[]
  createdAt: Date
  lastModified: Date
  expires?: Date
}

export interface PermanentMemory {
  id: string
  type: 'pattern' | 'solution' | 'error_learning' | 'optimization' | 'knowledge' | 'decision_template'
  category: string
  title: string
  description: string
  data: any
  metadata: {
    applicability: string[]
    confidence: number
    effectiveness: number
    usageCount: number
    successRate: number
    contexts: string[]
  }
  tags: string[]
  version: number
  precedence: number // Higher = more important
  verifiedBy: string[]
  createdAt: Date
  lastUsed: Date
  lastUpdated: Date
}

export interface WorkingMemory {
  id: string
  agentId: string
  taskId: string
  state: 'active' | 'suspended' | 'archived'
  currentFocus: string
  contextStack: string[]
  activeVariables: Map<string, any>
  subGoals: string[]
  progress: number // 0-100
  lastCheckpoint: Date
  checkpointData?: any
}

export interface MemoryAnalysis {
  memorability: number // 0-100 - how worth remembering this is
  generalApplicability: number // 0-100 - how broadly applicable
  uniqueness: number // 0-100 - how novel this information is
  criticalness: number // 0-100 - how critical for future success
  recommendation: 'discard' | 'temporary' | 'session' | 'permanent'
  reasoning: string
  suggestedTags: string[]
  relatedMemories: string[]
}

export interface MemoryConsolidation {
  id: string
  type: 'merge' | 'generalize' | 'specialize' | 'update' | 'deprecate'
  sourceMemories: string[]
  resultMemory?: PermanentMemory
  reasoning: string
  confidence: number
  timestamp: Date
}

export interface MemoryRetrieval {
  query: string
  context: string
  filters: {
    types?: string[]
    categories?: string[]
    tags?: string[]
    minConfidence?: number
    maxAge?: number
  }
  results: MemoryRetrievalResult[]
  reasoning: string
}

export interface MemoryRetrievalResult {
  memory: MemoryEntry | PermanentMemory | SessionMemory
  relevanceScore: number
  confidence: number
  applicability: number
  reasoning: string
}

export interface MemoryGarbageCollection {
  temporary: {
    expired: number
    lowAccess: number
    redundant: number
  }
  session: {
    completed: number
    obsolete: number
    merged: number
  }
  working: {
    archived: number
    consolidated: number
  }
  totalFreed: number
  timestamp: Date
}

/**
 * Autonomous Memory Manager
 * 
 * This service implements the sophisticated memory hierarchy system that enables
 * the AI agents to learn, remember, and optimize over time. It manages four
 * levels of memory and provides intelligent memory analysis, consolidation,
 * and retrieval capabilities.
 * 
 * Memory Hierarchy:
 * 1. Temporary Memory: Short-lived, task-specific data (seconds to minutes)
 * 2. Session Memory: Project-scoped memory for current work session (hours to days)
 * 3. Working Memory: Active agent state and context (dynamic, checkpointed)
 * 4. Permanent Memory: Long-term learnings, patterns, solutions (indefinite)
 * 
 * Key Features:
 * - AI-powered memory analysis for promotion decisions
 * - Automatic memory consolidation and garbage collection
 * - Contextual memory retrieval with relevance scoring
 * - Memory verification and confidence tracking
 * - Cross-project pattern recognition and learning
 */
export class AutonomousMemoryManager extends EventEmitter {
  private aiDirector: AutonomousAIDirector
  private aiModelManager: AIModelManager
  private cacheService: AdvancedCacheService
  
  private memory: MemoryHierarchy = {
    temporary: new Map(),
    session: new Map(),
    permanent: new Map(),
    working: new Map()
  }
  
  private memoryPath: string
  private maxTemporaryEntries: number = 10000
  private maxSessionEntries: number = 5000
  private maxWorkingEntries: number = 1000
  private gcInterval: number = 300000 // 5 minutes
  
  private analysisThresholds = {
    memorability: 70,
    generalApplicability: 60,
    uniqueness: 50,
    criticalness: 80
  }

  constructor(
    aiDirector: AutonomousAIDirector,
    aiModelManager: AIModelManager,
    cacheService: AdvancedCacheService
  ) {
    super()
    this.aiDirector = aiDirector
    this.aiModelManager = aiModelManager
    this.cacheService = cacheService
    this.memoryPath = path.join(process.cwd(), 'autonomous-memory')
    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Create memory directory
    await fs.mkdir(this.memoryPath, { recursive: true })
    
    // Load permanent memory
    await this.loadPermanentMemory()
    
    // Set up garbage collection
    this.setupGarbageCollection()
    
    // Set up memory consolidation
    this.setupMemoryConsolidation()
    
    this.emit('memory_manager_initialized')
  }

  /**
   * Store information in temporary memory (agent working data)
   */
  async storeTemporary(
    agentId: string,
    context: string,
    data: any,
    ttl: number = 300000 // 5 minutes default
  ): Promise<string> {
    const id = this.generateId()
    
    const tempMemory: TemporaryMemory = {
      id,
      agentId,
      context,
      data,
      ttl,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      autoExpire: true
    }
    
    this.memory.temporary.set(id, tempMemory)
    
    // Trigger garbage collection if memory is getting full
    if (this.memory.temporary.size > this.maxTemporaryEntries) {
      await this.garbageCollectTemporary()
    }
    
    this.emit('temporary_memory_stored', id)
    return id
  }

  /**
   * Store information in session memory (project-scoped)
   */
  async storeSession(
    sessionId: string,
    projectId: string,
    type: SessionMemory['type'],
    data: any,
    importance: number = 5
  ): Promise<string> {
    const id = this.generateId()
    
    const sessionMemory: SessionMemory = {
      id,
      sessionId,
      projectId,
      type,
      data,
      importance,
      dependencies: [],
      createdAt: new Date(),
      lastModified: new Date()
    }
    
    this.memory.session.set(id, sessionMemory)
    this.emit('session_memory_stored', id)
    return id
  }

  /**
   * Store agent working memory (active state)
   */
  async storeWorking(
    agentId: string,
    taskId: string,
    currentFocus: string,
    contextStack: string[],
    activeVariables: Map<string, any>
  ): Promise<string> {
    const id = this.generateId()
    
    const workingMemory: WorkingMemory = {
      id,
      agentId,
      taskId,
      state: 'active',
      currentFocus,
      contextStack,
      activeVariables,
      subGoals: [],
      progress: 0,
      lastCheckpoint: new Date()
    }
    
    this.memory.working.set(id, workingMemory)
    this.emit('working_memory_stored', id)
    return id
  }

  /**
   * AI-powered analysis to determine if memory should be promoted to permanent
   */
  async analyzeForPermanentStorage(
    memoryId: string,
    context: string,
    triggerEvent: 'success' | 'failure' | 'pattern' | 'optimization'
  ): Promise<MemoryAnalysis> {
    const memory = this.getMemoryById(memoryId)
    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`)
    }
    
    const analysisPrompt = this.buildMemoryAnalysisPrompt(memory, context, triggerEvent)
    
    const response = await this.aiModelManager.makeRequest(analysisPrompt, {
      modelId: 'deepseek-coder',
      temperature: 0.1,
      maxTokens: 1500
    })
    
    const analysis = JSON.parse(response.content)
    
    // Convert AI analysis to structured format
    const memoryAnalysis: MemoryAnalysis = {
      memorability: analysis.memorability,
      generalApplicability: analysis.generalApplicability,
      uniqueness: analysis.uniqueness,
      criticalness: analysis.criticalness,
      recommendation: this.determineRecommendation(analysis),
      reasoning: analysis.reasoning,
      suggestedTags: analysis.suggestedTags,
      relatedMemories: await this.findRelatedMemories(memory, analysis.suggestedTags)
    }
    
    this.emit('memory_analyzed', memoryId, memoryAnalysis)
    return memoryAnalysis
  }

  private buildMemoryAnalysisPrompt(memory: any, context: string, triggerEvent: string): string {
    const existingPatterns = this.getRelevantPatterns(memory)
    
    return `You are analyzing whether this memory should be promoted to permanent storage:

MEMORY DATA:
Type: ${memory.type || 'unknown'}
Context: ${memory.context || context}
Data: ${JSON.stringify(memory.data || memory).slice(0, 1000)}
Trigger Event: ${triggerEvent}

EXISTING PATTERNS:
${existingPatterns}

ANALYSIS CRITERIA:
1. Memorability (0-100): How likely is this information to be useful again?
2. General Applicability (0-100): How broadly applicable is this across projects?
3. Uniqueness (0-100): How novel or unique is this information?
4. Criticalness (0-100): How critical is this for future success/avoiding failure?

Consider:
- Is this a recurring pattern that agents should learn?
- Does this represent a solution worth remembering?
- Would forgetting this information cause problems later?
- Is this specific to one project or broadly applicable?
- Does this add to existing knowledge or duplicate it?

RESPONSE FORMAT (JSON):
{
  "memorability": 0-100,
  "generalApplicability": 0-100,
  "uniqueness": 0-100,
  "criticalness": 0-100,
  "reasoning": "detailed explanation of analysis",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "category": "pattern|solution|error_learning|optimization|knowledge|decision_template",
  "title": "short descriptive title",
  "description": "what this memory represents",
  "applicabilityContexts": ["context1", "context2"],
  "confidenceLevel": 0-100
}

Analyze thoroughly and provide scores that will determine storage strategy.`
  }

  /**
   * Promote memory to permanent storage
   */
  async promoteToPermament(
    memoryId: string,
    analysis: MemoryAnalysis,
    verifiedBy: string
  ): Promise<string> {
    const sourceMemory = this.getMemoryById(memoryId)
    if (!sourceMemory) {
      throw new Error(`Source memory ${memoryId} not found`)
    }
    
    const permanentId = this.generateId()
    
    const permanentMemory: PermanentMemory = {
      id: permanentId,
      type: this.determinePermanentType(analysis),
      category: analysis.suggestedTags[0] || 'general',
      title: `Permanent Memory ${permanentId.slice(-6)}`,
      description: analysis.reasoning,
      data: sourceMemory.data || sourceMemory,
      metadata: {
        applicability: analysis.suggestedTags,
        confidence: analysis.criticalness,
        effectiveness: 100, // Initial assumption
        usageCount: 0,
        successRate: 100,
        contexts: [analysis.reasoning]
      },
      tags: analysis.suggestedTags,
      version: 1,
      precedence: analysis.criticalness,
      verifiedBy: [verifiedBy],
      createdAt: new Date(),
      lastUsed: new Date(),
      lastUpdated: new Date()
    }
    
    this.memory.permanent.set(permanentId, permanentMemory)
    await this.persistPermanentMemory(permanentMemory)
    
    // Remove from source memory level if appropriate
    await this.cleanupSourceMemory(memoryId, analysis.recommendation)
    
    this.emit('memory_promoted', memoryId, permanentId)
    return permanentId
  }

  /**
   * Intelligent memory retrieval with context awareness
   */
  async retrieveRelevantMemories(
    query: string,
    context: string,
    filters: MemoryRetrieval['filters'] = {}
  ): Promise<MemoryRetrieval> {
    const retrievalPrompt = this.buildRetrievalPrompt(query, context, filters)
    
    const response = await this.aiModelManager.makeRequest(retrievalPrompt, {
      modelId: 'deepseek-coder',
      temperature: 0.2,
      maxTokens: 2000
    })
    
    const aiAnalysis = JSON.parse(response.content)
    
    // Search through memory hierarchies
    const results: MemoryRetrievalResult[] = []
    
    // Search permanent memory
    for (const [id, memory] of this.memory.permanent) {
      const relevance = this.calculateRelevance(memory, query, context, aiAnalysis)
      if (relevance.score > 0.3) { // 30% relevance threshold
        results.push({
          memory,
          relevanceScore: relevance.score,
          confidence: memory.metadata.confidence,
          applicability: relevance.applicability,
          reasoning: relevance.reasoning
        })
      }
    }
    
    // Search session memory
    for (const [id, memory] of this.memory.session) {
      const relevance = this.calculateRelevance(memory, query, context, aiAnalysis)
      if (relevance.score > 0.4) { // Higher threshold for session memory
        results.push({
          memory,
          relevanceScore: relevance.score,
          confidence: memory.importance * 10,
          applicability: relevance.applicability,
          reasoning: relevance.reasoning
        })
      }
    }
    
    // Sort by relevance and confidence
    results.sort((a, b) => 
      (b.relevanceScore * b.confidence) - (a.relevanceScore * a.confidence)
    )
    
    const retrieval: MemoryRetrieval = {
      query,
      context,
      filters,
      results: results.slice(0, 10), // Top 10 results
      reasoning: aiAnalysis.retrievalStrategy
    }
    
    // Update usage statistics
    for (const result of retrieval.results) {
      await this.updateMemoryUsage(result.memory.id)
    }
    
    this.emit('memory_retrieved', query, retrieval.results.length)
    return retrieval
  }

  private buildRetrievalPrompt(query: string, context: string, filters: any): string {
    return `You are helping retrieve relevant memories for this query:

QUERY: ${query}
CONTEXT: ${context}
FILTERS: ${JSON.stringify(filters)}

AVAILABLE MEMORY TYPES:
- Patterns: Recurring solutions and approaches
- Solutions: Specific problem-solution pairs
- Error Learning: Mistakes and how to avoid them
- Optimizations: Performance and efficiency improvements
- Knowledge: General facts and information
- Decision Templates: Decision-making frameworks

RETRIEVAL STRATEGY:
Analyze what type of memories would be most relevant for this query.
Consider the context and determine search criteria.

RESPONSE FORMAT (JSON):
{
  "retrievalStrategy": "explanation of retrieval approach",
  "relevantTypes": ["type1", "type2"],
  "keyTerms": ["term1", "term2"],
  "contextFactors": ["factor1", "factor2"],
  "priorityOrder": ["most_important", "secondary", "tertiary"]
}

Provide a strategic approach to finding the most relevant memories.`
  }

  /**
   * Automatic memory consolidation - merge similar memories
   */
  async consolidateMemories(): Promise<MemoryConsolidation[]> {
    const consolidations: MemoryConsolidation[] = []
    
    // Find similar permanent memories for consolidation
    const permanentMemories = Array.from(this.memory.permanent.values())
    const similarGroups = await this.findSimilarMemories(permanentMemories)
    
    for (const group of similarGroups) {
      if (group.length > 1) {
        const consolidation = await this.consolidateMemoryGroup(group)
        if (consolidation) {
          consolidations.push(consolidation)
        }
      }
    }
    
    this.emit('memory_consolidated', consolidations.length)
    return consolidations
  }

  /**
   * Memory garbage collection - clean up expired and redundant memories
   */
  async garbageCollect(): Promise<MemoryGarbageCollection> {
    const gc: MemoryGarbageCollection = {
      temporary: { expired: 0, lowAccess: 0, redundant: 0 },
      session: { completed: 0, obsolete: 0, merged: 0 },
      working: { archived: 0, consolidated: 0 },
      totalFreed: 0,
      timestamp: new Date()
    }
    
    // Clean temporary memory
    gc.temporary = await this.garbageCollectTemporary()
    
    // Clean session memory
    gc.session = await this.garbageCollectSession()
    
    // Archive working memory
    gc.working = await this.garbageCollectWorking()
    
    gc.totalFreed = gc.temporary.expired + gc.temporary.lowAccess + gc.temporary.redundant +
                    gc.session.completed + gc.session.obsolete + gc.session.merged +
                    gc.working.archived + gc.working.consolidated
    
    this.emit('garbage_collection_completed', gc)
    return gc
  }

  // Private utility methods
  private async garbageCollectTemporary(): Promise<{ expired: number; lowAccess: number; redundant: number }> {
    const now = Date.now()
    let expired = 0, lowAccess = 0, redundant = 0
    
    for (const [id, memory] of this.memory.temporary) {
      // Remove expired memories
      if (memory.autoExpire && (now - memory.createdAt.getTime()) > memory.ttl) {
        this.memory.temporary.delete(id)
        expired++
        continue
      }
      
      // Remove low-access memories if at capacity
      if (this.memory.temporary.size > this.maxTemporaryEntries && memory.accessCount < 2) {
        this.memory.temporary.delete(id)
        lowAccess++
      }
    }
    
    return { expired, lowAccess, redundant }
  }

  private async garbageCollectSession(): Promise<{ completed: number; obsolete: number; merged: number }> {
    let completed = 0, obsolete = 0, merged = 0
    
    for (const [id, memory] of this.memory.session) {
      // Remove memories for completed sessions
      if (memory.expires && memory.expires < new Date()) {
        this.memory.session.delete(id)
        completed++
      }
    }
    
    return { completed, obsolete, merged }
  }

  private async garbageCollectWorking(): Promise<{ archived: number; consolidated: number }> {
    let archived = 0, consolidated = 0
    
    for (const [id, memory] of this.memory.working) {
      // Archive inactive working memories
      if (memory.state === 'suspended' && 
          (Date.now() - memory.lastCheckpoint.getTime()) > 3600000) { // 1 hour
        memory.state = 'archived'
        archived++
      }
    }
    
    return { archived, consolidated }
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  private getMemoryById(id: string): any {
    return this.memory.temporary.get(id) ||
           this.memory.session.get(id) ||
           this.memory.permanent.get(id) ||
           this.memory.working.get(id)
  }

  private determineRecommendation(analysis: any): MemoryAnalysis['recommendation'] {
    const score = (analysis.memorability + analysis.generalApplicability + 
                   analysis.uniqueness + analysis.criticalness) / 4
    
    if (score >= 80) return 'permanent'
    if (score >= 60) return 'session'
    if (score >= 40) return 'temporary'
    return 'discard'
  }

  private determinePermanentType(analysis: MemoryAnalysis): PermanentMemory['type'] {
    // Determine type based on analysis
    if (analysis.suggestedTags.includes('error') || analysis.suggestedTags.includes('failure')) {
      return 'error_learning'
    }
    if (analysis.suggestedTags.includes('solution') || analysis.suggestedTags.includes('fix')) {
      return 'solution'
    }
    if (analysis.suggestedTags.includes('pattern') || analysis.suggestedTags.includes('recurring')) {
      return 'pattern'
    }
    if (analysis.suggestedTags.includes('optimization') || analysis.suggestedTags.includes('performance')) {
      return 'optimization'
    }
    if (analysis.suggestedTags.includes('decision') || analysis.suggestedTags.includes('choice')) {
      return 'decision_template'
    }
    return 'knowledge'
  }

  private async findRelatedMemories(memory: any, tags: string[]): Promise<string[]> {
    const related: string[] = []
    
    for (const [id, permMemory] of this.memory.permanent) {
      const commonTags = permMemory.tags.filter(tag => tags.includes(tag))
      if (commonTags.length > 0) {
        related.push(id)
      }
    }
    
    return related.slice(0, 5) // Top 5 related
  }

  private getRelevantPatterns(memory: any): string {
    const patterns = Array.from(this.memory.permanent.values())
      .filter(p => p.type === 'pattern')
      .slice(0, 5)
      .map(p => `${p.title}: ${p.description}`)
      .join('\n')
    
    return patterns || 'No existing patterns found'
  }

  private calculateRelevance(memory: any, query: string, context: string, aiAnalysis: any): {
    score: number
    applicability: number
    reasoning: string
  } {
    // Simple text matching for now - in production, would use vector similarity
    const queryLower = query.toLowerCase()
    const contextLower = context.toLowerCase()
    
    let score = 0
    let applicability = 0
    
    // Check title/description match
    const description = memory.description || memory.context || ''
    if (description.toLowerCase().includes(queryLower)) score += 0.4
    
    // Check tags match
    if (memory.tags) {
      const matchingTags = memory.tags.filter((tag: string) => 
        queryLower.includes(tag.toLowerCase()) || contextLower.includes(tag.toLowerCase())
      )
      score += matchingTags.length * 0.2
    }
    
    // Apply AI analysis weighting
    if (aiAnalysis.relevantTypes && memory.type && aiAnalysis.relevantTypes.includes(memory.type)) {
      score += 0.3
    }
    
    applicability = memory.metadata?.confidence || 50
    
    return {
      score: Math.min(score, 1.0),
      applicability,
      reasoning: `Text match + tag relevance + type relevance`
    }
  }

  private async findSimilarMemories(memories: PermanentMemory[]): Promise<PermanentMemory[][]> {
    const groups: PermanentMemory[][] = []
    const processed = new Set<string>()
    
    for (const memory of memories) {
      if (processed.has(memory.id)) continue
      
      const similar = memories.filter(other => 
        !processed.has(other.id) &&
        other.id !== memory.id &&
        this.memoriesAreSimilar(memory, other)
      )
      
      if (similar.length > 0) {
        groups.push([memory, ...similar])
        processed.add(memory.id)
        similar.forEach(s => processed.add(s.id))
      }
    }
    
    return groups
  }

  private memoriesAreSimilar(memory1: PermanentMemory, memory2: PermanentMemory): boolean {
    // Simple similarity check - in production, would use semantic similarity
    const commonTags = memory1.tags.filter(tag => memory2.tags.includes(tag))
    return commonTags.length >= 2 && memory1.type === memory2.type
  }

  private async consolidateMemoryGroup(group: PermanentMemory[]): Promise<MemoryConsolidation | null> {
    // Implement memory consolidation logic
    return null
  }

  private async updateMemoryUsage(memoryId: string): Promise<void> {
    const memory = this.memory.permanent.get(memoryId)
    if (memory) {
      memory.metadata.usageCount++
      memory.lastUsed = new Date()
    }
  }

  private async cleanupSourceMemory(memoryId: string, recommendation: string): Promise<void> {
    if (recommendation === 'permanent') {
      // Remove from temporary/session memory since it's now permanent
      this.memory.temporary.delete(memoryId)
      this.memory.session.delete(memoryId)
    }
  }

  private async loadPermanentMemory(): Promise<void> {
    try {
      const memoryFile = path.join(this.memoryPath, 'permanent-memory.json')
      const data = await fs.readFile(memoryFile, 'utf-8')
      const memories = JSON.parse(data)
      
      for (const memory of memories) {
        this.memory.permanent.set(memory.id, memory)
      }
    } catch {
      // No existing permanent memory file
    }
  }

  private async persistPermanentMemory(memory: PermanentMemory): Promise<void> {
    try {
      const memoryFile = path.join(this.memoryPath, 'permanent-memory.json')
      const allMemories = Array.from(this.memory.permanent.values())
      await fs.writeFile(memoryFile, JSON.stringify(allMemories, null, 2))
    } catch (error) {
      console.error('Failed to persist permanent memory:', error)
    }
  }

  private setupGarbageCollection(): void {
    setInterval(() => {
      this.garbageCollect()
    }, this.gcInterval)
  }

  private setupMemoryConsolidation(): void {
    // Run memory consolidation every hour
    setInterval(() => {
      this.consolidateMemories()
    }, 3600000)
  }

  // Public API
  async getMemoryStatistics(): Promise<{
    temporary: number
    session: number
    permanent: number
    working: number
    totalSize: number
  }> {
    return {
      temporary: this.memory.temporary.size,
      session: this.memory.session.size,
      permanent: this.memory.permanent.size,
      working: this.memory.working.size,
      totalSize: this.memory.temporary.size + this.memory.session.size + 
                 this.memory.permanent.size + this.memory.working.size
    }
  }

  async searchMemory(query: string, type?: string): Promise<Array<{ id: string; memory: any }>> {
    const results: Array<{ id: string; memory: any }> = []
    
    const searchIn = (memories: Map<string, any>) => {
      for (const [id, memory] of memories) {
        if (!type || memory.type === type) {
          const content = JSON.stringify(memory).toLowerCase()
          if (content.includes(query.toLowerCase())) {
            results.push({ id, memory })
          }
        }
      }
    }
    
    searchIn(this.memory.permanent)
    searchIn(this.memory.session)
    searchIn(this.memory.temporary)
    
    return results.slice(0, 20) // Limit results
  }

  async exportMemory(type: 'permanent' | 'all' = 'permanent'): Promise<string> {
    const exportData: any = {}
    
    if (type === 'all' || type === 'permanent') {
      exportData.permanent = Array.from(this.memory.permanent.values())
    }
    
    if (type === 'all') {
      exportData.session = Array.from(this.memory.session.values())
      exportData.working = Array.from(this.memory.working.values())
      // Don't export temporary memory as it's ephemeral
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  async importMemory(data: string): Promise<void> {
    const importData = JSON.parse(data)
    
    if (importData.permanent) {
      for (const memory of importData.permanent) {
        this.memory.permanent.set(memory.id, memory)
      }
      
      // Persist imported permanent memory
      const memoryFile = path.join(this.memoryPath, 'permanent-memory.json')
      await fs.writeFile(memoryFile, JSON.stringify(importData.permanent, null, 2))
    }
    
    this.emit('memory_imported', importData)
  }
}
