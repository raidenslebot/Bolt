/**
 * Terminal Manager Service - Advanced Terminal Operations for Bolt.diy
 * Handles all terminal, shell, and system command operations with intelligent monitoring
 */

import { EventEmitter } from 'events';
import { UniversalToolExecutor } from './universal-tool-executor';

export interface TerminalSession {
  id: string;
  pid?: number;
  isActive: boolean;
  isBackground: boolean;
  command: string;
  workingDirectory: string;
  output: string[];
  errorOutput: string[];
  exitCode?: number;
  startTime: Date;
  endTime?: Date;
  environment: Record<string, string>;
}

export interface CommandExecution {
  sessionId: string;
  command: string;
  output: string;
  exitCode: number;
  duration: number;
  workingDirectory: string;
  timestamp: Date;
}

export interface ProcessMonitor {
  pid: number;
  command: string;
  memoryUsage: number;
  cpuUsage: number;
  startTime: Date;
  status: 'running' | 'completed' | 'error' | 'killed';
}

export class TerminalManagerService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private activeProcesses: Map<number, ProcessMonitor> = new Map();
  private commandHistory: CommandExecution[] = [];
  private toolExecutor: UniversalToolExecutor;
  private sessionCounter = 0;

  constructor(toolExecutor: UniversalToolExecutor) {
    super();
    this.toolExecutor = toolExecutor;
    this.setupSystemMonitoring();
  }

  /**
   * Create a new terminal session
   */
  async createSession(workingDirectory?: string, environment?: Record<string, string>): Promise<string> {
    const sessionId = `terminal_${++this.sessionCounter}_${Date.now()}`;
    const session: TerminalSession = {
      id: sessionId,
      isActive: true,
      isBackground: false,
      command: '',
      workingDirectory: workingDirectory || process.cwd(),
      output: [],
      errorOutput: [],
      startTime: new Date(),
      environment: { ...process.env, ...environment }
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);
    
    return sessionId;
  }

  /**
   * Execute command in terminal session
   */
  async executeCommand(
    sessionId: string, 
    command: string, 
    options: {
      isBackground?: boolean;
      timeout?: number;
      captureOutput?: boolean;
      environment?: Record<string, string>;
    } = {}
  ): Promise<CommandExecution> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error(`Terminal session ${sessionId} not found or inactive`);
    }

    const startTime = Date.now();
    session.command = command;
    session.isBackground = options.isBackground || false;

    this.emit('command:started', { sessionId, command });

    try {
      // Execute command through Universal Tool Executor
      const result = await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command,
          explanation: `Executing: ${command}`,
          isBackground: options.isBackground || false
        }
      });

      const execution: CommandExecution = {
        sessionId,
        command,
        output: result.output || '',
        exitCode: result.exitCode || 0,
        duration: Date.now() - startTime,
        workingDirectory: session.workingDirectory,
        timestamp: new Date()
      };

      // Update session
      session.output.push(execution.output);
      if (result.exitCode !== 0) {
        session.errorOutput.push(result.error || 'Command failed');
      }

      // Store in command history
      this.commandHistory.push(execution);
      if (this.commandHistory.length > 1000) {
        this.commandHistory = this.commandHistory.slice(-1000); // Keep last 1000 commands
      }

      // Track process if background
      if (options.isBackground && result.pid) {
        this.trackBackgroundProcess(result.pid, command);
      }

      this.emit('command:completed', execution);
      return execution;

    } catch (error) {
      const execution: CommandExecution = {
        sessionId,
        command,
        output: '',
        exitCode: 1,
        duration: Date.now() - startTime,
        workingDirectory: session.workingDirectory,
        timestamp: new Date()
      };

      session.errorOutput.push(error.message);
      this.commandHistory.push(execution);

      this.emit('command:error', { sessionId, command, error });
      throw error;
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeCommandSequence(
    sessionId: string, 
    commands: string[], 
    options: {
      stopOnError?: boolean;
      environment?: Record<string, string>;
    } = {}
  ): Promise<CommandExecution[]> {
    const results: CommandExecution[] = [];
    
    for (const command of commands) {
      try {
        const result = await this.executeCommand(sessionId, command, {
          environment: options.environment
        });
        results.push(result);
        
        // Stop on error if requested
        if (options.stopOnError && result.exitCode !== 0) {
          break;
        }
        
      } catch (error) {
        if (options.stopOnError) {
          throw error;
        }
        // Continue with next command
      }
    }
    
    return results;
  }

  /**
   * Execute command with intelligent path resolution
   */
  async smartExecute(
    sessionId: string,
    command: string,
    context?: {
      projectType?: string;
      packageManager?: 'npm' | 'yarn' | 'pnpm';
      language?: string;
    }
  ): Promise<CommandExecution> {
    // Enhance command based on context
    const enhancedCommand = this.enhanceCommand(command, context);
    
    return await this.executeCommand(sessionId, enhancedCommand);
  }

  /**
   * Get terminal output in real-time
   */
  async getSessionOutput(sessionId: string, fromLine?: number): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    if (session.isBackground && session.pid) {
      // Get live output for background processes
      try {
        const result = await this.toolExecutor.executeTool({
          toolName: 'get_terminal_output',
          parameters: { id: sessionId }
        });
        
        if (result.output) {
          session.output.push(result.output);
        }
      } catch (error) {
        // Handle error getting output
      }
    }

    return fromLine ? session.output.slice(fromLine) : session.output;
  }

  /**
   * Kill a background process
   */
  async killProcess(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    if (session.pid && this.activeProcesses.has(session.pid)) {
      try {
        // Kill process
        await this.executeCommand(sessionId, `kill ${session.pid}`);
        
        // Update process monitor
        const monitor = this.activeProcesses.get(session.pid);
        if (monitor) {
          monitor.status = 'killed';
        }
        
        session.isActive = false;
        session.endTime = new Date();
        
        this.emit('process:killed', { sessionId, pid: session.pid });
        
      } catch (error) {
        this.emit('process:kill-error', { sessionId, error });
        throw error;
      }
    }
  }

  /**
   * Get command history with filtering
   */
  getCommandHistory(filter?: {
    sessionId?: string;
    command?: string;
    exitCode?: number;
    since?: Date;
  }): CommandExecution[] {
    let history = this.commandHistory;
    
    if (filter) {
      history = history.filter(execution => {
        if (filter.sessionId && execution.sessionId !== filter.sessionId) return false;
        if (filter.command && !execution.command.includes(filter.command)) return false;
        if (filter.exitCode !== undefined && execution.exitCode !== filter.exitCode) return false;
        if (filter.since && execution.timestamp < filter.since) return false;
        return true;
      });
    }
    
    return history;
  }

  /**
   * Get active terminal sessions
   */
  getActiveSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * Close terminal session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    // Kill any active processes
    if (session.pid && this.activeProcesses.has(session.pid)) {
      await this.killProcess(sessionId);
    }

    session.isActive = false;
    session.endTime = new Date();
    
    this.emit('session:closed', session);
  }

  /**
   * Monitor system processes
   */
  getSystemProcesses(): ProcessMonitor[] {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Get system resource usage
   */
  async getSystemResources(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    processes: number;
  }> {
    try {
      // Get system info through terminal commands
      const cpuResult = await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: process.platform === 'win32' 
            ? 'wmic cpu get loadpercentage /value' 
            : 'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'',
          explanation: 'Getting CPU usage',
          isBackground: false
        }
      });

      const memResult = await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: process.platform === 'win32'
            ? 'wmic computersystem get TotalPhysicalMemory /value'
            : 'free | grep Mem | awk \'{printf "%.2f", $3/$2 * 100.0}\'',
          explanation: 'Getting memory usage',
          isBackground: false
        }
      });

      return {
        cpu: this.parseNumberFromOutput(cpuResult.output, 0),
        memory: this.parseNumberFromOutput(memResult.output, 0),
        disk: 0, // TODO: Implement disk usage
        processes: this.activeProcesses.size
      };

    } catch (error) {
      return { cpu: 0, memory: 0, disk: 0, processes: this.activeProcesses.size };
    }
  }

  /**
   * Install development dependencies intelligently
   */
  async installDependencies(
    sessionId: string,
    projectPath: string,
    packages?: string[]
  ): Promise<CommandExecution[]> {
    // Detect package manager
    const packageManager = await this.detectPackageManager(projectPath);
    
    if (!packages) {
      // Install all dependencies
      const command = packageManager === 'npm' ? 'npm install' :
                     packageManager === 'yarn' ? 'yarn install' :
                     'pnpm install';
      
      return [await this.executeCommand(sessionId, command)];
    }

    // Install specific packages
    const results: CommandExecution[] = [];
    for (const pkg of packages) {
      const command = packageManager === 'npm' ? `npm install ${pkg}` :
                     packageManager === 'yarn' ? `yarn add ${pkg}` :
                     `pnpm add ${pkg}`;
      
      results.push(await this.executeCommand(sessionId, command));
    }
    
    return results;
  }

  /**
   * Run project-specific commands (build, test, start, etc.)
   */
  async runProjectCommand(
    sessionId: string,
    projectPath: string,
    scriptName: string
  ): Promise<CommandExecution> {
    const packageManager = await this.detectPackageManager(projectPath);
    
    const command = packageManager === 'npm' ? `npm run ${scriptName}` :
                   packageManager === 'yarn' ? `yarn ${scriptName}` :
                   `pnpm run ${scriptName}`;
    
    return await this.executeCommand(sessionId, command);
  }

  /**
   * Set up development environment
   */
  async setupDevEnvironment(
    sessionId: string,
    projectType: string,
    projectPath: string
  ): Promise<CommandExecution[]> {
    const commands: string[] = [];
    
    // Change to project directory
    commands.push(`cd "${projectPath}"`);
    
    // Setup commands based on project type
    switch (projectType.toLowerCase()) {
      case 'react':
      case 'nextjs':
      case 'javascript':
      case 'typescript':
        commands.push('npm install');
        break;
        
      case 'python':
        commands.push('python -m venv venv');
        commands.push(process.platform === 'win32' ? 'venv\\Scripts\\activate' : 'source venv/bin/activate');
        commands.push('pip install -r requirements.txt');
        break;
        
      case 'java':
        commands.push('mvn clean install');
        break;
        
      case 'go':
        commands.push('go mod tidy');
        break;
        
      case 'rust':
        commands.push('cargo build');
        break;
    }
    
    return await this.executeCommandSequence(sessionId, commands, { stopOnError: true });
  }

  // Private methods

  private setupSystemMonitoring(): void {
    // Monitor system resources periodically
    setInterval(async () => {
      try {
        const resources = await this.getSystemResources();
        this.emit('system:resources', resources);
      } catch (error) {
        // Handle monitoring error
      }
    }, 10000); // Every 10 seconds
  }

  private trackBackgroundProcess(pid: number, command: string): void {
    const monitor: ProcessMonitor = {
      pid,
      command,
      memoryUsage: 0,
      cpuUsage: 0,
      startTime: new Date(),
      status: 'running'
    };
    
    this.activeProcesses.set(pid, monitor);
    this.emit('process:started', monitor);
  }

  private enhanceCommand(command: string, context?: any): string {
    // Add intelligent command enhancement based on context
    if (context?.projectType === 'react' && command.includes('test')) {
      return `${command} --watchAll=false --coverage`;
    }
    
    if (context?.projectType === 'python' && command.includes('python')) {
      return command.replace('python', 'python3');
    }
    
    return command;
  }

  private async detectPackageManager(projectPath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      // Check for lock files
      const result = await this.toolExecutor.executeTool({
        toolName: 'file_search',
        parameters: {
          query: '{package-lock.json,yarn.lock,pnpm-lock.yaml}',
          maxResults: 1
        }
      });
      
      if (result.files) {
        if (result.files.some((f: string) => f.includes('yarn.lock'))) return 'yarn';
        if (result.files.some((f: string) => f.includes('pnpm-lock.yaml'))) return 'pnpm';
      }
      
      return 'npm'; // Default
      
    } catch (error) {
      return 'npm';
    }
  }

  private parseNumberFromOutput(output: string, defaultValue: number): number {
    const match = output.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : defaultValue;
  }
}

export default TerminalManagerService;
