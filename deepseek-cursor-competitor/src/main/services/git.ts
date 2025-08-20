import { simpleGit, SimpleGit, StatusResult, LogResult } from 'simple-git'
import { join } from 'path'

export interface GitFileStatus {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'staged' | 'conflicted'
}

export interface GitBranch {
  name: string
  current: boolean
  commit: string
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: Date
}

export class GitService {
  private git: SimpleGit | null = null
  private workingDir: string = ''

  async initializeRepository(workingDirectory: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.workingDir = workingDirectory
      this.git = simpleGit(workingDirectory)
      
      // Check if it's a git repository
      const isRepo = await this.git.checkIsRepo()
      if (!isRepo) {
        return { success: false, error: 'Not a git repository' }
      }

      return { success: true }
    } catch (error) {
      console.error('Git initialization error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async getStatus(): Promise<{ success: boolean; files?: GitFileStatus[]; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      const status: StatusResult = await this.git.status()
      const files: GitFileStatus[] = []

      // Process different types of file changes
      status.modified.forEach(file => files.push({ path: file, status: 'modified' }))
      status.created.forEach(file => files.push({ path: file, status: 'added' }))
      status.deleted.forEach(file => files.push({ path: file, status: 'deleted' }))
      status.not_added.forEach(file => files.push({ path: file, status: 'untracked' }))
      status.staged.forEach(file => files.push({ path: file, status: 'staged' }))
      status.conflicted.forEach(file => files.push({ path: file, status: 'conflicted' }))

      return { success: true, files }
    } catch (error) {
      console.error('Git status error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async getBranches(): Promise<{ success: boolean; branches?: GitBranch[]; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      const branchSummary = await this.git.branch()
      const branches: GitBranch[] = []

      Object.entries(branchSummary.branches).forEach(([name, branch]) => {
        branches.push({
          name,
          current: name === branchSummary.current,
          commit: branch.commit
        })
      })

      return { success: true, branches }
    } catch (error) {
      console.error('Git branches error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async getCommitHistory(limit: number = 20): Promise<{ success: boolean; commits?: GitCommit[]; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      const log: LogResult = await this.git.log({ maxCount: limit })
      const commits: GitCommit[] = log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date)
      }))

      return { success: true, commits }
    } catch (error) {
      console.error('Git log error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async stageFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.add(filePath)
      return { success: true }
    } catch (error) {
      console.error('Git add error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async unstageFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.reset(['HEAD', filePath])
      return { success: true }
    } catch (error) {
      console.error('Git reset error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async commit(message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      const result = await this.git.commit(message)
      return { success: true, hash: result.commit }
    } catch (error) {
      console.error('Git commit error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async createBranch(branchName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.checkoutLocalBranch(branchName)
      return { success: true }
    } catch (error) {
      console.error('Git create branch error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async switchBranch(branchName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.checkout(branchName)
      return { success: true }
    } catch (error) {
      console.error('Git checkout error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async pull(): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.pull()
      return { success: true }
    } catch (error) {
      console.error('Git pull error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async push(): Promise<{ success: boolean; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      await this.git.push()
      return { success: true }
    } catch (error) {
      console.error('Git push error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async getDiff(filePath?: string): Promise<{ success: boolean; diff?: string; error?: string }> {
    if (!this.git) {
      return { success: false, error: 'Git not initialized' }
    }

    try {
      const diff = filePath 
        ? await this.git.diff([filePath])
        : await this.git.diff()
      
      return { success: true, diff }
    } catch (error) {
      console.error('Git diff error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  async isRepository(directory: string): Promise<boolean> {
    try {
      const testGit = simpleGit(directory)
      return await testGit.checkIsRepo()
    } catch (error) {
      return false
    }
  }
}
