import React, { useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import FileTree from './components/FileTree'
import ChatInterface from './components/ChatInterface'
import Terminal from './components/Terminal'
import StatusBar from './components/StatusBar'
import TitleBar from './components/TitleBar'
import GitPanel from './components/GitPanel'
import AdvancedSearch from './components/AdvancedSearch'
import Composer from './components/Composer'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import { AutonomousAIPanel } from '../components/AutonomousAIPanel'
import AutonomousProgressTracker from '../components/AutonomousProgressTracker'
import ToastNotificationSystem from '../components/ToastNotificationSystem'

interface OpenFile {
  path: string
  content: string
  modified: boolean
}

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<OpenFile | null>(null)
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [workspaceFolder, setWorkspaceFolder] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [chatWidth, setChatWidth] = useState(400)
  const [terminalHeight, setTerminalHeight] = useState(200)
  const [showChat, setShowChat] = useState(true)
  const [showTerminal, setShowTerminal] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'files' | 'git' | 'search' | 'composer' | 'autonomous'>('files')

  // Handle menu events from Electron
  useEffect(() => {
    if (!window.electronAPI) return

    const handleNewFile = () => {
      const newFile: OpenFile = {
        path: 'untitled.txt',
        content: '',
        modified: false
      }
      setCurrentFile(newFile)
      setOpenFiles(prev => [...prev, newFile])
    }

    const handleOpenFile = ({ filePath, content }: { filePath: string; content: string }) => {
      const file: OpenFile = {
        path: filePath,
        content,
        modified: false
      }
      setCurrentFile(file)
      setOpenFiles(prev => {
        const existing = prev.find(f => f.path === filePath)
        if (existing) return prev
        return [...prev, file]
      })
    }

    const handleOpenFolder = ({ folderPath }: { folderPath: string }) => {
      setWorkspaceFolder(folderPath)
    }

    const handleSave = async () => {
      if (!currentFile || !window.electronAPI) return
      
      if (currentFile.path === 'untitled.txt') {
        const result = await window.electronAPI.dialog.showSave({
          defaultPath: 'untitled.txt'
        })
        
        if (!result.canceled && result.filePath) {
          await saveFile(result.filePath, currentFile.content)
          const updatedFile = { ...currentFile, path: result.filePath, modified: false }
          setCurrentFile(updatedFile)
          setOpenFiles(prev => prev.map(f => f.path === currentFile.path ? updatedFile : f))
        }
      } else {
        await saveFile(currentFile.path, currentFile.content)
        setCurrentFile(prev => prev ? { ...prev, modified: false } : null)
        setOpenFiles(prev => prev.map(f => f.path === currentFile.path ? { ...f, modified: false } : f))
      }
    }

    const handleSaveAs = async () => {
      if (!currentFile || !window.electronAPI) return
      
      const result = await window.electronAPI.dialog.showSave()
      if (!result.canceled && result.filePath) {
        await saveFile(result.filePath, currentFile.content)
      }
    }

    // Register menu event listeners
    window.electronAPI.menu.onNewFile(handleNewFile)
    window.electronAPI.menu.onOpenFile(handleOpenFile)
    window.electronAPI.menu.onOpenFolder(handleOpenFolder)
    window.electronAPI.menu.onSave(handleSave)
    window.electronAPI.menu.onSaveAs(handleSaveAs)

    // Cleanup
    return () => {
      window.electronAPI.menu.removeAllListeners('menu:new-file')
      window.electronAPI.menu.removeAllListeners('menu:open-file')
      window.electronAPI.menu.removeAllListeners('menu:open-folder')
      window.electronAPI.menu.removeAllListeners('menu:save')
      window.electronAPI.menu.removeAllListeners('menu:save-as')
    }
  }, [currentFile])

  const saveFile = async (filePath: string, content: string) => {
    if (!window.electronAPI) return
    
    const result = await window.electronAPI.file.write(filePath, content)
    if (!result.success) {
      console.error('Failed to save file:', result.error)
    }
  }

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!currentFile) return
    
    const newContent = value || ''
    const updatedFile = { ...currentFile, content: newContent, modified: true }
    setCurrentFile(updatedFile)
    setOpenFiles(prev => prev.map(f => f.path === currentFile.path ? updatedFile : f))
  }, [currentFile])

  const handleFileSelect = async (filePath: string) => {
    if (!window.electronAPI) return
    
    const existing = openFiles.find(f => f.path === filePath)
    if (existing) {
      setCurrentFile(existing)
      return
    }

    setIsLoading(true)
    const result = await window.electronAPI.file.read(filePath)
    setIsLoading(false)
    
    if (result.success) {
      const file: OpenFile = {
        path: filePath,
        content: result.content,
        modified: false
      }
      setCurrentFile(file)
      setOpenFiles(prev => [...prev, file])
    } else {
      console.error('Failed to read file:', result.error)
    }
  }

  const closeFile = (filePath: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== filePath))
    
    if (currentFile?.path === filePath) {
      const remaining = openFiles.filter(f => f.path !== filePath)
      setCurrentFile(remaining.length > 0 ? remaining[remaining.length - 1] : null)
    }
  }

  const handleComposerChanges = async (fileEdits: Array<{
    filePath: string
    content: string
    originalContent: string
    language: string
    isNew: boolean
    hasChanges: boolean
  }>) => {
    for (const edit of fileEdits) {
      if (edit.hasChanges) {
        await saveFile(edit.filePath, edit.content)
        
        // Update or add the file to open files
        const existingIndex = openFiles.findIndex(f => f.path === edit.filePath)
        const fileObj: OpenFile = {
          path: edit.filePath,
          content: edit.content,
          modified: false
        }
        
        if (existingIndex >= 0) {
          setOpenFiles(prev => prev.map((f, i) => i === existingIndex ? fileObj : f))
        } else {
          setOpenFiles(prev => [...prev, fileObj])
        }
        
        // If this is the current file, update it
        if (currentFile?.path === edit.filePath) {
          setCurrentFile(fileObj)
        }
      }
    }
  }

  // Keyboard shortcut handlers
  const handleNewFileShortcut = () => {
    const newFile: OpenFile = {
      path: 'untitled.txt',
      content: '',
      modified: true
    }
    setCurrentFile(newFile)
    setOpenFiles(prev => [...prev, newFile])
  }

  const handleOpenFileShortcut = async () => {
    // For now, just show a placeholder - we'd need to implement file picker
    console.log('Open file shortcut triggered')
  }

  const handleSaveShortcut = async () => {
    if (!currentFile) return
    await saveFile(currentFile.path, currentFile.content)
  }

  const handleFindShortcut = () => {
    setSidebarTab('search')
  }

  const handleToggleTerminalShortcut = () => {
    setShowTerminal(prev => !prev)
  }

  const handleToggleChatShortcut = () => {
    setShowChat(prev => !prev)
  }

  const handleToggleComposerShortcut = () => {
    setSidebarTab('composer')
  }

  const handleQuickOpenShortcut = () => {
    // For now, just switch to files tab - could implement a proper quick open modal
    setSidebarTab('files')
  }

  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell'
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <KeyboardShortcuts
        onNewFile={handleNewFileShortcut}
        onOpenFile={handleOpenFileShortcut}
        onSave={handleSaveShortcut}
        onFind={handleFindShortcut}
        onToggleTerminal={handleToggleTerminalShortcut}
        onToggleChat={handleToggleChatShortcut}
        onToggleComposer={handleToggleComposerShortcut}
        onQuickOpen={handleQuickOpenShortcut}
      />
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div 
          className="bg-gray-800 border-r border-gray-700 flex-shrink-0"
          style={{ width: sidebarWidth }}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex flex-col border-b border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setSidebarTab('files')}
                  className={`flex-1 p-2 text-xs font-medium ${
                    sidebarTab === 'files'
                      ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  📁 Files
                </button>
                <button
                  onClick={() => setSidebarTab('git')}
                  className={`flex-1 p-2 text-xs font-medium ${
                    sidebarTab === 'git'
                      ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  🌿 Git
                </button>
                <button
                  onClick={() => setSidebarTab('search')}
                  className={`flex-1 p-2 text-xs font-medium ${
                    sidebarTab === 'search'
                      ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  🔍 Search
                </button>
              </div>
              <div className="flex">
                <button
                  onClick={() => setSidebarTab('composer')}
                  className={`flex-1 p-2 text-xs font-medium ${
                    sidebarTab === 'composer'
                      ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  ✨ Composer
                </button>
                <button
                  onClick={() => setSidebarTab('autonomous')}
                  className={`flex-1 p-2 text-xs font-medium ${
                    sidebarTab === 'autonomous'
                      ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  🧠 AI Workforce
                </button>
              </div>
            </div>
            {/* Sidebar content */}
            <div className="flex-1 overflow-auto">
              {sidebarTab === 'files' && (
                <FileTree 
                  workspaceFolder={workspaceFolder}
                  onFileSelect={handleFileSelect}
                  onWorkspaceFolderChange={setWorkspaceFolder}
                />
              )}
              {sidebarTab === 'git' && (
                <GitPanel 
                  workingDirectory={workspaceFolder || undefined}
                  onFileClick={handleFileSelect}
                />
              )}
              {sidebarTab === 'search' && (
                <AdvancedSearch
                  workingDirectory={workspaceFolder || undefined}
                  onFileSelect={handleFileSelect}
                />
              )}
              {sidebarTab === 'composer' && (
                <Composer
                  workingDirectory={workspaceFolder || undefined}
                  onFileSelect={handleFileSelect}
                  onApplyChanges={handleComposerChanges}
                />
              )}
              {sidebarTab === 'autonomous' && (
                <AutonomousAIPanel />
              )}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          {openFiles.length > 0 && (
            <div className="bg-gray-800 border-b border-gray-700 flex overflow-x-auto">
              {openFiles.map(file => (
                <div
                  key={file.path}
                  className={`flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer hover:bg-gray-700 ${
                    currentFile?.path === file.path ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => setCurrentFile(file)}
                >
                  <span className="text-sm truncate max-w-32">
                    {file.path.split('/').pop() || file.path.split('\\').pop()}
                    {file.modified && <span className="text-orange-400 ml-1">●</span>}
                  </span>
                  <button
                    className="ml-2 text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeFile(file.path)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor and chat container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="spinner"></div>
                  </div>
                ) : currentFile ? (
                  <Editor
                    height="100%"
                    language={getLanguageFromPath(currentFile.path)}
                    value={currentFile.content}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      fontFamily: "'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', monospace",
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      minimap: { enabled: true },
                      wordWrap: 'on',
                      tabSize: 2,
                      insertSpaces: true
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <h2 className="text-xl mb-2">DeepSeek Cursor Competitor</h2>
                      <p>Open a file to start editing</p>
                      <div className="mt-4 text-sm">
                        <p>Ctrl+N - New File</p>
                        <p>Ctrl+O - Open File</p>
                        <p>Ctrl+Shift+O - Open Folder</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal */}
              {showTerminal && (
                <div 
                  className="border-t border-gray-700 bg-black"
                  style={{ height: terminalHeight }}
                >
                  <Terminal />
                </div>
              )}
            </div>

            {/* Chat interface */}
            {showChat && (
              <div 
                className="bg-gray-800 border-l border-gray-700 flex-shrink-0"
                style={{ width: chatWidth }}
              >
                <ChatInterface currentFile={currentFile} />
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar 
        currentFile={currentFile}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        showChat={showChat}
        showTerminal={showTerminal}
      />

      {/* Autonomous Progress Tracker */}
      <AutonomousProgressTracker />
      
      {/* Toast Notifications */}
      <ToastNotificationSystem />
    </div>
  )
}

export default App
