// Global window interface extension for Electron API
declare global {
  interface Window {
    electronAPI: {
      // File operations
      file: {
        read: (filePath: string) => Promise<any>
        write: (filePath: string, content: string) => Promise<any>
        exists: (filePath: string) => Promise<boolean>
      }

      // File system operations
      fileSystem: {
        readDirectory: (dirPath: string) => Promise<any>
        stat: (path: string) => Promise<any>
        watch: (path: string) => Promise<any>
        unwatch: (path: string) => Promise<any>
        onFileChange: (callback: (data: { path: string; event: string }) => void) => void
      }

      // Dialog operations
      dialog: {
        showSave: (options?: any) => Promise<any>
        showOpenDialog: (options?: any) => Promise<any>
      }

      // App operations
      app: {
        getVersion: () => Promise<string>
        getPlatform: () => Promise<string>
      }

      // Menu event listeners
      menu: {
        onNewFile: (callback: () => void) => void
        onOpenFile: (callback: (data: { filePath: string; content: string }) => void) => void
        onOpenFolder: (callback: (data: { folderPath: string }) => void) => void
        onSave: (callback: () => void) => void
        onSaveAs: (callback: () => void) => void
        removeAllListeners: (channel: string) => void
      }

      // DeepSeek API
      deepseek: {
        chat: (message: string, context?: any) => Promise<any>
        completion: (code: string, position: any) => Promise<any>
      }

      // Git operations
      git: {
        initialize: (workingDirectory: string) => Promise<any>
        status: () => Promise<any>
        branches: () => Promise<any>
        commits: (limit?: number) => Promise<any>
        stageFile: (filePath: string) => Promise<any>
        unstageFile: (filePath: string) => Promise<any>
        commit: (message: string) => Promise<any>
        createBranch: (branchName: string) => Promise<any>
        switchBranch: (branchName: string) => Promise<any>
        pull: () => Promise<any>
        push: () => Promise<any>
        diff: (filePath?: string) => Promise<any>
        isRepository: (directory: string) => Promise<boolean>
      }

      // Code Analysis operations
      analysis: {
        initialize: (workingDirectory: string) => Promise<any>
        analyzeFile: (filePath: string) => Promise<any>
        findSymbol: (symbolName: string) => Promise<any>
        findReferences: (symbolName: string, filePath: string) => Promise<any>
        getOverview: () => Promise<any>
      }

      // Terminal operations
      terminal: {
        create: () => Promise<any>
        write: (id: string, data: string) => Promise<any>
        resize: (id: string, cols: number, rows: number) => Promise<any>
        kill: (id: string) => Promise<any>
        onData: (callback: (data: { id: string; data: string }) => void) => void
      }

      // Autonomous AI operations
      autonomous: {
        chat: (message: string, context?: any) => Promise<{ success: boolean; content?: string; projectId?: string; error?: string }>
        processAIRequest: (request: any) => Promise<{ success: boolean; result?: any; error?: string }>
        launchProject: (request: any) => Promise<{ success: boolean; error?: string; projectId?: string }>
        getProjectStatus: (projectId: string) => Promise<any>
        getAllProjects: () => Promise<{ success: boolean; projects: any[]; error?: string }>
        
        // Enhanced detailed status methods
        getDetailedProjects: () => Promise<{ success: boolean; projects: any[]; error?: string }>
        getDetailedProjectStatus: (projectId: string) => Promise<{ success: boolean; project: any; error?: string }>
        getProjectActivityStream: (projectId: string, limit?: number) => Promise<{ success: boolean; activities: any[]; error?: string }>
        
        pauseProject: (projectId: string) => Promise<{ success: boolean; error?: string }>
        resumeProject: (projectId: string) => Promise<{ success: boolean; error?: string }>
        stopProject: (projectId: string) => Promise<{ success: boolean; error?: string }>
        getSystemMetrics: () => Promise<any>
        getSystemHealth: () => Promise<{ success: boolean; health: any; error?: string }>
        emergencyStop: () => Promise<{ success: boolean; error?: string }>
        resumeFromEmergency: () => Promise<any>
        subscribeToProgress: (projectId?: string) => Promise<any>
        
        // Event listeners for autonomous project updates
        onProjectStatusUpdate: (callback: (data: { projectId: string; status: any }) => void) => void
        onSystemMetricsUpdate: (callback: (data: { metrics: any }) => void) => void
        onProgressUpdate: (callback: (data: any) => void) => void
        onStatusChanged: (callback: (data: any) => void) => void
        onProjectLaunched: (callback: (data: any) => void) => void
        onProjectCompleted: (callback: (data: any) => void) => void
        onProjectFailed: (callback: (data: any) => void) => void
        onProjectUpdate: (callback: (data: any) => void) => void
        onActivityUpdate: (callback: (data: any) => void) => void
        onAgentThought: (callback: (data: any) => void) => void
      }

      // General IPC utilities
      ipc: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, callback: (...args: any[]) => void) => void
        removeAllListeners: (channel: string) => void
      }
    } | undefined
  }
}

export {}
