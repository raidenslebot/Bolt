import { spawn } from 'child_process'
import { EventEmitter } from 'events'

export interface DependencyConfig {
  name: string
  check: {
    command: string
    args: string[]
  }
  install: {
    windows?: string
    mac?: string
    linux?: string
  }
  postInstall?: {
    command: string
    args: string[]
  }
  required: boolean
  description: string
}

export interface InstallationResult {
  tool: string
  success: boolean
  alreadyInstalled: boolean
  error?: string
}

/**
 * 🚀 DEPENDENCY AUTO-INSTALLER
 * 
 * Comprehensive system for automatically detecting and installing missing dependencies.
 * Supports Windows (Chocolatey), macOS (Homebrew), and Linux (apt/yum).
 * 
 * Features:
 * - Automatic platform detection
 * - Package manager installation
 * - Dependency verification
 * - Graceful error handling
 * - Installation progress tracking
 */
export class DependencyAutoInstaller extends EventEmitter {
  private platform: 'windows' | 'mac' | 'linux'
  private packageManagerReady: boolean = false
  private installationQueue: DependencyConfig[] = []
  private installedTools: Set<string> = new Set()

  constructor() {
    super()
    this.platform = this.detectPlatform()
    this.ensurePackageManager()
  }

  private detectPlatform(): 'windows' | 'mac' | 'linux' {
    const platform = process.platform
    if (platform === 'win32') return 'windows'
    if (platform === 'darwin') return 'mac'
    return 'linux'
  }

  /**
   * Add a dependency to be checked and potentially installed
   */
  addDependency(config: DependencyConfig): void {
    this.installationQueue.push(config)
  }

  /**
   * Add multiple dependencies
   */
  addDependencies(configs: DependencyConfig[]): void {
    this.installationQueue.push(...configs)
  }

  /**
   * Check and install all queued dependencies
   */
  async installAllDependencies(): Promise<InstallationResult[]> {
    const results: InstallationResult[] = []
    
    console.log(`🔧 Checking ${this.installationQueue.length} dependencies on ${this.platform}...`)
    
    for (const dependency of this.installationQueue) {
      const result = await this.installDependency(dependency)
      results.push(result)
      
      this.emit('dependencyProcessed', result)
    }
    
    const successful = results.filter(r => r.success || r.alreadyInstalled).length
    const failed = results.filter(r => !r.success && !r.alreadyInstalled).length
    
    console.log(`✅ Dependency check complete: ${successful} available, ${failed} failed`)
    
    this.emit('installationComplete', results)
    return results
  }

  /**
   * Install a specific dependency
   */
  async installDependency(config: DependencyConfig): Promise<InstallationResult> {
    const { name, check, install, postInstall, required, description } = config
    
    try {
      // First check if already installed
      await this.executeCommand(check.command, check.args)
      console.log(`✅ ${name} is already available`)
      this.installedTools.add(name)
      return {
        tool: name,
        success: true,
        alreadyInstalled: true
      }
    } catch {
      // Tool not found, attempt installation
      console.log(`⚠️ ${name} not found. ${description}`)
      
      const installCommand = install[this.platform]
      if (!installCommand) {
        const error = `No installation method available for ${name} on ${this.platform}`
        console.warn(`❌ ${error}`)
        return {
          tool: name,
          success: false,
          alreadyInstalled: false,
          error
        }
      }
      
      try {
        console.log(`🔄 Installing ${name}...`)
        await this.installTool(name, installCommand)
        
        // Verify installation
        await this.executeCommand(check.command, check.args)
        
        // Run post-install if specified
        if (postInstall) {
          await this.executeCommand(postInstall.command, postInstall.args)
        }
        
        console.log(`✅ ${name} installed and verified successfully`)
        this.installedTools.add(name)
        
        return {
          tool: name,
          success: true,
          alreadyInstalled: false
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.warn(`❌ Failed to install ${name}: ${errorMsg}`)
        
        if (required) {
          console.error(`💥 ${name} is required but installation failed. System may not function properly.`)
        }
        
        return {
          tool: name,
          success: false,
          alreadyInstalled: false,
          error: errorMsg
        }
      }
    }
  }

  private async installTool(toolName: string, installCommand: string): Promise<void> {
    // Ensure package manager is ready
    if (!this.packageManagerReady) {
      await this.ensurePackageManager()
    }
    
    // Parse and execute install command
    const [command, ...args] = installCommand.split(' ')
    await this.executeCommand(command, args)
  }

  private async ensurePackageManager(): Promise<void> {
    if (this.packageManagerReady) return
    
    try {
      let success = false
      if (this.platform === 'windows') {
        success = await this.ensureChocolatey()
      } else if (this.platform === 'mac') {
        await this.ensureHomebrew()
        success = true
      } else {
        await this.ensureApt()
        success = true
      }
      
      if (success) {
        this.packageManagerReady = true
        console.log(`✅ Package manager ready for ${this.platform}`)
      } else {
        console.warn(`⚠️ Package manager setup incomplete for ${this.platform}, but continuing`)
      }
    } catch (error) {
      console.error(`❌ Failed to setup package manager:`, error)
      // Don't throw - allow system to continue with graceful degradation
    }
  }

  private async ensureChocolatey(): Promise<boolean> {
    try {
      await this.executeCommand('choco', ['--version'])
      console.log('✅ Chocolatey available')
      return true
    } catch {
      console.log('🔄 Installing Chocolatey...')
      await this.executeCommand('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command',
        '[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))'
      ])
      
      // Wait a moment for installation to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Try to verify installation without refreshenv
      try {
        await this.executeCommand('choco', ['--version'])
        console.log('✅ Chocolatey installed successfully')
        return true
      } catch {
        console.warn('⚠️ Chocolatey may need a shell restart to be available')
        // Try alternative paths and refresh environment
        const alternatePaths = [
          'C:\\ProgramData\\chocolatey\\bin\\choco.exe',
          '%ProgramData%\\chocolatey\\bin\\choco.exe',
          'C:\\tools\\chocolatey\\bin\\choco.exe'
        ]
        
        for (const chocoPath of alternatePaths) {
          try {
            await this.executeCommand(chocoPath, ['--version'])
            console.log(`✅ Chocolatey found at: ${chocoPath}`)
            // Try to refresh PATH for future commands
            process.env.PATH = `${process.env.PATH};C:\\ProgramData\\chocolatey\\bin`
            return true
          } catch {
            continue
          }
        }
        
        console.warn('⚠️ Chocolatey verification failed, but continuing with graceful degradation')
        return false // Don't throw, just return false to allow graceful degradation
      }
    }
  }

  private async ensureHomebrew(): Promise<void> {
    try {
      await this.executeCommand('brew', ['--version'])
      console.log('✅ Homebrew available')
    } catch {
      console.log('🔄 Installing Homebrew...')
      await this.executeCommand('/bin/bash', [
        '-c',
        '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'
      ])
      console.log('✅ Homebrew installed')
    }
  }

  private async ensureApt(): Promise<void> {
    try {
      await this.executeCommand('apt', ['--version'])
      console.log('✅ apt available')
    } catch {
      try {
        await this.executeCommand('yum', ['--version'])
        console.log('✅ yum available')
      } catch {
        throw new Error('No compatible package manager found (apt/yum)')
      }
    }
  }

  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        stdio: 'pipe',
        shell: this.platform === 'windows'
      })
      
      let output = ''
      let error = ''

      // Handle spawn errors
      process.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          reject(new Error(`Command '${command}' not found`))
        } else {
          reject(new Error(`Spawn error: ${err.message}`))
        }
      })

      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      process.stderr?.on('data', (data) => {
        error += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(`Command failed (${code}): ${error || 'Unknown error'}`))
        }
      })
    })
  }

  /**
   * Get list of successfully installed tools
   */
  getInstalledTools(): string[] {
    return Array.from(this.installedTools)
  }

  /**
   * Check if a specific tool is available
   */
  isToolAvailable(toolName: string): boolean {
    return this.installedTools.has(toolName)
  }

  /**
   * Get common dependency configurations
   */
  static getCommonDependencies(): DependencyConfig[] {
    return [
      {
        name: 'git',
        check: { command: 'git', args: ['--version'] },
        install: {
          windows: 'choco install git -y',
          mac: 'brew install git',
          linux: 'sudo apt-get install -y git'
        },
        required: true,
        description: 'Git version control system'
      },
      {
        name: 'node',
        check: { command: 'node', args: ['--version'] },
        install: {
          windows: 'choco install nodejs -y',
          mac: 'brew install node',
          linux: 'sudo apt-get install -y nodejs npm'
        },
        required: true,
        description: 'Node.js runtime'
      },
      {
        name: 'python',
        check: { command: 'python', args: ['--version'] },
        install: {
          windows: 'choco install python -y',
          mac: 'brew install python',
          linux: 'sudo apt-get install -y python3 python3-pip'
        },
        required: false,
        description: 'Python programming language'
      },
      {
        name: 'docker',
        check: { command: 'docker', args: ['--version'] },
        install: {
          windows: 'choco install docker-desktop -y',
          mac: 'brew install --cask docker',
          linux: 'sudo apt-get install -y docker.io'
        },
        postInstall: {
          command: 'docker',
          args: ['info']
        },
        required: false,
        description: 'Docker containerization platform'
      },
      {
        name: 'nmap',
        check: { command: 'nmap', args: ['--version'] },
        install: {
          windows: 'choco install nmap -y',
          mac: 'brew install nmap',
          linux: 'sudo apt-get install -y nmap'
        },
        required: false,
        description: 'Network scanning tool'
      }
    ]
  }
}

export default DependencyAutoInstaller
