import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PaperAirplaneIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface OpenFile {
  path: string
  content: string
  modified: boolean
}

interface ChatInterfaceProps {
  currentFile: OpenFile | null
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentFile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9)

  const addMessage = (role: 'user' | 'assistant', content: string, isStreaming = false) => {
    const message: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      isStreaming
    }
    setMessages(prev => [...prev, message])
    return message.id
  }

  const updateMessage = (id: string, content: string, isStreaming = false) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content, isStreaming } : msg
    ))
  }

  const buildContext = () => {
    const context = {
      currentFile: currentFile ? {
        path: currentFile.path,
        language: getLanguageFromPath(currentFile.path),
        content: currentFile.content
      } : null,
      timestamp: new Date().toISOString()
    }
    return context
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
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown'
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message
    addMessage('user', userMessage)

    try {
      if (!window.electronAPI || !window.electronAPI.autonomous) {
        throw new Error('Autonomous AI API not available')
      }

      const context = buildContext()
      const assistantMessageId = addMessage('assistant', '', true)

      // Send to Autonomous AI System instead of basic DeepSeek
      const response = await window.electronAPI.autonomous.chat(userMessage, context)

      if (response.success) {
        updateMessage(assistantMessageId, response.content || 'Autonomous task initiated', false)
        
        // If we got a project ID, add a follow-up message about the autonomous execution
        if (response.projectId) {
          const followupId = addMessage('assistant', `🤖 Autonomous execution started (Project ID: ${response.projectId}). The system is now working on your request...`, false)
        }
      } else {
        updateMessage(assistantMessageId, `Error: ${response.error}`, false)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addMessage('assistant', `Error: Failed to send message. ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    const lines = content.split('\n')
    const formattedLines = lines.map((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        return <div key={index} className="text-xs text-gray-400 mt-2">{line}</div>
      }
      
      // Code inline
      const codeRegex = /`([^`]+)`/g
      const parts = line.split(codeRegex)
      const formatted = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <code key={i} className="bg-gray-800 px-1 rounded text-sm font-mono">{part}</code>
        }
        return part
      })

      return <div key={index} className="mb-1">{formatted}</div>
    })

    return <div>{formattedLines}</div>
  }

  const MessageComponent = ({ message }: { message: ChatMessage }) => (
    <div className={`mb-4 ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}>
      <div className={`p-3 rounded-lg ${
        message.role === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-700 text-gray-100'
      }`}>
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs opacity-75 font-medium">
            {message.role === 'user' ? 'You' : 'DeepSeek'}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-60">
              {message.timestamp.toLocaleTimeString()}
            </span>
            <button
              onClick={() => copyToClipboard(message.content, message.id)}
              className="p-1 hover:bg-black hover:bg-opacity-20 rounded transition-colors"
              title="Copy message"
            >
              {copiedMessageId === message.id ? (
                <CheckIcon className="w-3 h-3 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-3 h-3 opacity-60 hover:opacity-100" />
              )}
            </button>
          </div>
        </div>
        
        <div className="text-sm leading-relaxed">
          {message.isStreaming ? (
            <div className="flex items-center">
              <span>{message.content}</span>
              <div className="ml-2 animate-pulse">▋</div>
            </div>
          ) : (
            formatMessage(message.content)
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">AI Assistant</h3>
          <p className="text-xs text-gray-500">
            {currentFile ? `Editing: ${currentFile.path.split('/').pop() || currentFile.path.split('\\').pop()}` : 'No file selected'}
          </p>
        </div>
        <button
          onClick={clearMessages}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Clear messages"
        >
          <TrashIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">🤖</div>
            <h4 className="text-lg font-medium mb-2">AI Assistant Ready</h4>
            <p className="text-sm">
              Ask questions about your code, request explanations, or get help with development tasks.
            </p>
            <div className="mt-4 text-xs space-y-1">
              <p>💡 Try: "Explain this function"</p>
              <p>🔧 Try: "Add error handling"</p>
              <p>📝 Try: "Write documentation"</p>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <MessageComponent key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentFile ? "Ask about your code..." : "Ask me anything..."}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {currentFile && (
            <span className="text-blue-400">
              Context: {getLanguageFromPath(currentFile.path)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
