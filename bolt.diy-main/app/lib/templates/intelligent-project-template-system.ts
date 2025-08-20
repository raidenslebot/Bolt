/**
 * 🎯 INTELLIGENT PROJECT TEMPLATE SYSTEM
 * Automatically detects project types and sets up optimal development environments
 * Integrates with WebContainer and AI services for Bolt.diy
 */

import { webcontainer } from '~/lib/webcontainer';
import { aiModelManager } from '~/lib/ai/ai-model-manager';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' | 'ai' | 'blockchain' | 'game';
  tags: string[];
  
  // Detection patterns
  detection: {
    files: string[];
    folders: string[];
    packageJsonDeps?: string[];
    fileContent?: Array<{ file: string; pattern: RegExp; }>;
  };
  
  // Setup configuration
  setup: {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
    commands: string[];
    environment: Record<string, string>;
    ports: number[];
    extensions: string[];
  };
  
  // AI-enhanced features
  ai: {
    codeGeneration: boolean;
    autoComplete: boolean;
    debugging: boolean;
    optimization: boolean;
    testing: boolean;
    documentation: boolean;
  };
  
  // Performance and quality
  performance: {
    bundling: boolean;
    minification: boolean;
    treeshaking: boolean;
    lazyLoading: boolean;
    caching: boolean;
  };
  
  // Development tools
  tools: {
    linting: string[];
    formatting: string[];
    testing: string[];
    bundling: string[];
    deployment: string[];
  };
}

export interface ProjectAnalysis {
  detectedTemplates: ProjectTemplate[];
  confidence: number;
  recommendations: string[];
  suggestedTemplate: ProjectTemplate | null;
  missingDependencies: string[];
  securityIssues: string[];
  performanceIssues: string[];
  codeQuality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface AutoSetupConfig {
  template: ProjectTemplate;
  customization: {
    skipDependencies?: string[];
    additionalDependencies?: string[];
    environmentOverrides?: Record<string, string>;
    scriptOverrides?: Record<string, string>;
  };
  features: {
    aiAssistance: boolean;
    autoTesting: boolean;
    cicd: boolean;
    docker: boolean;
    monitoring: boolean;
  };
}

/**
 * Intelligent project template system for Bolt.diy
 */
export class IntelligentProjectTemplateSystem {
  private templates: Map<string, ProjectTemplate> = new Map();
  private projectCache: Map<string, ProjectAnalysis> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize built-in project templates
   */
  private initializeTemplates(): void {
    const templates: ProjectTemplate[] = [
      {
        id: 'react-vite',
        name: 'React + Vite',
        description: 'Modern React development with Vite bundling',
        category: 'frontend',
        tags: ['react', 'vite', 'typescript', 'frontend'],
        detection: {
          files: ['package.json', 'vite.config.js', 'vite.config.ts'],
          folders: ['src'],
          packageJsonDeps: ['react', 'vite'],
          fileContent: [
            { file: 'package.json', pattern: /"react":\s*"/ }
          ]
        },
        setup: {
          dependencies: ['react', 'react-dom'],
          devDependencies: ['@vitejs/plugin-react', 'vite', 'typescript', '@types/react', '@types/react-dom'],
          scripts: {
            'dev': 'vite',
            'build': 'vite build',
            'preview': 'vite preview',
            'lint': 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
          },
          commands: ['npm install', 'npm run dev'],
          environment: { NODE_ENV: 'development' },
          ports: [5173],
          extensions: ['bradlc.vscode-tailwindcss', 'esbenp.prettier-vscode', 'dbaeumer.vscode-eslint']
        },
        ai: {
          codeGeneration: true,
          autoComplete: true,
          debugging: true,
          optimization: true,
          testing: true,
          documentation: true
        },
        performance: {
          bundling: true,
          minification: true,
          treeshaking: true,
          lazyLoading: true,
          caching: true
        },
        tools: {
          linting: ['eslint', 'typescript-eslint'],
          formatting: ['prettier'],
          testing: ['vitest', 'jest'],
          bundling: ['vite'],
          deployment: ['vercel', 'netlify']
        }
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        description: 'Full-stack React framework with SSR/SSG',
        category: 'fullstack',
        tags: ['nextjs', 'react', 'ssr', 'fullstack'],
        detection: {
          files: ['next.config.js', 'next.config.ts', 'package.json'],
          folders: ['pages', 'app'],
          packageJsonDeps: ['next'],
          fileContent: [
            { file: 'package.json', pattern: /"next":\s*"/ }
          ]
        },
        setup: {
          dependencies: ['next', 'react', 'react-dom'],
          devDependencies: ['@types/node', '@types/react', '@types/react-dom', 'typescript'],
          scripts: {
            'dev': 'next dev',
            'build': 'next build',
            'start': 'next start',
            'lint': 'next lint'
          },
          commands: ['npm install', 'npm run dev'],
          environment: { NODE_ENV: 'development' },
          ports: [3000],
          extensions: ['bradlc.vscode-tailwindcss', 'esbenp.prettier-vscode', 'dbaeumer.vscode-eslint']
        },
        ai: {
          codeGeneration: true,
          autoComplete: true,
          debugging: true,
          optimization: true,
          testing: true,
          documentation: true
        },
        performance: {
          bundling: true,
          minification: true,
          treeshaking: true,
          lazyLoading: true,
          caching: true
        },
        tools: {
          linting: ['eslint', 'next-lint'],
          formatting: ['prettier'],
          testing: ['jest', 'cypress'],
          bundling: ['next'],
          deployment: ['vercel', 'netlify']
        }
      },
      {
        id: 'express-api',
        name: 'Express.js API',
        description: 'RESTful API server with Express.js',
        category: 'backend',
        tags: ['express', 'nodejs', 'api', 'backend'],
        detection: {
          files: ['package.json'],
          folders: ['routes', 'controllers', 'middleware'],
          packageJsonDeps: ['express'],
          fileContent: [
            { file: 'package.json', pattern: /"express":\s*"/ }
          ]
        },
        setup: {
          dependencies: ['express', 'cors', 'helmet', 'morgan'],
          devDependencies: ['@types/express', '@types/cors', 'nodemon', 'typescript', 'ts-node'],
          scripts: {
            'start': 'node dist/index.js',
            'dev': 'nodemon src/index.ts',
            'build': 'tsc',
            'test': 'jest'
          },
          commands: ['npm install', 'npm run dev'],
          environment: { NODE_ENV: 'development', PORT: '3000' },
          ports: [3000],
          extensions: ['ms-vscode.vscode-typescript-next', 'esbenp.prettier-vscode']
        },
        ai: {
          codeGeneration: true,
          autoComplete: true,
          debugging: true,
          optimization: true,
          testing: true,
          documentation: true
        },
        performance: {
          bundling: false,
          minification: false,
          treeshaking: false,
          lazyLoading: false,
          caching: true
        },
        tools: {
          linting: ['eslint'],
          formatting: ['prettier'],
          testing: ['jest', 'supertest'],
          bundling: [],
          deployment: ['docker', 'heroku', 'railway']
        }
      },
      {
        id: 'fastapi',
        name: 'FastAPI',
        description: 'Modern Python API framework with automatic docs',
        category: 'backend',
        tags: ['fastapi', 'python', 'api', 'backend'],
        detection: {
          files: ['requirements.txt', 'pyproject.toml', 'main.py'],
          folders: ['app', 'routers'],
          fileContent: [
            { file: 'requirements.txt', pattern: /fastapi/ },
            { file: 'main.py', pattern: /from fastapi import/ }
          ]
        },
        setup: {
          dependencies: ['fastapi[all]', 'uvicorn', 'sqlalchemy', 'pydantic'],
          devDependencies: ['pytest', 'black', 'isort', 'mypy'],
          scripts: {
            'start': 'uvicorn main:app --host 0.0.0.0 --port 8000',
            'dev': 'uvicorn main:app --reload',
            'test': 'pytest',
            'format': 'black . && isort .'
          },
          commands: ['pip install -r requirements.txt', 'uvicorn main:app --reload'],
          environment: { PYTHONPATH: '.' },
          ports: [8000],
          extensions: ['ms-python.python', 'ms-python.black-formatter']
        },
        ai: {
          codeGeneration: true,
          autoComplete: true,
          debugging: true,
          optimization: true,
          testing: true,
          documentation: true
        },
        performance: {
          bundling: false,
          minification: false,
          treeshaking: false,
          lazyLoading: false,
          caching: true
        },
        tools: {
          linting: ['flake8', 'mypy'],
          formatting: ['black', 'isort'],
          testing: ['pytest'],
          bundling: [],
          deployment: ['docker', 'heroku', 'railway']
        }
      },
      {
        id: 'vue-nuxt',
        name: 'Vue + Nuxt',
        description: 'Vue.js framework with SSR/SSG capabilities',
        category: 'fullstack',
        tags: ['vue', 'nuxt', 'frontend', 'ssr'],
        detection: {
          files: ['nuxt.config.js', 'nuxt.config.ts', 'package.json'],
          folders: ['pages', 'components', 'layouts'],
          packageJsonDeps: ['nuxt', 'vue'],
          fileContent: [
            { file: 'package.json', pattern: /"nuxt":\s*"/ }
          ]
        },
        setup: {
          dependencies: ['nuxt', 'vue'],
          devDependencies: ['@nuxt/typescript-build'],
          scripts: {
            'dev': 'nuxt dev',
            'build': 'nuxt build',
            'generate': 'nuxt generate',
            'start': 'nuxt start'
          },
          commands: ['npm install', 'npm run dev'],
          environment: { NODE_ENV: 'development' },
          ports: [3000],
          extensions: ['Vue.volar', 'esbenp.prettier-vscode']
        },
        ai: {
          codeGeneration: true,
          autoComplete: true,
          debugging: true,
          optimization: true,
          testing: true,
          documentation: true
        },
        performance: {
          bundling: true,
          minification: true,
          treeshaking: true,
          lazyLoading: true,
          caching: true
        },
        tools: {
          linting: ['eslint'],
          formatting: ['prettier'],
          testing: ['vitest'],
          bundling: ['nuxt'],
          deployment: ['vercel', 'netlify']
        }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.isInitialized = true;
    console.log(`[TEMPLATE-SYSTEM] Initialized ${templates.length} project templates`);
  }

  /**
   * Analyze project and detect suitable templates
   */
  async analyzeProject(projectPath: string = '/'): Promise<ProjectAnalysis> {
    try {
      const cacheKey = `${projectPath}-${Date.now()}`;
      
      // Check if we have recent analysis cached
      const cached = this.projectCache.get(projectPath);
      if (cached && Date.now() - cached.confidence < 300000) { // 5 minutes
        return cached;
      }

      const wc = await webcontainer;
      const detectedTemplates: ProjectTemplate[] = [];
      const recommendations: string[] = [];
      let maxConfidence = 0;
      let suggestedTemplate: ProjectTemplate | null = null;

      // Analyze each template
      for (const template of this.templates.values()) {
        const confidence = await this.calculateTemplateConfidence(wc, projectPath, template);
        
        if (confidence > 0.3) { // 30% confidence threshold
          detectedTemplates.push(template);
          
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            suggestedTemplate = template;
          }
        }
      }

      // Sort templates by confidence
      detectedTemplates.sort((a, b) => 
        this.calculateTemplateConfidence(wc, projectPath, b) - 
        this.calculateTemplateConfidence(wc, projectPath, a)
      );

      // Generate AI-powered recommendations
      const aiRecommendations = await this.generateAIRecommendations(
        wc, 
        projectPath, 
        detectedTemplates
      );

      // Analyze dependencies and security
      const missingDependencies = await this.analyzeMissingDependencies(wc, projectPath);
      const securityIssues = await this.analyzeSecurityIssues(wc, projectPath);
      const performanceIssues = await this.analyzePerformanceIssues(wc, projectPath);
      const codeQuality = await this.analyzeCodeQuality(wc, projectPath);

      const analysis: ProjectAnalysis = {
        detectedTemplates,
        confidence: maxConfidence,
        recommendations: [...recommendations, ...aiRecommendations],
        suggestedTemplate,
        missingDependencies,
        securityIssues,
        performanceIssues,
        codeQuality
      };

      this.projectCache.set(projectPath, analysis);
      return analysis;

    } catch (error) {
      console.error('[TEMPLATE-SYSTEM] Project analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for a template match
   */
  private async calculateTemplateConfidence(
    wc: any,
    projectPath: string,
    template: ProjectTemplate
  ): Promise<number> {
    let score = 0;
    const maxScore = 100;

    try {
      // Check required files
      for (const file of template.detection.files) {
        try {
          await wc.fs.readFile(`${projectPath}/${file}`, 'utf-8');
          score += 20; // Each required file adds 20 points
        } catch {
          // File not found
        }
      }

      // Check required folders
      for (const folder of template.detection.folders) {
        try {
          const stat = await wc.fs.readdir(`${projectPath}/${folder}`);
          if (stat.length > 0) {
            score += 15; // Each required folder adds 15 points
          }
        } catch {
          // Folder not found
        }
      }

      // Check package.json dependencies
      if (template.detection.packageJsonDeps) {
        try {
          const packageJsonContent = await wc.fs.readFile(
            `${projectPath}/package.json`, 
            'utf-8'
          );
          const packageJson = JSON.parse(packageJsonContent);
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          for (const dep of template.detection.packageJsonDeps) {
            if (allDeps[dep]) {
              score += 25; // Each dependency match adds 25 points
            }
          }
        } catch {
          // package.json not found or invalid
        }
      }

      // Check file content patterns
      if (template.detection.fileContent) {
        for (const contentCheck of template.detection.fileContent) {
          try {
            const fileContent = await wc.fs.readFile(
              `${projectPath}/${contentCheck.file}`, 
              'utf-8'
            );
            if (contentCheck.pattern.test(fileContent)) {
              score += 20; // Each content pattern match adds 20 points
            }
          } catch {
            // File not found or cannot read
          }
        }
      }

      return Math.min(score / maxScore, 1); // Normalize to 0-1 range

    } catch (error) {
      console.warn('[TEMPLATE-SYSTEM] Template confidence calculation failed:', error);
      return 0;
    }
  }

  /**
   * Generate AI-powered project recommendations
   */
  private async generateAIRecommendations(
    wc: any,
    projectPath: string,
    detectedTemplates: ProjectTemplate[]
  ): Promise<string[]> {
    try {
      // Get project structure
      const structure = await this.getProjectStructure(wc, projectPath);
      
      // Prepare AI context
      const context = {
        projectStructure: structure,
        detectedTemplates: detectedTemplates.map(t => ({
          name: t.name,
          category: t.category,
          tags: t.tags
        }))
      };

      const prompt = `Analyze this project structure and provide 3-5 specific recommendations for improvement:

Project Structure:
${JSON.stringify(structure, null, 2)}

Detected Templates:
${JSON.stringify(context.detectedTemplates, null, 2)}

Provide actionable recommendations for:
1. Missing dependencies or tools
2. Performance optimizations
3. Security improvements
4. Development workflow enhancements
5. Code quality improvements

Format as a JSON array of strings.`;

      const response = await aiModelManager.sendRequest({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-haiku',
        temperature: 0.3
      });

      try {
        return JSON.parse(response.content);
      } catch {
        // If parsing fails, return generic recommendations
        return [
          'Consider adding TypeScript for better type safety',
          'Set up automated testing with Jest or Vitest',
          'Add ESLint and Prettier for code quality',
          'Configure CI/CD pipeline for automated deployments',
          'Implement proper error handling and logging'
        ];
      }

    } catch (error) {
      console.warn('[TEMPLATE-SYSTEM] AI recommendations failed:', error);
      return [];
    }
  }

  /**
   * Get simplified project structure
   */
  private async getProjectStructure(wc: any, projectPath: string): Promise<any> {
    try {
      const structure: any = {};
      
      const items = await wc.fs.readdir(projectPath);
      for (const item of items) {
        try {
          const stat = await wc.fs.stat(`${projectPath}/${item}`);
          if (stat.isDirectory()) {
            structure[item] = 'directory';
          } else {
            structure[item] = 'file';
          }
        } catch {
          // Skip items that can't be accessed
        }
      }

      return structure;
    } catch {
      return {};
    }
  }

  /**
   * Analyze missing dependencies
   */
  private async analyzeMissingDependencies(wc: any, projectPath: string): Promise<string[]> {
    const missing: string[] = [];

    try {
      const packageJsonContent = await wc.fs.readFile(
        `${projectPath}/package.json`,
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);
      
      // Common missing dependencies based on project type
      const commonDeps = [
        { name: '@types/node', condition: () => packageJson.devDependencies && !packageJson.devDependencies['@types/node'] },
        { name: 'typescript', condition: () => packageJson.devDependencies && !packageJson.devDependencies['typescript'] },
        { name: 'eslint', condition: () => !packageJson.devDependencies?.eslint },
        { name: 'prettier', condition: () => !packageJson.devDependencies?.prettier }
      ];

      for (const dep of commonDeps) {
        if (dep.condition()) {
          missing.push(dep.name);
        }
      }

    } catch {
      // package.json not found or invalid
    }

    return missing;
  }

  /**
   * Analyze security issues
   */
  private async analyzeSecurityIssues(wc: any, projectPath: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for common security issues
      const packageJsonContent = await wc.fs.readFile(
        `${projectPath}/package.json`,
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);

      // Check for outdated dependencies (simplified check)
      if (!packageJson.devDependencies?.['npm-audit'] && 
          !packageJson.devDependencies?.['audit-ci']) {
        issues.push('Missing security audit tools');
      }

      // Check for .env files in version control
      try {
        await wc.fs.readFile(`${projectPath}/.env`, 'utf-8');
        issues.push('Environment file detected - ensure it\'s in .gitignore');
      } catch {
        // .env not found, which is fine
      }

    } catch {
      // Analysis failed
    }

    return issues;
  }

  /**
   * Analyze performance issues
   */
  private async analyzePerformanceIssues(wc: any, projectPath: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      const packageJsonContent = await wc.fs.readFile(
        `${projectPath}/package.json`,
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);

      // Check for performance optimization tools
      if (!packageJson.devDependencies?.webpack && 
          !packageJson.devDependencies?.vite &&
          !packageJson.dependencies?.next) {
        issues.push('Missing modern bundler for optimization');
      }

      // Check for large dependencies
      const largeDeps = ['moment', 'lodash'];
      for (const dep of largeDeps) {
        if (packageJson.dependencies?.[dep]) {
          issues.push(`Consider replacing ${dep} with lighter alternatives`);
        }
      }

    } catch {
      // Analysis failed
    }

    return issues;
  }

  /**
   * Analyze code quality
   */
  private async analyzeCodeQuality(wc: any, projectPath: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    let score = 100;
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check for linting configuration
      const lintConfigs = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js'];
      let hasLintConfig = false;
      
      for (const config of lintConfigs) {
        try {
          await wc.fs.readFile(`${projectPath}/${config}`, 'utf-8');
          hasLintConfig = true;
          break;
        } catch {
          // Config file not found
        }
      }

      if (!hasLintConfig) {
        score -= 20;
        issues.push('Missing ESLint configuration');
        suggestions.push('Add ESLint for code quality checks');
      }

      // Check for TypeScript
      try {
        await wc.fs.readFile(`${projectPath}/tsconfig.json`, 'utf-8');
      } catch {
        score -= 15;
        issues.push('Missing TypeScript configuration');
        suggestions.push('Consider adding TypeScript for better type safety');
      }

      // Check for testing
      const packageJsonContent = await wc.fs.readFile(
        `${projectPath}/package.json`,
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);

      const testingLibs = ['jest', 'vitest', 'mocha', 'cypress', 'playwright'];
      const hasTestingLib = testingLibs.some(lib => 
        packageJson.dependencies?.[lib] || packageJson.devDependencies?.[lib]
      );

      if (!hasTestingLib) {
        score -= 25;
        issues.push('Missing testing framework');
        suggestions.push('Add automated testing with Jest or Vitest');
      }

    } catch (error) {
      score -= 30;
      issues.push('Unable to analyze project structure');
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  /**
   * Auto-setup project based on template
   */
  async autoSetupProject(
    config: AutoSetupConfig,
    projectPath: string = '/'
  ): Promise<void> {
    try {
      const wc = await webcontainer;
      const template = config.template;

      console.log(`[TEMPLATE-SYSTEM] Setting up project with template: ${template.name}`);

      // Install dependencies
      if (template.setup.dependencies.length > 0) {
        const deps = template.setup.dependencies.filter(
          dep => !config.customization.skipDependencies?.includes(dep)
        );
        
        if (config.customization.additionalDependencies) {
          deps.push(...config.customization.additionalDependencies);
        }

        await this.installDependencies(wc, projectPath, deps, false);
      }

      // Install dev dependencies
      if (template.setup.devDependencies.length > 0) {
        const devDeps = template.setup.devDependencies.filter(
          dep => !config.customization.skipDependencies?.includes(dep)
        );

        await this.installDependencies(wc, projectPath, devDeps, true);
      }

      // Setup package.json scripts
      await this.setupPackageJsonScripts(
        wc, 
        projectPath, 
        template.setup.scripts,
        config.customization.scriptOverrides
      );

      // Setup environment variables
      await this.setupEnvironment(
        wc,
        projectPath,
        template.setup.environment,
        config.customization.environmentOverrides
      );

      // Run setup commands
      for (const command of template.setup.commands) {
        await this.executeCommand(wc, projectPath, command);
      }

      // Setup AI features if enabled
      if (config.features.aiAssistance) {
        await this.setupAIFeatures(wc, projectPath, template);
      }

      // Setup testing if enabled
      if (config.features.autoTesting) {
        await this.setupTesting(wc, projectPath, template);
      }

      // Setup Docker if enabled
      if (config.features.docker) {
        await this.setupDocker(wc, projectPath, template);
      }

      console.log(`[TEMPLATE-SYSTEM] Project setup completed: ${template.name}`);

    } catch (error) {
      console.error('[TEMPLATE-SYSTEM] Auto-setup failed:', error);
      throw error;
    }
  }

  /**
   * Install dependencies
   */
  private async installDependencies(
    wc: any,
    projectPath: string,
    dependencies: string[],
    isDev: boolean
  ): Promise<void> {
    if (dependencies.length === 0) return;

    const flag = isDev ? '--save-dev' : '--save';
    const command = `npm install ${flag} ${dependencies.join(' ')}`;
    
    await this.executeCommand(wc, projectPath, command);
  }

  /**
   * Setup package.json scripts
   */
  private async setupPackageJsonScripts(
    wc: any,
    projectPath: string,
    scripts: Record<string, string>,
    overrides?: Record<string, string>
  ): Promise<void> {
    try {
      const packageJsonPath = `${projectPath}/package.json`;
      const packageJsonContent = await wc.fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      packageJson.scripts = {
        ...packageJson.scripts,
        ...scripts,
        ...overrides
      };

      await wc.fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );

    } catch (error) {
      console.warn('[TEMPLATE-SYSTEM] Failed to setup package.json scripts:', error);
    }
  }

  /**
   * Setup environment variables
   */
  private async setupEnvironment(
    wc: any,
    projectPath: string,
    environment: Record<string, string>,
    overrides?: Record<string, string>
  ): Promise<void> {
    try {
      const envVars = { ...environment, ...overrides };
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      await wc.fs.writeFile(`${projectPath}/.env.example`, envContent);

    } catch (error) {
      console.warn('[TEMPLATE-SYSTEM] Failed to setup environment:', error);
    }
  }

  /**
   * Execute command in WebContainer
   */
  private async executeCommand(wc: any, projectPath: string, command: string): Promise<void> {
    try {
      const process = await wc.spawn('sh', ['-c', `cd ${projectPath} && ${command}`]);
      await process.exit;
    } catch (error) {
      console.warn(`[TEMPLATE-SYSTEM] Command failed: ${command}`, error);
    }
  }

  /**
   * Setup AI features
   */
  private async setupAIFeatures(wc: any, projectPath: string, template: ProjectTemplate): Promise<void> {
    // Setup AI configuration files
    const aiConfig = {
      enabled: true,
      features: template.ai,
      model: 'claude-3-haiku',
      maxTokens: 4000
    };

    await wc.fs.writeFile(
      `${projectPath}/.ai-config.json`,
      JSON.stringify(aiConfig, null, 2)
    );
  }

  /**
   * Setup testing framework
   */
  private async setupTesting(wc: any, projectPath: string, template: ProjectTemplate): Promise<void> {
    const testingTool = template.tools.testing[0] || 'jest';
    
    if (testingTool === 'jest') {
      const jestConfig = {
        preset: 'ts-jest',
        testEnvironment: 'node',
        collectCoverage: true,
        coverageDirectory: 'coverage'
      };

      await wc.fs.writeFile(
        `${projectPath}/jest.config.js`,
        `module.exports = ${JSON.stringify(jestConfig, null, 2)};`
      );
    }
  }

  /**
   * Setup Docker configuration
   */
  private async setupDocker(wc: any, projectPath: string, template: ProjectTemplate): Promise<void> {
    let dockerfile = '';

    if (template.category === 'frontend') {
      dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE ${template.setup.ports[0] || 3000}
CMD ["npm", "start"]`;
    } else if (template.category === 'backend') {
      dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE ${template.setup.ports[0] || 3000}
CMD ["npm", "start"]`;
    }

    if (dockerfile) {
      await wc.fs.writeFile(`${projectPath}/Dockerfile`, dockerfile);
      
      // Create .dockerignore
      const dockerignore = `node_modules
npm-debug.log
.git
.env`;
      await wc.fs.writeFile(`${projectPath}/.dockerignore`, dockerignore);
    }
  }

  /**
   * Get all templates
   */
  getTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ProjectTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Add custom template
   */
  addTemplate(template: ProjectTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove template
   */
  removeTemplate(id: string): void {
    this.templates.delete(id);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.projectCache.clear();
  }
}

// Export singleton instance
export const projectTemplateSystem = new IntelligentProjectTemplateSystem();
