import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { existsSync, watch } from 'fs'
import * as chokidar from 'chokidar'
import { v4 as uuidv4 } from 'uuid'
import * as dotenv from 'dotenv'
import { DeepSeekService } from './services/deepseek'
import { GitService } from './services/git'
import { CodeAnalysisService } from './services/code-analysis'
import { AIModelManager } from './services/ai-model-manager'
import { AdvancedCacheService } from './services/advanced-cache'
import { AutonomousIntegrationService, AutonomousIntegrationConfig } from './services/autonomous-integration-service'

// Disable GPU acceleration to prevent crashes
app.disableHardwareAcceleration()

// Load environment variables from .env file
dotenv.config()

// Log environment variable loading status
console.log('[info] Loading environment variables...')
console.log('[info] DeepSeek API Key:', process.env.DEEPSEEK_API_KEY ? 'Loaded ✓' : 'Missing ✗')
console.log('[info] Environment variables loaded from .env file')

// Utility function for consistent error handling
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Terminal interface for future node-pty integration
interface TerminalSession {
  id: string
  title: string
  // pty: any // Will be added when node-pty is working
  cwd: string
  output: string
}

class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private isDev = process.env.NODE_ENV === 'development'

  async createMainWindow(): Promise<BrowserWindow> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: this.isDev ? undefined : join(__dirname, '../../resources/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/preload.js')
      },
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 15, y: 13 }
    })

    // Load the app
    if (this.isDev) {
      await this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      
      if (this.isDev) {
        this.mainWindow?.webContents.openDevTools()
      }
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    return this.mainWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New File',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.handleNewFile()
          },
          {
            label: 'Open File',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleOpenFile()
          },
          {
            label: 'Open Folder',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.handleOpenFolder()
          },
          { type: 'separator' },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.handleSave()
          },
          {
            label: 'Save As',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.handleSaveAs()
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private async handleNewFile(): Promise<void> {
    this.mainWindow?.webContents.send('menu:new-file')
  }

  private async handleOpenFile(): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Text Files', extensions: ['txt', 'md', 'json'] },
        { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      try {
        const content = await readFile(filePath, 'utf-8')
        this.mainWindow.webContents.send('menu:open-file', { filePath, content })
      } catch (error) {
        console.error('Error reading file:', error)
      }
    }
  }

  private async handleOpenFolder(): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0]
      this.mainWindow.webContents.send('menu:open-folder', { folderPath })
    }
  }

  private handleSave(): void {
    this.mainWindow?.webContents.send('menu:save')
  }

  private handleSaveAs(): void {
    this.mainWindow?.webContents.send('menu:save-as')
  }
}

class App {
  private windowManager = new WindowManager()
  private deepSeekService = new DeepSeekService()
  private gitService = new GitService()
  private codeAnalysisService = new CodeAnalysisService()
  
  // Autonomous AI Services
  private aiModelManager = new AIModelManager()
  private cacheService = new AdvancedCacheService()
  private autonomousIntegrationService: AutonomousIntegrationService

  constructor() {
    // Initialize autonomous integration with configuration
    const autonomousConfig: AutonomousIntegrationConfig = {
      maxConcurrentProjects: 3,
      defaultSafetyLevel: 'normal',
      enableLearningPersistence: true,
      enableCrossProjectLearning: true,
      apiKeys: {
        deepseek: process.env.DEEPSEEK_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY
      },
      resourceLimits: {
        maxMemoryUsage: 2048, // 2GB
        maxCpuUsage: 80, // 80%
        maxApiCallsPerMinute: 100
      }
    }
    
    this.autonomousIntegrationService = new AutonomousIntegrationService(
      this.aiModelManager,
      this.cacheService,
      autonomousConfig
    )
  }

  async initialize(): Promise<void> {
    await app.whenReady()
    
    // Create main window
    await this.windowManager.createMainWindow()
    
    // Setup menu
    this.windowManager.setupMenu()
    
    // Setup IPC handlers
    this.setupIPCHandlers()

    // Handle app activation (macOS)
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.windowManager.createMainWindow()
      }
    })

    // Quit when all windows are closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  }

  private setupIPCHandlers(): void {
    // File operations
    ipcMain.handle('file:read', async (_, filePath: string) => {
      try {
        const content = await readFile(filePath, 'utf-8')
        return { success: true, content }
      } catch (error) {
        return { success: false, error: error instanceof Error ? getErrorMessage(error) : String(error) }
      }
    })

    ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
      try {
        await writeFile(filePath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('file:exists', async (_, filePath: string) => {
      return existsSync(filePath)
    })

    // File system operations
    ipcMain.handle('filesystem:read-directory', async (_, dirPath: string) => {
      try {
        const entries = await readdir(dirPath, { withFileTypes: true })
        const result = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: join(dirPath, entry.name)
        }))
        return { success: true, entries: result }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('filesystem:stat', async (_, path: string) => {
      try {
        const stats = await stat(path)
        return {
          success: true,
          stats: {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtime: stats.mtime,
            ctime: stats.ctime
          }
        }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // File watching
    const watchers = new Map<string, chokidar.FSWatcher>()

    ipcMain.handle('filesystem:watch', async (_, path: string) => {
      try {
        if (watchers.has(path)) {
          return { success: true, message: 'Already watching' }
        }

        const watcher = chokidar.watch(path, {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true,
          ignoreInitial: true
        })

        watcher.on('all', (event, filePath) => {
          BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('filesystem:file-changed', { path: filePath, event })
          })
        })

        watchers.set(path, watcher)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('filesystem:unwatch', async (_, path: string) => {
      try {
        const watcher = watchers.get(path)
        if (watcher) {
          await watcher.close()
          watchers.delete(path)
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Additional filesystem operations
    ipcMain.handle('filesystem:create-directory', async (_, dirPath: string) => {
      try {
        const { mkdir } = await import('fs/promises')
        await mkdir(dirPath, { recursive: true })
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('filesystem:delete', async (_, path: string) => {
      try {
        const { rm } = await import('fs/promises')
        await rm(path, { recursive: true, force: true })
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('filesystem:rename', async (_, oldPath: string, newPath: string) => {
      try {
        const { rename } = await import('fs/promises')
        await rename(oldPath, newPath)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Search in files
    ipcMain.handle('filesystem:search-in-files', async (_, dirPath: string, query: string) => {
      try {
        const { readdir, readFile, stat } = await import('fs/promises')
        const path = await import('path')
        
        const matches: any[] = []
        const queryLower = query.toLowerCase()
        
        const searchInDirectory = async (currentDir: string) => {
          try {
            const entries = await readdir(currentDir)
            
            for (const entry of entries) {
              const fullPath = path.join(currentDir, entry)
              const stats = await stat(fullPath)
              
              if (stats.isDirectory()) {
                // Skip node_modules, .git, etc.
                if (entry !== 'node_modules' && !entry.startsWith('.')) {
                  await searchInDirectory(fullPath)
                }
              } else if (stats.isFile()) {
                // Only search text files
                const ext = path.extname(entry).toLowerCase()
                const textExts = ['.txt', '.md', '.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.xml', '.yml', '.yaml', '.py', '.cpp', '.h', '.c', '.java', '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.swift']
                
                if (textExts.includes(ext) || !ext) {
                  try {
                    const content = await readFile(fullPath, 'utf-8')
                    const lines = content.split('\n')
                    
                    lines.forEach((line, index) => {
                      if (line.toLowerCase().includes(queryLower)) {
                        matches.push({
                          file: fullPath,
                          line: line,
                          lineNumber: index + 1,
                          column: line.toLowerCase().indexOf(queryLower),
                          context: lines.slice(Math.max(0, index - 1), index + 2).join('\n')
                        })
                      }
                    })
                  } catch (err) {
                    // Skip files that can't be read
                  }
                }
              }
            }
          } catch (err) {
            // Skip directories that can't be read
          }
        }
        
        await searchInDirectory(dirPath)
        return { success: true, matches: matches.slice(0, 100) } // Limit results
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Search files by name
    ipcMain.handle('filesystem:search-files', async (_, dirPath: string, query: string) => {
      try {
        const { readdir, stat } = await import('fs/promises')
        const path = await import('path')
        
        const files: any[] = []
        const queryLower = query.toLowerCase()
        
        const searchInDirectory = async (currentDir: string) => {
          try {
            const entries = await readdir(currentDir)
            
            for (const entry of entries) {
              const fullPath = path.join(currentDir, entry)
              const stats = await stat(fullPath)
              
              if (stats.isDirectory()) {
                // Skip node_modules, .git, etc.
                if (entry !== 'node_modules' && !entry.startsWith('.')) {
                  await searchInDirectory(fullPath)
                }
              } else if (stats.isFile()) {
                if (entry.toLowerCase().includes(queryLower)) {
                  files.push({
                    name: entry,
                    path: fullPath,
                    size: stats.size,
                    extension: path.extname(entry)
                  })
                }
              }
            }
          } catch (err) {
            // Skip directories that can't be read
          }
        }
        
        await searchInDirectory(dirPath)
        return { success: true, files: files.slice(0, 100) } // Limit results
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Dialog operations
    ipcMain.handle('dialog:save', async (_, options = {}) => {
      const mainWindow = BrowserWindow.getFocusedWindow()
      if (!mainWindow) return { canceled: true }

      return await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md'] },
          { name: 'JavaScript', extensions: ['js', 'jsx'] },
          { name: 'TypeScript', extensions: ['ts', 'tsx'] },
          { name: 'Python', extensions: ['py'] }
        ],
        ...options
      })
    })

    ipcMain.handle('dialog:open', async (_, options = {}) => {
      const mainWindow = BrowserWindow.getFocusedWindow()
      if (!mainWindow) return { canceled: true }

      return await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        ...options
      })
    })

    // App info
    ipcMain.handle('app:get-version', () => app.getVersion())
    ipcMain.handle('app:get-platform', () => process.platform)

    // Terminal operations - Basic implementation without pty for now
    const terminals = new Map<string, TerminalSession>()

    ipcMain.handle('terminal:create', async () => {
      try {
        const terminalId = uuidv4()
        
        const session: TerminalSession = {
          id: terminalId,
          title: 'Terminal',
          cwd: process.cwd(),
          output: ''
        }

        terminals.set(terminalId, session)
        
        return { success: true, id: terminalId }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('terminal:write', async (_, id: string, data: string) => {
      try {
        const session = terminals.get(id)
        if (session) {
          // Write data to the terminal session
          console.log(`Terminal ${id}: Writing data: ${data}`)
          // Store the written data for retrieval
          session.output += data
          // Notify renderer about data
          const mainWindow = this.windowManager.getMainWindow()
          mainWindow?.webContents.send('terminal:data', { id, data })
          return { success: true }
        }
        return { success: false, error: 'Terminal not found' }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('terminal:resize', async (_, id: string, cols: number, rows: number) => {
      try {
        const session = terminals.get(id)
        if (session) {
          // Store terminal dimensions for future use
          console.log(`Terminal ${id}: Resizing to ${cols}x${rows}`)
          // In a full implementation, this would resize the pty
          return { success: true }
        }
        return { success: false, error: 'Terminal not found' }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('terminal:kill', async (_, id: string) => {
      try {
        const session = terminals.get(id)
        if (session) {
          terminals.delete(id)
          return { success: true }
        }
        return { success: false, error: 'Terminal not found' }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // DeepSeek API operations
    ipcMain.handle('deepseek:chat', async (_, message: string, context?: any) => {
      return await this.deepSeekService.chat(message, context)
    })

    ipcMain.handle('deepseek:completion', async (_, code: string, position: any) => {
      return await this.deepSeekService.completion(code, position)
    })

    // DeepSeek configuration
    ipcMain.handle('deepseek:set-api-key', async (_, apiKey: string) => {
      try {
        this.deepSeekService.setApiKey(apiKey)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('deepseek:get-models', async () => {
      try {
        return { success: true, models: this.deepSeekService.getAvailableModels() }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('deepseek:set-model', async (_, model: string) => {
      try {
        this.deepSeekService.setModel(model)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Git operations
    ipcMain.handle('git:initialize', async (_, workingDirectory: string) => {
      return await this.gitService.initializeRepository(workingDirectory)
    })

    ipcMain.handle('git:status', async () => {
      return await this.gitService.getStatus()
    })

    ipcMain.handle('git:branches', async () => {
      return await this.gitService.getBranches()
    })

    ipcMain.handle('git:commits', async (_, limit?: number) => {
      return await this.gitService.getCommitHistory(limit)
    })

    ipcMain.handle('git:stage-file', async (_, filePath: string) => {
      return await this.gitService.stageFile(filePath)
    })

    ipcMain.handle('git:unstage-file', async (_, filePath: string) => {
      return await this.gitService.unstageFile(filePath)
    })

    ipcMain.handle('git:commit', async (_, message: string) => {
      return await this.gitService.commit(message)
    })

    ipcMain.handle('git:create-branch', async (_, branchName: string) => {
      return await this.gitService.createBranch(branchName)
    })

    ipcMain.handle('git:switch-branch', async (_, branchName: string) => {
      return await this.gitService.switchBranch(branchName)
    })

    ipcMain.handle('git:pull', async () => {
      return await this.gitService.pull()
    })

    ipcMain.handle('git:push', async () => {
      return await this.gitService.push()
    })

    ipcMain.handle('git:diff', async (_, filePath?: string) => {
      return await this.gitService.getDiff(filePath)
    })

    ipcMain.handle('git:is-repository', async (_, directory: string) => {
      return await this.gitService.isRepository(directory)
    })

    // Code Analysis operations
    ipcMain.handle('analysis:initialize', async (_, workingDirectory: string) => {
      return await this.codeAnalysisService.initialize(workingDirectory)
    })

    ipcMain.handle('analysis:analyze-file', async (_, filePath: string) => {
      return await this.codeAnalysisService.analyzeFile(filePath)
    })

    ipcMain.handle('analysis:find-symbol', async (_, symbolName: string) => {
      return await this.codeAnalysisService.findSymbol(symbolName)
    })

    ipcMain.handle('analysis:find-references', async (_, symbolName: string, filePath: string) => {
      return await this.codeAnalysisService.findReferences(symbolName, filePath)
    })

    ipcMain.handle('analysis:get-overview', async () => {
      return await this.codeAnalysisService.getProjectOverview()
    })

    // Autonomous AI Integration Handlers
    ipcMain.handle('autonomous:chat', async (_, message: string, context?: any) => {
      try {
        // Create an autonomous project request for the chat message
        const autonomousRequest: any = {
          id: `chat-${Date.now()}`,
          vision: message,
          priority: 'normal' as const,
          constraints: {
            timeLimit: 1, // 1 hour limit for chat requests
            resourceLimit: 50, // Use up to 50% of resources
            qualityRequirement: 'production' as const
          },
          userPreferences: {
            communicationLevel: 'detailed' as const,
            interventionLevel: 'minimal' as const
          }
        }
        
        const result = await this.autonomousIntegrationService.launchAutonomousProject(autonomousRequest)
        
        // Return in the format expected by the chat interface
        return {
          success: true,
          content: `🤖 Autonomous AI is executing your request: "${message}"\n\nProject ID: ${result}\n\nThe system will autonomously handle file creation, command execution, and any other required actions.`,
          projectId: result
        }
      } catch (error) {
        return { 
          success: false, 
          error: `❌ Autonomous action failed: ${getErrorMessage(error)}`
        }
      }
    })

    ipcMain.handle('autonomous:process-ai-request', async (_, request: any) => {
      try {
        const result = await this.autonomousIntegrationService.launchAutonomousProject(request)
        return {
          success: true,
          content: `✅ Autonomous request processed: ${result}`,
          projectId: result
        }
      } catch (error) {
        return { 
          success: false, 
          error: `❌ Autonomous request failed: ${getErrorMessage(error)}`
        }
      }
    })

    ipcMain.handle('autonomous:launch-project', async (_, request: any) => {
      try {
        return await this.autonomousIntegrationService.launchAutonomousProject(request)
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-project-status', async (_, projectId: string) => {
      try {
        return { success: true, status: this.autonomousIntegrationService.getProjectStatus(projectId) }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-all-projects', async () => {
      try {
        return { success: true, projects: this.autonomousIntegrationService.getActiveProjectsStatus() }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:pause-project', async (_, projectId: string) => {
      try {
        await this.autonomousIntegrationService.pauseProject(projectId)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:resume-project', async (_, projectId: string) => {
      try {
        await this.autonomousIntegrationService.resumeProject(projectId)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:stop-project', async (_, projectId: string) => {
      try {
        await this.autonomousIntegrationService.stopProject(projectId)
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-system-metrics', async () => {
      try {
        return { success: true, metrics: this.autonomousIntegrationService.getSystemMetrics() }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-system-health', async () => {
      try {
        return { success: true, health: this.autonomousIntegrationService.getSystemHealth() }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Enhanced detailed project status APIs
    ipcMain.handle('autonomous:get-detailed-projects', async () => {
      try {
        const projects = await this.autonomousIntegrationService.getAllDetailedProjectsStatus()
        return { success: true, projects }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-detailed-project-status', async (_, projectId: string) => {
      try {
        const project = await this.autonomousIntegrationService.getDetailedProjectStatus(projectId)
        return { success: true, project }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:get-project-activity-stream', async (_, projectId: string, limit?: number) => {
      try {
        const activities = await this.autonomousIntegrationService.getProjectActivityStream(projectId, limit)
        return { success: true, activities }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:emergency-stop', async () => {
      try {
        this.autonomousIntegrationService.emergencyStopAll()
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    ipcMain.handle('autonomous:resume-from-emergency', async () => {
      try {
        this.autonomousIntegrationService.resumeFromEmergencyStop()
        return { success: true }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Real-time progress tracking handlers
    ipcMain.handle('autonomous:subscribe-to-progress', async (_, projectId?: string) => {
      try {
        // Return current status for all projects or specific project
        if (projectId) {
          const status = this.autonomousIntegrationService.getProjectStatus(projectId)
          return { success: true, status }
        } else {
          const projects = this.autonomousIntegrationService.getActiveProjectsStatus()
          return { success: true, projects }
        }
      } catch (error) {
        return { success: false, error: getErrorMessage(error) }
      }
    })

    // Set up real-time progress broadcasting
    this.setupProgressBroadcasting()
  }

  private setupProgressBroadcasting(): void {
    // Forward progress updates to all renderer processes
    this.autonomousIntegrationService.on('project_progress_update', (data) => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autonomous:progress-update', data)
      }
    })

    this.autonomousIntegrationService.on('project_status_changed', (data) => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autonomous:status-changed', data)
      }
    })

    this.autonomousIntegrationService.on('project_launched', (request, sessionId) => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autonomous:project-launched', { request, sessionId })
      }
    })

    this.autonomousIntegrationService.on('project_completed', (sessionId, result) => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autonomous:project-completed', { sessionId, result })
      }
    })

    this.autonomousIntegrationService.on('project_failed', (sessionId, error) => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('autonomous:project-failed', { sessionId, error })
      }
    })
  }
}

// Initialize the app
const appInstance = new App()
appInstance.initialize().catch(console.error)

// Handle app security
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.log('Blocked new window: ', url)
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (url !== contents.getURL()) {
      event.preventDefault()
      console.log('Blocked navigation to: ', url)
    }
  })
})

