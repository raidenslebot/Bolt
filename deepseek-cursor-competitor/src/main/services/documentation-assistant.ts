import { EventEmitter } from 'events'
import { AIModelManager } from './ai-model-manager'
import { AdvancedCodeAnalysisService } from './advanced-code-analysis'
import { IntelligentCodeGenerator } from './intelligent-code-generator-v2'
import { AdvancedCacheService } from './advanced-cache'
import * as fs from 'fs'
import * as path from 'path'

export interface DocumentationRequest {
  targetPath: string // file or directory
  type: 'api' | 'README' | 'inline' | 'technical' | 'user-guide' | 'changelog'
  format: 'markdown' | 'html' | 'pdf' | 'json' | 'jsdoc' | 'typedoc'
  audience: 'developer' | 'end-user' | 'maintainer' | 'contributor'
  options: {
    includeExamples: boolean
    includeTypes: boolean
    includePrivateMethods: boolean
    generateDiagrams: boolean
    includeUsageStats: boolean
    autoUpdate: boolean
  }
  style: {
    tone: 'formal' | 'casual' | 'technical' | 'friendly'
    depth: 'basic' | 'detailed' | 'comprehensive'
    includeMetadata: boolean
  }
}

export interface GeneratedDocumentation {
  content: string
  format: string
  sections: Array<{
    title: string
    content: string
    subsections?: any[]
  }>
  metadata: {
    generatedAt: Date
    version: string
    coverage: number
    wordCount: number
    readingTime: number
  }
  assets: {
    diagrams: string[]
    examples: string[]
    screenshots: string[]
  }
  suggestions: string[]
  relatedFiles: string[]
}

export interface DocumentationAnalysis {
  existingDocs: string[]
  coverage: {
    overall: number
    byType: Record<string, number>
    missing: string[]
  }
  quality: {
    score: number
    issues: Array<{
      type: 'outdated' | 'missing' | 'inconsistent' | 'unclear'
      description: string
      severity: 'low' | 'medium' | 'high'
      file: string
      line?: number
    }>
    suggestions: string[]
  }
  structure: {
    hierarchy: any
    navigation: string[]
    crossReferences: Record<string, string[]>
  }
}

export interface APIDocumentation {
  endpoints: Array<{
    path: string
    method: string
    description: string
    parameters: any[]
    responses: any[]
    examples: any[]
  }>
  schemas: Record<string, any>
  authentication: any
  rateLimit: any
  errorCodes: Record<string, string>
}

export interface InlineDocumentation {
  file: string
  functions: Array<{
    name: string
    description: string
    parameters: any[]
    returns: any
    examples: string[]
    jsdoc: string
  }>
  classes: Array<{
    name: string
    description: string
    constructor: any
    methods: any[]
    properties: any[]
    jsdoc: string
  }>
  interfaces: Array<{
    name: string
    description: string
    properties: any[]
    jsdoc: string
  }>
}

/**
 * AI-Powered Documentation Assistant
 * 
 * This service provides comprehensive documentation automation including:
 * - Intelligent documentation generation from code
 * - Multi-format output (Markdown, HTML, PDF, etc.)
 * - API documentation with OpenAPI/Swagger support
 * - Inline code documentation (JSDoc, TypeDoc)
 * - User guides and tutorials
 * - Documentation quality analysis and improvement
 * - Automated documentation updates
 */
export class DocumentationAssistant extends EventEmitter {
  private aiModelManager: AIModelManager
  private codeAnalysis: AdvancedCodeAnalysisService
  private codeGenerator: IntelligentCodeGenerator
  private cacheService: AdvancedCacheService
  private documentationHistory: Map<string, GeneratedDocumentation[]> = new Map()
  private templates: Map<string, any> = new Map()
  private workspaceRoot: string

  constructor(
    aiModelManager: AIModelManager,
    codeAnalysis: AdvancedCodeAnalysisService,
    codeGenerator: IntelligentCodeGenerator,
    cacheService: AdvancedCacheService,
    workspaceRoot: string = process.cwd()
  ) {
    super()
    this.aiModelManager = aiModelManager
    this.codeAnalysis = codeAnalysis
    this.codeGenerator = codeGenerator
    this.cacheService = cacheService
    this.workspaceRoot = workspaceRoot
    this.initialize()
  }

  private async initialize(): Promise<void> {
    await this.initializeTemplates()
    this.setupEventHandlers()
    this.emit('initialized')
  }

  private async initializeTemplates(): Promise<void> {
    const templates = {
      README: {
        sections: [
          'title',
          'description',
          'installation',
          'usage',
          'api',
          'contributing',
          'license'
        ],
        template: `# {{title}}

{{description}}

## Installation

\`\`\`bash
{{installationCommand}}
\`\`\`

## Usage

{{usageExamples}}

## API Reference

{{apiDocumentation}}

## Contributing

{{contributingGuidelines}}

## License

{{license}}`
      },
      API: {
        sections: [
          'overview',
          'authentication',
          'endpoints',
          'schemas',
          'examples',
          'errors'
        ],
        template: `# API Documentation

## Overview
{{overview}}

## Authentication
{{authentication}}

## Endpoints
{{endpoints}}

## Schemas
{{schemas}}

## Examples
{{examples}}

## Error Codes
{{errorCodes}}`
      },
      JSDoc: {
        function: `/**
 * {{description}}
 * {{parameters}}
 * @returns {{{returnType}}} {{returnDescription}}
 * @example
 * {{example}}
 */`,
        class: `/**
 * {{description}}
 * {{classDetails}}
 * @example
 * {{example}}
 */`,
        interface: `/**
 * {{description}}
 * {{interfaceDetails}}
 */`
      }
    }

    this.templates.set('documentation', templates)
    await this.cacheService.set('doc-templates', templates, { ttl: 3600000 })
  }

  private setupEventHandlers(): void {
    this.on('documentation-generated', (request: DocumentationRequest, result: GeneratedDocumentation) => {
      this.recordDocumentationGeneration(request, result)
    })

    this.on('documentation-updated', (filePath: string, changes: any) => {
      this.trackDocumentationChanges(filePath, changes)
    })
  }

  /**
   * Generate comprehensive documentation
   */
  async generateDocumentation(request: DocumentationRequest): Promise<GeneratedDocumentation> {
    const cacheKey = `doc-gen:${JSON.stringify(request)}`
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey)
    if (cached) {
      this.emit('cache-hit', cacheKey)
      return cached
    }

    try {
      // Analyze the target
      const analysis = await this.analyzeTarget(request.targetPath, request.type)
      
      // Generate content based on type
      let content: string
      let sections: any[]
      
      switch (request.type) {
        case 'README':
          ({ content, sections } = await this.generateREADME(analysis, request))
          break
        case 'api':
          ({ content, sections } = await this.generateAPIDocumentation(analysis, request))
          break
        case 'inline':
          ({ content, sections } = await this.generateInlineDocumentation(analysis, request))
          break
        case 'technical':
          ({ content, sections } = await this.generateTechnicalDocumentation(analysis, request))
          break
        case 'user-guide':
          ({ content, sections } = await this.generateUserGuide(analysis, request))
          break
        default:
          ({ content, sections } = await this.generateGenericDocumentation(analysis, request))
      }

      // Generate supporting assets
      const assets = await this.generateAssets(analysis, request)
      
      // Calculate metadata
      const metadata = this.calculateMetadata(content, analysis)
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(analysis, request)
      
      // Find related files
      const relatedFiles = await this.findRelatedFiles(request.targetPath)

      const result: GeneratedDocumentation = {
        content,
        format: request.format,
        sections,
        metadata,
        assets,
        suggestions,
        relatedFiles
      }

      // Cache the result
      await this.cacheService.set(cacheKey, result, { ttl: 1800000 })
      
      this.emit('documentation-generated', request, result)
      return result

    } catch (error) {
      this.emit('documentation-error', request, error)
      throw error
    }
  }

  private async analyzeTarget(targetPath: string, docType: string): Promise<any> {
    const analysis: any = {
      type: 'unknown',
      files: [],
      structure: {},
      codeAnalysis: null,
      projectInfo: {}
    }

    try {
      const stats = await fs.promises.stat(targetPath)
      
      if (stats.isDirectory()) {
        analysis.type = 'directory'
        analysis.files = await this.getDirectoryFiles(targetPath)
        analysis.structure = await this.analyzeDirectoryStructure(targetPath)
      } else {
        analysis.type = 'file'
        analysis.files = [targetPath]
        analysis.codeAnalysis = await this.codeAnalysis.analyzeFile(targetPath)
      }

      // Get project information
      analysis.projectInfo = await this.getProjectInfo()
      
      // Analyze based on documentation type
      if (docType === 'api') {
        analysis.apiInfo = await this.analyzeAPIStructure(analysis.files)
      }

    } catch (error) {
      console.error('Target analysis failed:', error)
    }

    return analysis
  }

  private async getDirectoryFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.promises.readdir(dirPath, { recursive: true })
      
      for (const entry of entries) {
        if (typeof entry === 'string' && this.isDocumentableFile(entry)) {
          files.push(path.join(dirPath, entry))
        }
      }
    } catch (error) {
      console.error('Directory analysis failed:', error)
    }

    return files
  }

  private isDocumentableFile(fileName: string): boolean {
    const documentableExtensions = ['.ts', '.js', '.jsx', '.tsx', '.py', '.java', '.cs', '.cpp', '.c']
    return documentableExtensions.some(ext => fileName.endsWith(ext)) &&
           !fileName.includes('node_modules') &&
           !fileName.includes('.test.') &&
           !fileName.includes('.spec.')
  }

  private async analyzeDirectoryStructure(dirPath: string): Promise<any> {
    const structure: any = {
      modules: [],
      components: [],
      services: [],
      utilities: [],
      types: []
    }

    try {
      const files = await this.getDirectoryFiles(dirPath)
      
      for (const file of files) {
        const relativePath = path.relative(dirPath, file)
        const category = this.categorizeFile(relativePath)
        
        if (structure[category]) {
          structure[category].push(relativePath)
        }
      }
    } catch (error) {
      console.error('Directory structure analysis failed:', error)
    }

    return structure
  }

  private categorizeFile(filePath: string): string {
    if (filePath.includes('component')) return 'components'
    if (filePath.includes('service')) return 'services'
    if (filePath.includes('util') || filePath.includes('helper')) return 'utilities'
    if (filePath.includes('type') || filePath.includes('interface')) return 'types'
    return 'modules'
  }

  private async getProjectInfo(): Promise<any> {
    const info: any = {
      name: 'Unknown Project',
      version: '1.0.0',
      description: '',
      dependencies: [],
      scripts: {}
    }

    try {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json')
      const packageContent = await fs.promises.readFile(packageJsonPath, 'utf8')
      const packageData = JSON.parse(packageContent)
      
      info.name = packageData.name || info.name
      info.version = packageData.version || info.version
      info.description = packageData.description || info.description
      info.dependencies = Object.keys(packageData.dependencies || {})
      info.scripts = packageData.scripts || {}
      
    } catch (error) {
      console.error('Project info analysis failed:', error)
    }

    return info
  }

  private async analyzeAPIStructure(files: string[]): Promise<any> {
    const apiInfo: any = {
      endpoints: [],
      schemas: {},
      authentication: null,
      middleware: []
    }

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf8')
        
        // Look for API patterns
        const endpoints = this.extractAPIEndpoints(content)
        apiInfo.endpoints.push(...endpoints)
        
        const schemas = this.extractSchemas(content)
        Object.assign(apiInfo.schemas, schemas)
        
      } catch (error) {
        console.error(`API analysis failed for ${file}:`, error)
      }
    }

    return apiInfo
  }

  private extractAPIEndpoints(content: string): any[] {
    const endpoints: any[] = []
    
    // Look for Express.js style routes
    const routeMatches = content.match(/(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g)
    
    if (routeMatches) {
      for (const match of routeMatches) {
        const methodMatch = match.match(/\.(get|post|put|delete|patch)/)
        const pathMatch = match.match(/['"`]([^'"`]+)['"`]/)
        
        if (methodMatch && pathMatch) {
          endpoints.push({
            method: methodMatch[1].toUpperCase(),
            path: pathMatch[1],
            description: this.extractEndpointDescription(content, match)
          })
        }
      }
    }

    return endpoints
  }

  private extractEndpointDescription(content: string, routeMatch: string): string {
    const matchIndex = content.indexOf(routeMatch)
    if (matchIndex === -1) return 'No description available'
    
    // Look for comments before the route
    const beforeRoute = content.substring(0, matchIndex)
    const commentMatch = beforeRoute.match(/\/\*\*([\s\S]*?)\*\/\s*$/m)
    
    if (commentMatch) {
      return commentMatch[1]
        .replace(/\s*\*\s?/g, '')
        .trim()
        .split('\n')[0] // First line only
    }

    return 'No description available'
  }

  private extractSchemas(content: string): Record<string, any> {
    const schemas: Record<string, any> = {}
    
    // Look for TypeScript interfaces
    const interfaceMatches = content.match(/interface\s+(\w+)\s*{[^}]+}/g)
    
    if (interfaceMatches) {
      for (const match of interfaceMatches) {
        const nameMatch = match.match(/interface\s+(\w+)/)
        if (nameMatch) {
          schemas[nameMatch[1]] = {
            type: 'interface',
            definition: match
          }
        }
      }
    }

    return schemas
  }

  private async generateREADME(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = this.buildREADMEPrompt(analysis, request)
    
    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 3000,
      temperature: 0.3,
      modelId: 'deepseek-coder'
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private buildREADMEPrompt(analysis: any, request: DocumentationRequest): string {
    return `
# Generate README Documentation

## Project Information
- Name: ${analysis.projectInfo.name}
- Version: ${analysis.projectInfo.version}
- Description: ${analysis.projectInfo.description}

## Project Structure
- Files: ${analysis.files?.length || 0}
- Modules: ${analysis.structure?.modules?.length || 0}
- Services: ${analysis.structure?.services?.length || 0}
- Components: ${analysis.structure?.components?.length || 0}

## Requirements
- Audience: ${request.audience}
- Tone: ${request.style.tone}
- Depth: ${request.style.depth}
- Include examples: ${request.options.includeExamples}

## Instructions
Generate a comprehensive README.md that includes:
1. Project title and description
2. Installation instructions
3. Usage examples
4. API reference (if applicable)
5. Contributing guidelines
6. License information

Make it ${request.style.tone} and ${request.style.depth} for ${request.audience} audience.
`
  }

  private async generateAPIDocumentation(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = `
# Generate API Documentation

## API Structure
- Endpoints: ${analysis.apiInfo?.endpoints?.length || 0}
- Schemas: ${Object.keys(analysis.apiInfo?.schemas || {}).length}

## Endpoints
${analysis.apiInfo?.endpoints?.map((ep: any) => `${ep.method} ${ep.path}: ${ep.description}`).join('\n') || 'No endpoints found'}

## Requirements
- Format: ${request.format}
- Include examples: ${request.options.includeExamples}
- Include types: ${request.options.includeTypes}

Generate comprehensive API documentation with:
1. Overview and authentication
2. Endpoint details with parameters and responses
3. Schema definitions
4. Usage examples
5. Error codes and handling
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 4000,
      temperature: 0.2
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private async generateInlineDocumentation(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = `
# Generate Inline Documentation

## Code Analysis
- Functions: ${analysis.codeAnalysis?.methods?.length || 0}
- Classes: ${analysis.codeAnalysis?.classes?.length || 0}
- Complexity: ${analysis.codeAnalysis?.metrics?.cyclomaticComplexity || 0}

## Source Code
\`\`\`typescript
${analysis.codeAnalysis?.content || 'No source code available'}
\`\`\`

## Requirements
- Format: JSDoc style
- Include parameters and return types
- Include usage examples
- Target audience: ${request.audience}

Generate comprehensive inline documentation (JSDoc comments) for all public methods, classes, and interfaces.
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 3500,
      temperature: 0.3
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private async generateTechnicalDocumentation(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = `
# Generate Technical Documentation

## Project Analysis
- Type: ${analysis.type}
- Files analyzed: ${analysis.files?.length || 0}
- Project: ${analysis.projectInfo?.name}

## Architecture
${JSON.stringify(analysis.structure, null, 2)}

## Requirements
- Depth: ${request.style.depth}
- Include diagrams: ${request.options.generateDiagrams}
- Technical audience

Generate technical documentation covering:
1. Architecture overview
2. System design
3. Data flow
4. Implementation details
5. Deployment guide
6. Troubleshooting
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 4000,
      temperature: 0.3
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private async generateUserGuide(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = `
# Generate User Guide

## Project Information
- Name: ${analysis.projectInfo?.name}
- Description: ${analysis.projectInfo?.description}

## Target Audience
- ${request.audience}
- Tone: ${request.style.tone}
- Experience level: ${request.style.depth}

Generate a user-friendly guide that includes:
1. Getting started
2. Basic usage
3. Common tasks
4. Troubleshooting
5. FAQ
6. Support information

Make it accessible and easy to follow for ${request.audience}.
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 3000,
      temperature: 0.4
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private async generateGenericDocumentation(analysis: any, request: DocumentationRequest): Promise<{ content: string; sections: any[] }> {
    const prompt = `
# Generate ${request.type} Documentation

## Analysis Results
${JSON.stringify(analysis, null, 2)}

## Requirements
- Type: ${request.type}
- Format: ${request.format}
- Audience: ${request.audience}
- Tone: ${request.style.tone}

Generate appropriate documentation based on the analysis and requirements.
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 2500,
      temperature: 0.3
    })

    const content = this.formatDocumentation(response.content, request.format)
    const sections = this.extractSections(content)

    return { content, sections }
  }

  private formatDocumentation(content: string, format: string): string {
    switch (format) {
      case 'markdown':
        return content
      case 'html':
        return this.convertMarkdownToHTML(content)
      case 'json':
        return JSON.stringify({ content }, null, 2)
      default:
        return content
    }
  }

  private convertMarkdownToHTML(markdown: string): string {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  }

  private extractSections(content: string): any[] {
    const sections: any[] = []
    const lines = content.split('\n')
    let currentSection: any = null

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        currentSection = {
          title: headerMatch[2],
          level: headerMatch[1].length,
          content: '',
          subsections: []
        }
      } else if (currentSection) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  private async generateAssets(analysis: any, request: DocumentationRequest): Promise<any> {
    const assets: any = {
      diagrams: [],
      examples: [],
      screenshots: []
    }

    if (request.options.generateDiagrams) {
      assets.diagrams = await this.generateDiagrams(analysis)
    }

    if (request.options.includeExamples) {
      assets.examples = await this.generateExamples(analysis)
    }

    return assets
  }

  private async generateDiagrams(analysis: any): Promise<string[]> {
    const diagrams: string[] = []
    
    // Generate Mermaid diagrams for architecture
    if (analysis.structure?.modules?.length > 0) {
      const flowchart = this.generateFlowchartDiagram(analysis.structure)
      diagrams.push(flowchart)
    }

    return diagrams
  }

  private generateFlowchartDiagram(structure: any): string {
    let mermaid = 'flowchart TD\n'
    
    // Add modules
    structure.modules?.forEach((module: string, index: number) => {
      mermaid += `  A${index}[${module}]\n`
    })

    // Add services
    structure.services?.forEach((service: string, index: number) => {
      mermaid += `  B${index}[${service}]\n`
    })

    return mermaid
  }

  private async generateExamples(analysis: any): Promise<string[]> {
    const examples: string[] = []
    
    // Generate usage examples based on analysis
    if (analysis.codeAnalysis?.methods?.length > 0) {
      for (const method of analysis.codeAnalysis.methods.slice(0, 3)) {
        const example = await this.generateMethodExample(method)
        examples.push(example)
      }
    }

    return examples
  }

  private async generateMethodExample(method: any): Promise<string> {
    const prompt = `
Generate a usage example for this method:

Name: ${method.name}
Parameters: ${method.parameters?.map((p: any) => `${p.name}: ${p.type}`).join(', ') || 'none'}

Create a practical, realistic usage example with proper setup and explanation.
`

    const response = await this.aiModelManager.makeRequest(prompt, {
      maxTokens: 500,
      temperature: 0.4
    })

    return response.content.trim()
  }

  private calculateMetadata(content: string, analysis: any): any {
    const wordCount = content.split(/\s+/).length
    const readingTime = Math.ceil(wordCount / 200) // Average reading speed
    
    return {
      generatedAt: new Date(),
      version: analysis.projectInfo?.version || '1.0.0',
      coverage: this.calculateDocumentationCoverage(content, analysis),
      wordCount,
      readingTime
    }
  }

  private calculateDocumentationCoverage(content: string, analysis: any): number {
    // Calculate how well the documentation covers the code
    let coverage = 0
    const totalMethods = analysis.codeAnalysis?.methods?.length || 0
    
    if (totalMethods > 0) {
      let documentedMethods = 0
      
      for (const method of analysis.codeAnalysis.methods) {
        if (content.includes(method.name)) {
          documentedMethods++
        }
      }
      
      coverage = (documentedMethods / totalMethods) * 100
    }

    return Math.round(coverage)
  }

  private async generateSuggestions(analysis: any, request: DocumentationRequest): Promise<string[]> {
    const suggestions: string[] = []
    
    // Generate context-aware suggestions
    if (request.type === 'README' && !analysis.projectInfo?.scripts?.test) {
      suggestions.push('Consider adding testing instructions to the README')
    }

    if (request.type === 'api' && !analysis.apiInfo?.authentication) {
      suggestions.push('Add authentication documentation for API endpoints')
    }

    if (request.options.includeExamples && analysis.codeAnalysis?.methods?.length > 5) {
      suggestions.push('Consider creating separate example files for complex methods')
    }

    return suggestions
  }

  private async findRelatedFiles(targetPath: string): Promise<string[]> {
    const related: string[] = []
    
    try {
      const directory = path.dirname(targetPath)
      const files = await fs.promises.readdir(directory)
      
      for (const file of files) {
        if (file.includes('README') || 
            file.includes('CHANGELOG') || 
            file.includes('CONTRIBUTING') ||
            file.includes('.md')) {
          related.push(path.join(directory, file))
        }
      }
    } catch (error) {
      console.error('Related files search failed:', error)
    }

    return related
  }

  /**
   * Analyze existing documentation quality and coverage
   */
  async analyzeExistingDocumentation(projectPath: string): Promise<DocumentationAnalysis> {
    try {
      const existingDocs = await this.findExistingDocumentation(projectPath)
      const coverage = await this.calculateDocumentationCoverage2(projectPath, existingDocs)
      const quality = await this.assessDocumentationQuality(existingDocs)
      const structure = await this.analyzeDocumentationStructure(existingDocs)

      return {
        existingDocs,
        coverage,
        quality,
        structure
      }

    } catch (error) {
      console.error('Documentation analysis failed:', error)
      throw error
    }
  }

  private async findExistingDocumentation(projectPath: string): Promise<string[]> {
    const docs: string[] = []
    
    try {
      const files = await fs.promises.readdir(projectPath, { recursive: true })
      
      for (const file of files) {
        if (typeof file === 'string' && this.isDocumentationFile(file)) {
          docs.push(path.join(projectPath, file))
        }
      }
    } catch (error) {
      console.error('Documentation discovery failed:', error)
    }

    return docs
  }

  private isDocumentationFile(fileName: string): boolean {
    return fileName.endsWith('.md') ||
           fileName.endsWith('.rst') ||
           fileName.endsWith('.txt') ||
           fileName.includes('README') ||
           fileName.includes('CHANGELOG') ||
           fileName.includes('CONTRIBUTING') ||
           fileName.includes('docs/')
  }

  private async calculateDocumentationCoverage2(projectPath: string, existingDocs: string[]): Promise<any> {
    const sourceFiles = await this.getDirectoryFiles(projectPath)
    const coverage = {
      overall: 0,
      byType: {} as Record<string, number>,
      missing: [] as string[]
    }

    // Calculate overall coverage
    const expectedDocs = sourceFiles.length
    const actualDocs = existingDocs.length
    coverage.overall = expectedDocs > 0 ? (actualDocs / expectedDocs) * 100 : 0

    // Calculate by type
    coverage.byType['README'] = existingDocs.some(doc => doc.includes('README')) ? 100 : 0
    coverage.byType['API'] = existingDocs.some(doc => doc.includes('api') || doc.includes('API')) ? 100 : 0
    coverage.byType['Contributing'] = existingDocs.some(doc => doc.includes('CONTRIBUTING')) ? 100 : 0

    // Find missing documentation
    if (!existingDocs.some(doc => doc.includes('README'))) {
      coverage.missing.push('README.md')
    }
    if (!existingDocs.some(doc => doc.includes('CHANGELOG'))) {
      coverage.missing.push('CHANGELOG.md')
    }

    return coverage
  }

  private async assessDocumentationQuality(docs: string[]): Promise<any> {
    const quality = {
      score: 0,
      issues: [] as any[],
      suggestions: [] as string[]
    }

    let totalScore = 0
    let fileCount = 0

    for (const docPath of docs) {
      try {
        const content = await fs.promises.readFile(docPath, 'utf8')
        const fileScore = this.scoreDocumentationFile(content, docPath)
        totalScore += fileScore.score
        fileCount++
        
        quality.issues.push(...fileScore.issues)
        quality.suggestions.push(...fileScore.suggestions)

      } catch (error) {
        console.error(`Failed to assess ${docPath}:`, error)
      }
    }

    quality.score = fileCount > 0 ? Math.round(totalScore / fileCount) : 0

    return quality
  }

  private scoreDocumentationFile(content: string, filePath: string): any {
    let score = 100
    const issues: any[] = []
    const suggestions: string[] = []

    // Check for basic structure
    if (!content.includes('#')) {
      score -= 20
      issues.push({
        type: 'missing',
        description: 'No headers found',
        severity: 'medium',
        file: filePath
      })
    }

    // Check for examples
    if (!content.includes('```') && !content.includes('`')) {
      score -= 15
      suggestions.push('Add code examples to improve clarity')
    }

    // Check length
    if (content.length < 200) {
      score -= 10
      issues.push({
        type: 'unclear',
        description: 'Documentation is very brief',
        severity: 'low',
        file: filePath
      })
    }

    // Check for table of contents (for long docs)
    if (content.length > 2000 && !content.includes('Table of Contents')) {
      suggestions.push('Consider adding a table of contents for easier navigation')
    }

    return { score: Math.max(0, score), issues, suggestions }
  }

  private async analyzeDocumentationStructure(docs: string[]): Promise<any> {
    const structure = {
      hierarchy: {} as Record<string, any>,
      navigation: [] as string[],
      crossReferences: {} as Record<string, string[]>
    }

    // Analyze hierarchy and navigation
    for (const docPath of docs) {
      try {
        const content = await fs.promises.readFile(docPath, 'utf8')
        const headers = this.extractHeaders(content)
        
        structure.hierarchy[docPath] = headers
        structure.navigation.push(...headers.map((h: any) => h.text))
        
        // Find cross-references
        const refs = this.findCrossReferences(content)
        structure.crossReferences[docPath] = refs

      } catch (error) {
        console.error(`Structure analysis failed for ${docPath}:`, error)
      }
    }

    return structure
  }

  private extractHeaders(content: string): any[] {
    const headers: any[] = []
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headerMatch) {
        headers.push({
          level: headerMatch[1].length,
          text: headerMatch[2],
          line: i + 1
        })
      }
    }

    return headers
  }

  private findCrossReferences(content: string): string[] {
    const refs: string[] = []
    
    // Find markdown links
    const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g)
    if (linkMatches) {
      for (const match of linkMatches) {
        const urlMatch = match.match(/\]\(([^)]+)\)/)
        if (urlMatch) {
          refs.push(urlMatch[1])
        }
      }
    }

    return refs
  }

  // Helper methods
  private recordDocumentationGeneration(request: DocumentationRequest, result: GeneratedDocumentation): void {
    const history = this.documentationHistory.get(request.type) || []
    history.push(result)
    this.documentationHistory.set(request.type, history.slice(-50)) // Keep last 50
  }

  private trackDocumentationChanges(filePath: string, changes: any): void {
    // Track changes for analytics and improvement
    console.log(`Documentation updated: ${filePath}`, changes)
  }

  /**
   * Get documentation statistics and insights
   */
  getDocumentationStatistics(): any {
    const totalDocs = Array.from(this.documentationHistory.values())
      .reduce((sum, history) => sum + history.length, 0)

    return {
      totalDocsGenerated: totalDocs,
      docsByType: this.getDocsByType(),
      averageCoverage: this.calculateAverageCoverage(),
      popularFormats: this.getPopularFormats(),
      qualityTrends: this.getQualityTrends()
    }
  }

  private getDocsByType(): Record<string, number> {
    const counts: Record<string, number> = {}
    
    for (const [type, history] of this.documentationHistory.entries()) {
      counts[type] = history.length
    }
    
    return counts
  }

  private calculateAverageCoverage(): number {
    const allDocs = Array.from(this.documentationHistory.values()).flat()
    if (allDocs.length === 0) return 0
    
    return allDocs.reduce((sum, doc) => sum + doc.metadata.coverage, 0) / allDocs.length
  }

  private getPopularFormats(): Record<string, number> {
    const counts: Record<string, number> = {}
    const allDocs = Array.from(this.documentationHistory.values()).flat()
    
    for (const doc of allDocs) {
      counts[doc.format] = (counts[doc.format] || 0) + 1
    }
    
    return counts
  }

  private getQualityTrends(): any {
    // This would track quality improvements over time
    return {
      improvingCoverage: true,
      increasingDetail: true,
      betterExamples: true
    }
  }
}
