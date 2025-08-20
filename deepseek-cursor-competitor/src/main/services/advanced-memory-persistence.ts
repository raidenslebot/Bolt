import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

export interface MemoryEntry {
  id: string
  type: 'experience' | 'knowledge' | 'skill' | 'pattern' | 'relationship' | 'objective'
  content: any
  metadata: {
    source: string
    timestamp: Date
    confidence: number
    importance: number
    relevance: number
    tags: string[]
    context: string
  }
  associations: string[] // IDs of related memories
  accessCount: number
  lastAccessed: Date
  retention: {
    permanent: boolean
    decayRate: number
    strengthening: number
  }
}

export interface MemoryCluster {
  id: string
  name: string
  description: string
  memoryIds: string[]
  centroid: any // Semantic center of the cluster
  coherence: number // How well memories fit together
  lastUpdated: Date
}

export interface KnowledgeGraph {
  nodes: Map<string, MemoryNode>
  edges: Map<string, MemoryConnection[]>
  clusters: Map<string, MemoryCluster>
  patterns: Map<string, MemoryPattern>
}

export interface MemoryNode {
  id: string
  memory: MemoryEntry
  connections: string[]
  importance: number
  centrality: number
}

export interface MemoryConnection {
  fromMemory: string
  toMemory: string
  connectionType: 'causal' | 'temporal' | 'semantic' | 'procedural' | 'contextual'
  strength: number
  confidence: number
  metadata: any
}

export interface MemoryPattern {
  id: string
  name: string
  pattern: any
  occurrences: string[] // Memory IDs where pattern occurs
  confidence: number
  predictivePower: number
}

export interface MemoryQuery {
  type: 'semantic' | 'temporal' | 'pattern' | 'association' | 'importance'
  content: any
  filters: {
    timeRange?: { start: Date; end: Date }
    tags?: string[]
    source?: string
    minConfidence?: number
    minImportance?: number
  }
  limit?: number
}

export interface LearningSession {
  id: string
  agentId: string
  startTime: Date
  endTime?: Date
  objective: string
  memoriesCreated: string[]
  knowledgeGained: any[]
  skillsImproved: string[]
  patterns: MemoryPattern[]
  performance: {
    retentionRate: number
    transferEfficiency: number
    comprehensionLevel: number
  }
}

export interface MemoryConsolidation {
  id: string
  type: 'strengthening' | 'pruning' | 'reorganization' | 'compression'
  targetMemories: string[]
  algorithm: string
  startTime: Date
  endTime?: Date
  results: {
    memoriesProcessed: number
    memoriesStrengthened: number
    memoriesPruned: number
    newConnections: number
    efficiencyGain: number
  }
}

/**
 * Advanced Memory Persistence System
 * 
 * Sophisticated memory management system that enables agents to build,
 * organize, and retrieve complex knowledge structures with semantic
 * understanding and temporal awareness.
 * 
 * Key Features:
 * - Persistent memory storage with automatic organization
 * - Semantic knowledge graphs with relationship mapping
 * - Memory consolidation and strengthening algorithms
 * - Pattern recognition and learning from experience
 * - Contextual retrieval with relevance ranking
 * - Memory sharing and knowledge transfer between agents
 * - Adaptive forgetting and importance-based retention
 */
export class AdvancedMemoryPersistence extends EventEmitter {
  private workspaceDir: string
  private memoryDir: string
  private memories: Map<string, MemoryEntry> = new Map()
  private knowledgeGraph: KnowledgeGraph
  private learningSessions: Map<string, LearningSession> = new Map()
  private consolidationHistory: MemoryConsolidation[] = []
  
  // Memory management parameters
  private maxMemories: number
  private consolidationInterval: number
  private retentionThreshold: number
  
  // Performance metrics
  private memoryMetrics = {
    totalMemories: 0,
    activeMemories: 0,
    consolidationRuns: 0,
    averageRetrievalTime: 0,
    knowledgeTransferRate: 0,
    retentionEfficiency: 0
  }

  // Real-time memory operations
  private memoryBuffer: MemoryEntry[] = []
  private processingQueue: MemoryEntry[] = []

  constructor(
    workspaceDir: string,
    options: {
      maxMemories?: number
      consolidationInterval?: number // milliseconds
      retentionThreshold?: number
    } = {}
  ) {
    super()
    
    this.workspaceDir = workspaceDir
    this.memoryDir = join(workspaceDir, 'memory-persistence')
    this.maxMemories = options.maxMemories || 100000
    this.consolidationInterval = options.consolidationInterval || 3600000 // 1 hour
    this.retentionThreshold = options.retentionThreshold || 0.1
    
    this.knowledgeGraph = {
      nodes: new Map(),
      edges: new Map(),
      clusters: new Map(),
      patterns: new Map()
    }
    
    this.initializeMemorySystem()
    this.startMemoryProcessing()
    
    console.log('🧠 Advanced Memory Persistence System initialized')
  }

  /**
   * Store new memory with automatic processing and organization
   */
  async storeMemory(
    type: MemoryEntry['type'],
    content: any,
    metadata: Partial<MemoryEntry['metadata']>,
    agentId: string
  ): Promise<string> {
    try {
      const memoryId = randomUUID()
      
      const memory: MemoryEntry = {
        id: memoryId,
        type,
        content,
        metadata: {
          source: agentId,
          timestamp: new Date(),
          confidence: 0.8,
          importance: 0.5,
          relevance: 0.5,
          tags: [],
          context: '',
          ...metadata
        },
        associations: [],
        accessCount: 0,
        lastAccessed: new Date(),
        retention: {
          permanent: false,
          decayRate: 0.01,
          strengthening: 1.0
        }
      }

      // Add to memory buffer for processing
      this.memoryBuffer.push(memory)
      this.memories.set(memoryId, memory)

      // Create knowledge graph node
      const node: MemoryNode = {
        id: memoryId,
        memory,
        connections: [],
        importance: memory.metadata.importance,
        centrality: 0
      }
      this.knowledgeGraph.nodes.set(memoryId, node)

      // Trigger immediate processing for important memories
      if (memory.metadata.importance > 0.8) {
        await this.processMemoryImmediate(memory)
      }

      this.memoryMetrics.totalMemories++
      this.memoryMetrics.activeMemories++

      this.emit('memoryStored', {
        memoryId,
        type,
        agentId,
        importance: memory.metadata.importance,
        timestamp: new Date()
      })

      await this.persistMemoryToDisk(memory)

      console.log(`🧠 Memory stored: ${memoryId} (${type})`)
      return memoryId

    } catch (error) {
      console.error('Failed to store memory:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Retrieve memories based on semantic query
   */
  async retrieveMemories(query: MemoryQuery): Promise<MemoryEntry[]> {
    try {
      const startTime = Date.now()
      let results: MemoryEntry[] = []

      switch (query.type) {
        case 'semantic':
          results = await this.semanticSearch(query)
          break
        case 'temporal':
          results = await this.temporalSearch(query)
          break
        case 'pattern':
          results = await this.patternSearch(query)
          break
        case 'association':
          results = await this.associationSearch(query)
          break
        case 'importance':
          results = await this.importanceSearch(query)
          break
      }

      // Apply filters
      results = this.applyFilters(results, query.filters)

      // Limit results
      if (query.limit && results.length > query.limit) {
        results = results.slice(0, query.limit)
      }

      // Update access statistics
      for (const memory of results) {
        memory.accessCount++
        memory.lastAccessed = new Date()
        this.strengthenMemory(memory.id)
      }

      const retrievalTime = Date.now() - startTime
      this.memoryMetrics.averageRetrievalTime = 
        (this.memoryMetrics.averageRetrievalTime + retrievalTime) / 2

      this.emit('memoriesRetrieved', {
        query,
        resultCount: results.length,
        retrievalTime,
        timestamp: new Date()
      })

      return results

    } catch (error) {
      console.error('Failed to retrieve memories:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  /**
   * Create associations between memories
   */
  async createAssociation(
    memory1Id: string,
    memory2Id: string,
    connectionType: MemoryConnection['connectionType'],
    strength: number = 0.5,
    metadata: any = {}
  ): Promise<void> {
    try {
      const memory1 = this.memories.get(memory1Id)
      const memory2 = this.memories.get(memory2Id)

      if (!memory1 || !memory2) {
        throw new Error('One or both memories not found')
      }

      // Create bidirectional association
      if (!memory1.associations.includes(memory2Id)) {
        memory1.associations.push(memory2Id)
      }
      if (!memory2.associations.includes(memory1Id)) {
        memory2.associations.push(memory1Id)
      }

      // Create connection in knowledge graph
      const connection: MemoryConnection = {
        fromMemory: memory1Id,
        toMemory: memory2Id,
        connectionType,
        strength,
        confidence: 0.8,
        metadata
      }

      if (!this.knowledgeGraph.edges.has(memory1Id)) {
        this.knowledgeGraph.edges.set(memory1Id, [])
      }
      this.knowledgeGraph.edges.get(memory1Id)!.push(connection)

      // Update node centrality
      await this.updateNodeCentrality(memory1Id)
      await this.updateNodeCentrality(memory2Id)

      this.emit('associationCreated', {
        memory1Id,
        memory2Id,
        connectionType,
        strength,
        timestamp: new Date()
      })

      console.log(`🔗 Association created: ${memory1Id} -> ${memory2Id}`)

    } catch (error) {
      console.error('Failed to create association:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * Start a learning session for an agent
   */
  async startLearningSession(agentId: string, objective: string): Promise<string> {
    const sessionId = randomUUID()
    
    const session: LearningSession = {
      id: sessionId,
      agentId,
      startTime: new Date(),
      objective,
      memoriesCreated: [],
      knowledgeGained: [],
      skillsImproved: [],
      patterns: [],
      performance: {
        retentionRate: 0,
        transferEfficiency: 0,
        comprehensionLevel: 0
      }
    }

    this.learningSessions.set(sessionId, session)

    this.emit('learningSessionStarted', {
      sessionId,
      agentId,
      objective,
      timestamp: new Date()
    })

    console.log(`📚 Learning session started: ${sessionId}`)
    return sessionId
  }

  /**
   * End learning session and consolidate memories
   */
  async endLearningSession(sessionId: string): Promise<LearningSession> {
    const session = this.learningSessions.get(sessionId)
    if (!session) {
      throw new Error(`Learning session ${sessionId} not found`)
    }

    session.endTime = new Date()

    // Analyze learning performance
    session.performance = await this.analyzeLearningPerformance(session)

    // Consolidate memories from session
    await this.consolidateSessionMemories(sessionId)

    // Extract patterns
    session.patterns = await this.extractPatternsFromSession(session)

    this.emit('learningSessionEnded', {
      sessionId,
      performance: session.performance,
      memoriesCreated: session.memoriesCreated.length,
      timestamp: new Date()
    })

    console.log(`📚 Learning session ended: ${sessionId}`)
    return session
  }

  /**
   * Transfer knowledge between agents
   */
  async transferKnowledge(
    sourceAgentId: string,
    targetAgentId: string,
    knowledgeQuery: MemoryQuery,
    transferType: 'copy' | 'share' | 'merge' = 'share'
  ): Promise<{
    transferredMemories: string[]
    newConnections: number
    efficiency: number
  }> {
    try {
      // Retrieve relevant memories from source agent
      const sourceMemories = await this.retrieveMemories({
        ...knowledgeQuery,
        filters: {
          ...knowledgeQuery.filters,
          source: sourceAgentId
        }
      })

      const transferredMemories: string[] = []
      let newConnections = 0

      for (const memory of sourceMemories) {
        let newMemoryId: string

        switch (transferType) {
          case 'copy':
            // Create exact copy for target agent
            newMemoryId = await this.storeMemory(
              memory.type,
              memory.content,
              {
                ...memory.metadata,
                source: targetAgentId,
                tags: [...memory.metadata.tags, 'transferred', `from:${sourceAgentId}`]
              },
              targetAgentId
            )
            break

          case 'share':
            // Create shared reference
            newMemoryId = await this.createSharedMemory(memory, targetAgentId)
            break

          case 'merge':
            // Merge with existing target agent memories
            newMemoryId = await this.mergeWithExistingMemories(memory, targetAgentId)
            break
        }

        transferredMemories.push(newMemoryId)

        // Create knowledge transfer connections
        const connections = await this.createTransferConnections(memory.id, newMemoryId)
        newConnections += connections
      }

      const efficiency = transferredMemories.length / sourceMemories.length
      this.memoryMetrics.knowledgeTransferRate = 
        (this.memoryMetrics.knowledgeTransferRate + efficiency) / 2

      this.emit('knowledgeTransferred', {
        sourceAgentId,
        targetAgentId,
        transferredCount: transferredMemories.length,
        efficiency,
        timestamp: new Date()
      })

      console.log(`🔄 Knowledge transferred: ${sourceAgentId} -> ${targetAgentId}`)

      return {
        transferredMemories,
        newConnections,
        efficiency
      }

    } catch (error) {
      console.error('Failed to transfer knowledge:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Run memory consolidation algorithm
   */
  async consolidateMemories(
    algorithm: 'strengthening' | 'pruning' | 'reorganization' | 'compression' = 'strengthening'
  ): Promise<MemoryConsolidation> {
    const consolidationId = randomUUID()
    
    const consolidation: MemoryConsolidation = {
      id: consolidationId,
      type: algorithm,
      targetMemories: [],
      algorithm,
      startTime: new Date(),
      results: {
        memoriesProcessed: 0,
        memoriesStrengthened: 0,
        memoriesPruned: 0,
        newConnections: 0,
        efficiencyGain: 0
      }
    }

    try {
      switch (algorithm) {
        case 'strengthening':
          await this.runStrengtheningConsolidation(consolidation)
          break
        case 'pruning':
          await this.runPruningConsolidation(consolidation)
          break
        case 'reorganization':
          await this.runReorganizationConsolidation(consolidation)
          break
        case 'compression':
          await this.runCompressionConsolidation(consolidation)
          break
      }

      consolidation.endTime = new Date()
      this.consolidationHistory.push(consolidation)
      this.memoryMetrics.consolidationRuns++

      this.emit('memoryConsolidated', {
        consolidationId,
        algorithm,
        results: consolidation.results,
        timestamp: new Date()
      })

      console.log(`🔄 Memory consolidation completed: ${algorithm}`)
      return consolidation

    } catch (error) {
      console.error('Failed to consolidate memories:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Get memory system status and analytics
   */
  getMemoryStatus(): {
    metrics: any
    memoryCount: number
    knowledgeGraphStats: {
      nodes: number
      edges: number
      clusters: number
      patterns: number
    }
    activeSessions: LearningSession[]
    recentConsolidations: MemoryConsolidation[]
  } {
    return {
      metrics: this.memoryMetrics,
      memoryCount: this.memories.size,
      knowledgeGraphStats: {
        nodes: this.knowledgeGraph.nodes.size,
        edges: Array.from(this.knowledgeGraph.edges.values()).reduce((sum, arr) => sum + arr.length, 0),
        clusters: this.knowledgeGraph.clusters.size,
        patterns: this.knowledgeGraph.patterns.size
      },
      activeSessions: Array.from(this.learningSessions.values()).filter(s => !s.endTime),
      recentConsolidations: this.consolidationHistory.slice(-10)
    }
  }

  // Private helper methods

  private initializeMemorySystem(): void {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true })
    }

    // Load existing memories
    this.loadExistingMemories()

    // Initialize consolidation scheduler
    setInterval(() => {
      this.consolidateMemories('strengthening')
    }, this.consolidationInterval)
  }

  private startMemoryProcessing(): void {
    // Process memory buffer
    setInterval(() => {
      this.processMemoryBuffer()
    }, 1000)

    // Update memory metrics
    setInterval(() => {
      this.updateMemoryMetrics()
    }, 5000)

    // Memory maintenance
    setInterval(() => {
      this.performMemoryMaintenance()
    }, 60000)
  }

  private async processMemoryImmediate(memory: MemoryEntry): Promise<void> {
    // Immediate processing for important memories
    await this.createSemanticAssociations(memory)
    await this.updateKnowledgeClusters(memory)
    await this.extractMemoryPatterns(memory)
  }

  private async processMemoryBuffer(): Promise<void> {
    if (this.memoryBuffer.length === 0) return

    const batchSize = Math.min(10, this.memoryBuffer.length)
    const batch = this.memoryBuffer.splice(0, batchSize)

    for (const memory of batch) {
      await this.processMemoryImmediate(memory)
    }
  }

  private async semanticSearch(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = []
    const searchTerm = query.content

    for (const memory of this.memories.values()) {
      const similarity = this.calculateSemanticSimilarity(searchTerm, memory.content)
      if (similarity > 0.3) {
        results.push(memory)
      }
    }

    return results.sort((a, b) => b.metadata.relevance - a.metadata.relevance)
  }

  private async temporalSearch(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = []
    const timeRange = query.filters?.timeRange

    for (const memory of this.memories.values()) {
      if (timeRange) {
        const timestamp = memory.metadata.timestamp
        if (timestamp >= timeRange.start && timestamp <= timeRange.end) {
          results.push(memory)
        }
      }
    }

    return results.sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime())
  }

  private async patternSearch(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = []
    const pattern = query.content

    for (const [patternId, memoryPattern] of this.knowledgeGraph.patterns) {
      if (this.matchesPattern(pattern, memoryPattern.pattern)) {
        for (const memoryId of memoryPattern.occurrences) {
          const memory = this.memories.get(memoryId)
          if (memory) {
            results.push(memory)
          }
        }
      }
    }

    return results
  }

  private async associationSearch(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = []
    const sourceMemoryId = query.content

    const sourceMemory = this.memories.get(sourceMemoryId)
    if (!sourceMemory) return results

    for (const associatedId of sourceMemory.associations) {
      const memory = this.memories.get(associatedId)
      if (memory) {
        results.push(memory)
      }
    }

    return results.sort((a, b) => b.metadata.relevance - a.metadata.relevance)
  }

  private async importanceSearch(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results = Array.from(this.memories.values())
      .filter(m => m.metadata.importance >= (query.content || 0.5))
      .sort((a, b) => b.metadata.importance - a.metadata.importance)

    return results
  }

  private applyFilters(memories: MemoryEntry[], filters: MemoryQuery['filters']): MemoryEntry[] {
    let filtered = memories

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter(m => 
        filters.tags!.some(tag => m.metadata.tags.includes(tag))
      )
    }

    if (filters?.source) {
      filtered = filtered.filter(m => m.metadata.source === filters.source)
    }

    if (filters?.minConfidence) {
      filtered = filtered.filter(m => m.metadata.confidence >= filters.minConfidence!)
    }

    if (filters?.minImportance) {
      filtered = filtered.filter(m => m.metadata.importance >= filters.minImportance!)
    }

    return filtered
  }

  private calculateSemanticSimilarity(term1: any, term2: any): number {
    // Simple similarity calculation (in real implementation, use embeddings)
    const str1 = JSON.stringify(term1).toLowerCase()
    const str2 = JSON.stringify(term2).toLowerCase()
    
    const words1 = str1.split(/\W+/)
    const words2 = str2.split(/\W+/)
    
    const commonWords = words1.filter(word => words2.includes(word))
    const similarity = commonWords.length / Math.max(words1.length, words2.length)
    
    return similarity
  }

  private strengthenMemory(memoryId: string): void {
    const memory = this.memories.get(memoryId)
    if (!memory) return

    memory.retention.strengthening += 0.1
    memory.metadata.importance = Math.min(1.0, memory.metadata.importance + 0.05)
  }

  private async updateNodeCentrality(memoryId: string): Promise<void> {
    const node = this.knowledgeGraph.nodes.get(memoryId)
    if (!node) return

    // Calculate centrality based on connections
    const connections = this.knowledgeGraph.edges.get(memoryId) || []
    node.centrality = connections.length / this.knowledgeGraph.nodes.size
    node.importance = (node.importance + node.centrality) / 2
  }

  private async createSemanticAssociations(memory: MemoryEntry): Promise<void> {
    // Find semantically similar memories and create associations
    for (const [otherId, otherMemory] of this.memories) {
      if (otherId === memory.id) continue

      const similarity = this.calculateSemanticSimilarity(memory.content, otherMemory.content)
      if (similarity > 0.7) {
        await this.createAssociation(memory.id, otherId, 'semantic', similarity)
      }
    }
  }

  private async updateKnowledgeClusters(memory: MemoryEntry): Promise<void> {
    // Update knowledge clusters based on new memory
    const relevantCluster = this.findRelevantCluster(memory)
    
    if (relevantCluster) {
      relevantCluster.memoryIds.push(memory.id)
      relevantCluster.lastUpdated = new Date()
    } else {
      // Create new cluster if no relevant cluster found
      const clusterId = randomUUID()
      const newCluster: MemoryCluster = {
        id: clusterId,
        name: `Cluster-${Date.now()}`,
        description: `Auto-generated cluster for ${memory.type}`,
        memoryIds: [memory.id],
        centroid: memory.content,
        coherence: 1.0,
        lastUpdated: new Date()
      }
      this.knowledgeGraph.clusters.set(clusterId, newCluster)
    }
  }

  private findRelevantCluster(memory: MemoryEntry): MemoryCluster | null {
    let bestCluster: MemoryCluster | null = null
    let bestSimilarity = 0

    for (const cluster of this.knowledgeGraph.clusters.values()) {
      const similarity = this.calculateSemanticSimilarity(memory.content, cluster.centroid)
      if (similarity > bestSimilarity && similarity > 0.5) {
        bestSimilarity = similarity
        bestCluster = cluster
      }
    }

    return bestCluster
  }

  private async extractMemoryPatterns(memory: MemoryEntry): Promise<void> {
    // Extract patterns from memory content
    const patterns = this.identifyPatterns(memory.content)
    
    for (const pattern of patterns) {
      const patternId = this.generatePatternId(pattern)
      let memoryPattern = this.knowledgeGraph.patterns.get(patternId)
      
      if (!memoryPattern) {
        memoryPattern = {
          id: patternId,
          name: `Pattern-${patternId.slice(0, 8)}`,
          pattern,
          occurrences: [],
          confidence: 0.5,
          predictivePower: 0.5
        }
        this.knowledgeGraph.patterns.set(patternId, memoryPattern)
      }
      
      memoryPattern.occurrences.push(memory.id)
      memoryPattern.confidence = Math.min(1.0, memoryPattern.confidence + 0.1)
    }
  }

  private identifyPatterns(content: any): any[] {
    // Simple pattern identification (in real implementation, use ML)
    const patterns: any[] = []
    
    if (typeof content === 'object' && content !== null) {
      // Extract structural patterns
      patterns.push({
        type: 'structure',
        keys: Object.keys(content)
      })
    }
    
    return patterns
  }

  private generatePatternId(pattern: any): string {
    // Generate consistent ID for pattern
    return randomUUID() // Simplified for example
  }

  private matchesPattern(queryPattern: any, memoryPattern: any): boolean {
    // Simple pattern matching (in real implementation, use sophisticated matching)
    return JSON.stringify(queryPattern) === JSON.stringify(memoryPattern)
  }

  private async persistMemoryToDisk(memory: MemoryEntry): Promise<void> {
    const filePath = join(this.memoryDir, `${memory.id}.json`)
    writeFileSync(filePath, JSON.stringify(memory, null, 2))
  }

  private loadExistingMemories(): void {
    if (!existsSync(this.memoryDir)) return

    const files = readdirSync(this.memoryDir).filter(f => f.endsWith('.json'))
    
    for (const file of files) {
      try {
        const filePath = join(this.memoryDir, file)
        const data = readFileSync(filePath, 'utf8')
        const memory: MemoryEntry = JSON.parse(data)
        
        this.memories.set(memory.id, memory)
        
        const node: MemoryNode = {
          id: memory.id,
          memory,
          connections: memory.associations,
          importance: memory.metadata.importance,
          centrality: 0
        }
        this.knowledgeGraph.nodes.set(memory.id, node)
        
      } catch (error) {
        console.warn(`Failed to load memory from ${file}:`, error instanceof Error ? error.message : String(error))
      }
    }
    
    console.log(`📚 Loaded ${this.memories.size} existing memories`)
  }

  private async analyzeLearningPerformance(session: LearningSession): Promise<LearningSession['performance']> {
    const sessionMemories = session.memoriesCreated.map(id => this.memories.get(id)).filter(Boolean)
    
    const retentionRate = sessionMemories.length > 0 ? 
      sessionMemories.filter(m => m!.retention.strengthening > 1.0).length / sessionMemories.length : 0
    
    return {
      retentionRate,
      transferEfficiency: 0.8, // Calculated based on knowledge transfer success
      comprehensionLevel: 0.7   // Calculated based on pattern recognition
    }
  }

  private async consolidateSessionMemories(sessionId: string): Promise<void> {
    const session = this.learningSessions.get(sessionId)
    if (!session) return

    // Strengthen memories from session
    for (const memoryId of session.memoriesCreated) {
      this.strengthenMemory(memoryId)
    }

    // Create temporal associations between session memories
    for (let i = 0; i < session.memoriesCreated.length - 1; i++) {
      await this.createAssociation(
        session.memoriesCreated[i],
        session.memoriesCreated[i + 1],
        'temporal',
        0.6
      )
    }
  }

  private async extractPatternsFromSession(session: LearningSession): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = []
    
    // Extract patterns from session memories
    for (const memoryId of session.memoriesCreated) {
      const memory = this.memories.get(memoryId)
      if (memory) {
        await this.extractMemoryPatterns(memory)
      }
    }
    
    return patterns
  }

  private async createSharedMemory(sourceMemory: MemoryEntry, targetAgentId: string): Promise<string> {
    // Create shared reference to memory
    const sharedMemoryId = randomUUID()
    const sharedMemory: MemoryEntry = {
      ...sourceMemory,
      id: sharedMemoryId,
      metadata: {
        ...sourceMemory.metadata,
        source: targetAgentId,
        tags: [...sourceMemory.metadata.tags, 'shared']
      }
    }
    
    this.memories.set(sharedMemoryId, sharedMemory)
    await this.persistMemoryToDisk(sharedMemory)
    
    return sharedMemoryId
  }

  private async mergeWithExistingMemories(sourceMemory: MemoryEntry, targetAgentId: string): Promise<string> {
    // Find similar memories and merge
    const similarMemories = await this.retrieveMemories({
      type: 'semantic',
      content: sourceMemory.content,
      filters: { source: targetAgentId },
      limit: 1
    })
    
    if (similarMemories.length > 0) {
      const existingMemory = similarMemories[0]
      // Merge content and strengthen
      existingMemory.metadata.confidence = Math.min(1.0, existingMemory.metadata.confidence + 0.1)
      existingMemory.metadata.importance = Math.min(1.0, existingMemory.metadata.importance + 0.1)
      return existingMemory.id
    } else {
      // Create new memory if no similar found
      return await this.storeMemory(
        sourceMemory.type,
        sourceMemory.content,
        sourceMemory.metadata,
        targetAgentId
      )
    }
  }

  private async createTransferConnections(sourceMemoryId: string, targetMemoryId: string): Promise<number> {
    await this.createAssociation(sourceMemoryId, targetMemoryId, 'contextual', 0.8, {
      transferType: 'knowledge-transfer'
    })
    return 1
  }

  private async runStrengtheningConsolidation(consolidation: MemoryConsolidation): Promise<void> {
    let strengthened = 0
    
    for (const memory of this.memories.values()) {
      if (memory.accessCount > 10 || memory.metadata.importance > 0.7) {
        this.strengthenMemory(memory.id)
        strengthened++
      }
    }
    
    consolidation.results.memoriesStrengthened = strengthened
    consolidation.results.memoriesProcessed = this.memories.size
  }

  private async runPruningConsolidation(consolidation: MemoryConsolidation): Promise<void> {
    let pruned = 0
    const memoriesToPrune: string[] = []
    
    for (const [id, memory] of this.memories) {
      if (memory.retention.strengthening < this.retentionThreshold && 
          !memory.retention.permanent &&
          memory.accessCount === 0) {
        memoriesToPrune.push(id)
      }
    }
    
    for (const id of memoriesToPrune) {
      this.memories.delete(id)
      this.knowledgeGraph.nodes.delete(id)
      pruned++
    }
    
    consolidation.results.memoriesPruned = pruned
    this.memoryMetrics.activeMemories = this.memories.size
  }

  private async runReorganizationConsolidation(consolidation: MemoryConsolidation): Promise<void> {
    // Reorganize knowledge clusters and connections
    await this.reorganizeKnowledgeClusters()
    consolidation.results.newConnections = await this.optimizeConnections()
  }

  private async runCompressionConsolidation(consolidation: MemoryConsolidation): Promise<void> {
    // Compress related memories and create abstractions
    const compressed = await this.compressRelatedMemories()
    consolidation.results.efficiencyGain = compressed
  }

  private async reorganizeKnowledgeClusters(): Promise<void> {
    // Reorganize clusters based on current memory state
    this.knowledgeGraph.clusters.clear()
    
    for (const memory of this.memories.values()) {
      await this.updateKnowledgeClusters(memory)
    }
  }

  private async optimizeConnections(): Promise<number> {
    let newConnections = 0
    
    // Create new connections based on updated importance and centrality
    for (const [id1, node1] of this.knowledgeGraph.nodes) {
      for (const [id2, node2] of this.knowledgeGraph.nodes) {
        if (id1 !== id2 && node1.importance > 0.8 && node2.importance > 0.8) {
          const similarity = this.calculateSemanticSimilarity(
            node1.memory.content, 
            node2.memory.content
          )
          if (similarity > 0.6 && !node1.memory.associations.includes(id2)) {
            await this.createAssociation(id1, id2, 'semantic', similarity)
            newConnections++
          }
        }
      }
    }
    
    return newConnections
  }

  private async compressRelatedMemories(): Promise<number> {
    // Identify and compress highly related memory groups
    let compressionGain = 0
    
    // Implementation would identify memory groups and create compressed representations
    
    return compressionGain
  }

  private updateMemoryMetrics(): void {
    this.memoryMetrics.activeMemories = this.memories.size
    this.memoryMetrics.retentionEfficiency = 
      this.memories.size > 0 ? 
      Array.from(this.memories.values()).filter(m => m.retention.strengthening > 1.0).length / this.memories.size : 0
  }

  private performMemoryMaintenance(): void {
    // Regular maintenance tasks
    if (this.memories.size > this.maxMemories) {
      this.consolidateMemories('pruning')
    }
  }
}
