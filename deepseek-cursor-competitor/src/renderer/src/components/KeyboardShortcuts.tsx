import React, { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onNewFile?: () => void
  onOpenFile?: () => void
  onSave?: () => void
  onFind?: () => void
  onToggleTerminal?: () => void
  onToggleChat?: () => void
  onToggleComposer?: () => void
  onQuickOpen?: () => void
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onNewFile,
  onOpenFile,
  onSave,
  onFind,
  onToggleTerminal,
  onToggleChat,
  onToggleComposer,
  onQuickOpen
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, shiftKey, altKey, key } = event
      const cmdOrCtrl = ctrlKey || metaKey

      // Prevent default for our shortcuts
      const preventDefault = () => {
        event.preventDefault()
        event.stopPropagation()
      }

      // File operations
      if (cmdOrCtrl && key === 'n' && !shiftKey && !altKey) {
        preventDefault()
        onNewFile?.()
        return
      }

      if (cmdOrCtrl && key === 'o' && !shiftKey && !altKey) {
        preventDefault()
        onOpenFile?.()
        return
      }

      if (cmdOrCtrl && key === 's' && !shiftKey && !altKey) {
        preventDefault()
        onSave?.()
        return
      }

      // Quick open (Cmd/Ctrl + P)
      if (cmdOrCtrl && key === 'p' && !shiftKey && !altKey) {
        preventDefault()
        onQuickOpen?.()
        return
      }

      // Find (Cmd/Ctrl + F)
      if (cmdOrCtrl && key === 'f' && !shiftKey && !altKey) {
        preventDefault()
        onFind?.()
        return
      }

      // Toggle terminal (Cmd/Ctrl + `)
      if (cmdOrCtrl && key === '`' && !shiftKey && !altKey) {
        preventDefault()
        onToggleTerminal?.()
        return
      }

      // Toggle chat (Cmd/Ctrl + L)
      if (cmdOrCtrl && key === 'l' && !shiftKey && !altKey) {
        preventDefault()
        onToggleChat?.()
        return
      }

      // Toggle composer (Cmd/Ctrl + I)
      if (cmdOrCtrl && key === 'i' && !shiftKey && !altKey) {
        preventDefault()
        onToggleComposer?.()
        return
      }

      // Command palette (Cmd/Ctrl + Shift + P)
      if (cmdOrCtrl && shiftKey && key === 'P' && !altKey) {
        preventDefault()
        // Could trigger a command palette in the future
        return
      }

      // Symbol search (Cmd/Ctrl + Shift + O)
      if (cmdOrCtrl && shiftKey && key === 'O' && !altKey) {
        preventDefault()
        onFind?.() // For now, use the find function
        return
      }

      // Go to line (Cmd/Ctrl + G)
      if (cmdOrCtrl && key === 'g' && !shiftKey && !altKey) {
        preventDefault()
        // Could implement go to line functionality
        return
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown, true)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [
    onNewFile,
    onOpenFile,
    onSave,
    onFind,
    onToggleTerminal,
    onToggleChat,
    onToggleComposer,
    onQuickOpen
  ])

  // This component doesn't render anything visible
  return null
}

export default KeyboardShortcuts

// Export shortcut definitions for documentation
export const SHORTCUTS = {
  file: {
    'Ctrl/Cmd + N': 'New File',
    'Ctrl/Cmd + O': 'Open File',
    'Ctrl/Cmd + S': 'Save File',
    'Ctrl/Cmd + P': 'Quick Open'
  },
  navigation: {
    'Ctrl/Cmd + F': 'Find/Search',
    'Ctrl/Cmd + Shift + O': 'Symbol Search',
    'Ctrl/Cmd + G': 'Go to Line'
  },
  panels: {
    'Ctrl/Cmd + `': 'Toggle Terminal',
    'Ctrl/Cmd + L': 'Toggle Chat',
    'Ctrl/Cmd + I': 'Toggle Composer'
  },
  advanced: {
    'Ctrl/Cmd + Shift + P': 'Command Palette'
  }
}
