import { contextBridge, ipcRenderer } from 'electron'

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File operations
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath)
  },

  // File system operations
  fileSystem: {
    readDirectory: (dirPath: string) => ipcRenderer.invoke('filesystem:read-directory', dirPath),
    stat: (path: string) => ipcRenderer.invoke('filesystem:stat', path),
    watch: (path: string) => ipcRenderer.invoke('filesystem:watch', path),
    unwatch: (path: string) => ipcRenderer.invoke('filesystem:unwatch', path),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('filesystem:create-directory', dirPath),
    delete: (path: string) => ipcRenderer.invoke('filesystem:delete', path),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('filesystem:rename', oldPath, newPath),
    searchInFiles: (dirPath: string, query: string) => ipcRenderer.invoke('filesystem:search-in-files', dirPath, query),
    searchFiles: (dirPath: string, query: string) => ipcRenderer.invoke('filesystem:search-files', dirPath, query),
    onFileChange: (callback: (data: { path: string; event: string }) => void) =>
      ipcRenderer.on('filesystem:file-changed', (_, data) => callback(data))
  },

  // Dialog operations
  dialog: {
    showSave: (options?: any) => ipcRenderer.invoke('dialog:save', options),
    showOpenDialog: (options?: any) => ipcRenderer.invoke('dialog:open', options)
  },

  // App operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform')
  },

  // Menu event listeners
  menu: {
    onNewFile: (callback: () => void) => ipcRenderer.on('menu:new-file', callback),
    onOpenFile: (callback: (data: { filePath: string; content: string }) => void) => 
      ipcRenderer.on('menu:open-file', (_, data) => callback(data)),
    onOpenFolder: (callback: (data: { folderPath: string }) => void) => 
      ipcRenderer.on('menu:open-folder', (_, data) => callback(data)),
    onSave: (callback: () => void) => ipcRenderer.on('menu:save', callback),
    onSaveAs: (callback: () => void) => ipcRenderer.on('menu:save-as', callback),
    
    // Remove listeners
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  },

  // DeepSeek API (to be implemented)
  deepseek: {
    chat: (message: string, context?: any) => ipcRenderer.invoke('deepseek:chat', message, context),
    completion: (code: string, position: any) => ipcRenderer.invoke('deepseek:completion', code, position)
  },

  // Git operations
  git: {
    initialize: (workingDirectory: string) => ipcRenderer.invoke('git:initialize', workingDirectory),
    status: () => ipcRenderer.invoke('git:status'),
    branches: () => ipcRenderer.invoke('git:branches'),
    commits: (limit?: number) => ipcRenderer.invoke('git:commits', limit),
    stageFile: (filePath: string) => ipcRenderer.invoke('git:stage-file', filePath),
    unstageFile: (filePath: string) => ipcRenderer.invoke('git:unstage-file', filePath),
    commit: (message: string) => ipcRenderer.invoke('git:commit', message),
    createBranch: (branchName: string) => ipcRenderer.invoke('git:create-branch', branchName),
    switchBranch: (branchName: string) => ipcRenderer.invoke('git:switch-branch', branchName),
    pull: () => ipcRenderer.invoke('git:pull'),
    push: () => ipcRenderer.invoke('git:push'),
    diff: (filePath?: string) => ipcRenderer.invoke('git:diff', filePath),
    isRepository: (directory: string) => ipcRenderer.invoke('git:is-repository', directory)
  },

  // Code Analysis operations
  analysis: {
    initialize: (workingDirectory: string) => ipcRenderer.invoke('analysis:initialize', workingDirectory),
    analyzeFile: (filePath: string) => ipcRenderer.invoke('analysis:analyze-file', filePath),
    findSymbol: (symbolName: string) => ipcRenderer.invoke('analysis:find-symbol', symbolName),
    findReferences: (symbolName: string, filePath: string) => ipcRenderer.invoke('analysis:find-references', symbolName, filePath),
    getOverview: () => ipcRenderer.invoke('analysis:get-overview')
  },

  // Terminal operations (to be implemented)
  terminal: {
    create: () => ipcRenderer.invoke('terminal:create'),
    write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke('terminal:kill', id),
    onData: (callback: (data: { id: string; data: string }) => void) => 
      ipcRenderer.on('terminal:data', (_, data) => callback(data))
  },

  // Autonomous AI operations
  autonomous: {
    chat: (message: string, context?: any) => ipcRenderer.invoke('autonomous:chat', message, context),
    processAIRequest: (request: any) => ipcRenderer.invoke('autonomous:process-ai-request', request),
    launchProject: (request: any) => ipcRenderer.invoke('autonomous:launch-project', request),
    getProjectStatus: (projectId: string) => ipcRenderer.invoke('autonomous:get-project-status', projectId),
    getAllProjects: () => ipcRenderer.invoke('autonomous:get-all-projects'),
    
    // Enhanced detailed status methods
    getDetailedProjects: () => ipcRenderer.invoke('autonomous:get-detailed-projects'),
    getDetailedProjectStatus: (projectId: string) => ipcRenderer.invoke('autonomous:get-detailed-project-status', projectId),
    getProjectActivityStream: (projectId: string, limit?: number) => ipcRenderer.invoke('autonomous:get-project-activity-stream', projectId, limit),
    
    pauseProject: (projectId: string) => ipcRenderer.invoke('autonomous:pause-project', projectId),
    resumeProject: (projectId: string) => ipcRenderer.invoke('autonomous:resume-project', projectId),
    stopProject: (projectId: string) => ipcRenderer.invoke('autonomous:stop-project', projectId),
    getSystemMetrics: () => ipcRenderer.invoke('autonomous:get-system-metrics'),
    getSystemHealth: () => ipcRenderer.invoke('autonomous:get-system-health'),
    emergencyStop: () => ipcRenderer.invoke('autonomous:emergency-stop'),
    resumeFromEmergency: () => ipcRenderer.invoke('autonomous:resume-from-emergency'),
    subscribeToProgress: (projectId?: string) => ipcRenderer.invoke('autonomous:subscribe-to-progress', projectId),
    
    // Event listeners for autonomous project updates
    onProjectStatusUpdate: (callback: (data: { projectId: string; status: any }) => void) =>
      ipcRenderer.on('autonomous:project-status-update', (_, data) => callback(data)),
    onSystemMetricsUpdate: (callback: (data: { metrics: any }) => void) =>
      ipcRenderer.on('autonomous:system-metrics-update', (_, data) => callback(data)),
    onProgressUpdate: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:progress-update', (_, data) => callback(data)),
    onStatusChanged: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:status-changed', (_, data) => callback(data)),
    onProjectLaunched: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:project-launched', (_, data) => callback(data)),
    onProjectCompleted: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:project-completed', (_, data) => callback(data)),
    onProjectFailed: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:project-failed', (_, data) => callback(data)),
    onProjectUpdate: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:project-update', (_, data) => callback(data)),
    onActivityUpdate: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:activity-update', (_, data) => callback(data)),
    onAgentThought: (callback: (data: any) => void) =>
      ipcRenderer.on('autonomous:agent-thought', (_, data) => callback(data))
  },

  // General IPC utilities
  ipc: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) => 
      ipcRenderer.on(channel, (_, ...args) => callback(...args)),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Add debugging and ensure DOM is ready
console.log('🔧 Preload script loaded successfully')
console.log('🔧 electronAPI exposed to window:', typeof electronAPI)

// Ensure the API is available when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 DOM loaded, electronAPI available')
})
