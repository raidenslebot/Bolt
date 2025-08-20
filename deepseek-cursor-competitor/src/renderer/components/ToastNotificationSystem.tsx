import React, { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

interface ToastNotification {
  id: string
  type: 'info' | 'success' | 'error' | 'warning'
  title: string
  message: string
  duration?: number
  timestamp: Date
}

export const ToastNotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  useEffect(() => {
    // Listen for autonomous project events
    const addNotification = (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
      const newNotification: ToastNotification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date()
      }
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 5)) // Keep max 5 notifications
      
      // Auto remove after duration
      if (notification.duration !== 0) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newNotification.id))
        }, notification.duration || 5000)
      }
    }

    // Set up autonomous event listeners
    const handleProjectLaunched = (data: any) => {
      addNotification({
        type: 'info',
        title: '🚀 Autonomous Project Started',
        message: `Project ${data.sessionId.slice(-8)} is now running autonomously`,
        duration: 3000
      })
    }

    const handleProgressUpdate = (data: any) => {
      if (data.status.progress % 25 === 0 && data.status.progress > 0) { // Show every 25%
        addNotification({
          type: 'info',
          title: '⚡ Progress Update',
          message: `${data.status.currentPhase} - ${data.status.progress}%`,
          duration: 2000
        })
      }
    }

    const handleProjectCompleted = (data: any) => {
      addNotification({
        type: 'success',
        title: '✅ Project Completed',
        message: `Autonomous project ${data.sessionId.slice(-8)} completed successfully`,
        duration: 5000
      })
    }

    const handleProjectFailed = (data: any) => {
      addNotification({
        type: 'error',
        title: '❌ Project Failed',
        message: `Autonomous project ${data.sessionId.slice(-8)} encountered an error`,
        duration: 8000
      })
    }

    if (window.electronAPI?.autonomous) {
      try {
        // Note: These would need proper type handling in production
        (window as any).electronAPI.autonomous.onProjectLaunched?.(handleProjectLaunched)
        ;(window as any).electronAPI.autonomous.onProgressUpdate?.(handleProgressUpdate)
        ;(window as any).electronAPI.autonomous.onProjectCompleted?.(handleProjectCompleted)
        ;(window as any).electronAPI.autonomous.onProjectFailed?.(handleProjectFailed)
      } catch (error) {
        console.log('Progress tracking not fully available yet')
      }
    }

    return () => {
      // Cleanup would go here
    }
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'info':
      default:
        return <Activity className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(notification.type)} border rounded-lg p-3 max-w-sm shadow-lg animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start space-x-3">
            {getIcon(notification.type)}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm">
                {notification.title}
              </h4>
              <p className="text-gray-600 text-xs mt-1">
                {notification.message}
              </p>
              <div className="flex items-center mt-1 text-xs text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {notification.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="text-gray-400 hover:text-gray-600 pointer-events-auto"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ToastNotificationSystem
