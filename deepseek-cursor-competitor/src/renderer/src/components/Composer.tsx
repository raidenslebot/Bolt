import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  XMarkIcon,
  DocumentIcon,
  CommandLineIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface FileEdit {
  filePath: string
  content: string
  originalContent: string
  language: string
  isNew: boolean
  hasChanges: boolean
}

interface ComposerProps {
  workingDirectory?: string
  onFileSelect?: (filePath: string) => void
  onApplyChanges?: (fileEdits: FileEdit[]) => void
}

const Composer: React.FC<ComposerProps> = ({ 
  workingDirectory, 
  onFileSelect, 
  onApplyChanges 
}) => {
  const [fileEdits, setFileEdits] = useState<FileEdit[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null)

  const addFile = async (filePath?: string) => {
    if (filePath) {
      // Add existing file
      try {
        const content = await window.electronAPI.file.read(filePath)
        const language = getLanguageFromPath(filePath)
        
        const newEdit: FileEdit = {
          filePath,
          content,
          originalContent: content,
          language,
          isNew: false,
          hasChanges: false
        }
        
        setFileEdits(prev => [...prev, newEdit])
        setActiveEditIndex(fileEdits.length)
      } catch (error) {
        console.error('Failed to read file:', error)
      }
    } else {
      // Add new file
      const newEdit: FileEdit = {
        filePath: `untitled-${Date.now()}.txt`,
        content: '',
        originalContent: '',
        language: 'plaintext',
        isNew: true,
        hasChanges: true
      }
      
      setFileEdits(prev => [...prev, newEdit])
      setActiveEditIndex(fileEdits.length)
    }
  }

  const removeFile = (index: number) => {
    setFileEdits(prev => prev.filter((_, i) => i !== index))
    if (activeEditIndex === index) {
      setActiveEditIndex(null)
    } else if (activeEditIndex !== null && activeEditIndex > index) {
      setActiveEditIndex(activeEditIndex - 1)
    }
  }

  const updateFileContent = (index: number, content: string) => {
    setFileEdits(prev => prev.map((edit, i) => 
      i === index 
        ? { 
            ...edit, 
            content, 
            hasChanges: content !== edit.originalContent 
          }
        : edit
    ))
  }

  const updateFilePath = (index: number, newPath: string) => {
    setFileEdits(prev => prev.map((edit, i) => 
      i === index 
        ? { 
            ...edit, 
            filePath: newPath,
            language: getLanguageFromPath(newPath)
          }
        : edit
    ))
  }

  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript'
      case 'js': case 'jsx': return 'javascript'
      case 'py': return 'python'
      case 'java': return 'java'
      case 'cs': return 'csharp'
      case 'cpp': case 'cc': case 'cxx': return 'cpp'
      case 'c': return 'c'
      case 'go': return 'go'
      case 'rs': return 'rust'
      case 'php': return 'php'
      case 'rb': return 'ruby'
      case 'html': return 'html'
      case 'css': return 'css'
      case 'scss': case 'sass': return 'scss'
      case 'json': return 'json'
      case 'xml': return 'xml'
      case 'yaml': case 'yml': return 'yaml'
      case 'md': return 'markdown'
      case 'sql': return 'sql'
      case 'sh': case 'bash': return 'shell'
      default: return 'plaintext'
    }
  }

  const generateWithAI = async () => {
    if (!instruction.trim() || fileEdits.length === 0) return

    setIsGenerating(true)
    try {
      // Prepare context for AI
      const context = fileEdits.map(edit => ({
        filePath: edit.filePath,
        content: edit.content,
        language: edit.language,
        isNew: edit.isNew
      }))

      const prompt = `
You are an expert programmer. I need you to help me modify multiple files simultaneously.

Current files in the composer:
${context.map(file => `
File: ${file.filePath} (${file.language})
${file.isNew ? '[NEW FILE]' : '[EXISTING FILE]'}
\`\`\`${file.language}
${file.content}
\`\`\`
`).join('\n')}

Instruction: ${instruction}

Please provide the complete updated content for each file that needs changes. Format your response as:

FILE: [file_path]
\`\`\`[language]
[complete_file_content]
\`\`\`

Only include files that actually need changes. Be precise and ensure the code is production-ready.`

      const response = await window.electronAPI.deepseek.completion(prompt, 'deepseek-coder')
      
      if (response.success && response.content) {
        parseAndApplyAIResponse(response.content)
      } else {
        console.error('AI generation failed:', response.error)
      }
    } catch (error) {
      console.error('Failed to generate with AI:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const parseAndApplyAIResponse = (aiResponse: string) => {
    const fileBlocks = aiResponse.split(/^FILE:\s*(.+)$/gm)
    
    for (let i = 1; i < fileBlocks.length; i += 2) {
      const filePath = fileBlocks[i].trim()
      const fileContent = fileBlocks[i + 1]
      
      if (fileContent) {
        // Extract code from markdown code blocks
        const codeMatch = fileContent.match(/```[\w]*\n([\s\S]*?)\n```/)
        const content = codeMatch ? codeMatch[1] : fileContent.trim()
        
        // Find the file edit index
        const editIndex = fileEdits.findIndex(edit => 
          edit.filePath === filePath || 
          edit.filePath.endsWith(filePath.split('/').pop() || '')
        )
        
        if (editIndex !== -1) {
          updateFileContent(editIndex, content)
        }
      }
    }
  }

  const applyAllChanges = () => {
    const changedFiles = fileEdits.filter(edit => edit.hasChanges)
    onApplyChanges?.(changedFiles)
  }

  const formatFilePath = (filePath: string) => {
    if (!workingDirectory) return filePath
    return filePath.replace(workingDirectory, '').replace(/^[\\\/]/, '')
  }

  const totalChanges = fileEdits.filter(edit => edit.hasChanges).length

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-purple-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Composer
          </span>
          {totalChanges > 0 && (
            <span className="px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
              {totalChanges} changed
            </span>
          )}
        </div>

        {/* AI Instruction Input */}
        <div className="space-y-2">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Describe what you want to implement across these files..."
            className="w-full h-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <div className="flex gap-2">
            <button
              onClick={generateWithAI}
              disabled={!instruction.trim() || fileEdits.length === 0 || isGenerating}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SparklesIcon className="w-4 h-4" />
              )}
              Generate
            </button>
            {totalChanges > 0 && (
              <button
                onClick={applyAllChanges}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <CommandLineIcon className="w-4 h-4" />
                Apply All ({totalChanges})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 overflow-x-auto">
        {fileEdits.map((edit, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer group ${
              activeEditIndex === index
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveEditIndex(index)}
          >
            <DocumentIcon className="w-4 h-4" />
            <span className="whitespace-nowrap">
              {formatFilePath(edit.filePath)}
            </span>
            {edit.hasChanges && (
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeFile(index)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        <button
          onClick={() => addFile()}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <PlusIcon className="w-4 h-4" />
          Add File
        </button>
      </div>

      {/* File Editor */}
      <div className="flex-1 overflow-hidden">
        {activeEditIndex !== null && fileEdits[activeEditIndex] && (
          <div className="h-full flex flex-col">
            {/* File Header */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={fileEdits[activeEditIndex].filePath}
                  onChange={(e) => updateFilePath(activeEditIndex, e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {fileEdits[activeEditIndex].language}
                </span>
                {fileEdits[activeEditIndex].isNew && (
                  <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
                    NEW
                  </span>
                )}
              </div>
            </div>

            {/* Text Editor */}
            <div className="flex-1">
              <textarea
                value={fileEdits[activeEditIndex].content}
                onChange={(e) => updateFileContent(activeEditIndex, e.target.value)}
                className="w-full h-full p-3 text-sm font-mono border-0 resize-none focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="Enter file content..."
              />
            </div>
          </div>
        )}

        {fileEdits.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <div>
              <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium mb-2">Multi-File Composer</p>
              <p className="text-sm mb-4">
                Add files to edit multiple files simultaneously with AI assistance
              </p>
              <button
                onClick={() => addFile()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 mx-auto"
              >
                <PlusIcon className="w-4 h-4" />
                Add First File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Composer
