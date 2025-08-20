import React, { useState, useEffect } from 'react'
import { 
  FolderIcon, 
  DocumentIcon, 
  PlusIcon, 
  MinusIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

interface GitFileStatus {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'staged' | 'conflicted'
}

interface GitBranch {
  name: string
  current: boolean
  commit: string
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: Date
}

interface GitPanelProps {
  workingDirectory?: string
  onFileClick?: (filePath: string) => void
}

const GitPanel: React.FC<GitPanelProps> = ({ workingDirectory, onFileClick }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [files, setFiles] = useState<GitFileStatus[]>([])
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>('')
  const [commitMessage, setCommitMessage] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [activeTab, setActiveTab] = useState<'changes' | 'branches' | 'history'>('changes')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (workingDirectory) {
      initializeGit(workingDirectory)
    }
  }, [workingDirectory])

  const initializeGit = async (directory: string) => {
    setLoading(true)
    try {
      const result = await window.electronAPI.git.initialize(directory)
      if (result.success) {
        setIsInitialized(true)
        await refreshData()
      } else {
        console.warn('Not a git repository:', result.error)
        setIsInitialized(false)
      }
    } catch (error) {
      console.error('Git initialization error:', error)
      setIsInitialized(false)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    if (!isInitialized) return

    try {
      const [statusResult, branchesResult, commitsResult] = await Promise.all([
        window.electronAPI.git.status(),
        window.electronAPI.git.branches(),
        window.electronAPI.git.commits(10)
      ])

      if (statusResult.success && statusResult.files) {
        setFiles(statusResult.files)
      }

      if (branchesResult.success && branchesResult.branches) {
        setBranches(branchesResult.branches)
        const current = branchesResult.branches.find((b: any) => b.current)
        if (current) {
          setCurrentBranch(current.name)
        }
      }

      if (commitsResult.success && commitsResult.commits) {
        setCommits(commitsResult.commits)
      }
    } catch (error) {
      console.error('Git refresh error:', error)
    }
  }

  const stageFile = async (filePath: string) => {
    try {
      const result = await window.electronAPI.git.stageFile(filePath)
      if (result.success) {
        await refreshData()
      }
    } catch (error) {
      console.error('Git stage error:', error)
    }
  }

  const unstageFile = async (filePath: string) => {
    try {
      const result = await window.electronAPI.git.unstageFile(filePath)
      if (result.success) {
        await refreshData()
      }
    } catch (error) {
      console.error('Git unstage error:', error)
    }
  }

  const commitChanges = async () => {
    if (!commitMessage.trim()) return

    try {
      const result = await window.electronAPI.git.commit(commitMessage.trim())
      if (result.success) {
        setCommitMessage('')
        await refreshData()
      }
    } catch (error) {
      console.error('Git commit error:', error)
    }
  }

  const createBranch = async () => {
    if (!newBranchName.trim()) return

    try {
      const result = await window.electronAPI.git.createBranch(newBranchName.trim())
      if (result.success) {
        setNewBranchName('')
        await refreshData()
      }
    } catch (error) {
      console.error('Git create branch error:', error)
    }
  }

  const switchBranch = async (branchName: string) => {
    try {
      const result = await window.electronAPI.git.switchBranch(branchName)
      if (result.success) {
        await refreshData()
      }
    } catch (error) {
      console.error('Git switch branch error:', error)
    }
  }

  const pull = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.git.pull()
      if (result.success) {
        await refreshData()
      }
    } catch (error) {
      console.error('Git pull error:', error)
    } finally {
      setLoading(false)
    }
  }

  const push = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.git.push()
      if (result.success) {
        await refreshData()
      }
    } catch (error) {
      console.error('Git push error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
      case 'staged':
        return <PlusIcon className="w-4 h-4 text-green-500" />
      case 'modified':
        return <DocumentIcon className="w-4 h-4 text-yellow-500" />
      case 'deleted':
        return <MinusIcon className="w-4 h-4 text-red-500" />
      case 'untracked':
        return <DocumentIcon className="w-4 h-4 text-gray-400" />
      case 'conflicted':
        return <DocumentIcon className="w-4 h-4 text-red-600" />
      default:
        return <DocumentIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
      case 'staged':
        return 'text-green-600'
      case 'modified':
        return 'text-yellow-600'
      case 'deleted':
        return 'text-red-600'
      case 'untracked':
        return 'text-gray-500'
      case 'conflicted':
        return 'text-red-700'
      default:
        return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>Not a Git repository</p>
        <p className="text-sm text-gray-400">Open a folder with Git to see version control</p>
      </div>
    )
  }

  const stagedFiles = files.filter(f => f.status === 'staged')
  const unstagedFiles = files.filter(f => f.status !== 'staged')

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentBranch}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={pull}
            disabled={loading}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Pull"
          >
            <CloudArrowDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={push}
            disabled={loading}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Push"
          >
            <CloudArrowUpIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['changes', 'branches', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'changes' && (
          <div className="p-3 space-y-4">
            {/* Commit Section */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    onClick={commitChanges}
                    disabled={!commitMessage.trim()}
                    className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Commit
                  </button>
                </div>
              </div>
            )}

            {/* Staged Changes */}
            {stagedFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Staged Changes ({stagedFiles.length})
                </h3>
                <div className="space-y-1">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                      onClick={() => onFileClick?.(file.path)}
                    >
                      {getStatusIcon(file.status)}
                      <span className={`flex-1 text-sm truncate ${getStatusColor(file.status)}`}>
                        {file.path}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          unstageFile(file.path)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Unstage"
                      >
                        <MinusIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unstaged Changes */}
            {unstagedFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Changes ({unstagedFiles.length})
                </h3>
                <div className="space-y-1">
                  {unstagedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                      onClick={() => onFileClick?.(file.path)}
                    >
                      {getStatusIcon(file.status)}
                      <span className={`flex-1 text-sm truncate ${getStatusColor(file.status)}`}>
                        {file.path}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          stageFile(file.path)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Stage"
                      >
                        <PlusIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <DocumentIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No changes</p>
                <p className="text-sm text-gray-400">Working tree clean</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="p-3 space-y-4">
            {/* Create Branch */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="New branch name..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={createBranch}
                disabled={!newBranchName.trim()}
                className="px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>

            {/* Branch List */}
            <div className="space-y-1">
              {branches.map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                    branch.current
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => !branch.current && switchBranch(branch.name)}
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{branch.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {branch.commit.substring(0, 8)}
                    </div>
                  </div>
                  {branch.current && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-3 space-y-2">
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {commit.message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {commit.author} • {new Date(commit.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {commit.hash.substring(0, 8)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GitPanel
