import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface FileMetadata {
  path: string
  name: string
  extension: string
  size: number
  created: Date
  modified: Date
  accessed: Date
  isDirectory: boolean
  isSymlink: boolean
  isHidden: boolean
  permissions: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
  encoding?: string
  lineCount?: number
  language?: string
  complexity?: number
  dependencies?: string[]
  checksum: string
}

export interface FileSearchOptions {
  pattern?: string
  extensions?: string[]
  includeHidden?: boolean
  includeDirectories?: boolean
  maxResults?: number
  sortBy?: 'name' | 'size' | 'modified' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  fuzzySearch?: boolean
  contentSearch?: boolean
}

export interface FileWatcher {
  id: string
  path: string
  recursive: boolean
  events: ('create' | 'modify' | 'delete' | 'move')[]
  callback: (event: FileSystemEvent) => void
  active: boolean
}

export interface FileSystemEvent {
  type: 'create' | 'modify' | 'delete' | 'move'
  path: string
  oldPath?: string
  timestamp: Date
  metadata?: FileMetadata
}

export interface WorkspaceConfig {
  root: string
  excludePatterns: string[]
  includePatterns: string[]
  maxFileSize: number
  enableIndexing: boolean
  enableWatching: boolean
  compressionEnabled: boolean
  backupEnabled: boolean
}

export interface BackupConfig {
  enabled: boolean
  interval: number // minutes
  maxBackups: number
  compressionLevel: number
  excludePatterns: string[]
}

export interface FileOperation {
  id: string
  type: 'copy' | 'move' | 'delete' | 'create' | 'modify'
  source: string
  destination?: string
  timestamp: Date
  completed: boolean
  error?: string
  progress: number
}

/**
 * Advanced File System service providing intelligent file operations and workspace management
 * Features: smart indexing, real-time watching, intelligent search, backup management
 */
export class AdvancedFileSystemService extends EventEmitter {
  private config: WorkspaceConfig
  private fileIndex: Map<string, FileMetadata> = new Map()
  private watchers: Map<string, FileWatcher> = new Map()
  private fsWatchers: Map<string, fs.FSWatcher> = new Map()
  private operations: Map<string, FileOperation> = new Map()
  private backupConfig: BackupConfig
  private isRunning = false
  private indexingTimer: NodeJS.Timeout | null = null
  private backupTimer: NodeJS.Timeout | null = null

  constructor(config: WorkspaceConfig) {
    super()
    this.config = config
    this.backupConfig = {
      enabled: true,
      interval: 30, // 30 minutes
      maxBackups: 10,
      compressionLevel: 6,
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    }
  }

  /**
   * Start the file system service
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    
    // Initialize workspace
    await this.initializeWorkspace()
    
    // Start indexing if enabled
    if (this.config.enableIndexing) {
      await this.buildInitialIndex()
      this.startPeriodicIndexing()
    }
    
    // Start file watching if enabled
    if (this.config.enableWatching) {
      await this.setupWorkspaceWatching()
    }
    
    // Start backup system
    if (this.backupConfig.enabled) {
      this.startBackupSystem()
    }
    
    this.emit('started')
  }

  /**
   * Stop the file system service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    
    // Stop all watchers
    for (const watcher of this.fsWatchers.values()) {
      watcher.close()
    }
    this.fsWatchers.clear()
    this.watchers.clear()
    
    // Stop timers
    if (this.indexingTimer) {
      clearInterval(this.indexingTimer)
      this.indexingTimer = null
    }
    
    if (this.backupTimer) {
      clearInterval(this.backupTimer)
      this.backupTimer = null
    }
    
    this.emit('stopped')
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    const normalizedPath = path.normalize(filePath)
    
    // Check cache first
    const cached = this.fileIndex.get(normalizedPath)
    if (cached) {
      return cached
    }
    
    try {
      const stats = await fs.promises.stat(normalizedPath)
      const metadata = await this.buildFileMetadata(normalizedPath, stats)
      
      // Cache the metadata
      this.fileIndex.set(normalizedPath, metadata)
      
      return metadata
    } catch (error) {
      return null
    }
  }

  /**
   * Search files with advanced options
   */
  async searchFiles(query: string, options: FileSearchOptions = {}): Promise<FileMetadata[]> {
    const results: Array<{ metadata: FileMetadata; score: number }> = []
    
    const searchInIndex = options.contentSearch !== true
    const files = searchInIndex ? 
      Array.from(this.fileIndex.values()) : 
      await this.getAllFiles()
    
    for (const metadata of files) {
      const score = await this.calculateRelevanceScore(metadata, query, options)
      
      if (score > 0) {
        results.push({ metadata, score })
      }
    }
    
    // Sort by relevance or specified criteria
    const sortBy = options.sortBy || 'relevance'
    const sortOrder = options.sortOrder || 'desc'
    
    results.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'relevance':
          comparison = a.score - b.score
          break
        case 'name':
          comparison = a.metadata.name.localeCompare(b.metadata.name)
          break
        case 'size':
          comparison = a.metadata.size - b.metadata.size
          break
        case 'modified':
          comparison = a.metadata.modified.getTime() - b.metadata.modified.getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    // Apply limit
    const maxResults = options.maxResults || 100
    return results.slice(0, maxResults).map(r => r.metadata)
  }

  /**
   * Watch for file system changes
   */
  watchPath(
    watchPath: string,
    events: ('create' | 'modify' | 'delete' | 'move')[],
    callback: (event: FileSystemEvent) => void,
    recursive = true
  ): string {
    const watcherId = this.generateWatcherId()
    
    const watcher: FileWatcher = {
      id: watcherId,
      path: watchPath,
      recursive,
      events,
      callback,
      active: true
    }
    
    this.watchers.set(watcherId, watcher)
    
    try {
      const fsWatcher = fs.watch(watchPath, { recursive }, (eventType, filename) => {
        this.handleFileSystemEvent(watcher, eventType, filename)
      })
      
      this.fsWatchers.set(watcherId, fsWatcher)
      this.emit('watcherCreated', watcher)
      
    } catch (error) {
      this.watchers.delete(watcherId)
      this.emit('watcherError', watcherId, error)
      throw error
    }
    
    return watcherId
  }

  /**
   * Stop watching a path
   */
  unwatchPath(watcherId: string): void {
    const watcher = this.watchers.get(watcherId)
    if (!watcher) return
    
    const fsWatcher = this.fsWatchers.get(watcherId)
    if (fsWatcher) {
      fsWatcher.close()
      this.fsWatchers.delete(watcherId)
    }
    
    this.watchers.delete(watcherId)
    this.emit('watcherRemoved', watcherId)
  }

  /**
   * Copy file or directory
   */
  async copyPath(source: string, destination: string, options: {
    overwrite?: boolean
    preserveTimestamps?: boolean
    followSymlinks?: boolean
  } = {}): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'copy',
      source,
      destination,
      timestamp: new Date(),
      completed: false,
      progress: 0
    }
    
    this.operations.set(operationId, operation)
    this.emit('operationStarted', operation)
    
    try {
      await this.performCopyOperation(source, destination, options, operation)
      
      operation.completed = true
      operation.progress = 100
      this.emit('operationCompleted', operation)
      
      // Update index
      if (this.config.enableIndexing) {
        await this.indexPath(destination)
      }
      
    } catch (error) {
      operation.error = error instanceof Error ? error.message : String(error)
      this.emit('operationFailed', operation)
      throw error
    }
    
    return operationId
  }

  /**
   * Move file or directory
   */
  async movePath(source: string, destination: string): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'move',
      source,
      destination,
      timestamp: new Date(),
      completed: false,
      progress: 0
    }
    
    this.operations.set(operationId, operation)
    this.emit('operationStarted', operation)
    
    try {
      await fs.promises.rename(source, destination)
      
      operation.completed = true
      operation.progress = 100
      this.emit('operationCompleted', operation)
      
      // Update index
      if (this.config.enableIndexing) {
        this.fileIndex.delete(source)
        await this.indexPath(destination)
      }
      
    } catch (error) {
      operation.error = error instanceof Error ? error.message : String(error)
      this.emit('operationFailed', operation)
      throw error
    }
    
    return operationId
  }

  /**
   * Delete file or directory
   */
  async deletePath(targetPath: string, options: {
    recursive?: boolean
    backup?: boolean
  } = {}): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'delete',
      source: targetPath,
      timestamp: new Date(),
      completed: false,
      progress: 0
    }
    
    this.operations.set(operationId, operation)
    this.emit('operationStarted', operation)
    
    try {
      // Create backup if requested
      if (options.backup) {
        await this.createBackup(targetPath)
      }
      
      const stats = await fs.promises.stat(targetPath)
      
      if (stats.isDirectory()) {
        if (options.recursive) {
          await fs.promises.rmdir(targetPath, { recursive: true })
        } else {
          await fs.promises.rmdir(targetPath)
        }
      } else {
        await fs.promises.unlink(targetPath)
      }
      
      operation.completed = true
      operation.progress = 100
      this.emit('operationCompleted', operation)
      
      // Update index
      if (this.config.enableIndexing) {
        this.fileIndex.delete(targetPath)
      }
      
    } catch (error) {
      operation.error = error instanceof Error ? error.message : String(error)
      this.emit('operationFailed', operation)
      throw error
    }
    
    return operationId
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string, options: {
    recursive?: boolean
    mode?: number
  } = {}): Promise<string> {
    const operationId = this.generateOperationId()
    
    const operation: FileOperation = {
      id: operationId,
      type: 'create',
      source: dirPath,
      timestamp: new Date(),
      completed: false,
      progress: 0
    }
    
    this.operations.set(operationId, operation)
    this.emit('operationStarted', operation)
    
    try {
      await fs.promises.mkdir(dirPath, {
        recursive: options.recursive ?? true,
        mode: options.mode
      })
      
      operation.completed = true
      operation.progress = 100
      this.emit('operationCompleted', operation)
      
      // Update index
      if (this.config.enableIndexing) {
        await this.indexPath(dirPath)
      }
      
    } catch (error) {
      operation.error = error instanceof Error ? error.message : String(error)
      this.emit('operationFailed', operation)
      throw error
    }
    
    return operationId
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): FileOperation | undefined {
    return this.operations.get(operationId)
  }

  /**
   * Get all operations
   */
  getOperations(): FileOperation[] {
    return Array.from(this.operations.values())
  }

  /**
   * Create backup of file or directory
   */
  async createBackup(targetPath: string): Promise<string> {
    const backupDir = path.join(this.config.root, '.vscode-backups')
    await fs.promises.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseName = path.basename(targetPath)
    const backupPath = path.join(backupDir, `${baseName}-${timestamp}`)
    
    await this.copyPath(targetPath, backupPath, { preserveTimestamps: true })
    
    this.emit('backupCreated', targetPath, backupPath)
    return backupPath
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(): Promise<{
    totalFiles: number
    totalDirectories: number
    totalSize: number
    filesByExtension: Map<string, number>
    largestFiles: FileMetadata[]
    recentlyModified: FileMetadata[]
  }> {
    const stats = {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      filesByExtension: new Map<string, number>(),
      largestFiles: [] as FileMetadata[],
      recentlyModified: [] as FileMetadata[]
    }
    
    const allFiles = Array.from(this.fileIndex.values())
    
    for (const file of allFiles) {
      if (file.isDirectory) {
        stats.totalDirectories++
      } else {
        stats.totalFiles++
        stats.totalSize += file.size
        
        // Count by extension
        const ext = file.extension || 'no-extension'
        stats.filesByExtension.set(ext, (stats.filesByExtension.get(ext) || 0) + 1)
      }
    }
    
    // Get largest files
    stats.largestFiles = allFiles
      .filter(f => !f.isDirectory)
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
    
    // Get recently modified files
    stats.recentlyModified = allFiles
      .filter(f => !f.isDirectory)
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, 10)
    
    return stats
  }

  /**
   * Private methods
   */
  private async initializeWorkspace(): Promise<void> {
    try {
      const stats = await fs.promises.stat(this.config.root)
      if (!stats.isDirectory()) {
        throw new Error(`Workspace root is not a directory: ${this.config.root}`)
      }
    } catch (error) {
      throw new Error(`Cannot access workspace root: ${this.config.root}`)
    }
  }

  private async buildInitialIndex(): Promise<void> {
    this.emit('indexingStarted')
    
    try {
      await this.indexPath(this.config.root)
      this.emit('indexingCompleted', this.fileIndex.size)
    } catch (error) {
      this.emit('indexingError', error)
      throw error
    }
  }

  private async indexPath(targetPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(targetPath)
      const metadata = await this.buildFileMetadata(targetPath, stats)
      
      this.fileIndex.set(targetPath, metadata)
      
      if (stats.isDirectory()) {
        const entries = await fs.promises.readdir(targetPath)
        
        for (const entry of entries) {
          const entryPath = path.join(targetPath, entry)
          
          // Check if path should be excluded
          if (this.shouldExcludePath(entryPath)) {
            continue
          }
          
          await this.indexPath(entryPath)
        }
      }
    } catch (error) {
      // Skip files that can't be accessed
    }
  }

  private async buildFileMetadata(filePath: string, stats: fs.Stats): Promise<FileMetadata> {
    const normalizedPath = path.normalize(filePath)
    const parsedPath = path.parse(normalizedPath)
    
    const metadata: FileMetadata = {
      path: normalizedPath,
      name: parsedPath.base,
      extension: parsedPath.ext.slice(1), // Remove dot
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      isHidden: parsedPath.base.startsWith('.'),
      permissions: {
        readable: true, // Simplified - in real implementation, check actual permissions
        writable: true,
        executable: false
      },
      checksum: ''
    }
    
    // Additional metadata for files
    if (!stats.isDirectory() && stats.size < this.config.maxFileSize) {
      try {
        const content = await fs.promises.readFile(normalizedPath, 'utf8')
        metadata.encoding = 'utf8'
        metadata.lineCount = content.split('\n').length
        metadata.language = this.detectLanguage(metadata.extension)
        metadata.checksum = crypto.createHash('md5').update(content).digest('hex')
      } catch {
        // Binary file or access error
        metadata.checksum = crypto.createHash('md5').update(stats.size.toString()).digest('hex')
      }
    }
    
    return metadata
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'plaintext'
    }
    
    return languageMap[extension.toLowerCase()] || 'unknown'
  }

  private shouldExcludePath(filePath: string): boolean {
    const relativePath = path.relative(this.config.root, filePath)
    
    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true
      }
    }
    
    // Check include patterns (if any)
    if (this.config.includePatterns.length > 0) {
      for (const pattern of this.config.includePatterns) {
        if (this.matchesPattern(relativePath, pattern)) {
          return false
        }
      }
      return true // Exclude if doesn't match any include pattern
    }
    
    return false
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
    
    return new RegExp(`^${regex}$`).test(filePath)
  }

  private async calculateRelevanceScore(
    metadata: FileMetadata,
    query: string,
    options: FileSearchOptions
  ): Promise<number> {
    let score = 0
    
    // Extension filter
    if (options.extensions && !options.extensions.includes(metadata.extension)) {
      return 0
    }
    
    // Hidden file filter
    if (!options.includeHidden && metadata.isHidden) {
      return 0
    }
    
    // Directory filter
    if (!options.includeDirectories && metadata.isDirectory) {
      return 0
    }
    
    // Pattern matching
    if (options.pattern) {
      if (this.matchesPattern(metadata.name, options.pattern)) {
        score += 100
      } else {
        return 0
      }
    }
    
    // Name matching
    if (options.fuzzySearch) {
      score += this.calculateFuzzyScore(metadata.name, query) * 50
    } else {
      if (metadata.name.toLowerCase().includes(query.toLowerCase())) {
        score += 75
      }
    }
    
    // Content search
    if (options.contentSearch && !metadata.isDirectory) {
      const contentScore = await this.searchFileContent(metadata.path, query)
      score += contentScore * 25
    }
    
    return score
  }

  private calculateFuzzyScore(text: string, query: string): number {
    // Simple fuzzy matching algorithm
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()
    
    let score = 0
    let textIndex = 0
    
    for (const char of queryLower) {
      const foundIndex = textLower.indexOf(char, textIndex)
      if (foundIndex === -1) {
        return 0 // Character not found
      }
      
      // Closer matches get higher scores
      const distance = foundIndex - textIndex
      score += Math.max(0, 10 - distance)
      textIndex = foundIndex + 1
    }
    
    return score / query.length
  }

  private async searchFileContent(filePath: string, query: string): Promise<number> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      const matches = content.toLowerCase().split(query.toLowerCase()).length - 1
      return Math.min(matches, 10) // Cap at 10 matches
    } catch {
      return 0
    }
  }

  private async getAllFiles(): Promise<FileMetadata[]> {
    // If index is empty, build it
    if (this.fileIndex.size === 0) {
      await this.buildInitialIndex()
    }
    
    return Array.from(this.fileIndex.values())
  }

  private handleFileSystemEvent(watcher: FileWatcher, eventType: string, filename: string | null): void {
    if (!filename || !watcher.active) return
    
    const fullPath = path.join(watcher.path, filename)
    let eventTypeNormalized: FileSystemEvent['type']
    
    switch (eventType) {
      case 'rename':
        // This could be create, delete, or move
        fs.access(fullPath, (err) => {
          eventTypeNormalized = err ? 'delete' : 'create'
          this.processFileSystemEvent(watcher, eventTypeNormalized, fullPath)
        })
        return
      case 'change':
        eventTypeNormalized = 'modify'
        break
      default:
        return
    }
    
    this.processFileSystemEvent(watcher, eventTypeNormalized, fullPath)
  }

  private async processFileSystemEvent(
    watcher: FileWatcher,
    eventType: FileSystemEvent['type'],
    fullPath: string
  ): Promise<void> {
    if (!watcher.events.includes(eventType)) return
    
    const event: FileSystemEvent = {
      type: eventType,
      path: fullPath,
      timestamp: new Date()
    }
    
    // Update index
    if (this.config.enableIndexing) {
      if (eventType === 'delete') {
        this.fileIndex.delete(fullPath)
      } else {
        try {
          await this.indexPath(fullPath)
          event.metadata = this.fileIndex.get(fullPath)
        } catch {
          // Ignore indexing errors
        }
      }
    }
    
    // Notify watcher
    try {
      watcher.callback(event)
    } catch (error) {
      this.emit('watcherCallbackError', watcher.id, error)
    }
    
    this.emit('fileSystemEvent', event)
  }

  private async performCopyOperation(
    source: string,
    destination: string,
    options: any,
    operation: FileOperation
  ): Promise<void> {
    const stats = await fs.promises.stat(source)
    
    if (stats.isDirectory()) {
      await this.copyDirectory(source, destination, options, operation)
    } else {
      await this.copyFile(source, destination, options, operation)
    }
  }

  private async copyFile(
    source: string,
    destination: string,
    options: any,
    operation: FileOperation
  ): Promise<void> {
    // Check if destination exists
    if (!options.overwrite) {
      try {
        await fs.promises.access(destination)
        throw new Error(`Destination already exists: ${destination}`)
      } catch (error) {
        // File doesn't exist, continue
        if ((error as any).code !== 'ENOENT') {
          throw error
        }
      }
    }
    
    // Ensure destination directory exists
    await fs.promises.mkdir(path.dirname(destination), { recursive: true })
    
    // Copy file
    await fs.promises.copyFile(source, destination)
    
    // Preserve timestamps if requested
    if (options.preserveTimestamps) {
      const stats = await fs.promises.stat(source)
      await fs.promises.utimes(destination, stats.atime, stats.mtime)
    }
  }

  private async copyDirectory(
    source: string,
    destination: string,
    options: any,
    operation: FileOperation
  ): Promise<void> {
    await fs.promises.mkdir(destination, { recursive: true })
    
    const entries = await fs.promises.readdir(source)
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry)
      const destPath = path.join(destination, entry)
      
      await this.performCopyOperation(sourcePath, destPath, options, operation)
    }
  }

  private async setupWorkspaceWatching(): Promise<void> {
    // Watch the entire workspace
    this.watchPath(
      this.config.root,
      ['create', 'modify', 'delete', 'move'],
      (event) => {
        this.emit('workspaceChanged', event)
      },
      true
    )
  }

  private startPeriodicIndexing(): void {
    this.indexingTimer = setInterval(() => {
      this.buildInitialIndex().catch(error => {
        this.emit('indexingError', error)
      })
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private startBackupSystem(): void {
    this.backupTimer = setInterval(() => {
      this.performAutomaticBackup().catch(error => {
        this.emit('backupError', error)
      })
    }, this.backupConfig.interval * 60 * 1000)
  }

  private async performAutomaticBackup(): Promise<void> {
    // Implementation would backup important workspace files
    this.emit('automaticBackupCompleted')
  }

  private generateWatcherId(): string {
    return `watcher-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }
}
