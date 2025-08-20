import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import { AdvancedFileSystemService } from './advanced-filesystem'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'web' | 'mobile' | 'desktop' | 'library' | 'fullstack' | 'ai-ml' | 'blockchain' | 'game'
  tags: string[]
  author: string
  version: string
  languages: string[]
  frameworks: string[]
  dependencies: string[]
  devDependencies: string[]
  features: ProjectFeature[]
  structure: ProjectStructure
  configFiles: ProjectConfigFile[]
  documentation: ProjectDocumentation
  testing: TestingConfiguration
  deployment: DeploymentConfiguration
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedTime: number // in minutes
  prerequisites: string[]
  preview: string[]
}

export interface ProjectFeature {
  id: string
  name: string
  description: string
  optional: boolean
  dependencies: string[]
  files: TemplateFile[]
  configuration: Record<string, any>
}

export interface ProjectStructure {
  root: string
  directories: ProjectDirectory[]
  files: TemplateFile[]
}

export interface ProjectDirectory {
  path: string
  description: string
  optional: boolean
  files: TemplateFile[]
  subdirectories: ProjectDirectory[]
}

export interface TemplateFile {
  path: string
  content: string
  contentType: 'static' | 'template' | 'binary'
  encoding: 'utf8' | 'binary'
  permissions?: number
  variables: TemplateVariable[]
  conditions: TemplateCondition[]
  transforms: TemplateTransform[]
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue: any
  description: string
  required: boolean
  validation?: string // regex pattern
  options?: any[] // for select type
}

export interface TemplateCondition {
  expression: string
  type: 'include' | 'exclude' | 'modify'
}

export interface TemplateTransform {
  type: 'replace' | 'insert' | 'append' | 'prepend' | 'format'
  pattern?: string
  replacement?: string
  position?: number
  formatter?: string
}

export interface ProjectConfigFile {
  name: string
  path: string
  type: 'json' | 'yaml' | 'toml' | 'ini' | 'xml' | 'js' | 'ts'
  content: Record<string, any>
  mergeStrategy: 'replace' | 'merge' | 'append'
}

export interface ProjectDocumentation {
  readme: string
  changelog: string
  contributing: string
  license: string
  api?: string
  deployment?: string
  examples: DocumentationExample[]
}

export interface DocumentationExample {
  name: string
  description: string
  code: string
  language: string
  category: string
}

export interface TestingConfiguration {
  framework: string
  patterns: string[]
  coverage: {
    enabled: boolean
    threshold: number
    reports: string[]
  }
  fixtures: TemplateFile[]
  setup: TemplateFile[]
}

export interface DeploymentConfiguration {
  platforms: DeploymentPlatform[]
  environments: DeploymentEnvironment[]
  scripts: DeploymentScript[]
  containers: ContainerConfiguration[]
}

export interface DeploymentPlatform {
  name: string
  type: 'cloud' | 'vps' | 'serverless' | 'static' | 'container'
  configuration: Record<string, any>
  files: TemplateFile[]
}

export interface DeploymentEnvironment {
  name: string
  variables: Record<string, string>
  secrets: string[]
  configuration: Record<string, any>
}

export interface DeploymentScript {
  name: string
  description: string
  command: string
  stage: 'build' | 'test' | 'deploy' | 'post-deploy'
  platform?: string
}

export interface ContainerConfiguration {
  name: string
  dockerfile: string
  dockerCompose?: string
  environment: Record<string, string>
  volumes: string[]
  ports: number[]
}

export interface ProjectGenerationOptions {
  templateId: string
  projectName: string
  targetDirectory: string
  variables: Record<string, any>
  features: string[]
  skipOptional: boolean
  overwriteExisting: boolean
  dryRun: boolean
  includeTests: boolean
  includeDocumentation: boolean
  setupGit: boolean
  installDependencies: boolean
}

export interface GenerationProgress {
  phase: 'preparing' | 'creating-structure' | 'generating-files' | 'installing-deps' | 'configuring' | 'finalizing'
  completed: number
  total: number
  currentFile?: string
  currentOperation?: string
}

export interface GenerationResult {
  success: boolean
  projectPath: string
  filesCreated: string[]
  errors: string[]
  warnings: string[]
  nextSteps: string[]
  executionTime: number
}

export interface CustomTemplate {
  id: string
  name: string
  sourceProject: string
  excludePatterns: string[]
  includePatterns: string[]
  templateVariables: TemplateVariable[]
  metadata: Record<string, any>
  created: Date
  lastModified: Date
}

/**
 * Advanced Project Templates service providing intelligent project scaffolding
 * Features: template management, code generation, project analysis, custom templates
 */
export class AdvancedProjectTemplatesService extends EventEmitter {
  private templates: Map<string, ProjectTemplate> = new Map()
  private customTemplates: Map<string, CustomTemplate> = new Map()
  private fileSystemService: AdvancedFileSystemService
  private templatesPath: string
  private isInitialized = false

  constructor(fileSystemService: AdvancedFileSystemService, templatesPath: string) {
    super()
    this.fileSystemService = fileSystemService
    this.templatesPath = templatesPath
  }

  /**
   * Initialize the templates service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Ensure templates directory exists
      await fs.promises.mkdir(this.templatesPath, { recursive: true })

      // Load built-in templates
      await this.loadBuiltInTemplates()

      // Load custom templates
      await this.loadCustomTemplates()

      this.isInitialized = true
      this.emit('initialized', {
        builtInTemplates: this.templates.size,
        customTemplates: this.customTemplates.size
      })

    } catch (error) {
      this.emit('initializationError', error)
      throw error
    }
  }

  /**
   * Get all available templates
   */
  getTemplates(category?: string, language?: string): ProjectTemplate[] {
    let templates = Array.from(this.templates.values())

    if (category) {
      templates = templates.filter(t => t.category === category)
    }

    if (language) {
      templates = templates.filter(t => t.languages.includes(language))
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): ProjectTemplate | null {
    return this.templates.get(templateId) || null
  }

  /**
   * Search templates
   */
  searchTemplates(query: string, options: {
    category?: string
    language?: string
    complexity?: string
    tags?: string[]
  } = {}): ProjectTemplate[] {
    const queryLower = query.toLowerCase()
    let templates = Array.from(this.templates.values())

    // Filter by search query
    templates = templates.filter(template => 
      template.name.toLowerCase().includes(queryLower) ||
      template.description.toLowerCase().includes(queryLower) ||
      template.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
      template.languages.some(lang => lang.toLowerCase().includes(queryLower)) ||
      template.frameworks.some(framework => framework.toLowerCase().includes(queryLower))
    )

    // Apply filters
    if (options.category) {
      templates = templates.filter(t => t.category === options.category)
    }

    if (options.language) {
      templates = templates.filter(t => t.languages.includes(options.language!))
    }

    if (options.complexity) {
      templates = templates.filter(t => t.complexity === options.complexity)
    }

    if (options.tags && options.tags.length > 0) {
      templates = templates.filter(t => 
        options.tags!.some(tag => t.tags.includes(tag))
      )
    }

    return templates
  }

  /**
   * Generate a project from template
   */
  async generateProject(options: ProjectGenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now()
    const result: GenerationResult = {
      success: false,
      projectPath: '',
      filesCreated: [],
      errors: [],
      warnings: [],
      nextSteps: [],
      executionTime: 0
    }

    try {
      const template = this.templates.get(options.templateId)
      if (!template) {
        throw new Error(`Template not found: ${options.templateId}`)
      }

      const projectPath = path.join(options.targetDirectory, options.projectName)
      result.projectPath = projectPath

      // Check if project directory exists
      if (!options.overwriteExisting && fs.existsSync(projectPath)) {
        throw new Error(`Project directory already exists: ${projectPath}`)
      }

      // Start generation process
      this.emit('generationStarted', options)

      if (options.dryRun) {
        await this.performDryRun(template, options, result)
      } else {
        await this.performGeneration(template, options, result)
      }

      result.success = true
      result.executionTime = Date.now() - startTime

      this.emit('generationCompleted', result)

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error))
      result.executionTime = Date.now() - startTime
      this.emit('generationError', result, error)
    }

    return result
  }

  /**
   * Create custom template from existing project
   */
  async createCustomTemplate(
    projectPath: string,
    templateName: string,
    options: {
      description?: string
      excludePatterns?: string[]
      includePatterns?: string[]
      extractVariables?: boolean
    } = {}
  ): Promise<CustomTemplate> {
    try {
      const templateId = this.generateTemplateId(templateName)
      
      const customTemplate: CustomTemplate = {
        id: templateId,
        name: templateName,
        sourceProject: projectPath,
        excludePatterns: options.excludePatterns || [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '*.log'
        ],
        includePatterns: options.includePatterns || ['**/*'],
        templateVariables: options.extractVariables ? 
          await this.extractVariables(projectPath) : [],
        metadata: {
          description: options.description || '',
          created: new Date(),
          sourceAnalysis: await this.analyzeProject(projectPath)
        },
        created: new Date(),
        lastModified: new Date()
      }

      // Save custom template
      await this.saveCustomTemplate(customTemplate)
      
      this.customTemplates.set(templateId, customTemplate)
      this.emit('customTemplateCreated', customTemplate)

      return customTemplate

    } catch (error) {
      this.emit('customTemplateError', error)
      throw error
    }
  }

  /**
   * Generate project from custom template
   */
  async generateFromCustomTemplate(
    customTemplateId: string,
    targetPath: string,
    variables: Record<string, any> = {}
  ): Promise<GenerationResult> {
    const customTemplate = this.customTemplates.get(customTemplateId)
    if (!customTemplate) {
      throw new Error(`Custom template not found: ${customTemplateId}`)
    }

    const startTime = Date.now()
    const result: GenerationResult = {
      success: false,
      projectPath: targetPath,
      filesCreated: [],
      errors: [],
      warnings: [],
      nextSteps: [],
      executionTime: 0
    }

    try {
      // Copy project structure
      await this.copyProjectStructure(
        customTemplate.sourceProject,
        targetPath,
        customTemplate,
        variables
      )

      // Apply template variables
      await this.applyTemplateVariables(
        targetPath,
        customTemplate.templateVariables,
        variables
      )

      result.success = true
      result.executionTime = Date.now() - startTime

      this.emit('customGenerationCompleted', result)

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error))
      result.executionTime = Date.now() - startTime
      this.emit('customGenerationError', result, error)
    }

    return result
  }

  /**
   * Get project generation suggestions based on context
   */
  async getProjectSuggestions(context: {
    existingFiles?: string[]
    dependencies?: string[]
    framework?: string
    language?: string
    purpose?: string
  }): Promise<{
    recommended: ProjectTemplate[]
    reasoning: string[]
  }> {
    const allTemplates = Array.from(this.templates.values())
    const scores = new Map<string, number>()
    const reasoning: string[] = []

    for (const template of allTemplates) {
      let score = 0

      // Language matching
      if (context.language && template.languages.includes(context.language)) {
        score += 50
        reasoning.push(`${template.name}: Matches language ${context.language}`)
      }

      // Framework matching
      if (context.framework && template.frameworks.includes(context.framework)) {
        score += 40
        reasoning.push(`${template.name}: Supports framework ${context.framework}`)
      }

      // Dependencies matching
      if (context.dependencies) {
        const matchingDeps = context.dependencies.filter(dep => 
          template.dependencies.includes(dep) || template.devDependencies.includes(dep)
        )
        score += matchingDeps.length * 10
        if (matchingDeps.length > 0) {
          reasoning.push(`${template.name}: Has ${matchingDeps.length} matching dependencies`)
        }
      }

      // Purpose/category inference
      if (context.purpose) {
        const purposeLower = context.purpose.toLowerCase()
        if (template.description.toLowerCase().includes(purposeLower) ||
            template.tags.some(tag => tag.toLowerCase().includes(purposeLower))) {
          score += 30
          reasoning.push(`${template.name}: Matches purpose "${context.purpose}"`)
        }
      }

      scores.set(template.id, score)
    }

    // Sort by score and return top recommendations
    const recommended = allTemplates
      .filter(t => scores.get(t.id)! > 0)
      .sort((a, b) => scores.get(b.id)! - scores.get(a.id)!)
      .slice(0, 5)

    return { recommended, reasoning }
  }

  /**
   * Validate template variables
   */
  validateVariables(template: ProjectTemplate, variables: Record<string, any>): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[]
    }

    // Collect all variables from template and features
    const allVariables = [...template.structure.files.flatMap(f => f.variables)]
    template.features.forEach(feature => {
      feature.files.forEach(file => {
        allVariables.push(...file.variables)
      })
    })

    for (const variable of allVariables) {
      const value = variables[variable.name]

      if (variable.required && (value === undefined || value === null || value === '')) {
        validation.errors.push(`Required variable '${variable.name}' is missing`)
        validation.valid = false
      }

      if (value !== undefined && variable.validation) {
        const regex = new RegExp(variable.validation)
        if (!regex.test(String(value))) {
          validation.errors.push(`Variable '${variable.name}' does not match pattern: ${variable.validation}`)
          validation.valid = false
        }
      }

      if (value !== undefined && variable.type === 'number' && isNaN(Number(value))) {
        validation.errors.push(`Variable '${variable.name}' must be a number`)
        validation.valid = false
      }

      if (value !== undefined && variable.type === 'boolean' && typeof value !== 'boolean') {
        validation.warnings.push(`Variable '${variable.name}' should be a boolean`)
      }
    }

    return validation
  }

  /**
   * Get template preview
   */
  async getTemplatePreview(templateId: string, variables: Record<string, any> = {}): Promise<{
    structure: string[]
    files: Array<{
      path: string
      preview: string
    }>
    estimatedSize: number
  }> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const structure: string[] = []
    const files: Array<{ path: string; preview: string }> = []
    let estimatedSize = 0

    // Build structure preview
    this.buildStructurePreview(template.structure, structure, '', variables)

    // Generate file previews
    for (const file of template.structure.files) {
      if (this.shouldIncludeFile(file, variables)) {
        const content = await this.processTemplateContent(file.content, variables)
        files.push({
          path: file.path,
          preview: content.substring(0, 500) + (content.length > 500 ? '...' : '')
        })
        estimatedSize += content.length
      }
    }

    return { structure, files, estimatedSize }
  }

  /**
   * Private methods
   */
  private async loadBuiltInTemplates(): Promise<void> {
    // Load React TypeScript template
    const reactTemplate = this.createReactTemplate()
    this.templates.set(reactTemplate.id, reactTemplate)

    // Load Node.js Express template
    const nodeTemplate = this.createNodeTemplate()
    this.templates.set(nodeTemplate.id, nodeTemplate)

    // Load Python FastAPI template
    const pythonTemplate = this.createPythonTemplate()
    this.templates.set(pythonTemplate.id, pythonTemplate)

    // Load more templates...
    this.emit('builtInTemplatesLoaded', this.templates.size)
  }

  private createReactTemplate(): ProjectTemplate {
    return {
      id: 'react-typescript-app',
      name: 'React TypeScript Application',
      description: 'Modern React application with TypeScript, Vite, and best practices',
      category: 'web',
      tags: ['react', 'typescript', 'vite', 'frontend'],
      author: 'DeepSeek Cursor Competitor',
      version: '1.0.0',
      languages: ['typescript', 'javascript'],
      frameworks: ['react', 'vite'],
      dependencies: ['react', 'react-dom'],
      devDependencies: ['@types/react', '@types/react-dom', 'vite', 'typescript'],
      features: [
        {
          id: 'routing',
          name: 'React Router',
          description: 'Add client-side routing with React Router',
          optional: true,
          dependencies: ['react-router-dom'],
          files: [],
          configuration: {}
        },
        {
          id: 'styling',
          name: 'Styled Components',
          description: 'Add styled-components for CSS-in-JS',
          optional: true,
          dependencies: ['styled-components'],
          files: [],
          configuration: {}
        }
      ],
      structure: {
        root: '',
        directories: [
          {
            path: 'src',
            description: 'Source code directory',
            optional: false,
            files: [
              {
                path: 'src/App.tsx',
                content: 'import React from \'react\'\n\nfunction App() {\n  return (\n    <div className="App">\n      <h1>{{projectName}}</h1>\n    </div>\n  )\n}\n\nexport default App',
                contentType: 'template',
                encoding: 'utf8',
                variables: [
                  {
                    name: 'projectName',
                    type: 'string',
                    defaultValue: 'My React App',
                    description: 'Project name to display',
                    required: true
                  }
                ],
                conditions: [],
                transforms: []
              }
            ],
            subdirectories: []
          }
        ],
        files: [
          {
            path: 'package.json',
            content: JSON.stringify({
              name: '{{projectNameKebab}}',
              version: '0.1.0',
              type: 'module',
              scripts: {
                'dev': 'vite',
                'build': 'tsc && vite build',
                'preview': 'vite preview'
              }
            }, null, 2),
            contentType: 'template',
            encoding: 'utf8',
            variables: [
              {
                name: 'projectNameKebab',
                type: 'string',
                defaultValue: 'my-react-app',
                description: 'Project name in kebab-case',
                required: true,
                validation: '^[a-z0-9-]+$'
              }
            ],
            conditions: [],
            transforms: []
          }
        ]
      },
      configFiles: [
        {
          name: 'vite.config.ts',
          path: 'vite.config.ts',
          type: 'ts',
          content: {
            plugins: ['@vitejs/plugin-react'],
            server: { port: 3000 }
          },
          mergeStrategy: 'replace'
        }
      ],
      documentation: {
        readme: '# {{projectName}}\n\nA React TypeScript application built with Vite.',
        changelog: '# Changelog\n\n## [0.1.0] - Initial Release',
        contributing: '# Contributing\n\nContributions are welcome!',
        license: 'MIT',
        examples: []
      },
      testing: {
        framework: 'vitest',
        patterns: ['**/*.test.{ts,tsx}'],
        coverage: {
          enabled: true,
          threshold: 80,
          reports: ['text', 'html']
        },
        fixtures: [],
        setup: []
      },
      deployment: {
        platforms: [
          {
            name: 'vercel',
            type: 'static',
            configuration: {},
            files: []
          }
        ],
        environments: [],
        scripts: [],
        containers: []
      },
      complexity: 'intermediate',
      estimatedTime: 15,
      prerequisites: ['Node.js 18+', 'npm or yarn'],
      preview: [
        'src/',
        '  App.tsx',
        '  main.tsx',
        'package.json',
        'vite.config.ts',
        'tsconfig.json'
      ]
    }
  }

  private createNodeTemplate(): ProjectTemplate {
    return {
      id: 'node-express-api',
      name: 'Node.js Express API',
      description: 'RESTful API with Express.js, TypeScript, and database integration',
      category: 'web',
      tags: ['nodejs', 'express', 'api', 'backend'],
      author: 'DeepSeek Cursor Competitor',
      version: '1.0.0',
      languages: ['typescript'],
      frameworks: ['express', 'nodejs'],
      dependencies: ['express', 'cors', 'helmet'],
      devDependencies: ['@types/express', '@types/cors', 'typescript', 'nodemon'],
      features: [],
      structure: {
        root: '',
        directories: [],
        files: []
      },
      configFiles: [],
      documentation: {
        readme: '# {{projectName}}\n\nNode.js Express API',
        changelog: '',
        contributing: '',
        license: 'MIT',
        examples: []
      },
      testing: {
        framework: 'jest',
        patterns: [],
        coverage: { enabled: false, threshold: 0, reports: [] },
        fixtures: [],
        setup: []
      },
      deployment: {
        platforms: [],
        environments: [],
        scripts: [],
        containers: []
      },
      complexity: 'intermediate',
      estimatedTime: 20,
      prerequisites: ['Node.js 18+'],
      preview: []
    }
  }

  private createPythonTemplate(): ProjectTemplate {
    return {
      id: 'python-fastapi',
      name: 'Python FastAPI Application',
      description: 'Modern Python API with FastAPI, async support, and automatic documentation',
      category: 'web',
      tags: ['python', 'fastapi', 'api', 'async'],
      author: 'DeepSeek Cursor Competitor',
      version: '1.0.0',
      languages: ['python'],
      frameworks: ['fastapi'],
      dependencies: ['fastapi', 'uvicorn'],
      devDependencies: ['pytest', 'black', 'flake8'],
      features: [],
      structure: {
        root: '',
        directories: [],
        files: []
      },
      configFiles: [],
      documentation: {
        readme: '# {{projectName}}\n\nPython FastAPI application',
        changelog: '',
        contributing: '',
        license: 'MIT',
        examples: []
      },
      testing: {
        framework: 'pytest',
        patterns: [],
        coverage: { enabled: false, threshold: 0, reports: [] },
        fixtures: [],
        setup: []
      },
      deployment: {
        platforms: [],
        environments: [],
        scripts: [],
        containers: []
      },
      complexity: 'intermediate',
      estimatedTime: 25,
      prerequisites: ['Python 3.9+'],
      preview: []
    }
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      const customPath = path.join(this.templatesPath, 'custom')
      await fs.promises.mkdir(customPath, { recursive: true })

      const files = await fs.promises.readdir(customPath)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(customPath, file)
          const content = await fs.promises.readFile(templatePath, 'utf8')
          const customTemplate: CustomTemplate = JSON.parse(content)
          this.customTemplates.set(customTemplate.id, customTemplate)
        }
      }

      this.emit('customTemplatesLoaded', this.customTemplates.size)

    } catch (error) {
      // Ignore errors - no custom templates is fine
    }
  }

  private async performDryRun(
    template: ProjectTemplate,
    options: ProjectGenerationOptions,
    result: GenerationResult
  ): Promise<void> {
    // Simulate file creation without actually creating files
    const totalFiles = this.estimateFileCount(template, options)
    
    for (let i = 0; i < totalFiles; i++) {
      result.filesCreated.push(`dry-run-file-${i}`)
      
      this.emit('generationProgress', {
        phase: 'generating-files',
        completed: i + 1,
        total: totalFiles,
        currentFile: `file-${i}`
      } as GenerationProgress)
      
      // Small delay to simulate work
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    result.nextSteps = [
      'Run without --dry-run to create the project',
      `cd ${options.projectName}`,
      'npm install',
      'npm run dev'
    ]
  }

  private async performGeneration(
    template: ProjectTemplate,
    options: ProjectGenerationOptions,
    result: GenerationResult
  ): Promise<void> {
    const projectPath = result.projectPath

    // Phase 1: Create directory structure
    this.emit('generationProgress', {
      phase: 'creating-structure',
      completed: 0,
      total: 100
    } as GenerationProgress)

    await fs.promises.mkdir(projectPath, { recursive: true })
    await this.createDirectoryStructure(template.structure, projectPath, options)

    // Phase 2: Generate files
    this.emit('generationProgress', {
      phase: 'generating-files',
      completed: 20,
      total: 100
    } as GenerationProgress)

    await this.generateFiles(template, projectPath, options, result)

    // Phase 3: Install dependencies
    if (options.installDependencies) {
      this.emit('generationProgress', {
        phase: 'installing-deps',
        completed: 70,
        total: 100
      } as GenerationProgress)

      await this.installDependencies(projectPath, template)
    }

    // Phase 4: Setup Git
    if (options.setupGit) {
      this.emit('generationProgress', {
        phase: 'configuring',
        completed: 90,
        total: 100
      } as GenerationProgress)

      await this.setupGitRepository(projectPath)
    }

    // Phase 5: Finalize
    this.emit('generationProgress', {
      phase: 'finalizing',
      completed: 100,
      total: 100
    } as GenerationProgress)

    result.nextSteps = this.generateNextSteps(template, options)
  }

  private async createDirectoryStructure(
    structure: ProjectStructure,
    basePath: string,
    options: ProjectGenerationOptions
  ): Promise<void> {
    for (const directory of structure.directories) {
      if (directory.optional && options.skipOptional) continue

      const dirPath = path.join(basePath, directory.path)
      await fs.promises.mkdir(dirPath, { recursive: true })

      // Recursively create subdirectories
      if (directory.subdirectories.length > 0) {
        for (const subdir of directory.subdirectories) {
          await this.createDirectoryStructure(
            { root: '', directories: [subdir], files: [] },
            dirPath,
            options
          )
        }
      }
    }
  }

  private async generateFiles(
    template: ProjectTemplate,
    projectPath: string,
    options: ProjectGenerationOptions,
    result: GenerationResult
  ): Promise<void> {
    // Generate root files
    for (const file of template.structure.files) {
      if (this.shouldIncludeFile(file, options.variables)) {
        await this.generateFile(file, projectPath, options.variables, result)
      }
    }

    // Generate directory files
    for (const directory of template.structure.directories) {
      const dirPath = path.join(projectPath, directory.path)
      for (const file of directory.files) {
        if (this.shouldIncludeFile(file, options.variables)) {
          await this.generateFile(file, projectPath, options.variables, result)
        }
      }
    }

    // Generate feature files
    for (const featureId of options.features) {
      const feature = template.features.find(f => f.id === featureId)
      if (feature) {
        for (const file of feature.files) {
          if (this.shouldIncludeFile(file, options.variables)) {
            await this.generateFile(file, projectPath, options.variables, result)
          }
        }
      }
    }
  }

  private async generateFile(
    file: TemplateFile,
    projectPath: string,
    variables: Record<string, any>,
    result: GenerationResult
  ): Promise<void> {
    const filePath = path.join(projectPath, file.path)
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })

    let content = file.content

    if (file.contentType === 'template') {
      content = await this.processTemplateContent(content, variables)
    }

    // Apply transforms
    for (const transform of file.transforms) {
      content = this.applyTransform(content, transform, variables)
    }

    await fs.promises.writeFile(filePath, content, {
      encoding: file.encoding,
      mode: file.permissions
    })

    result.filesCreated.push(file.path)
  }

  private async processTemplateContent(content: string, variables: Record<string, any>): Promise<string> {
    // Simple template variable replacement
    let processed = content

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      processed = processed.replace(regex, String(value))
    }

    return processed
  }

  private shouldIncludeFile(file: TemplateFile, variables: Record<string, any>): boolean {
    for (const condition of file.conditions) {
      const result = this.evaluateCondition(condition.expression, variables)
      
      if (condition.type === 'include' && !result) {
        return false
      }
      
      if (condition.type === 'exclude' && result) {
        return false
      }
    }

    return true
  }

  private evaluateCondition(expression: string, variables: Record<string, any>): boolean {
    // Simple expression evaluation - in production, use a proper parser
    try {
      const func = new Function('variables', `with(variables) { return ${expression} }`)
      return !!func(variables)
    } catch {
      return false
    }
  }

  private applyTransform(content: string, transform: TemplateTransform, variables: Record<string, any>): string {
    switch (transform.type) {
      case 'replace':
        if (transform.pattern && transform.replacement) {
          return content.replace(new RegExp(transform.pattern, 'g'), transform.replacement)
        }
        break
      case 'insert':
        if (transform.position !== undefined && transform.replacement) {
          return content.slice(0, transform.position) + transform.replacement + content.slice(transform.position)
        }
        break
      case 'append':
        if (transform.replacement) {
          return content + transform.replacement
        }
        break
      case 'prepend':
        if (transform.replacement) {
          return transform.replacement + content
        }
        break
    }

    return content
  }

  private async installDependencies(projectPath: string, template: ProjectTemplate): Promise<void> {
    // Implementation would run npm install or equivalent
  }

  private async setupGitRepository(projectPath: string): Promise<void> {
    // Implementation would initialize git repository
  }

  private generateNextSteps(template: ProjectTemplate, options: ProjectGenerationOptions): string[] {
    const steps = [
      `cd ${options.projectName}`
    ]

    if (!options.installDependencies) {
      steps.push('npm install')
    }

    if (template.category === 'web') {
      steps.push('npm run dev')
    }

    steps.push('Open in your favorite editor')
    steps.push('Start coding!')

    return steps
  }

  private estimateFileCount(template: ProjectTemplate, options: ProjectGenerationOptions): number {
    let count = template.structure.files.length

    for (const directory of template.structure.directories) {
      count += directory.files.length
    }

    for (const featureId of options.features) {
      const feature = template.features.find(f => f.id === featureId)
      if (feature) {
        count += feature.files.length
      }
    }

    return count
  }

  private async extractVariables(projectPath: string): Promise<TemplateVariable[]> {
    // Implementation would analyze project files and extract potential variables
    return []
  }

  private async analyzeProject(projectPath: string): Promise<Record<string, any>> {
    // Implementation would analyze project structure and dependencies
    return {}
  }

  private async saveCustomTemplate(template: CustomTemplate): Promise<void> {
    const customPath = path.join(this.templatesPath, 'custom')
    await fs.promises.mkdir(customPath, { recursive: true })
    
    const filePath = path.join(customPath, `${template.id}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(template, null, 2))
  }

  private async copyProjectStructure(
    sourcePath: string,
    targetPath: string,
    template: CustomTemplate,
    variables: Record<string, any>
  ): Promise<void> {
    // Implementation would copy files and apply transformations
  }

  private async applyTemplateVariables(
    projectPath: string,
    templateVariables: TemplateVariable[],
    variables: Record<string, any>
  ): Promise<void> {
    // Implementation would apply variable substitutions
  }

  private buildStructurePreview(
    structure: ProjectStructure,
    preview: string[],
    indent: string,
    variables: Record<string, any>
  ): void {
    for (const directory of structure.directories) {
      preview.push(`${indent}${directory.path}/`)
      
      for (const file of directory.files) {
        if (this.shouldIncludeFile(file, variables)) {
          preview.push(`${indent}  ${path.basename(file.path)}`)
        }
      }
      
      // Recursively add subdirectories
      for (const subdir of directory.subdirectories) {
        this.buildStructurePreview(
          { root: '', directories: [subdir], files: [] },
          preview,
          indent + '  ',
          variables
        )
      }
    }

    for (const file of structure.files) {
      if (this.shouldIncludeFile(file, variables)) {
        preview.push(`${indent}${path.basename(file.path)}`)
      }
    }
  }

  private generateTemplateId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}
