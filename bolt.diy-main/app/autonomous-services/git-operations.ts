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
   * Initialize a new Git repository
   */
  async initRepository(path: string, initialCommit: boolean = true): Promise<GitRepository> {
    try {
      // Initialize git repository
      await this.executeGitCommand(path, 'git init');
      
      if (initialCommit) {
        // Create initial commit
        await this.executeGitCommand(path, 'git add .');
        await this.executeGitCommand(path, 'git commit -m "Initial commit"');
      }
      
      const repository = await this.getRepositoryStatus(path);
      this.repositories.set(path, repository);
      
      this.emit('repository:initialized', repository);
      return repository;
      
    } catch (error) {
      this.emit('repository:init-error', { path, error });
      throw error;
    }
  }

  /**
   * Clone a remote repository
   */
  async cloneRepository(
    remoteUrl: string, 
    localPath: string, 
    options: {
      branch?: string;
      depth?: number;
      recursive?: boolean;
    } = {}
  ): Promise<GitRepository> {
    try {
      let cloneCommand = `git clone ${remoteUrl} "${localPath}"`;
      
      if (options.branch) {
        cloneCommand += ` --branch ${options.branch}`;
      }
      
      if (options.depth) {
        cloneCommand += ` --depth ${options.depth}`;
      }
      
      if (options.recursive) {
        cloneCommand += ' --recursive';
      }
      
      await this.executeGitCommand('.', cloneCommand);
      
      const repository = await this.getRepositoryStatus(localPath);
      this.repositories.set(localPath, repository);
      
      this.emit('repository:cloned', { remoteUrl, localPath, repository });
      return repository;
      
    } catch (error) {
      this.emit('repository:clone-error', { remoteUrl, localPath, error });
      throw error;
    }
  }

  /**
   * Get repository status with comprehensive information
   */
  async getRepositoryStatus(path: string): Promise<GitRepository> {
    try {
      // Get current branch
      const branchResult = await this.executeGitCommand(path, 'git branch --show-current');
      const currentBranch = branchResult.trim();
      
      // Get remote URL
      let remoteUrl: string | undefined;
      try {
        const remoteResult = await this.executeGitCommand(path, 'git remote get-url origin');
        remoteUrl = remoteResult.trim();
      } catch {
        // No remote configured
      }
      
      // Get status
      const statusResult = await this.executeGitCommand(path, 'git status --porcelain');
      const { staged, unstaged, untracked } = this.parseGitStatus(statusResult);
      
      // Get ahead/behind count
      let ahead = 0, behind = 0;
      try {
        const aheadBehindResult = await this.executeGitCommand(path, 'git rev-list --left-right --count origin/main...HEAD');
        const [behindStr, aheadStr] = aheadBehindResult.trim().split('\t');
        behind = parseInt(behindStr) || 0;
        ahead = parseInt(aheadStr) || 0;
      } catch {
        // No remote tracking branch
      }
      
      // Get last commit
      let lastCommit: GitCommit | undefined;
      try {
        const lastCommitResult = await this.executeGitCommand(
          path, 
          'git log -1 --pretty=format:"%H|%an|%ae|%ai|%s"'
        );
        if (lastCommitResult.trim()) {
          lastCommit = this.parseCommit(lastCommitResult.trim());
        }
      } catch {
        // No commits yet
      }
      
      const repository: GitRepository = {
        path,
        remoteUrl,
        currentBranch,
        isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        lastCommit
      };
      
      this.repositories.set(path, repository);
      return repository;
      
    } catch (error) {
      throw new Error(`Failed to get repository status: ${error.message}`);
    }
  }

  /**
   * Commit changes with intelligent commit message generation
   */
  async commitChanges(
    path: string, 
    message?: string, 
    options: {
      addAll?: boolean;
      amend?: boolean;
      signoff?: boolean;
    } = {}
  ): Promise<GitCommit> {
    try {
      // Add files if requested
      if (options.addAll) {
        await this.executeGitCommand(path, 'git add .');
      }
      
      // Generate commit message if not provided
      if (!message) {
        message = await this.generateCommitMessage(path);
      }
      
      // Build commit command
      let commitCommand = `git commit -m "${message}"`;
      
      if (options.amend) {
        commitCommand += ' --amend';
      }
      
      if (options.signoff) {
        commitCommand += ' --signoff';
      }
      
      await this.executeGitCommand(path, commitCommand);
      
      // Get the new commit info
      const commitResult = await this.executeGitCommand(
        path,
        'git log -1 --pretty=format:"%H|%an|%ae|%ai|%s" --name-only'
      );
      
      const lines = commitResult.trim().split('\n');
      const commit = this.parseCommit(lines[0]);
      commit.files = lines.slice(2); // Skip empty line
      
      this.emit('commit:created', { path, commit });
      return commit;
      
    } catch (error) {
      this.emit('commit:error', { path, message, error });
      throw error;
    }
  }

  /**
   * Create and switch to a new branch
   */
  async createBranch(path: string, branchName: string, checkout: boolean = true): Promise<void> {
    try {
      let command = `git branch ${branchName}`;
      
      if (checkout) {
        command = `git checkout -b ${branchName}`;
      }
      
      await this.executeGitCommand(path, command);
      
      this.emit('branch:created', { path, branchName, checkout });
      
    } catch (error) {
      this.emit('branch:create-error', { path, branchName, error });
      throw error;
    }
  }

  /**
   * Switch to an existing branch
   */
  async checkoutBranch(path: string, branchName: string): Promise<void> {
    try {
      await this.executeGitCommand(path, `git checkout ${branchName}`);
      this.emit('branch:checkout', { path, branchName });
      
    } catch (error) {
      this.emit('branch:checkout-error', { path, branchName, error });
      throw error;
    }
  }

  /**
   * Get all branches (local and remote)
   */
  async getBranches(path: string): Promise<GitBranch[]> {
    try {
      const result = await this.executeGitCommand(path, 'git branch -a -v --format="%(refname:short)|%(upstream:short)|%(objectname:short)|%(committerdate:iso8601)"');
      
      const branches: GitBranch[] = [];
      const lines = result.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const [name, upstream, commit, dateStr] = line.split('|');
          const isRemote = name.startsWith('origin/');
          const isCurrent = name.includes('*');
          
          branches.push({
            name: name.replace('*', '').trim(),
            isRemote,
            isCurrent,
            lastCommit: commit,
            commitDate: new Date(dateStr)
          });
        }
      }
      
      return branches;
      
    } catch (error) {
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  /**
   * Merge branches with conflict detection
   */
  async mergeBranch(
    path: string, 
    sourceBranch: string, 
    targetBranch?: string
  ): Promise<{ success: boolean; conflicts?: GitConflict[] }> {
    try {
      // Switch to target branch if specified
      if (targetBranch) {
        await this.checkoutBranch(path, targetBranch);
      }
      
      // Attempt merge
      try {
        await this.executeGitCommand(path, `git merge ${sourceBranch}`);
        
        this.emit('merge:success', { path, sourceBranch, targetBranch });
        return { success: true };
        
      } catch (error) {
        // Check for merge conflicts
        const conflicts = await this.getMergeConflicts(path);
        
        if (conflicts.length > 0) {
          this.emit('merge:conflicts', { path, sourceBranch, targetBranch, conflicts });
          return { success: false, conflicts };
        }
        
        throw error;
      }
      
    } catch (error) {
      this.emit('merge:error', { path, sourceBranch, targetBranch, error });
      throw error;
    }
  }

  /**
   * Get merge conflicts
   */
  async getMergeConflicts(path: string): Promise<GitConflict[]> {
    try {
      const result = await this.executeGitCommand(path, 'git diff --name-only --diff-filter=U');
      const conflictFiles = result.trim().split('\n').filter(f => f);
      
      const conflicts: GitConflict[] = [];
      
      for (const file of conflictFiles) {
        const content = await this.toolExecutor.executeTool({
          toolName: 'read_file',
          parameters: {
            filePath: `${path}/${file}`,
            startLine: 1,
            endLine: 1000
          }
        });
        
        const markers = this.findConflictMarkers(content.content || '');
        
        conflicts.push({
          file,
          type: 'content',
          content: content.content || '',
          markers
        });
      }
      
      return conflicts;
      
    } catch (error) {
      return [];
    }
  }

  /**
   * Resolve merge conflicts automatically where possible
   */
  async resolveConflicts(
    path: string, 
    conflicts: GitConflict[], 
    strategy: 'ours' | 'theirs' | 'manual' = 'manual'
  ): Promise<string[]> {
    const resolvedFiles: string[] = [];
    
    for (const conflict of conflicts) {
      try {
        if (strategy === 'ours' || strategy === 'theirs') {
          await this.executeGitCommand(
            path, 
            `git checkout --${strategy} ${conflict.file}`
          );
          resolvedFiles.push(conflict.file);
        }
        // Manual resolution would require user input
        
      } catch (error) {
        console.warn(`Failed to resolve conflict in ${conflict.file}:`, error);
      }
    }
    
    if (resolvedFiles.length > 0) {
      // Mark conflicts as resolved
      await this.executeGitCommand(path, `git add ${resolvedFiles.join(' ')}`);
    }
    
    return resolvedFiles;
  }

  /**
   * Push changes to remote
   */
  async push(
    path: string, 
    remote: string = 'origin', 
    branch?: string,
    force: boolean = false
  ): Promise<void> {
    try {
      const repository = await this.getRepositoryStatus(path);
      const targetBranch = branch || repository.currentBranch;
      
      let command = `git push ${remote} ${targetBranch}`;
      
      if (force) {
        command += ' --force';
      }
      
      await this.executeGitCommand(path, command);
      
      this.emit('push:success', { path, remote, branch: targetBranch });
      
    } catch (error) {
      this.emit('push:error', { path, remote, branch, error });
      throw error;
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(path: string, remote: string = 'origin', branch?: string): Promise<void> {
    try {
      let command = `git pull ${remote}`;
      
      if (branch) {
        command += ` ${branch}`;
      }
      
      await this.executeGitCommand(path, command);
      
      this.emit('pull:success', { path, remote, branch });
      
    } catch (error) {
      this.emit('pull:error', { path, remote, branch, error });
      throw error;
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(
    path: string, 
    options: {
      limit?: number;
      since?: Date;
      author?: string;
      grep?: string;
    } = {}
  ): Promise<GitCommit[]> {
    try {
      let command = 'git log --pretty=format:"%H|%an|%ae|%ai|%s"';
      
      if (options.limit) {
        command += ` -n ${options.limit}`;
      }
      
      if (options.since) {
        command += ` --since="${options.since.toISOString()}"`;
      }
      
      if (options.author) {
        command += ` --author="${options.author}"`;
      }
      
      if (options.grep) {
        command += ` --grep="${options.grep}"`;
      }
      
      const result = await this.executeGitCommand(path, command);
      const commits: GitCommit[] = [];
      
      const lines = result.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          commits.push(this.parseCommit(line));
        }
      }
      
      return commits;
      
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  /**
   * Get diff between commits, branches, or working directory
   */
  async getDiff(
    path: string,
    from?: string,
    to?: string,
    files?: string[]
  ): Promise<GitDiff[]> {
    try {
      let command = 'git diff --numstat';
      
      if (from && to) {
        command += ` ${from}..${to}`;
      } else if (from) {
        command += ` ${from}`;
      }
      
      if (files && files.length > 0) {
        command += ` -- ${files.join(' ')}`;
      }
      
      const numstatResult = await this.executeGitCommand(path, command);
      const diffs: GitDiff[] = [];
      
      const lines = numstatResult.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const [additions, deletions, file] = line.split('\t');
          
          // Get the actual patch
          let patchCommand = command.replace('--numstat', '');
          patchCommand += ` -- ${file}`;
          
          try {
            const patch = await this.executeGitCommand(path, patchCommand);
            
            diffs.push({
              file,
              type: this.getDiffType(patch),
              additions: parseInt(additions) || 0,
              deletions: parseInt(deletions) || 0,
              patch
            });
          } catch {
            // Handle binary files or other issues
            diffs.push({
              file,
              type: 'modified',
              additions: parseInt(additions) || 0,
              deletions: parseInt(deletions) || 0,
              patch: 'Binary file or unable to generate patch'
            });
          }
        }
      }
      
      return diffs;
      
    } catch (error) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Stash changes
   */
  async stash(
    path: string, 
    message?: string, 
    includeUntracked: boolean = false
  ): Promise<void> {
    try {
      let command = 'git stash push';
      
      if (message) {
        command += ` -m "${message}"`;
      }
      
      if (includeUntracked) {
        command += ' -u';
      }
      
      await this.executeGitCommand(path, command);
      
      this.emit('stash:created', { path, message, includeUntracked });
      
    } catch (error) {
      this.emit('stash:error', { path, error });
      throw error;
    }
  }

  /**
   * Apply stashed changes
   */
  async stashPop(path: string, index: number = 0): Promise<void> {
    try {
      await this.executeGitCommand(path, `git stash pop stash@{${index}}`);
      
      this.emit('stash:applied', { path, index });
      
    } catch (error) {
      this.emit('stash:apply-error', { path, index, error });
      throw error;
    }
  }

  // Private methods

  private async executeGitCommand(path: string, command: string): Promise<string> {
    const result = await this.toolExecutor.executeTool({
      toolName: 'run_in_terminal',
      parameters: {
        command: `cd "${path}" && ${command}`,
        explanation: `Executing git command: ${command}`,
        isBackground: false
      }
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.result || '';
  }

  private parseGitStatus(status: string): { staged: string[]; unstaged: string[]; untracked: string[] } {
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    
    const lines = status.trim().split('\n');
    
    for (const line of lines) {
      if (line.length >= 3) {
        const stagedFlag = line[0];
        const unstagedFlag = line[1];
        const filename = line.substring(3);
        
        if (stagedFlag !== ' ' && stagedFlag !== '?') {
          staged.push(filename);
        }
        
        if (unstagedFlag !== ' ' && unstagedFlag !== '?') {
          unstaged.push(filename);
        }
        
        if (stagedFlag === '?' && unstagedFlag === '?') {
          untracked.push(filename);
        }
      }
    }
    
    return { staged, unstaged, untracked };
  }

  private parseCommit(line: string): GitCommit {
    const [hash, author, email, date, message] = line.split('|');
    
    return {
      hash,
      author,
      email,
      date: new Date(date),
      message,
      files: []
    };
  }

  private findConflictMarkers(content: string): Array<{ start: number; separator: number; end: number }> {
    const markers: Array<{ start: number; separator: number; end: number }> = [];
    const lines = content.split('\n');
    
    let currentMarker: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('<<<<<<<')) {
        currentMarker = { start: i };
      } else if (line === '=======' && currentMarker) {
        currentMarker.separator = i;
      } else if (line.startsWith('>>>>>>>') && currentMarker) {
        currentMarker.end = i;
        markers.push(currentMarker);
        currentMarker = null;
      }
    }
    
    return markers;
  }

  private getDiffType(patch: string): 'added' | 'modified' | 'deleted' | 'renamed' {
    if (patch.includes('new file mode')) return 'added';
    if (patch.includes('deleted file mode')) return 'deleted';
    if (patch.includes('rename from')) return 'renamed';
    return 'modified';
  }

  private async generateCommitMessage(path: string): Promise<string> {
    try {
      // Get staged changes
      const diffResult = await this.executeGitCommand(path, 'git diff --staged --name-only');
      const files = diffResult.trim().split('\n').filter(f => f);
      
      if (files.length === 0) {
        return 'Update files';
      }
      
      // Simple commit message generation based on files
      if (files.length === 1) {
        return `Update ${files[0]}`;
      }
      
      const extensions = files.map(f => f.split('.').pop()).filter(Boolean);
      const uniqueExtensions = [...new Set(extensions)];
      
      if (uniqueExtensions.length === 1) {
        return `Update ${uniqueExtensions[0]} files (${files.length} files)`;
      }
      
      return `Update multiple files (${files.length} files)`;
      
    } catch (error) {
      return 'Update files';
    }
  }
}

export default GitOperationsService;
