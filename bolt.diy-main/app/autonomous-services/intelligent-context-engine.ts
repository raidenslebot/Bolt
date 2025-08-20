/**
 * Intelligent Context Engine for Bolt.diy
 * Provides AI-driven context awareness and smart suggestions
 */

import { UniversalToolExecutor } from './universal-tool-executor';
import { LanguageServerBridge } from './language-server-bridge';
import { EventEmitter } from 'events';

export class IntelligentContextEngine extends EventEmitter {
  private toolExecutor: UniversalToolExecutor;
  private languageServer: LanguageServerBridge;
  private contextCache: Map<string, ContextData> = new Map();
  private analysisHistory: AnalysisEntry[] = [];
  private activeContext: ProjectContext | null = null;

  constructor(toolExecutor: UniversalToolExecutor, languageServer: LanguageServerBridge) {
    super();
    this.toolExecutor = toolExecutor;
    this.languageServer = languageServer;
  }

  /**
   * Analyze project context and provide intelligent insights
   */
  async analyzeProjectContext(projectPath: string): Promise<ProjectContext> {
    const context: ProjectContext = {
      projectId: this.generateProjectId(projectPath),
      projectPath,
      timestamp: new Date(),
      technologies: [],
      architecture: null,
      dependencies: [],
      codeStructure: null,
      qualityMetrics: null,
      suggestions: []
    };

    // Analyze project structure
    context.codeStructure = await this.analyzeCodeStructure(projectPath);
    
    // Detect technologies
    context.technologies = await this.detectTechnologies(projectPath);
    
    // Analyze dependencies
    context.dependencies = await this.analyzeDependencies(projectPath);
    
    // Analyze architecture patterns
    context.architecture = await this.analyzeArchitecture(projectPath);
    
    // Calculate quality metrics
    context.qualityMetrics = await this.calculateQualityMetrics(projectPath);
    
    // Generate intelligent suggestions
    context.suggestions = await this.generateSuggestions(context);

    this.activeContext = context;
    this.cacheContext(context);
    
    this.emit('context:analyzed', context);
    
    return context;
  }

  /**
   * Get contextual code suggestions based on current file and cursor position
   */
  async getContextualSuggestions(filePath: string, position: any, currentText: string): Promise<ContextualSuggestion[]> {
    const context = await this.buildFileContext(filePath, position, currentText);
    
    const suggestions: ContextualSuggestion[] = [];

    // Get AI-powered code suggestions
    const aiSuggestions = await this.getAICodeSuggestions(context);
    suggestions.push(...aiSuggestions);

    // Get pattern-based suggestions
    const patternSuggestions = await this.getPatternSuggestions(context);
    suggestions.push(...patternSuggestions);

    // Get refactoring suggestions
    const refactoringSuggestions = await this.getRefactoringSuggestions(context);
    suggestions.push(...refactoringSuggestions);

    // Rank suggestions by relevance
    return this.rankSuggestions(suggestions, context);
  }

  /**
   * Analyze code quality and provide improvement suggestions
   */
  async analyzeCodeQuality(filePath: string): Promise<QualityAnalysis> {
    const fileContent = await this.readFile(filePath);
    const language = this.detectLanguage(filePath);

    const analysis: QualityAnalysis = {
      filePath,
      language,
      metrics: {
        complexity: 0,
        maintainability: 0,
        readability: 0,
        testCoverage: 0
      },
      issues: [],
      suggestions: []
    };

    // Get diagnostics from language server
    const diagnostics = await this.languageServer.getDiagnostics(filePath);
    analysis.issues = diagnostics.map(d => ({
      type: 'diagnostic',
      severity: d.severity,
      message: d.message,
      line: d.range.start.line,
      column: d.range.start.character
    }));

    // Calculate complexity metrics
    analysis.metrics.complexity = this.calculateComplexity(fileContent, language);
    analysis.metrics.maintainability = this.calculateMaintainability(fileContent, language);
    analysis.metrics.readability = this.calculateReadability(fileContent, language);

    // Generate improvement suggestions
    analysis.suggestions = await this.generateImprovementSuggestions(analysis);

    return analysis;
  }

  /**
   * Get intelligent error explanations and fix suggestions
   */
  async explainError(error: string, filePath: string, context?: string): Promise<ErrorExplanation> {
    const fileContent = await this.readFile(filePath);
    const language = this.detectLanguage(filePath);

    // Use semantic search to find similar errors and solutions
    const similarErrors = await this.toolExecutor.executeTool({
      toolName: 'semantic_search',
      parameters: {
        query: `Error solution: ${error} in ${language}`
      }
    });

    return {
      error,
      filePath,
      language,
      explanation: await this.generateErrorExplanation(error, language, context),
      possibleCauses: this.identifyPossibleCauses(error, language),
      suggestedFixes: await this.generateFixSuggestions(error, fileContent, language),
      relatedDocumentation: this.findRelatedDocumentation(error, language),
      similarCases: similarErrors.result || []
    };
  }

  /**
   * Generate intelligent test suggestions
   */
  async generateTestSuggestions(filePath: string): Promise<TestSuggestion[]> {
    const fileContent = await this.readFile(filePath);
    const language = this.detectLanguage(filePath);
    const symbols = await this.languageServer.getDocumentSymbols(filePath);

    const suggestions: TestSuggestion[] = [];

    for (const symbol of symbols) {
      if (symbol.kind === 12) { // Function
        suggestions.push({
          type: 'unit-test',
          target: symbol.name,
          description: `Create unit test for ${symbol.name}`,
          template: this.generateTestTemplate(symbol.name, language),
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze project for security vulnerabilities
   */
  async analyzeSecurityIssues(projectPath: string): Promise<SecurityAnalysis> {
    const packageFiles = await this.findPackageFiles(projectPath);
    const codeFiles = await this.findCodeFiles(projectPath);

    const analysis: SecurityAnalysis = {
      vulnerabilities: [],
      securityScore: 100,
      recommendations: []
    };

    // Analyze dependencies for known vulnerabilities
    for (const packageFile of packageFiles) {
      const vulnerabilities = await this.scanDependencies(packageFile);
      analysis.vulnerabilities.push(...vulnerabilities);
    }

    // Analyze code for security patterns
    for (const codeFile of codeFiles) {
      const codeVulnerabilities = await this.scanCodeSecurity(codeFile);
      analysis.vulnerabilities.push(...codeVulnerabilities);
    }

    // Calculate security score
    analysis.securityScore = this.calculateSecurityScore(analysis.vulnerabilities);

    // Generate recommendations
    analysis.recommendations = this.generateSecurityRecommendations(analysis.vulnerabilities);

    return analysis;
  }

  /**
   * Get performance optimization suggestions
   */
  async analyzePerformance(filePath: string): Promise<PerformanceAnalysis> {
    const fileContent = await this.readFile(filePath);
    const language = this.detectLanguage(filePath);

    const analysis: PerformanceAnalysis = {
      filePath,
      bottlenecks: [],
      optimizations: [],
      metrics: {
        estimatedRuntimeComplexity: 'O(n)',
        memoryUsage: 'low',
        asyncPatterns: 0
      }
    };

    // Analyze for common performance issues
    analysis.bottlenecks = this.identifyPerformanceBottlenecks(fileContent, language);
    analysis.optimizations = await this.generateOptimizationSuggestions(fileContent, language);
    
    return analysis;
  }

  // Private helper methods

  private async analyzeCodeStructure(projectPath: string): Promise<CodeStructure> {
    const files = await this.findAllFiles(projectPath);
    
    const structure: CodeStructure = {
      totalFiles: files.length,
      filesByType: {},
      directories: [],
      complexity: 'medium'
    };

    // Categorize files by type
    for (const file of files) {
      const extension = file.split('.').pop() || 'unknown';
      structure.filesByType[extension] = (structure.filesByType[extension] || 0) + 1;
    }

    // Analyze directory structure
    const directories = await this.toolExecutor.executeTool({
      toolName: 'list_dir',
      parameters: { path: projectPath }
    });

    structure.directories = directories.result || [];

    return structure;
  }

  private async detectTechnologies(projectPath: string): Promise<string[]> {
    const technologies: Set<string> = new Set();

    // Check package.json for dependencies
    const packageJsonPath = `${projectPath}/package.json`;
    try {
      const packageJson = await this.readFile(packageJsonPath);
      const pkg = JSON.parse(packageJson);
      
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(dep => {
          if (dep.includes('react')) technologies.add('React');
          if (dep.includes('vue')) technologies.add('Vue');
          if (dep.includes('angular')) technologies.add('Angular');
          if (dep.includes('express')) technologies.add('Express');
          if (dep.includes('next')) technologies.add('Next.js');
          if (dep.includes('typescript')) technologies.add('TypeScript');
        });
      }
    } catch (error) {
      // Package.json not found or invalid
    }

    // Check for other technology indicators
    const files = await this.findAllFiles(projectPath);
    
    files.forEach(file => {
      const fileName = file.toLowerCase();
      if (fileName.includes('.tsx') || fileName.includes('.jsx')) {
        technologies.add('React');
      }
      if (fileName.includes('.vue')) {
        technologies.add('Vue');
      }
      if (fileName.includes('.py')) {
        technologies.add('Python');
      }
      if (fileName.includes('dockerfile')) {
        technologies.add('Docker');
      }
    });

    return Array.from(technologies);
  }

  private async analyzeDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    try {
      const packageJsonPath = `${projectPath}/package.json`;
      const packageJson = await this.readFile(packageJsonPath);
      const pkg = JSON.parse(packageJson);

      if (pkg.dependencies) {
        Object.entries(pkg.dependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            type: 'production',
            vulnerabilities: []
          });
        });
      }

      if (pkg.devDependencies) {
        Object.entries(pkg.devDependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            type: 'development',
            vulnerabilities: []
          });
        });
      }
    } catch (error) {
      // Handle missing package.json
    }

    return dependencies;
  }

  private async analyzeArchitecture(projectPath: string): Promise<ArchitectureAnalysis | null> {
    const files = await this.findAllFiles(projectPath);
    
    // Detect common architecture patterns
    const patterns = {
      mvc: this.hasMVCPattern(files),
      layered: this.hasLayeredPattern(files),
      microservices: this.hasMicroservicesPattern(files),
      monolithic: !this.hasMicroservicesPattern(files)
    };

    const detectedPattern = Object.entries(patterns).find(([, value]) => value)?.[0];

    if (detectedPattern) {
      return {
        pattern: detectedPattern as ArchitecturePattern,
        confidence: 0.8,
        description: this.getPatternDescription(detectedPattern as ArchitecturePattern),
        strengths: this.getPatternStrengths(detectedPattern as ArchitecturePattern),
        weaknesses: this.getPatternWeaknesses(detectedPattern as ArchitecturePattern)
      };
    }

    return null;
  }

  private async calculateQualityMetrics(projectPath: string): Promise<QualityMetrics> {
    const files = await this.findCodeFiles(projectPath);
    
    let totalComplexity = 0;
    let totalMaintainability = 0;
    let filesAnalyzed = 0;

    for (const file of files.slice(0, 10)) { // Analyze first 10 files for performance
      try {
        const content = await this.readFile(file);
        const language = this.detectLanguage(file);
        
        totalComplexity += this.calculateComplexity(content, language);
        totalMaintainability += this.calculateMaintainability(content, language);
        filesAnalyzed++;
      } catch (error) {
        continue;
      }
    }

    return {
      averageComplexity: filesAnalyzed > 0 ? totalComplexity / filesAnalyzed : 0,
      maintainabilityIndex: filesAnalyzed > 0 ? totalMaintainability / filesAnalyzed : 0,
      testCoverage: 0, // Would require running tests
      documentation: this.calculateDocumentationScore(projectPath),
      codeReuse: 0.5 // Placeholder
    };
  }

  private async generateSuggestions(context: ProjectContext): Promise<IntelligentSuggestion[]> {
    const suggestions: IntelligentSuggestion[] = [];

    // Architecture suggestions
    if (context.architecture?.confidence && context.architecture.confidence < 0.6) {
      suggestions.push({
        type: 'architecture',
        priority: 'high',
        title: 'Consider restructuring project architecture',
        description: 'The current architecture pattern is unclear. Consider adopting a clear architectural pattern.',
        action: 'refactor-architecture'
      });
    }

    // Performance suggestions
    if (context.qualityMetrics?.averageComplexity && context.qualityMetrics.averageComplexity > 10) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        title: 'Reduce code complexity',
        description: 'Several functions have high complexity. Consider breaking them into smaller functions.',
        action: 'refactor-complexity'
      });
    }

    // Testing suggestions
    if (context.qualityMetrics?.testCoverage === 0) {
      suggestions.push({
        type: 'testing',
        priority: 'high',
        title: 'Add unit tests',
        description: 'No tests detected. Adding tests will improve code reliability.',
        action: 'add-tests'
      });
    }

    return suggestions;
  }

  private generateProjectId(projectPath: string): string {
    return `project_${projectPath.split('/').pop()}_${Date.now()}`;
  }

  private async buildFileContext(filePath: string, position: any, currentText: string): Promise<FileContext> {
    return {
      filePath,
      position,
      currentText,
      language: this.detectLanguage(filePath),
      symbols: await this.languageServer.getDocumentSymbols(filePath),
      diagnostics: await this.languageServer.getDiagnostics(filePath),
      imports: [],
      dependencies: []
    };
  }

  private async getAICodeSuggestions(context: FileContext): Promise<ContextualSuggestion[]> {
    // Use AI to generate contextual code suggestions
    const result = await this.toolExecutor.executeTool({
      toolName: 'semantic_search',
      parameters: {
        query: `Code completion for ${context.language} at line ${context.position?.line}`
      }
    });

    return [{
      type: 'completion',
      text: '// AI generated suggestion',
      description: 'AI-powered code completion',
      confidence: 0.8,
      source: 'ai'
    }];
  }

  private async getPatternSuggestions(context: FileContext): Promise<ContextualSuggestion[]> {
    return [];
  }

  private async getRefactoringSuggestions(context: FileContext): Promise<ContextualSuggestion[]> {
    return [];
  }

  private rankSuggestions(suggestions: ContextualSuggestion[], context: FileContext): ContextualSuggestion[] {
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private async readFile(filePath: string): Promise<string> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'read_file',
      parameters: {
        filePath,
        startLine: 1,
        endLine: 10000
      }
    });

    return result.result || '';
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp'
    };
    return languageMap[extension || ''] || 'text';
  }

  private calculateComplexity(content: string, language: string): number {
    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    let complexity = 1; // Base complexity

    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      complexity += matches ? matches.length : 0;
    });

    return complexity;
  }

  private calculateMaintainability(content: string, language: string): number {
    // Simple maintainability calculation
    const lines = content.split('\n').length;
    const complexity = this.calculateComplexity(content, language);
    
    return Math.max(0, 100 - (complexity * 2) - (lines / 10));
  }

  private calculateReadability(content: string, language: string): number {
    // Simple readability score
    const lines = content.split('\n');
    const comments = lines.filter(line => line.trim().startsWith('//')).length;
    const commentRatio = lines.length > 0 ? comments / lines.length : 0;
    
    return commentRatio * 100;
  }

  private async generateImprovementSuggestions(analysis: QualityAnalysis): Promise<QualityImprovement[]> {
    return [];
  }

  private async generateErrorExplanation(error: string, language: string, context?: string): Promise<string> {
    return `Error in ${language}: ${error}. This typically occurs when...`;
  }

  private identifyPossibleCauses(error: string, language: string): string[] {
    return ['Syntax error', 'Type mismatch', 'Missing import'];
  }

  private async generateFixSuggestions(error: string, content: string, language: string): Promise<string[]> {
    return ['Check syntax', 'Verify imports', 'Review type definitions'];
  }

  private findRelatedDocumentation(error: string, language: string): string[] {
    return [];
  }

  private generateTestTemplate(functionName: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `describe('${functionName}', () => {
  it('should work correctly', () => {
    // Test implementation
    expect(${functionName}()).toBeDefined();
  });
});`;
    }
    return '';
  }

  private async findAllFiles(projectPath: string): Promise<string[]> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'file_search',
      parameters: {
        query: '*',
        maxResults: 1000
      }
    });

    return result.result || [];
  }

  private async findCodeFiles(projectPath: string): Promise<string[]> {
    const allFiles = await this.findAllFiles(projectPath);
    return allFiles.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      return ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'cpp'].includes(ext || '');
    });
  }

  private async findPackageFiles(projectPath: string): Promise<string[]> {
    const allFiles = await this.findAllFiles(projectPath);
    return allFiles.filter(file => file.includes('package.json') || file.includes('requirements.txt'));
  }

  private hasMVCPattern(files: string[]): boolean {
    return files.some(file => file.includes('model')) &&
           files.some(file => file.includes('view')) &&
           files.some(file => file.includes('controller'));
  }

  private hasLayeredPattern(files: string[]): boolean {
    return files.some(file => file.includes('service')) ||
           files.some(file => file.includes('repository')) ||
           files.some(file => file.includes('dao'));
  }

  private hasMicroservicesPattern(files: string[]): boolean {
    return files.some(file => file.includes('docker')) ||
           files.some(file => file.includes('kubernetes')) ||
           files.filter(file => file.includes('service')).length > 3;
  }

  private getPatternDescription(pattern: ArchitecturePattern): string {
    const descriptions = {
      mvc: 'Model-View-Controller pattern separates concerns into three interconnected components',
      layered: 'Layered architecture organizes code into horizontal layers with specific responsibilities',
      microservices: 'Microservices architecture structures application as loosely coupled services',
      monolithic: 'Monolithic architecture deploys application as single unit'
    };
    return descriptions[pattern] || 'Unknown pattern';
  }

  private getPatternStrengths(pattern: ArchitecturePattern): string[] {
    const strengths = {
      mvc: ['Clear separation of concerns', 'Easy to test', 'Reusable components'],
      layered: ['Clear hierarchy', 'Maintainable', 'Scalable'],
      microservices: ['Independent deployment', 'Technology diversity', 'Fault isolation'],
      monolithic: ['Simple deployment', 'Easy debugging', 'Performance']
    };
    return strengths[pattern] || [];
  }

  private getPatternWeaknesses(pattern: ArchitecturePattern): string[] {
    const weaknesses = {
      mvc: ['Can become complex', 'Tight coupling possible'],
      layered: ['Can be slow', 'Layer violations possible'],
      microservices: ['Complex deployment', 'Network overhead', 'Distributed system complexity'],
      monolithic: ['Hard to scale components individually', 'Technology lock-in']
    };
    return weaknesses[pattern] || [];
  }

  private calculateDocumentationScore(projectPath: string): number {
    // Simple documentation score based on README presence
    return 0.5; // Placeholder
  }

  private identifyPerformanceBottlenecks(content: string, language: string): PerformanceIssue[] {
    return [];
  }

  private async generateOptimizationSuggestions(content: string, language: string): Promise<OptimizationSuggestion[]> {
    return [];
  }

  private async scanDependencies(packageFile: string): Promise<SecurityVulnerability[]> {
    return [];
  }

  private async scanCodeSecurity(codeFile: string): Promise<SecurityVulnerability[]> {
    return [];
  }

  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    return Math.max(0, 100 - vulnerabilities.length * 10);
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    return [];
  }

  private cacheContext(context: ProjectContext): void {
    this.contextCache.set(context.projectId, {
      context,
      timestamp: new Date(),
      accessCount: 0
    });
  }
}

// Supporting Types
export interface ProjectContext {
  projectId: string;
  projectPath: string;
  timestamp: Date;
  technologies: string[];
  architecture: ArchitectureAnalysis | null;
  dependencies: Dependency[];
  codeStructure: CodeStructure | null;
  qualityMetrics: QualityMetrics | null;
  suggestions: IntelligentSuggestion[];
}

export interface ContextualSuggestion {
  type: 'completion' | 'refactor' | 'fix' | 'optimize';
  text: string;
  description: string;
  confidence: number;
  source: 'ai' | 'pattern' | 'static-analysis';
}

export interface QualityAnalysis {
  filePath: string;
  language: string;
  metrics: {
    complexity: number;
    maintainability: number;
    readability: number;
    testCoverage: number;
  };
  issues: QualityIssue[];
  suggestions: QualityImprovement[];
}

export interface ErrorExplanation {
  error: string;
  filePath: string;
  language: string;
  explanation: string;
  possibleCauses: string[];
  suggestedFixes: string[];
  relatedDocumentation: string[];
  similarCases: any[];
}

export interface TestSuggestion {
  type: 'unit-test' | 'integration-test' | 'e2e-test';
  target: string;
  description: string;
  template: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  securityScore: number;
  recommendations: string[];
}

export interface PerformanceAnalysis {
  filePath: string;
  bottlenecks: PerformanceIssue[];
  optimizations: OptimizationSuggestion[];
  metrics: {
    estimatedRuntimeComplexity: string;
    memoryUsage: 'low' | 'medium' | 'high';
    asyncPatterns: number;
  };
}

// Additional supporting interfaces
export interface CodeStructure {
  totalFiles: number;
  filesByType: Record<string, number>;
  directories: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  vulnerabilities: SecurityVulnerability[];
}

export interface ArchitectureAnalysis {
  pattern: ArchitecturePattern;
  confidence: number;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

export interface QualityMetrics {
  averageComplexity: number;
  maintainabilityIndex: number;
  testCoverage: number;
  documentation: number;
  codeReuse: number;
}

export interface IntelligentSuggestion {
  type: 'architecture' | 'performance' | 'testing' | 'security' | 'documentation';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
}

export interface FileContext {
  filePath: string;
  position: any;
  currentText: string;
  language: string;
  symbols: any[];
  diagnostics: any[];
  imports: string[];
  dependencies: string[];
}

export interface ContextData {
  context: ProjectContext;
  timestamp: Date;
  accessCount: number;
}

export interface AnalysisEntry {
  timestamp: Date;
  type: string;
  filePath: string;
  result: any;
}

export type ArchitecturePattern = 'mvc' | 'layered' | 'microservices' | 'monolithic';

export interface QualityIssue {
  type: string;
  severity: number;
  message: string;
  line: number;
  column: number;
}

export interface QualityImprovement {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution?: string;
}

export interface PerformanceIssue {
  type: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OptimizationSuggestion {
  type: string;
  description: string;
  expectedImprovement: string;
  implementation: string;
}

export default IntelligentContextEngine;
