import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import Fuse from 'fuse.js'
import { Database } from 'sqlite3'
import { promisify } from 'util'

export interface IndexedFile {
  id: string
  path: string
  relativePath: string
  content: string
  contentHash: string
  language: string
  size: number
  lastModified: number
  symbols: SymbolIndex[]
  imports: string[]
  exports: string[]
}

export interface SymbolIndex {
  name: string
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'type' | 'enum'
  line: number
  column: number
  endLine: number
  endColumn: number
  signature?: string
  documentation?: string
  scope: string
  accessibility?: 'public' | 'private' | 'protected'
}

export interface SearchResult {
  file: IndexedFile
  matches: Array<{
    type: 'content' | 'symbol' | 'filename'
    line?: number
    column?: number
    snippet: string
    score: number
  }>
}

export interface ProjectStats {
  totalFiles: number
  totalLines: number
  totalSymbols: number
  languages: { [key: string]: number }
  lastIndexed: Date
  indexSize: number
}

/**
 * Real code indexing service for fast project-wide search and context
 * This provides the foundation for intelligent code navigation and AI context
 */
export class CodeIndexingService {
  private db: Database | null = null
  private workspaceRoot: string = ''
  private indexedFiles: Map<string, IndexedFile> = new Map()
  private symbolIndex: Fuse<SymbolIndex> | null = null
  private contentIndex: Fuse<IndexedFile> | null = null
  private isIndexing = false
  private watchedPaths: Set<string> = new Set()

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot
  }

  /**
   * Initialize the indexing service with SQLite database
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      const dbPath = path.join(this.workspaceRoot, '.deepseek', 'index.db')
      await fs.mkdir(path.dirname(dbPath), { recursive: true })

      this.db = new Database(dbPath)
      await this.setupDatabase()
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * Setup database schema
   */
  private async setupDatabase(): Promise<void> {
    if (!this.db) return

    const queries = [
      `CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        relative_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        language TEXT NOT NULL,
        size INTEGER NOT NULL,
        last_modified INTEGER NOT NULL,
        indexed_at INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        line INTEGER NOT NULL,
        column INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        end_column INTEGER NOT NULL,
        signature TEXT,
        documentation TEXT,
        scope TEXT NOT NULL,
        accessibility TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols (name)`,
      `CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols (kind)`,
      `CREATE INDEX IF NOT EXISTS idx_files_language ON files (language)`,
      
      `CREATE TABLE IF NOT EXISTS file_relations (
        id TEXT PRIMARY KEY,
        source_file_id TEXT NOT NULL,
        target_file_path TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        FOREIGN KEY (source_file_id) REFERENCES files (id) ON DELETE CASCADE
      )`
    ]

    for (const query of queries) {
      await new Promise<void>((resolve, reject) => {
        this.db!.run(query, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  /**
   * Index the entire workspace
   */
  async indexWorkspace(
    progressCallback?: (progress: { completed: number; total: number; current: string }) => void
  ): Promise<{ success: boolean; stats: ProjectStats; error?: string }> {
    if (this.isIndexing) {
      return { success: false, error: 'Indexing already in progress', stats: await this.getStats() }
    }

    this.isIndexing = true
    
    try {
      const files = await this.discoverFiles()
      let completed = 0

      for (const filePath of files) {
        try {
          await this.indexFile(filePath)
          completed++
          
          progressCallback?.({
            completed,
            total: files.length,
            current: filePath
          })
        } catch (error) {
          console.error(`Failed to index ${filePath}:`, error)
        }
      }

      await this.buildSearchIndices()
      const stats = await this.getStats()

      return { success: true, stats }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        stats: await this.getStats()
      }
    } finally {
      this.isIndexing = false
    }
  }

  /**
   * Discover all indexable files in the workspace
   */
  private async discoverFiles(): Promise<string[]> {
    const files: string[] = []
    const supportedExtensions = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.dart', '.vue',
      '.svelte', '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml',
      '.yaml', '.yml', '.md', '.sql', '.graphql', '.sh', '.ps1', '.bat'
    ])

    const excludePatterns = [
      'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out',
      '.next', '.nuxt', 'coverage', '__pycache__', '.pytest_cache',
      'vendor', 'target', 'bin', 'obj', '.vscode', '.idea'
    ]

    async function walkDirectory(dirPath: string): Promise<void> {
      const items = await fs.readdir(dirPath, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)

        if (item.isDirectory()) {
          if (!excludePatterns.includes(item.name) && !item.name.startsWith('.')) {
            await walkDirectory(fullPath)
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase()
          if (supportedExtensions.has(ext)) {
            files.push(fullPath)
          }
        }
      }
    }

    await walkDirectory(this.workspaceRoot)
    return files
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<IndexedFile | null> {
    try {
      const stats = await fs.stat(filePath)
      const content = await fs.readFile(filePath, 'utf-8')
      const contentHash = crypto.createHash('md5').update(content).digest('hex')
      const relativePath = path.relative(this.workspaceRoot, filePath)
      const language = this.detectLanguage(filePath)

      // Check if file is already indexed and hasn't changed
      const existingFile = await this.getFileFromDb(filePath)
      if (existingFile && existingFile.contentHash === contentHash) {
        this.indexedFiles.set(filePath, existingFile)
        return existingFile
      }

      // Extract symbols and imports/exports
      const symbols = await this.extractSymbols(content, language)
      const { imports, exports } = await this.extractImportsExports(content, language)

      const indexedFile: IndexedFile = {
        id: crypto.createHash('md5').update(filePath).digest('hex'),
        path: filePath,
        relativePath,
        content,
        contentHash,
        language,
        size: stats.size,
        lastModified: stats.mtimeMs,
        symbols,
        imports,
        exports
      }

      // Store in database
      await this.storeFileInDb(indexedFile)
      this.indexedFiles.set(filePath, indexedFile)

      return indexedFile
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Extract symbols from code content
   */
  private async extractSymbols(content: string, language: string): Promise<SymbolIndex[]> {
    const symbols: SymbolIndex[] = []
    const lines = content.split('\n')

    // Basic regex-based symbol extraction (would be enhanced with proper AST parsing)
    if (language === 'typescript' || language === 'javascript') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Functions
        const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/i)
        if (functionMatch) {
          symbols.push({
            name: functionMatch[1],
            kind: 'function',
            line: i + 1,
            column: line.indexOf(functionMatch[1]),
            endLine: i + 1,
            endColumn: line.indexOf(functionMatch[1]) + functionMatch[1].length,
            scope: 'global'
          })
        }

        // Classes
        const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/i)
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            kind: 'class',
            line: i + 1,
            column: line.indexOf(classMatch[1]),
            endLine: i + 1,
            endColumn: line.indexOf(classMatch[1]) + classMatch[1].length,
            scope: 'global'
          })
        }

        // Interfaces
        const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/i)
        if (interfaceMatch) {
          symbols.push({
            name: interfaceMatch[1],
            kind: 'interface',
            line: i + 1,
            column: line.indexOf(interfaceMatch[1]),
            endLine: i + 1,
            endColumn: line.indexOf(interfaceMatch[1]) + interfaceMatch[1].length,
            scope: 'global'
          })
        }

        // Variables and constants
        const varMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)/i)
        if (varMatch) {
          symbols.push({
            name: varMatch[1],
            kind: line.includes('const') ? 'constant' : 'variable',
            line: i + 1,
            column: line.indexOf(varMatch[1]),
            endLine: i + 1,
            endColumn: line.indexOf(varMatch[1]) + varMatch[1].length,
            scope: 'global'
          })
        }
      }
    }

    return symbols
  }

  /**
   * Extract imports and exports
   */
  private async extractImportsExports(
    content: string, 
    language: string
  ): Promise<{ imports: string[]; exports: string[] }> {
    const imports: string[] = []
    const exports: string[] = []
    const lines = content.split('\n')

    if (language === 'typescript' || language === 'javascript') {
      for (const line of lines) {
        // Import statements
        const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/i)
        if (importMatch) {
          imports.push(importMatch[1])
        }

        // Export statements
        if (line.includes('export')) {
          const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|interface|const|let|var)\s+(\w+)/i)
          if (exportMatch) {
            exports.push(exportMatch[1])
          }
        }
      }
    }

    return { imports, exports }
  }

  /**
   * Build search indices for fast searching
   */
  private async buildSearchIndices(): Promise<void> {
    const allSymbols: SymbolIndex[] = []
    const allFiles: IndexedFile[] = Array.from(this.indexedFiles.values())

    for (const file of allFiles) {
      allSymbols.push(...file.symbols)
    }

    // Symbol search index
    this.symbolIndex = new Fuse(allSymbols, {
      keys: ['name', 'signature'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    })

    // Content search index
    this.contentIndex = new Fuse(allFiles, {
      keys: ['content', 'relativePath'],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true
    })
  }

  /**
   * Search across the codebase
   */
  async search(
    query: string, 
    options: {
      type?: 'all' | 'symbols' | 'content' | 'files'
      language?: string
      maxResults?: number
    } = {}
  ): Promise<SearchResult[]> {
    const { type = 'all', language, maxResults = 50 } = options
    const results: SearchResult[] = []

    if (type === 'symbols' || type === 'all') {
      if (this.symbolIndex) {
        const symbolResults = this.symbolIndex.search(query).slice(0, maxResults)
        
        for (const result of symbolResults) {
          const symbol = result.item
          const file = Array.from(this.indexedFiles.values()).find(f => 
            f.symbols.some(s => s === symbol)
          )
          
          if (file && (!language || file.language === language)) {
            results.push({
              file,
              matches: [{
                type: 'symbol',
                line: symbol.line,
                column: symbol.column,
                snippet: `${symbol.kind} ${symbol.name}`,
                score: result.score || 0
              }]
            })
          }
        }
      }
    }

    if (type === 'content' || type === 'all') {
      if (this.contentIndex) {
        const contentResults = this.contentIndex.search(query).slice(0, maxResults)
        
        for (const result of contentResults) {
          const file = result.item
          
          if (!language || file.language === language) {
            const lines = file.content.split('\n')
            const matchingLines = lines
              .map((line, index) => ({ line, index }))
              .filter(({ line }) => line.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 3)

            if (matchingLines.length > 0) {
              results.push({
                file,
                matches: matchingLines.map(({ line, index }) => ({
                  type: 'content' as const,
                  line: index + 1,
                  snippet: line.trim(),
                  score: result.score || 0
                }))
              })
            }
          }
        }
      }
    }

    return results.slice(0, maxResults)
  }

  /**
   * Get project statistics
   */
  async getStats(): Promise<ProjectStats> {
    const files = Array.from(this.indexedFiles.values())
    const languages: { [key: string]: number } = {}
    let totalLines = 0
    let totalSymbols = 0

    for (const file of files) {
      languages[file.language] = (languages[file.language] || 0) + 1
      totalLines += file.content.split('\n').length
      totalSymbols += file.symbols.length
    }

    return {
      totalFiles: files.length,
      totalLines,
      totalSymbols,
      languages,
      lastIndexed: new Date(),
      indexSize: files.reduce((sum, f) => sum + f.size, 0)
    }
  }

  /**
   * Database operations
   */
  private async getFileFromDb(filePath: string): Promise<IndexedFile | null> {
    if (!this.db) return null

    try {
      const fileRow: any = await new Promise((resolve, reject) => {
        this.db!.get('SELECT * FROM files WHERE path = ?', [filePath], (err, row) => {
          if (err) reject(err)
          else resolve(row)
        })
      })

      if (!fileRow) return null

      const symbolRows: any[] = await new Promise((resolve, reject) => {
        this.db!.all('SELECT * FROM symbols WHERE file_id = ?', [fileRow.id], (err, rows) => {
          if (err) reject(err)
          else resolve(rows || [])
        })
      })

      return {
        id: fileRow.id,
        path: fileRow.path,
        relativePath: fileRow.relative_path,
        content: '', // Content not stored in DB for performance
        contentHash: fileRow.content_hash,
        language: fileRow.language,
        size: fileRow.size,
        lastModified: fileRow.last_modified,
        symbols: symbolRows.map(row => ({
          name: row.name,
          kind: row.kind,
          line: row.line,
          column: row.column,
          endLine: row.end_line,
          endColumn: row.end_column,
          signature: row.signature,
          documentation: row.documentation,
          scope: row.scope,
          accessibility: row.accessibility
        })),
        imports: [],
        exports: []
      }
    } catch (error) {
      console.error('Failed to get file from DB:', error)
      return null
    }
  }

  private async storeFileInDb(file: IndexedFile): Promise<void> {
    if (!this.db) return

    try {
      // Insert/update file
      await new Promise<void>((resolve, reject) => {
        this.db!.run(`
          INSERT OR REPLACE INTO files 
          (id, path, relative_path, content_hash, language, size, last_modified, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          file.id, file.path, file.relativePath, file.contentHash,
          file.language, file.size, file.lastModified, Date.now()
        ], (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      // Delete old symbols
      await new Promise<void>((resolve, reject) => {
        this.db!.run('DELETE FROM symbols WHERE file_id = ?', [file.id], (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      // Insert new symbols
      for (const symbol of file.symbols) {
        const symbolId = crypto.createHash('md5')
          .update(`${file.id}-${symbol.name}-${symbol.line}`)
          .digest('hex')

        await new Promise<void>((resolve, reject) => {
          this.db!.run(`
            INSERT INTO symbols 
            (id, file_id, name, kind, line, column, end_line, end_column, signature, documentation, scope, accessibility)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            symbolId, file.id, symbol.name, symbol.kind, symbol.line, symbol.column,
            symbol.endLine, symbol.endColumn, symbol.signature, symbol.documentation,
            symbol.scope, symbol.accessibility
          ], (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
    } catch (error) {
      console.error('Failed to store file in DB:', error)
    }
  }

  /**
   * Utility methods
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    }
    return languageMap[ext] || 'plaintext'
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
