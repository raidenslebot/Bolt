/**
 * Git Integration Service - AI-Enhanced Git Operations for Bolt.diy
 * Integrates with Bolt's existing Git functionality and adds AI capabilities
 */

import { EventEmitter } from 'events';
import { UniversalToolExecutor } from './universal-tool-executor';

export interface GitRepository {
  path: string;
  remoteUrl?: string;
  currentBranch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  lastCommit?: GitCommit;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: string[];
}

export interface CommitSuggestion {
  type: 'fix' | 'feat' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  message: string;
  description: string;
  confidence: number;
}

export interface GitAnalysis {
  changedFiles: string[];
  fileTypes: string[];
  complexity: 'low' | 'medium' | 'high';
  suggestedCommitType: string;
  suggestedMessage: string;
  breakingChange: boolean;
}

export class GitIntegrationService extends EventEmitter {
  private toolExecutor: UniversalToolExecutor;

  constructor(toolExecutor: UniversalToolExecutor) {
    super();
    this.toolExecutor = toolExecutor;
  }

  /**
   * Get repository status using Bolt's git tools
   */
  async getRepositoryStatus(): Promise<GitRepository> {
    try {
      // Use built-in get_changed_files tool
      const changedFiles = await this.toolExecutor.executeTool({
        toolName: 'get_changed_files',
        parameters: {}
      });

      // Parse the results into our format
      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      if (changedFiles.success && changedFiles.result) {
        const files = changedFiles.result;
        
        // Categorize files based on their git status
        for (const file of files) {
          if (file.status === 'staged') {
            staged.push(file.path);
          } else if (file.status === 'unstaged') {
            unstaged.push(file.path);
          } else if (file.status === 'untracked') {
            untracked.push(file.path);
          }
        }
      }

      return {
        path: process.cwd(),
        currentBranch: 'main', // Default branch
        isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
        staged,
        unstaged,
        untracked
      };

    } catch (error) {
      this.emit('git:error', error);
      throw error;
    }
  }

  /**
   * Analyze git changes and suggest commit messages using AI
   */
  async analyzeChanges(): Promise<GitAnalysis> {
    try {
      const status = await this.getRepositoryStatus();
      const changedFiles = [...status.staged, ...status.unstaged];

      if (changedFiles.length === 0) {
        return {
          changedFiles: [],
          fileTypes: [],
          complexity: 'low',
          suggestedCommitType: 'chore',
          suggestedMessage: 'No changes to commit',
          breakingChange: false
        };
      }

      // Analyze file types
      const fileTypes = this.analyzeFileTypes(changedFiles);
      
      // Determine complexity based on number and types of files
      const complexity = this.determineComplexity(changedFiles, fileTypes);
      
      // Generate AI-powered commit suggestion
      const commitAnalysis = await this.generateCommitSuggestion(changedFiles, fileTypes);

      return {
        changedFiles,
        fileTypes,
        complexity,
        suggestedCommitType: commitAnalysis.type,
        suggestedMessage: commitAnalysis.message,
        breakingChange: commitAnalysis.breakingChange
      };

    } catch (error) {
      this.emit('analysis:error', error);
      throw error;
    }
  }

  /**
   * Generate intelligent commit suggestions based on file changes
   */
  async generateCommitSuggestions(changedFiles: string[]): Promise<CommitSuggestion[]> {
    const suggestions: CommitSuggestion[] = [];
    
    if (changedFiles.length === 0) {
      return suggestions;
    }

    const fileTypes = this.analyzeFileTypes(changedFiles);

    // Generate different types of commit suggestions
    const commitAnalysis = await this.generateCommitSuggestion(changedFiles, fileTypes);
    
    // Create multiple suggestion variations
    suggestions.push({
      type: commitAnalysis.type as CommitSuggestion['type'],
      message: commitAnalysis.message,
      description: `${commitAnalysis.type}: ${commitAnalysis.description}`,
      confidence: 0.8
    });

    // Add conventional commit formats
    if (fileTypes.includes('test')) {
      suggestions.push({
        type: 'test',
        message: `test: add tests for ${this.getMainFeature(changedFiles)}`,
        description: 'Add or update tests',
        confidence: 0.7
      });
    }

    if (fileTypes.includes('documentation')) {
      suggestions.push({
        type: 'docs',
        message: `docs: update documentation`,
        description: 'Update documentation files',
        confidence: 0.6
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create and manage branches intelligently
   */
  async createFeatureBranch(featureName: string, baseBranch: string = 'main'): Promise<void> {
    try {
      // Sanitize branch name
      const sanitizedName = featureName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const branchName = `feature/${sanitizedName}`;

      // Use git operations through terminal
      await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: `git checkout -b ${branchName}`,
          explanation: `Creating feature branch: ${branchName}`,
          isBackground: false
        }
      });

      this.emit('branch:created', { branchName, baseBranch });

    } catch (error) {
      this.emit('branch:error', { featureName, error });
      throw error;
    }
  }

  /**
   * Intelligent commit with AI-generated messages
   */
  async smartCommit(userMessage?: string, autoStage: boolean = true): Promise<GitCommit> {
    try {
      if (autoStage) {
        // Stage all changes
        await this.toolExecutor.executeTool({
          toolName: 'run_in_terminal',
          parameters: {
            command: 'git add .',
            explanation: 'Staging all changes',
            isBackground: false
          }
        });
      }

      let commitMessage = userMessage;
      
      if (!commitMessage) {
        // Generate AI commit message
        const analysis = await this.analyzeChanges();
        commitMessage = analysis.suggestedMessage;
      }

      // Make the commit
      await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: `git commit -m "${commitMessage}"`,
          explanation: `Committing with message: ${commitMessage}`,
          isBackground: false
        }
      });

      // Get commit info
      const commitInfo = await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: 'git log -1 --pretty=format:"%H|%an|%ae|%ai|%s"',
          explanation: 'Getting latest commit info',
          isBackground: false
        }
      });

      const commit = this.parseCommitInfo(commitInfo.result || '');
      
      this.emit('commit:created', commit);
      return commit;

    } catch (error) {
      this.emit('commit:error', { userMessage, error });
      throw error;
    }
  }

  /**
   * Auto-sync with remote repository
   */
  async autoSync(): Promise<void> {
    try {
      // Check if there are any changes to commit
      const status = await this.getRepositoryStatus();
      
      if (!status.isClean) {
        // Auto-commit changes
        await this.smartCommit();
      }

      // Pull latest changes
      await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: 'git pull origin main',
          explanation: 'Pulling latest changes',
          isBackground: false
        }
      });

      // Push changes
      await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: 'git push origin HEAD',
          explanation: 'Pushing changes to remote',
          isBackground: false
        }
      });

      this.emit('sync:completed');

    } catch (error) {
      this.emit('sync:error', error);
      throw error;
    }
  }

  /**
   * Clone repository using Bolt's built-in git clone
   */
  async cloneRepository(url: string, targetPath?: string): Promise<void> {
    try {
      // This would integrate with Bolt's existing useGit hook
      // For now, use terminal commands
      const cloneCommand = targetPath 
        ? `git clone ${url} "${targetPath}"`
        : `git clone ${url}`;

      await this.toolExecutor.executeTool({
        toolName: 'run_in_terminal',
        parameters: {
          command: cloneCommand,
          explanation: `Cloning repository: ${url}`,
          isBackground: false
        }
      });

      this.emit('repository:cloned', { url, targetPath });

    } catch (error) {
      this.emit('repository:clone-error', { url, error });
      throw error;
    }
  }

  // Private helper methods

  private analyzeFileTypes(files: string[]): string[] {
    const types = new Set<string>();

    for (const file of files) {
      const ext = file.split('.').pop()?.toLowerCase();
      
      if (!ext) continue;

      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
        types.add('code');
      } else if (['test.ts', 'test.js', 'spec.ts', 'spec.js'].some(suffix => file.includes(suffix))) {
        types.add('test');
      } else if (['md', 'mdx', 'txt'].includes(ext)) {
        types.add('documentation');
      } else if (['css', 'scss', 'less', 'sass'].includes(ext)) {
        types.add('style');
      } else if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
        types.add('config');
      }
    }

    return Array.from(types);
  }

  private determineComplexity(files: string[], types: string[]): 'low' | 'medium' | 'high' {
    if (files.length > 10 || types.length > 3) return 'high';
    if (files.length > 5 || types.length > 2) return 'medium';
    return 'low';
  }

  private async generateCommitSuggestion(files: string[], types: string[]): Promise<{
    type: string;
    message: string;
    description: string;
    breakingChange: boolean;
  }> {
    // Simple heuristic-based commit message generation
    // In a real implementation, this could use AI/LLM for better suggestions
    
    let type = 'chore';
    let description = 'update files';
    let breakingChange = false;

    if (types.includes('code')) {
      if (types.includes('test')) {
        type = 'feat';
        description = 'add new feature with tests';
      } else {
        type = files.length > 3 ? 'feat' : 'fix';
        description = type === 'feat' ? 'add new functionality' : 'fix issues';
      }
    } else if (types.includes('documentation')) {
      type = 'docs';
      description = 'update documentation';
    } else if (types.includes('style')) {
      type = 'style';
      description = 'update styles';
    } else if (types.includes('config')) {
      type = 'chore';
      description = 'update configuration';
    }

    // Check for breaking changes (simple heuristic)
    breakingChange = files.some(f => 
      f.includes('package.json') || 
      f.includes('api/') || 
      f.includes('schema')
    );

    const mainFeature = this.getMainFeature(files);
    const message = `${type}: ${description}${mainFeature ? ` in ${mainFeature}` : ''}`;

    return { type, message, description, breakingChange };
  }

  private getMainFeature(files: string[]): string {
    // Extract main feature/module from file paths
    const commonPaths = files
      .map(f => f.split('/')[0])
      .filter(p => p !== '.' && p !== 'src' && p !== 'app');

    if (commonPaths.length === 0) return '';

    // Find most common path
    const pathCount = commonPaths.reduce((acc, path) => {
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(pathCount)
      .sort(([,a], [,b]) => b - a)[0];

    return mostCommon ? mostCommon[0] : '';
  }

  private parseCommitInfo(commitInfo: string): GitCommit {
    const [hash, author, email, date, message] = commitInfo.split('|');
    
    return {
      hash: hash || '',
      author: author || '',
      email: email || '',
      date: new Date(date || ''),
      message: message || '',
      files: []
    };
  }
}

export default GitIntegrationService;
