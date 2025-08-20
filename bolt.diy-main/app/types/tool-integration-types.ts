/**
 * Tool Integration Types for Bolt.diy
 * Every tool available to the AI assistant will be made available to Bolt
 */

export interface ToolCapability {
  name: string;
  description: string;
  parameters: Record<string, string>;
  optionalParameters?: string[];
  category: 'file-operations' | 'search' | 'development' | 'terminal' | 'notebook' | 'web' | 'project-management' | 'vscode' | 'git' | 'python' | 'analysis';
  isAsync: boolean;
  requiresContext?: boolean;
}

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  context?: {
    workspaceRoot?: string;
    currentFile?: string;
    selectedText?: string;
    projectType?: string;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    resourcesUsed: string[];
    sideEffects: string[];
  };
}

// Complete list of all available tools
export const AVAILABLE_TOOLS: ToolCapability[] = [
  // File Operations
  {
    name: 'create_directory',
    description: 'Create a new directory structure in the workspace',
    parameters: { dirPath: 'string' },
    category: 'file-operations',
    isAsync: false
  },
  {
    name: 'create_file',
    description: 'Create a new file in the workspace with specified content',
    parameters: { filePath: 'string', content: 'string' },
    category: 'file-operations',
    isAsync: false
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file with line range specification',
    parameters: { filePath: 'string', startLine: 'number', endLine: 'number' },
    category: 'file-operations',
    isAsync: false
  },
  {
    name: 'replace_string_in_file',
    description: 'Make precise edits to existing files by replacing exact text',
    parameters: { filePath: 'string', oldString: 'string', newString: 'string' },
    category: 'file-operations',
    isAsync: false
  },
  {
    name: 'list_dir',
    description: 'List the contents of a directory',
    parameters: { path: 'string' },
    category: 'file-operations',
    isAsync: false
  },
  
  // Search Operations
  {
    name: 'file_search',
    description: 'Search for files in the workspace by glob pattern',
    parameters: { query: 'string' },
    optionalParameters: ['maxResults'],
    category: 'search',
    isAsync: false
  },
  {
    name: 'grep_search',
    description: 'Fast text search in the workspace with regex support',
    parameters: { query: 'string', isRegexp: 'boolean' },
    optionalParameters: ['includePattern', 'maxResults'],
    category: 'search',
    isAsync: false
  },
  {
    name: 'semantic_search',
    description: 'Natural language search for relevant code or documentation',
    parameters: { query: 'string' },
    category: 'search',
    isAsync: false
  },
  {
    name: 'test_search',
    description: 'Find test files for source code or source files for tests',
    parameters: { filePaths: 'string[]' },
    category: 'search',
    isAsync: false
  },
  
  // Development Tools
  {
    name: 'create_new_workspace',
    description: 'Get steps to create any project in VS Code workspace',
    parameters: { query: 'string' },
    category: 'development',
    isAsync: false
  },
  {
    name: 'get_project_setup_info',
    description: 'Get project setup information for VS Code workspace',
    parameters: { projectType: 'string' },
    category: 'development',
    isAsync: false
  },
  {
    name: 'get_errors',
    description: 'Get compile or lint errors in code files',
    parameters: { filePaths: 'string[]' },
    category: 'development',
    isAsync: false
  },
  {
    name: 'list_code_usages',
    description: 'List all usages of functions, classes, methods, variables',
    parameters: { symbolName: 'string' },
    optionalParameters: ['filePaths'],
    category: 'development',
    isAsync: false
  },
  
  // Terminal Operations
  {
    name: 'run_in_terminal',
    description: 'Execute shell commands in persistent terminal session',
    parameters: { command: 'string', explanation: 'string', isBackground: 'boolean' },
    category: 'terminal',
    isAsync: true
  },
  {
    name: 'get_terminal_output',
    description: 'Get output from a terminal command',
    parameters: { id: 'string' },
    category: 'terminal',
    isAsync: false
  },
  {
    name: 'get_terminal_last_command',
    description: 'Get the active terminal\'s last run command',
    parameters: {},
    category: 'terminal',
    isAsync: false
  },
  {
    name: 'get_terminal_selection',
    description: 'Get user\'s current selection in active terminal',
    parameters: {},
    category: 'terminal',
    isAsync: false
  },
  
  // Notebook Operations
  {
    name: 'create_new_jupyter_notebook',
    description: 'Generate new Jupyter Notebook in VS Code',
    parameters: { query: 'string' },
    category: 'notebook',
    isAsync: false
  },
  {
    name: 'edit_notebook_file',
    description: 'Edit existing Notebook file in workspace',
    parameters: { filePath: 'string', explanation: 'string', editType: 'string' },
    optionalParameters: ['cellId', 'language', 'newCode'],
    category: 'notebook',
    isAsync: false
  },
  {
    name: 'run_notebook_cell',
    description: 'Run a code cell in notebook file directly',
    parameters: { filePath: 'string', cellId: 'string' },
    optionalParameters: ['continueOnError', 'reason'],
    category: 'notebook',
    isAsync: true
  },
  {
    name: 'copilot_getNotebookSummary',
    description: 'Get list of notebook cells with metadata',
    parameters: { filePath: 'string' },
    category: 'notebook',
    isAsync: false
  },
  
  // Web Operations
  {
    name: 'fetch_webpage',
    description: 'Fetch main content from web pages',
    parameters: { urls: 'string[]', query: 'string' },
    category: 'web',
    isAsync: true
  },
  {
    name: 'open_simple_browser',
    description: 'Preview website or open URL in editor\'s Simple Browser',
    parameters: { url: 'string' },
    category: 'web',
    isAsync: false
  },
  
  // Task Management
  {
    name: 'create_and_run_task',
    description: 'Create and run build, run, or custom tasks',
    parameters: { task: 'object', workspaceFolder: 'string' },
    category: 'project-management',
    isAsync: true
  },
  {
    name: 'get_task_output',
    description: 'Get output of a task',
    parameters: { id: 'string', workspaceFolder: 'string' },
    category: 'project-management',
    isAsync: false
  },
  
  // VS Code Integration
  {
    name: 'install_extension',
    description: 'Install VS Code extension',
    parameters: { id: 'string', name: 'string' },
    category: 'vscode',
    isAsync: true
  },
  {
    name: 'run_vscode_command',
    description: 'Run VS Code command',
    parameters: { commandId: 'string', name: 'string' },
    optionalParameters: ['args'],
    category: 'vscode',
    isAsync: false
  },
  {
    name: 'get_vscode_api',
    description: 'Get VS Code API references for extension development',
    parameters: { query: 'string' },
    category: 'vscode',
    isAsync: false
  },
  {
    name: 'vscode_searchExtensions_internal',
    description: 'Search VS Code Extensions Marketplace',
    parameters: {},
    optionalParameters: ['category', 'ids', 'keywords'],
    category: 'vscode',
    isAsync: false
  },
  {
    name: 'get_search_view_results',
    description: 'Get results from search view',
    parameters: {},
    category: 'vscode',
    isAsync: false
  },
  
  // Git Operations
  {
    name: 'get_changed_files',
    description: 'Get git diffs of current file changes',
    parameters: {},
    optionalParameters: ['repositoryPath', 'sourceControlState'],
    category: 'git',
    isAsync: false
  },
  
  // Python Operations
  {
    name: 'configure_python_environment',
    description: 'Configure Python environment in workspace',
    parameters: {},
    optionalParameters: ['resourcePath'],
    category: 'python',
    isAsync: true
  },
  {
    name: 'get_python_environment_details',
    description: 'Get Python environment details',
    parameters: {},
    optionalParameters: ['resourcePath'],
    category: 'python',
    isAsync: false
  },
  {
    name: 'get_python_executable_details',
    description: 'Get Python executable details for terminal commands',
    parameters: {},
    optionalParameters: ['resourcePath'],
    category: 'python',
    isAsync: false
  },
  {
    name: 'install_python_packages',
    description: 'Install Python packages in workspace',
    parameters: { packageList: 'string[]' },
    optionalParameters: ['resourcePath'],
    category: 'python',
    isAsync: true
  },
  
  // Pylance Integration (MCP Tools)
  {
    name: 'mcp_pylance_mcp_s_pylanceDocuments',
    description: 'Search Pylance documentation',
    parameters: { search: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceFileSyntaxErrors',
    description: 'Check Python file for syntax errors',
    parameters: { fileUri: 'string', workspaceRoot: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceImports',
    description: 'Analyze imports across workspace',
    parameters: { workspaceRoot: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceInstalledTopLevelModules',
    description: 'Get available top-level modules from installed packages',
    parameters: { workspaceRoot: 'string' },
    optionalParameters: ['pythonEnvironment'],
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceInvokeRefactoring',
    description: 'Apply automated code refactoring to Python files',
    parameters: { fileUri: 'string', name: 'string' },
    optionalParameters: ['mode'],
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylancePythonEnvironments',
    description: 'Get Python environment information',
    parameters: { workspaceRoot: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceSettings',
    description: 'Get current Python analysis settings',
    parameters: { workspaceRoot: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceSyntaxErrors',
    description: 'Validate Python code snippets for syntax errors',
    parameters: { code: 'string', pythonVersion: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceUpdatePythonEnvironment',
    description: 'Switch active Python environment',
    parameters: { workspaceRoot: 'string', pythonEnvironment: 'string' },
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceWorkspaceRoots',
    description: 'Get workspace root directories',
    parameters: {},
    optionalParameters: ['fileUri'],
    category: 'python',
    isAsync: false
  },
  {
    name: 'mcp_pylance_mcp_s_pylanceWorkspaceUserFiles',
    description: 'Get list of all user Python files in workspace',
    parameters: { workspaceRoot: 'string' },
    category: 'python',
    isAsync: false
  },
  
  // GitHub Integration
  {
    name: 'github_repo',
    description: 'Search GitHub repository for relevant source code snippets',
    parameters: { repo: 'string', query: 'string' },
    category: 'analysis',
    isAsync: true
  },
  
  // Testing
  {
    name: 'test_failure',
    description: 'Include test failure information in prompt',
    parameters: {},
    category: 'development',
    isAsync: false
  }
];

export interface ToolExecutor {
  executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
  getAvailableTools(): ToolCapability[];
  getToolsByCategory(category: string): ToolCapability[];
  validateToolRequest(request: ToolExecutionRequest): boolean;
}
