import React from 'react'

interface TitleBarProps {}

const TitleBar: React.FC<TitleBarProps> = () => {
  return (
    <div className="title-bar-drag h-8 bg-gray-900 border-b border-gray-700 flex items-center justify-center">
      <div className="title-bar-no-drag text-sm text-gray-400">
        DeepSeek Cursor Competitor
      </div>
    </div>
  )
}

export default TitleBar
