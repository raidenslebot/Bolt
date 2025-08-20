import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';

interface ContextItem {
  id: string;
  type: 'file' | 'error' | 'project';
  title: string;
  content: string;
  relevance: number;
}

interface ChatContextManagerProps {
  onContextUpdate?: (items: ContextItem[]) => void;
}

export const ChatContextManager = memo<ChatContextManagerProps>(({ onContextUpdate }) => {
  const files = useStore(workbenchStore.files);
  const selectedFile = useStore(workbenchStore.selectedFile);
  
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Smart context extraction from workbench state
  const extractRelevantContext = useCallback(async (): Promise<ContextItem[]> => {
    const items: ContextItem[] = [];
    
    try {
      // 1. Current active file
      if (selectedFile && files[selectedFile]) {
        const file = files[selectedFile];
        if (file?.type === 'file' && typeof file.content === 'string') {
          items.push({
            id: `file-${selectedFile}`,
            type: 'file',
            title: selectedFile,
            content: file.content.slice(0, 1500), // First 1.5KB for context
            relevance: 0.9
          });
        }
      }

      // 2. Project structure overview
      const fileList = Object.keys(files).filter(path => {
        const file = files[path];
        return file?.type === 'file';
      }).slice(0, 15); // Top 15 files
      
      if (fileList.length > 0) {
        const structure = fileList
          .map(path => {
            const file = files[path];
            const size = typeof file?.content === 'string' ? file.content.length : 0;
            const type = path.split('.').pop() || 'unknown';
            return `${path} (${type}, ${size} chars)`;
          })
          .join('\n');
          
        items.push({
          id: 'project-structure',
          type: 'project',
          title: 'Project Files',
          content: structure,
          relevance: 0.6
        });
      }

    } catch (error) {
      console.warn('Context extraction error:', error);
    }
    
    return items.sort((a, b) => b.relevance - a.relevance);
  }, [files, selectedFile]);

  // Auto-update context when files or selection changes
  useEffect(() => {
    let timeoutId: number;
    
    const updateContext = async () => {
      setIsAnalyzing(true);
      try {
        const newItems = await extractRelevantContext();
        setContextItems(newItems);
        onContextUpdate?.(newItems);
      } finally {
        setIsAnalyzing(false);
      }
    };

    timeoutId = window.setTimeout(updateContext, 300);
    
    return () => window.clearTimeout(timeoutId);
  }, [selectedFile, Object.keys(files).length, extractRelevantContext, onContextUpdate]);

  // Generate intelligent context prompt
  const generateContextPrompt = useCallback(() => {
    if (contextItems.length === 0) return '';
    
    let prompt = '**Current Context:**\n\n';
    
    contextItems.forEach(item => {
      if (item.type === 'file') {
        prompt += `**Active File: ${item.title}**\n\`\`\`\n${item.content.slice(0, 400)}\n\`\`\`\n\n`;
      } else if (item.type === 'project') {
        prompt += `**${item.title}:**\n${item.content}\n\n`;
      }
    });
    
    return prompt;
  }, [contextItems]);

  const contextSummary = useMemo(() => ({
    files: contextItems.filter(item => item.type === 'file').length,
    total: contextItems.length
  }), [contextItems]);

  return (
    <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
      {isAnalyzing ? (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-bolt-elements-borderColor border-t-bolt-elements-textPrimary rounded-full animate-spin" />
          <span>Analyzing context...</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Context: {contextSummary.total} items
          </span>
          
          {contextSummary.files > 0 && (
            <span className="px-2 py-1 bg-bolt-elements-bg-depth-2 rounded text-xs">
              {contextSummary.files} files
            </span>
          )}
          
          <button
            onClick={() => {
              const prompt = generateContextPrompt();
              navigator.clipboard?.writeText(prompt);
            }}
            className="px-2 py-1 bg-bolt-elements-bg-depth-2 hover:bg-bolt-elements-bg-depth-3 rounded text-xs transition-colors"
            title="Copy context to clipboard"
          >
            Copy Context
          </button>
        </div>
      )}
    </div>
  );
});

ChatContextManager.displayName = 'ChatContextManager';
