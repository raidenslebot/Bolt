/**
 * Local Filesystem Bridge for Bolt.diy
 * Enables direct file operations on the user's local PC filesystem
 */

import { UniversalToolExecutor } from './universal-tool-executor'
import * as fs from 'fs'
import * as path from 'path'

export class LocalFilesystemBridge {
  private toolExecutor: UniversalToolExecutor
  private workspacePath: string
  private fileWatchers: Map<string, any> = new Map()

  constructor(toolExecutor: UniversalToolExecutor, workspacePath: string = process.cwd()) {
    this.toolExecutor = toolExecutor
    this.workspacePath = workspacePath
  }

  /**
   * Create project workspace on local filesystem
   */
  async createWorkspace(projectName: string, template?: string): Promise<string> {
    const projectPath = path.join(this.workspacePath, 'projects', projectName)
    
    // Create project directory
    await this.toolExecutor.executeTool({
      toolName: 'create_directory',
      parameters: { dirPath: projectPath }
    })

    // Create basic structure
    const basicStructure = [
      'src',
      'public',
      'tests',
      'docs',
      '.vscode'
    ]

    for (const dir of basicStructure) {
      await this.toolExecutor.executeTool({
        toolName: 'create_directory',
        parameters: { dirPath: path.join(projectPath, dir) }
      })
    }

    // Initialize git repository
    await this.toolExecutor.executeTool({
      toolName: 'run_in_terminal',
      parameters: {
        command: `cd "${projectPath}" && git init`,
        explanation: 'Initialize git repository',
        isBackground: false
      }
    })

    // Create initial files
    await this.createInitialProjectFiles(projectPath, projectName, template)

    return projectPath
  }

  /**
   * Read file from local filesystem
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolveLocalPath(filePath)
    
    const result = await this.toolExecutor.executeTool({
      toolName: 'read_file',
      parameters: {
        filePath: fullPath,
        startLine: 1,
        endLine: 10000 // Read entire file
      }
    })

    return result.result || ''
  }

  /**
   * Write file to local filesystem
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath)
    
    await this.toolExecutor.executeTool({
      toolName: 'create_file',
      parameters: {
        filePath: fullPath,
        content
      }
    })
  }

  /**
   * Update existing file on local filesystem
   */
  async updateFile(filePath: string, oldContent: string, newContent: string): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath)
    
    await this.toolExecutor.executeTool({
      toolName: 'replace_string_in_file',
      parameters: {
        filePath: fullPath,
        oldString: oldContent,
        newString: newContent
      }
    })
  }

  /**
   * List directory contents on local filesystem
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    const fullPath = this.resolveLocalPath(dirPath)
    
    const result = await this.toolExecutor.executeTool({
      toolName: 'list_dir',
      parameters: { path: fullPath }
    })

    return result.result || []
  }

  /**
   * Search for files in local filesystem
   */
  async searchFiles(pattern: string, directory?: string): Promise<string[]> {
    const searchPath = directory ? this.resolveLocalPath(directory) : this.workspacePath
    
    const result = await this.toolExecutor.executeTool({
      toolName: 'file_search',
      parameters: {
        query: pattern,
        maxResults: 100
      }
    })

    return result.result || []
  }

  /**
   * Search for content in files
   */
  async searchInFiles(query: string, includePattern?: string): Promise<any[]> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'grep_search',
      parameters: {
        query,
        includePattern,
        isRegexp: false,
        maxResults: 100
      }
    })

    return result.result || []
  }

  /**
   * Watch files for changes
   */
  async watchFile(filePath: string, callback: (event: string, filename: string) => void): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath)
    
    if (this.fileWatchers.has(fullPath)) {
      return // Already watching
    }

    // Create file watcher (this would be implemented differently in browser context)
    const watcher = {
      path: fullPath,
      callback,
      active: true
    }

    this.fileWatchers.set(fullPath, watcher)
  }

  /**
   * Stop watching file
   */
  async unwatchFile(filePath: string): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath)
    
    const watcher = this.fileWatchers.get(fullPath)
    if (watcher) {
      watcher.active = false
      this.fileWatchers.delete(fullPath)
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const fullPath = this.resolveLocalPath(filePath)
    
    try {
      // This would use actual fs.stat in Node.js environment
      return {
        path: fullPath,
        exists: true,
        isFile: true,
        isDirectory: false,
        size: 0,
        modified: new Date(),
        created: new Date()
      }
    } catch (error) {
      return {
        path: fullPath,
        exists: false,
        isFile: false,
        isDirectory: false,
        size: 0,
        modified: new Date(),
        created: new Date()
      }
    }
  }

  /**
   * Copy file or directory
   */
  async copy(source: string, destination: string): Promise<void> {
    const sourcePath = this.resolveLocalPath(source)
    const destPath = this.resolveLocalPath(destination)
    
    await this.toolExecutor.executeTool({
      toolName: 'run_in_terminal',
      parameters: {
        command: process.platform === 'win32' 
          ? `copy "${sourcePath}" "${destPath}"`
          : `cp -r "${sourcePath}" "${destPath}"`,
        explanation: `Copy ${source} to ${destination}`,
        isBackground: false
      }
    })
  }

  /**
   * Move/rename file or directory
   */
  async move(source: string, destination: string): Promise<void> {
    const sourcePath = this.resolveLocalPath(source)
    const destPath = this.resolveLocalPath(destination)
    
    await this.toolExecutor.executeTool({
      toolName: 'run_in_terminal',
      parameters: {
        command: process.platform === 'win32'
          ? `move "${sourcePath}" "${destPath}"`
          : `mv "${sourcePath}" "${destPath}"`,
        explanation: `Move ${source} to ${destination}`,
        isBackground: false
      }
    })
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolveLocalPath(filePath)
    
    await this.toolExecutor.executeTool({
      toolName: 'run_in_terminal',
      parameters: {
        command: process.platform === 'win32'
          ? `rmdir /s /q "${fullPath}"`
          : `rm -rf "${fullPath}"`,
        explanation: `Delete ${filePath}`,
        isBackground: false
      }
    })
  }

  /**
   * Create project from template
   */
  async createFromTemplate(projectName: string, templateName: string): Promise<string> {
    const projectPath = await this.createWorkspace(projectName, templateName)
    
    // Copy template files based on template type
    switch (templateName) {
      case 'react':
        await this.createReactTemplate(projectPath, projectName)
        break
      case 'nextjs':
        await this.createNextJSTemplate(projectPath, projectName)
        break
      case 'express':
        await this.createExpressTemplate(projectPath, projectName)
        break
      case 'fullstack':
        await this.createFullStackTemplate(projectPath, projectName)
        break
      default:
        await this.createBasicTemplate(projectPath, projectName)
    }

    return projectPath
  }

  private resolveLocalPath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.join(this.workspacePath, filePath)
  }

  private async createInitialProjectFiles(projectPath: string, projectName: string, template?: string): Promise<void> {
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: `${projectName} - Generated by Bolt.diy Autonomous AI`,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest',
        build: 'webpack --mode production'
      },
      dependencies: {},
      devDependencies: {
        nodemon: '^2.0.0',
        jest: '^29.0.0'
      }
    }

    await this.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2))

    // Create README.md
    const readme = `# ${projectName}

Generated by Bolt.diy Autonomous AI Development System

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Features

- Full-stack development capabilities
- AI-driven code generation
- Automated testing and deployment
- Autonomous agent coordination

## Structure

- \`src/\` - Source code
- \`public/\` - Static assets
- \`tests/\` - Test files
- \`docs/\` - Documentation

## Built With

- Bolt.diy - AI-powered development platform
- Autonomous AI Agents - Intelligent code generation and project management
`

    await this.writeFile(path.join(projectPath, 'README.md'), readme)

    // Create basic index.js
    const indexJs = `/**
 * ${projectName}
 * Generated by Bolt.diy Autonomous AI
 */

console.log('Welcome to ${projectName}!')
console.log('This project was created by Bolt.diy Autonomous AI Development System')

// Your code goes here...
`

    await this.writeFile(path.join(projectPath, 'src', 'index.js'), indexJs)

    // Create .gitignore
    const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`

    await this.writeFile(path.join(projectPath, '.gitignore'), gitignore)
  }

  private async createReactTemplate(projectPath: string, projectName: string): Promise<void> {
    // Enhanced React template creation
    const packageJsonUpdates = {
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.8.0'
      },
      devDependencies: {
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        '@vitejs/plugin-react': '^3.1.0',
        vite: '^4.1.0',
        typescript: '^4.9.0'
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      }
    }

    // Update package.json
    const currentPackageJson = JSON.parse(await this.readFile(path.join(projectPath, 'package.json')))
    const updatedPackageJson = { ...currentPackageJson, ...packageJsonUpdates }
    
    await this.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(updatedPackageJson, null, 2)
    )

    // Create React components
    const appJsx = `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${projectName}</h1>
        <p>Built with Bolt.diy Autonomous AI</p>
      </header>
    </div>
  )
}

export default App`

    await this.writeFile(path.join(projectPath, 'src', 'App.jsx'), appJsx)

    // Create index.jsx
    const indexJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`

    await this.writeFile(path.join(projectPath, 'src', 'main.jsx'), indexJsx)

    // Create HTML template
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`

    await this.writeFile(path.join(projectPath, 'index.html'), indexHtml)

    // Create Vite config
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`

    await this.writeFile(path.join(projectPath, 'vite.config.js'), viteConfig)
  }

  private async createNextJSTemplate(projectPath: string, projectName: string): Promise<void> {
    // Next.js template implementation
    // Similar pattern as React template but with Next.js specific files
  }

  private async createExpressTemplate(projectPath: string, projectName: string): Promise<void> {
    // Express.js template implementation
    // Create server files, routes, middleware, etc.
  }

  private async createFullStackTemplate(projectPath: string, projectName: string): Promise<void> {
    // Full-stack template with both frontend and backend
    // Combine React frontend with Express backend
  }

  private async createBasicTemplate(projectPath: string, projectName: string): Promise<void> {
    // Basic JavaScript template - already created in createInitialProjectFiles
  }
}

export interface FileInfo {
  path: string
  exists: boolean
  isFile: boolean
  isDirectory: boolean
  size: number
  modified: Date
  created: Date
}

export interface FileWatcher {
  path: string
  callback: (event: string, filename: string) => void
  active: boolean
}

export default LocalFilesystemBridge
