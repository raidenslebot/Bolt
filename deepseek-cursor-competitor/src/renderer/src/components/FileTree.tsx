import React, { useState, useEffect, useRef } from 'react'
import { ChevronRightIcon, ChevronDownIcon, DocumentIcon, FolderIcon, FolderOpenIcon, PlusIcon, FolderPlusIcon, EllipsisVerticalIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  expanded?: boolean
}

interface FileTreeProps {
  workspaceFolder: string | null
  onFileSelect: (filePath: string) => void
  onWorkspaceFolderChange?: (folderPath: string) => void
}

interface ContextMenu {
  x: number
  y: number
  node: FileTreeNode | null
  visible: boolean
}

const FileTree: React.FC<FileTreeProps> = ({ workspaceFolder, onFileSelect, onWorkspaceFolderChange }) => {
  const [tree, setTree] = useState<FileTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ x: 0, y: 0, node: null, visible: false })
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [selectedForAction, setSelectedForAction] = useState<FileTreeNode | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (workspaceFolder) {
      loadDirectory(workspaceFolder)
    } else {
      setTree([])
    }
  }, [workspaceFolder])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.visible])

  const loadDirectory = async (dirPath: string) => {
    if (!window.electronAPI) return

    setLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.fileSystem.readDirectory(dirPath)
      if (result.success) {
        const nodes = await Promise.all(
          result.entries.map(async (entry: any) => {
            const node: FileTreeNode = {
              name: entry.name,
              path: entry.path, // Use the path from the backend which has proper separators
              type: entry.type,
              expanded: false
            }

            if (entry.type === 'directory') {
              node.children = []
            }

            return node
          })
        )

        // Sort: directories first, then files, both alphabetically
        nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })

        if (workspaceFolder) {
          setTree([{
            name: workspaceFolder.split('/').pop() || workspaceFolder.split('\\').pop() || 'Project',
            path: workspaceFolder,
            type: 'directory',
            expanded: true,
            children: nodes
          }])
        }
      } else {
        setError(result.error || 'Failed to load directory')
      }
    } catch (err) {
      setError('Failed to load directory')
      console.error('Error loading directory:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSubdirectory = async (node: FileTreeNode) => {
    if (!window.electronAPI || node.type !== 'directory') return

    try {
      const result = await window.electronAPI.fileSystem.readDirectory(node.path)
      if (result.success) {
        const children = await Promise.all(
          result.entries.map(async (entry: any) => {
            const fullPath = `${node.path}/${entry.name}`.replace(/\\/g, '/')
            return {
              name: entry.name,
              path: fullPath,
              type: entry.type,
              expanded: false,
              children: entry.type === 'directory' ? [] : undefined
            } as FileTreeNode
          })
        )

        children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })

        updateNodeChildren(node.path, children)
      }
    } catch (err) {
      console.error('Error loading subdirectory:', err)
    }
  }

  const updateNodeChildren = (path: string, children: FileTreeNode[]) => {
    const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, children, expanded: true }
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) }
        }
        return node
      })
    }

    setTree(updateNode(tree))
  }

  const handleContextMenu = (event: React.MouseEvent, node: FileTreeNode) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
      visible: true
    })
  }

  const handleCreateFile = (parentNode?: FileTreeNode) => {
    setSelectedForAction(parentNode || null)
    setShowNewFileDialog(true)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCreateFolder = (parentNode?: FileTreeNode) => {
    setSelectedForAction(parentNode || null)
    setShowNewFolderDialog(true)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleRename = (node: FileTreeNode) => {
    setSelectedForAction(node)
    setNewItemName(node.name)
    setShowRenameDialog(true)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleDelete = async (node: FileTreeNode) => {
    if (!window.electronAPI) return
    
    const confirmed = confirm(`Are you sure you want to delete "${node.name}"?`)
    if (!confirmed) return

    try {
      const result = await window.electronAPI.fileSystem.delete(node.path)
      if (result.success) {
        // Refresh the parent directory
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
        await refreshDirectory(parentPath)
      } else {
        alert(`Failed to delete: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete item')
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const confirmCreateFile = async () => {
    if (!newItemName.trim() || !window.electronAPI) return

    const parentPath = selectedForAction?.path || workspaceFolder
    if (!parentPath) return

    const filePath = `${parentPath}/${newItemName.trim()}`
    
    try {
      const result = await window.electronAPI.file.write(filePath, '')
      if (result.success) {
        await refreshDirectory(parentPath)
        setShowNewFileDialog(false)
        setNewItemName('')
        setSelectedForAction(null)
      } else {
        alert(`Failed to create file: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating file:', error)
      alert('Failed to create file')
    }
  }

  const confirmCreateFolder = async () => {
    if (!newItemName.trim() || !window.electronAPI) return

    const parentPath = selectedForAction?.path || workspaceFolder
    if (!parentPath) return

    const folderPath = `${parentPath}/${newItemName.trim()}`
    
    try {
      const result = await window.electronAPI.fileSystem.createDirectory(folderPath)
      if (result.success) {
        await refreshDirectory(parentPath)
        setShowNewFolderDialog(false)
        setNewItemName('')
        setSelectedForAction(null)
      } else {
        alert(`Failed to create folder: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder')
    }
  }

  const confirmRename = async () => {
    if (!newItemName.trim() || !selectedForAction || !window.electronAPI) return

    const oldPath = selectedForAction.path
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const newPath = `${parentPath}/${newItemName.trim()}`
    
    if (oldPath === newPath) {
      setShowRenameDialog(false)
      setNewItemName('')
      setSelectedForAction(null)
      return
    }

    try {
      const result = await window.electronAPI.fileSystem.rename(oldPath, newPath)
      if (result.success) {
        await refreshDirectory(parentPath)
        setShowRenameDialog(false)
        setNewItemName('')
        setSelectedForAction(null)
      } else {
        alert(`Failed to rename: ${result.error}`)
      }
    } catch (error) {
      console.error('Error renaming:', error)
      alert('Failed to rename item')
    }
  }

  const refreshDirectory = async (dirPath: string) => {
    if (dirPath === workspaceFolder) {
      await loadDirectory(dirPath)
    } else {
      // Find and refresh the specific directory node
      const updateTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
        return nodes.map(node => {
          if (node.path === dirPath && node.type === 'directory') {
            loadSubdirectory(node)
            return node
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) }
          }
          return node
        })
      }
      setTree(updateTree(tree))
    }
  }

  const toggleNode = async (node: FileTreeNode) => {
    if (node.type === 'file') {
      onFileSelect(node.path)
      return
    }

    if (!node.expanded && node.children?.length === 0) {
      await loadSubdirectory(node)
    } else {
      const toggleNodeExpansion = (nodes: FileTreeNode[]): FileTreeNode[] => {
        return nodes.map(n => {
          if (n.path === node.path) {
            return { ...n, expanded: !n.expanded }
          }
          if (n.children) {
            return { ...n, children: toggleNodeExpansion(n.children) }
          }
          return n
        })
      }

      setTree(toggleNodeExpansion(tree))
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    const iconMap: Record<string, string> = {
      js: '🟨',
      jsx: '🔵',
      ts: '🔷',
      tsx: '🔷',
      py: '🐍',
      java: '☕',
      cpp: '⚡',
      c: '⚡',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      json: '📄',
      md: '📝',
      txt: '📄',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      svg: '🎯',
      pdf: '📕',
      zip: '📦',
      gitignore: '🙈',
      env: '🔐'
    }

    if (fileName.startsWith('.')) {
      return '⚙️'
    }

    return iconMap[ext || ''] || '📄'
  }

  const renderNode = (node: FileTreeNode, depth: number = 0) => {
    const isDirectory = node.type === 'directory'
    const hasChildren = isDirectory && node.children && node.children.length > 0
    const isExpanded = node.expanded

    return (
      <div key={node.path}>
        <div
          className="flex items-center px-2 py-1 hover:bg-gray-700 cursor-pointer text-sm select-none"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleNode(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {isDirectory && (
            <div className="w-4 h-4 mr-1 flex items-center justify-center">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3 text-gray-400" />
                )
              ) : null}
            </div>
          )}
          
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpenIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <FolderIcon className="w-4 h-4 text-blue-400" />
              )
            ) : (
              <span className="text-xs">{getFileIcon(node.name)}</span>
            )}
          </div>
          
          <span className="truncate text-gray-300 hover:text-white">
            {node.name}
          </span>
        </div>
        
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!workspaceFolder) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
            <button
              onClick={async () => {
                if (!window.electronAPI) return
                const result = await window.electronAPI.dialog.showOpenDialog({
                  properties: ['openDirectory']
                })
                if (result && !result.canceled && result.filePaths?.length > 0) {
                  onWorkspaceFolderChange?.(result.filePaths[0])
                }
              }}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
            >
              <FolderIcon className="w-3 h-3" />
              Open Folder
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 text-center text-gray-500">
          <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No folder opened</p>
          <p className="text-xs mt-1">Open a folder to see the file tree</p>
          <p className="text-xs mt-2 text-gray-600">Ctrl+Shift+O</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
        </div>
        <div className="flex-1 p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading files...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
        </div>
        <div className="flex-1 p-4 text-center text-red-400">
          <p className="text-sm">Error: {error}</p>
          <button 
            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            onClick={() => workspaceFolder && loadDirectory(workspaceFolder)}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header with action buttons */}
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreateFile()}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="New File"
          >
            <DocumentIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCreateFolder()}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="New Folder"
          >
            <FolderPlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => workspaceFolder && refreshDirectory(workspaceFolder)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading files...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <p className="text-sm">Error: {error}</p>
            <button 
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              onClick={() => workspaceFolder && loadDirectory(workspaceFolder)}
            >
              Retry
            </button>
          </div>
        ) : (
          tree.map(node => renderNode(node))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          ref={contextMenuRef}
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node.type === 'directory' && (
            <>
              <button
                onClick={() => handleCreateFile(contextMenu.node!)}
                className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              >
                <DocumentIcon className="w-4 h-4" />
                New File
              </button>
              <button
                onClick={() => handleCreateFolder(contextMenu.node!)}
                className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              >
                <FolderPlusIcon className="w-4 h-4" />
                New Folder
              </button>
              <div className="border-t border-gray-600 my-1"></div>
            </>
          )}
          <button
            onClick={() => handleRename(contextMenu.node!)}
            className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.node!)}
            className="w-full px-3 py-1 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-80">
            <h3 className="text-lg font-medium mb-3">Create New File</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter file name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreateFile()
                if (e.key === 'Escape') {
                  setShowNewFileDialog(false)
                  setNewItemName('')
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNewFileDialog(false)
                  setNewItemName('')
                }}
                className="px-3 py-1 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateFile}
                disabled={!newItemName.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-80">
            <h3 className="text-lg font-medium mb-3">Create New Folder</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter folder name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreateFolder()
                if (e.key === 'Escape') {
                  setShowNewFolderDialog(false)
                  setNewItemName('')
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false)
                  setNewItemName('')
                }}
                className="px-3 py-1 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateFolder}
                disabled={!newItemName.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 w-80">
            <h3 className="text-lg font-medium mb-3">Rename {selectedForAction?.type === 'directory' ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') {
                  setShowRenameDialog(false)
                  setNewItemName('')
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRenameDialog(false)
                  setNewItemName('')
                }}
                className="px-3 py-1 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                disabled={!newItemName.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileTree
