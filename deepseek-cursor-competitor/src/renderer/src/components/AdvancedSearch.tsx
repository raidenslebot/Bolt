import React, { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon, 
  CodeBracketIcon, 
  DocumentTextIcon,
  FolderIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface SymbolInfo {
  name: string
  kind: string
  location: {
    file: string
    line: number
    column: number
  }
  type?: string
  documentation?: string
}

interface SearchResult {
  symbol: SymbolInfo
  relevance: number
}

interface AdvancedSearchProps {
  workingDirectory?: string
  onFileSelect?: (filePath: string, line?: number) => void
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ workingDirectory, onFileSelect }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'symbols' | 'text' | 'files'>('symbols')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [projectInitialized, setProjectInitialized] = useState(false)
  const [projectOverview, setProjectOverview] = useState<any>(null)

  useEffect(() => {
    if (workingDirectory) {
      initializeAnalysis()
    }
  }, [workingDirectory])

  const initializeAnalysis = async () => {
    if (!workingDirectory) return

    setIsLoading(true)
    try {
      const result = await window.electronAPI.analysis.initialize(workingDirectory)
      if (result.success) {
        setProjectInitialized(true)
        await loadProjectOverview()
      }
    } catch (error) {
      console.error('Failed to initialize code analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectOverview = async () => {
    try {
      const result = await window.electronAPI.analysis.getOverview()
      if (result.success && result.overview) {
        setProjectOverview(result.overview)
      }
    } catch (error) {
      console.error('Failed to load project overview:', error)
    }
  }

  const performSearch = async () => {
    if (!searchQuery.trim() || !projectInitialized) return

    setIsLoading(true)
    try {
      if (searchType === 'symbols') {
        await searchSymbols()
      } else if (searchType === 'text') {
        await searchText()
      } else if (searchType === 'files') {
        await searchFiles()
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const searchSymbols = async () => {
    const result = await window.electronAPI.analysis.findSymbol(searchQuery.trim())
    if (result.success && result.symbols) {
      const searchResults: SearchResult[] = result.symbols.map((symbol: SymbolInfo) => ({
        symbol,
        relevance: calculateSymbolRelevance(symbol, searchQuery)
      }))
      
      // Sort by relevance
      searchResults.sort((a, b) => b.relevance - a.relevance)
      setSearchResults(searchResults)
    }
  }

  const searchText = async () => {
    if (!window.electronAPI || !workingDirectory) return
    
    try {
      // Use the file system to search for text in files
      const result = await window.electronAPI.fileSystem.searchInFiles(workingDirectory, searchQuery.trim())
      if (result.success && result.matches) {
        const textResults: SearchResult[] = result.matches.map((match: any) => ({
          symbol: {
            name: match.line.trim().substring(0, 100) + (match.line.length > 100 ? '...' : ''),
            kind: 'text',
            location: {
              file: match.file,
              line: match.lineNumber,
              column: match.column || 0
            },
            type: `Line ${match.lineNumber}`,
            documentation: match.context
          },
          relevance: calculateTextRelevance(match.line, searchQuery)
        }))
        
        textResults.sort((a, b) => b.relevance - a.relevance)
        setSearchResults(textResults)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Text search failed:', error)
      setSearchResults([])
    }
  }

  const searchFiles = async () => {
    if (!window.electronAPI || !workingDirectory) return
    
    try {
      // Use the file system to search for files by name
      const result = await window.electronAPI.fileSystem.searchFiles(workingDirectory, searchQuery.trim())
      if (result.success && result.files) {
        const fileResults: SearchResult[] = result.files.map((file: any) => ({
          symbol: {
            name: file.name,
            kind: 'file',
            location: {
              file: file.path,
              line: 1,
              column: 0
            },
            type: file.extension || 'file',
            documentation: `Size: ${file.size || 0} bytes`
          },
          relevance: calculateFileRelevance(file.name, searchQuery)
        }))
        
        fileResults.sort((a, b) => b.relevance - a.relevance)
        setSearchResults(fileResults)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('File search failed:', error)
      setSearchResults([])
    }
  }

  const calculateTextRelevance = (text: string, query: string): number => {
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Count occurrences
    const matches = (textLower.match(new RegExp(queryLower, 'g')) || []).length
    if (matches === 0) return 0
    
    // More matches = higher relevance
    return Math.min(100, matches * 20)
  }

  const calculateFileRelevance = (fileName: string, query: string): number => {
    const nameLower = fileName.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Exact name match
    if (nameLower === queryLower) return 100
    
    // Starts with query
    if (nameLower.startsWith(queryLower)) return 80
    
    // Contains query
    if (nameLower.includes(queryLower)) return 60
    
    // Fuzzy match
    if (isFuzzyMatch(nameLower, queryLower)) return 40
    
    return 0
  }

  const calculateSymbolRelevance = (symbol: SymbolInfo, query: string): number => {
    const name = symbol.name.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Exact match gets highest score
    if (name === queryLower) return 100
    
    // Starts with query gets high score
    if (name.startsWith(queryLower)) return 80
    
    // Contains query gets medium score
    if (name.includes(queryLower)) return 60
    
    // Fuzzy match gets low score
    if (isFuzzyMatch(name, queryLower)) return 40
    
    return 0
  }

  const isFuzzyMatch = (text: string, pattern: string): boolean => {
    let patternIndex = 0
    for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
      if (text[i] === pattern[patternIndex]) {
        patternIndex++
      }
    }
    return patternIndex === pattern.length
  }

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'function':
      case 'method':
        return <CodeBracketIcon className="w-4 h-4 text-blue-500" />
      case 'class':
        return <DocumentTextIcon className="w-4 h-4 text-green-500" />
      case 'interface':
        return <DocumentTextIcon className="w-4 h-4 text-purple-500" />
      case 'variable':
        return <DocumentTextIcon className="w-4 h-4 text-yellow-500" />
      default:
        return <DocumentTextIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'function':
      case 'method':
        return 'text-blue-400'
      case 'class':
        return 'text-green-400'
      case 'interface':
        return 'text-purple-400'
      case 'variable':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const handleResultClick = (result: SearchResult) => {
    const { symbol } = result
    onFileSelect?.(symbol.location.file, symbol.location.line)
  }

  const findReferences = async (symbol: SymbolInfo) => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI!.analysis.findReferences(symbol.name, symbol.location.file)
      if (result.success && result.references) {
        const refResults: SearchResult[] = result.references.map((ref: SymbolInfo) => ({
          symbol: ref,
          relevance: 100
        }))
        setSearchResults(refResults)
        setSearchQuery(`References: ${symbol.name}`)
      }
    } catch (error) {
      console.error('Find references failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFilePath = (filePath: string) => {
    if (!workingDirectory) return filePath
    return filePath.replace(workingDirectory, '').replace(/^[\\\/]/, '')
  }

  if (!projectInitialized && !isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
        <p>Project analysis not available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Open a project folder to enable advanced search
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advanced Search
          </span>
          {isLoading && (
            <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>
        
        {/* Search Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search symbols, text, or files..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={performSearch}
            disabled={!searchQuery.trim() || isLoading}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-1">
          {['symbols', 'text', 'files'].map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type as any)}
              className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                searchType === type
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Project Overview */}
      {projectOverview && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>Files: {projectOverview.totalFiles}</div>
            <div>Symbols: {projectOverview.totalSymbols}</div>
            <div className="flex gap-2">
              Languages: {Object.entries(projectOverview.languages || {}).map(([ext, count]: [string, any]) => (
                <span key={ext} className="text-blue-600 dark:text-blue-400">
                  {ext}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="flex-1 overflow-auto">
        {searchResults.length === 0 && searchQuery && !isLoading && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p>No results found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Try a different search term
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-start gap-2">
                  {getKindIcon(result.symbol.kind)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {result.symbol.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getKindColor(result.symbol.kind)} bg-gray-200 dark:bg-gray-700`}>
                        {result.symbol.kind}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {formatFilePath(result.symbol.location.file)}:{result.symbol.location.line}
                    </div>
                    {result.symbol.type && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 font-mono truncate">
                        {result.symbol.type}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        findReferences(result.symbol)
                      }}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      title="Find References"
                    >
                      Refs
                    </button>
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

export default AdvancedSearch
