import React from 'react'
import { ChatBubbleLeftIcon, CommandLineIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface OpenFile {
  path: string
  content: string
  modified: boolean
}

interface StatusBarProps {
  currentFile: OpenFile | null
  onToggleChat: () => void
  onToggleTerminal: () => void
  showChat: boolean
  showTerminal: boolean
}

const StatusBar: React.FC<StatusBarProps> = ({
  currentFile,
  onToggleChat,
  onToggleTerminal,
  showChat,
  showTerminal
}) => {
  const getFileInfo = () => {
    if (!currentFile) return null

    const fileName = currentFile.path.split('/').pop() || currentFile.path.split('\\').pop()
    const extension = fileName?.split('.').pop()?.toLowerCase()
    const lines = currentFile.content.split('\n').length
    const chars = currentFile.content.length
    const words = currentFile.content.trim() ? currentFile.content.trim().split(/\s+/).length : 0

    return {
      fileName,
      extension,
      lines,
      chars,
      words
    }
  }

  const getLanguageDisplayName = (extension: string): string => {
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      jsx: 'JavaScript React',
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      php: 'PHP',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin',
      scala: 'Scala',
      html: 'HTML',
      htm: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      less: 'Less',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      yml: 'YAML',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bash: 'Bash',
      zsh: 'Zsh',
      ps1: 'PowerShell',
      dockerfile: 'Dockerfile',
      gitignore: 'Git Ignore',
      env: 'Environment'
    }
    return languageMap[extension] || extension.toUpperCase()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const fileInfo = getFileInfo()

  return (
    <div className="bg-blue-600 text-white px-4 py-1 text-xs flex items-center justify-between select-none">
      {/* Left side - File info */}
      <div className="flex items-center space-x-4">
        {currentFile ? (
          <>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{fileInfo?.fileName}</span>
              {currentFile.modified && (
                <span className="text-orange-300" title="Unsaved changes">●</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3 text-blue-200">
              <span title="Language">
                {fileInfo?.extension ? getLanguageDisplayName(fileInfo.extension) : 'Plain Text'}
              </span>
              
              <span title="Lines">
                {fileInfo?.lines} lines
              </span>
              
              <span title="Characters">
                {fileInfo?.chars} chars
              </span>
              
              <span title="Words">
                {fileInfo?.words} words
              </span>
              
              <span title="File size">
                {formatFileSize(new Blob([currentFile.content]).size)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-blue-200">No file selected</span>
        )}
      </div>

      {/* Right side - Controls and status */}
      <div className="flex items-center space-x-3">
        {/* AI Status */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full" title="AI Ready"></div>
          <span className="text-blue-200">DeepSeek Ready</span>
        </div>

        {/* View toggles */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleChat}
            className={`p-1 rounded hover:bg-blue-700 transition-colors ${
              showChat ? 'bg-blue-700' : ''
            }`}
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleTerminal}
            className={`p-1 rounded hover:bg-blue-700 transition-colors ${
              showTerminal ? 'bg-blue-700' : ''
            }`}
            title={showTerminal ? 'Hide Terminal' : 'Show Terminal'}
          >
            <CommandLineIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Git status */}
        <div className="flex items-center space-x-1 text-blue-200">
          <span>●</span>
          <span>main</span>
        </div>

        {/* Connection status */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Connected"></div>
          <span className="text-blue-200">Online</span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
