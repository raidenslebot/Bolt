import { useCallback, useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

interface SmartChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SmartChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Describe what you want to build...",
  disabled = false
}: SmartChatInputProps) {
  const files = useStore(workbenchStore.files);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generate smart suggestions based on current context
  const generateSuggestions = useCallback(() => {
    const contextSuggestions: string[] = [];

    // File-specific suggestions
    if (selectedFile) {
      const file = files[selectedFile];
      const extension = selectedFile.split('.').pop()?.toLowerCase();

      if (extension === 'tsx' || extension === 'jsx') {
        contextSuggestions.push(
          `Add a new React component to ${selectedFile}`,
          `Fix TypeScript errors in ${selectedFile}`,
          `Optimize the component structure in ${selectedFile}`
        );
      } else if (extension === 'ts' || extension === 'js') {
        contextSuggestions.push(
          `Add error handling to ${selectedFile}`,
          `Refactor functions in ${selectedFile}`,
          `Add type definitions to ${selectedFile}`
        );
      } else if (extension === 'css' || extension === 'scss') {
        contextSuggestions.push(
          `Improve styling in ${selectedFile}`,
          `Add responsive design to ${selectedFile}`,
          `Optimize CSS performance in ${selectedFile}`
        );
      }
    }

    // Project-level suggestions
    const fileCount = Object.keys(files).length;
    if (fileCount > 0) {
      contextSuggestions.push(
        'Review the entire project structure',
        'Add comprehensive error handling',
        'Optimize project performance',
        'Add missing TypeScript types',
        'Improve code documentation'
      );
    }

    // General suggestions if no specific context
    if (contextSuggestions.length === 0) {
      contextSuggestions.push(
        'Create a new React component',
        'Build a modern web application',
        'Add authentication to my app',
        'Implement a REST API',
        'Set up a database connection'
      );
    }

    setSuggestions(contextSuggestions.slice(0, 5)); // Max 5 suggestions
  }, [files, selectedFile]);

  // Generate suggestions when context changes
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  // Handle input focus/blur for suggestions
  const handleFocus = () => {
    if (!value.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 150);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Hide suggestions when typing
    if (newValue.trim()) {
      setShowSuggestions(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    }
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className={classNames(
          "w-full resize-none rounded-lg border border-bolt-elements-borderColor",
          "bg-bolt-elements-bg-depth-1 p-3 text-bolt-elements-textPrimary",
          "placeholder-bolt-elements-textSecondary focus:border-bolt-elements-focus",
          "focus:outline-none transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div className="bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 text-xs text-bolt-elements-textSecondary border-b border-bolt-elements-borderColor">
              Smart suggestions based on your project:
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-bg-depth-3 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context indicator */}
      <div className="flex items-center justify-between mt-2 text-xs text-bolt-elements-textSecondary">
        <div className="flex items-center gap-2">
          {selectedFile && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              Editing: {selectedFile.split('/').pop()}
            </span>
          )}
          {Object.keys(files).length > 0 && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {Object.keys(files).length} files in project
            </span>
          )}
        </div>
        <div className="text-bolt-elements-textSecondary">
          Press Ctrl+Enter to send • Tab for suggestion
        </div>
      </div>
    </div>
  );
}
