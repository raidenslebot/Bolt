import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalSession {
  id: string
  title: string
  terminal: XTerm
  fitAddon: FitAddon
}

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      sessions.forEach(session => {
        session.fitAddon.fit()
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sessions])

  useEffect(() => {
    if (!window.electronAPI) return

    const handleTerminalData = (data: { id: string; data: string }) => {
      const session = sessions.find(s => s.id === data.id)
      if (session) {
        session.terminal.write(data.data)
      }
    }

    window.electronAPI.terminal.onData(handleTerminalData)

    return () => {
      // Cleanup would go here if we had a removeListener method
    }
  }, [sessions])

  const createNewSession = async () => {
    if (!terminalRef.current || !window.electronAPI || isCreating) return

    setIsCreating(true)
    
    try {
      const result = await window.electronAPI.terminal.create()
      
      if (result.success) {
        const terminal = new XTerm({
          theme: {
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ffffff',
            cursorAccent: '#000000',
            selectionBackground: '#ffffff40',
            black: '#000000',
            red: '#ff6b6b',
            green: '#51cf66',
            yellow: '#ffd93d',
            blue: '#74c0fc',
            magenta: '#f783ac',
            cyan: '#3bc9db',
            white: '#ffffff',
            brightBlack: '#495057',
            brightRed: '#ff8787',
            brightGreen: '#69db7c',
            brightYellow: '#ffe066',
            brightBlue: '#91a7ff',
            brightMagenta: '#faa2c1',
            brightCyan: '#66d9ef',
            brightWhite: '#ffffff'
          },
          fontSize: 14,
          fontFamily: '"SF Mono", Monaco, "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 1000,
          tabStopWidth: 4
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        
        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)

        const session: TerminalSession = {
          id: result.id,
          title: `Terminal ${sessions.length + 1}`,
          terminal,
          fitAddon
        }

        // Handle terminal input
        terminal.onData(async (data) => {
          if (window.electronAPI) {
            await window.electronAPI.terminal.write(result.id, data)
          }
        })

        // Handle terminal resize
        terminal.onResize(async ({ cols, rows }) => {
          if (window.electronAPI) {
            await window.electronAPI.terminal.resize(result.id, cols, rows)
          }
        })

        setSessions(prev => [...prev, session])
        setActiveSessionId(result.id)

        // Mount terminal to DOM
        setTimeout(() => {
          if (terminalRef.current) {
            terminal.open(terminalRef.current)
            fitAddon.fit()
            terminal.focus()
          }
        }, 0)

      } else {
        console.error('Failed to create terminal:', result.error)
      }
    } catch (error) {
      console.error('Error creating terminal:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const switchToSession = (sessionId: string) => {
    if (sessionId === activeSessionId || !terminalRef.current) return

    // Clear current terminal
    if (terminalRef.current.firstChild) {
      terminalRef.current.removeChild(terminalRef.current.firstChild)
    }

    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setActiveSessionId(sessionId)
      session.terminal.open(terminalRef.current)
      session.fitAddon.fit()
      session.terminal.focus()
    }
  }

  const closeSession = async (sessionId: string) => {
    if (!window.electronAPI) return

    try {
      await window.electronAPI.terminal.kill(sessionId)
      
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== sessionId)
        
        if (sessionId === activeSessionId) {
          if (filtered.length > 0) {
            const newActiveId = filtered[0].id
            setActiveSessionId(newActiveId)
            setTimeout(() => switchToSession(newActiveId), 0)
          } else {
            setActiveSessionId(null)
            if (terminalRef.current && terminalRef.current.firstChild) {
              terminalRef.current.removeChild(terminalRef.current.firstChild)
            }
          }
        }
        
        return filtered
      })
    } catch (error) {
      console.error('Error closing terminal:', error)
    }
  }

  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-700 flex items-center justify-between px-2 py-1">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`flex items-center px-3 py-1 text-xs rounded cursor-pointer ${
                session.id === activeSessionId 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              onClick={() => switchToSession(session.id)}
            >
              <span className="mr-2">🖥️</span>
              <span>{session.title}</span>
              <button
                className="ml-2 text-gray-500 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation()
                  closeSession(session.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={createNewSession}
            disabled={isCreating}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '...' : '+'}
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 relative">
        {sessions.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">🖥️</div>
              <p className="text-sm">No terminal sessions</p>
              <button
                onClick={createNewSession}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Terminal
              </button>
            </div>
          </div>
        ) : (
          <div 
            ref={terminalRef} 
            className="w-full h-full"
            style={{ fontSize: 0 }} // Prevents extra spacing
          />
        )}
      </div>

      {/* Status bar */}
      {activeSession && (
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-1 text-xs text-gray-400 flex items-center justify-between">
          <span>Terminal: {activeSession.title}</span>
          <span>Ready</span>
        </div>
      )}
    </div>
  )
}

export default Terminal
