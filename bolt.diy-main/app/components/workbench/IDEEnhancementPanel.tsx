import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
import { enhancedWorkbench, type CodeSymbol, type ContextItem } from '~/lib/workbench/enhanced-workbench';
import { workbenchStore } from '~/lib/stores/workbench';
import { useState, useEffect, useMemo } from 'react';
import { IconButton } from '~/components/ui/IconButton';

interface IDEEnhancementPanelProps {
  className?: string;
}

export function IDEEnhancementPanel({ className }: IDEEnhancementPanelProps) {
  const ideStatus = useStore(enhancedWorkbench.ideStatus);
  const activeSymbols = useStore(enhancedWorkbench.activeSymbols);
  const smartSuggestions = useStore(enhancedWorkbench.smartSuggestions);
  const selectedFile = useStore(workbenchStore.selectedFile);
  
  const [activeTab, setActiveTab] = useState<'symbols' | 'context' | 'suggestions'>('symbols');
  const [contextQuery, setContextQuery] = useState('');
  const [contextResults, setContextResults] = useState<ContextItem[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Get context when query changes
  useEffect(() => {
    if (contextQuery.trim().length > 2) {
      setIsLoadingContext(true);
      const debounceTimer = setTimeout(async () => {
        try {
          const results = await enhancedWorkbench.getSmartContext(contextQuery, selectedFile);
          setContextResults(results);
        } catch (error) {
          console.error('Error getting context:', error);
          setContextResults([]);
        } finally {
          setIsLoadingContext(false);
        }
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setContextResults([]);
      setIsLoadingContext(false);
    }
  }, [contextQuery, selectedFile]);

  const capabilities = useMemo(() => enhancedWorkbench.getCapabilities(), [ideStatus]);

  if (ideStatus === 'error') {
    return (
      <div className={`bg-red-900/20 border border-red-500/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-400 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            IDE Enhancement Error
          </div>
          <p>Enhanced IDE capabilities failed to initialize. Basic functionality is still available.</p>
        </div>
      </div>
    );
  }

  if (ideStatus === 'initializing') {
    return (
      <div className={`bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg p-4 ${className}`}>
        <div className="text-bolt-elements-textSecondary text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            Initializing IDE Enhancements...
          </div>
          <p>Loading advanced code intelligence features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg overflow-hidden ${className}`}>
      {/* Header with status indicator */}
      <div className="flex items-center justify-between p-3 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-bolt-elements-textPrimary font-medium text-sm">
            IDE Enhanced
          </span>
          <span className="text-bolt-elements-textSecondary text-xs">
            ({Object.keys(capabilities).length} capabilities)
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-bolt-elements-borderColor">
        {[
          { id: 'symbols', label: 'Symbols', count: activeSymbols.length },
          { id: 'context', label: 'Context', count: contextResults.length },
          { id: 'suggestions', label: 'Suggestions', count: smartSuggestions.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-textPrimary border-b-2 border-bolt-elements-focus'
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundHover'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-bolt-elements-button-secondary-background rounded text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 max-h-80 overflow-y-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'symbols' && (
            <SymbolsPanel symbols={activeSymbols} />
          )}
          
          {activeTab === 'context' && (
            <ContextPanel
              query={contextQuery}
              setQuery={setContextQuery}
              results={contextResults}
              isLoading={isLoadingContext}
            />
          )}
          
          {activeTab === 'suggestions' && (
            <SuggestionsPanel suggestions={smartSuggestions} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SymbolsPanel({ symbols }: { symbols: CodeSymbol[] }) {
  if (symbols.length === 0) {
    return (
      <div className="text-bolt-elements-textSecondary text-sm text-center py-8">
        <div className="text-2xl mb-2">🔍</div>
        <p>No symbols found in current file</p>
        <p className="text-xs mt-1">Open a code file to see symbols</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {symbols.map((symbol, index) => (
        <div
          key={`${symbol.location.file}-${symbol.name}-${index}`}
          className="p-2 rounded border border-bolt-elements-borderColor hover:bg-bolt-elements-item-backgroundHover transition-colors cursor-pointer"
          onClick={() => {
            // TODO: Navigate to symbol location
            console.log('Navigate to symbol:', symbol);
          }}
        >
          <div className="flex items-center gap-2">
            <SymbolIcon kind={symbol.kind} />
            <span className="text-bolt-elements-textPrimary font-medium text-sm">
              {symbol.name}
            </span>
            <span className="text-bolt-elements-textSecondary text-xs">
              {symbol.kind}
            </span>
          </div>
          {symbol.documentation && (
            <p className="text-bolt-elements-textSecondary text-xs mt-1 line-clamp-2">
              {symbol.documentation}
            </p>
          )}
          <div className="text-bolt-elements-textTertiary text-xs mt-1">
            Line {symbol.location.line}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContextPanel({ 
  query, 
  setQuery, 
  results, 
  isLoading 
}: { 
  query: string;
  setQuery: (query: string) => void;
  results: ContextItem[];
  isLoading: boolean;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search for context, symbols, or code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded text-bolt-elements-textPrimary text-sm focus:outline-none focus:ring-1 focus:ring-bolt-elements-focus"
      />
      
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block w-4 h-4 border-2 border-bolt-elements-textSecondary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-bolt-elements-textSecondary text-sm mt-2">Searching...</p>
        </div>
      )}
      
      {!isLoading && query.trim().length > 2 && results.length === 0 && (
        <div className="text-bolt-elements-textSecondary text-sm text-center py-8">
          <div className="text-2xl mb-2">🤷</div>
          <p>No context found for "{query}"</p>
        </div>
      )}
      
      {!isLoading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded border border-bolt-elements-borderColor hover:bg-bolt-elements-item-backgroundHover transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <ContextTypeIcon type={item.type} />
                <span className="text-bolt-elements-textPrimary text-sm font-medium">
                  {item.type}
                </span>
                <div className="flex-1"></div>
                <div className="text-xs bg-bolt-elements-button-secondary-background px-2 py-1 rounded">
                  {Math.round(item.relevance)}% match
                </div>
              </div>
              
              <p className="text-bolt-elements-textSecondary text-sm line-clamp-3">
                {item.content}
              </p>
              
              {item.metadata.filePath && (
                <div className="text-bolt-elements-textTertiary text-xs mt-2">
                  {item.metadata.filePath}
                  {item.metadata.lineNumber && ` (line ${item.metadata.lineNumber})`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {query.trim().length <= 2 && (
        <div className="text-bolt-elements-textSecondary text-sm text-center py-8">
          <div className="text-2xl mb-2">💡</div>
          <p>Type 3+ characters to search for context</p>
          <p className="text-xs mt-1">Find functions, variables, files, and more</p>
        </div>
      )}
    </div>
  );
}

function SuggestionsPanel({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) {
    return (
      <div className="text-bolt-elements-textSecondary text-sm text-center py-8">
        <div className="text-2xl mb-2">✨</div>
        <p>No suggestions for current file</p>
        <p className="text-xs mt-1">Suggestions appear as you code</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="p-3 rounded border border-bolt-elements-borderColor bg-blue-900/10 border-blue-500/20"
        >
          <div className="flex items-start gap-2">
            <div className="text-blue-400 mt-0.5">💡</div>
            <p className="text-bolt-elements-textPrimary text-sm">
              {suggestion}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SymbolIcon({ kind }: { kind: CodeSymbol['kind'] }) {
  const icons = {
    function: '𝑓',
    class: '𝐂',
    interface: '𝐈',
    variable: '𝐱',
    method: '𝐦',
    property: '𝐩'
  };
  
  const colors = {
    function: 'text-purple-400',
    class: 'text-orange-400',
    interface: 'text-blue-400',
    variable: 'text-green-400',
    method: 'text-purple-400',
    property: 'text-yellow-400'
  };

  return (
    <div className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${colors[kind]}`}>
      {icons[kind]}
    </div>
  );
}

function ContextTypeIcon({ type }: { type: ContextItem['type'] }) {
  const icons = {
    file: '📄',
    symbol: '🔧',
    error: '⚠️',
    suggestion: '💡'
  };

  return <span className="text-sm">{icons[type]}</span>;
}
