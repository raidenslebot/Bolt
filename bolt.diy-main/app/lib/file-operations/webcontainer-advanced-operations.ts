import { webcontainer } from '~/lib/webcontainer';
import { EventEmitter } from 'events';

// Define FileSystemTree type inline to avoid import issues
type FileSystemTree = Record<string, string | { file: { contents: string } } | FileSystemTree>;

export interface FileOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'copy' | 'batch';
  sourcePath: string;
  targetPath?: string;
  content?: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error?: string;
  metadata?: {
    size?: number;
    encoding?: string;
    backup?: boolean;
    permissions?: string;
  };
}

export interface BatchOperation {
  id: string;
  operations: FileOperation[];
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'partial';
  completedCount: number;
  failedCount: number;
  rollbackSupported: boolean;
}

export interface FileTemplate {
  name: string;
  extension: string;
  content: string;
  variables?: Record<string, string>;
  description?: string;
}

export interface SmartRename {
  pattern: string;
  replacement: string;
  preview: Array<{ from: string; to: string }>;
}

/**
 * Advanced File Operations for WebContainer
 * Provides intelligent file management with batching, templates, and smart operations
 */
export class WebContainerAdvancedFileOperations extends EventEmitter {
  private webcontainer: any = null;
  private operationQueue: FileOperation[] = [];
  private batchOperations: Map<string, BatchOperation> = new Map();
  private isProcessing = false;
  private templates: Map<string, FileTemplate> = new Map();
  private operationHistory: FileOperation[] = [];

  constructor() {
    super();
    this.initializeWebContainer();
    this.initializeTemplates();
  }

  private async initializeWebContainer() {
    try {
      this.webcontainer = await webcontainer;
      this.emit('ready');
      this.startProcessingQueue();
    } catch (error) {
      console.error('Failed to initialize WebContainer for advanced file operations:', error);
      this.emit('error', error);
    }
  }

  /**
   * Initialize built-in file templates
   */
  private initializeTemplates() {
    // React Component Template
    this.templates.set('react-component', {
      name: 'React Component',
      extension: 'tsx',
      content: `import React from 'react';

interface {{ComponentName}}Props {
  // Add your props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = () => {
  return (
    <div className="{{componentName}}">
      <h1>{{ComponentName}}</h1>
      {/* Add your component content here */}
    </div>
  );
};

export default {{ComponentName}};
`,
      variables: {
        '{{ComponentName}}': 'Component name in PascalCase',
        '{{componentName}}': 'Component name in camelCase'
      },
      description: 'React functional component with TypeScript'
    });

    // Express Route Template
    this.templates.set('express-route', {
      name: 'Express Route',
      extension: 'ts',
      content: `import { Router, Request, Response } from 'express';

const router = Router();

// GET /{{route}}
router.get('/', async (req: Request, res: Response) => {
  try {
    // Implementation here
    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error in {{route}} route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /{{route}}
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // Implementation here
    res.status(201).json({ message: 'Created successfully', data });
  } catch (error) {
    console.error('Error in {{route}} POST route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`,
      variables: {
        '{{route}}': 'Route name'
      },
      description: 'Express.js route with basic CRUD operations'
    });

    // API Types Template
    this.templates.set('api-types', {
      name: 'API Types',
      extension: 'ts',
      content: `// {{ApiName}} API Types

export interface {{ApiName}}Request {
  // Define request structure
  id?: string;
  data?: any;
}

export interface {{ApiName}}Response {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface {{ApiName}}Config {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export type {{ApiName}}Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface {{ApiName}}Error {
  code: string;
  message: string;
  details?: any;
}
`,
      variables: {
        '{{ApiName}}': 'API name in PascalCase'
      },
      description: 'TypeScript types for API interfaces'
    });
  }

  /**
   * Create file from template
   */
  async createFromTemplate(
    templateName: string,
    targetPath: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    let content = template.content;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      content = content.replace(regex, value);
    });

    // Generate operation ID
    const operationId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const operation: FileOperation = {
      id: operationId,
      type: 'create',
      sourcePath: targetPath,
      content,
      timestamp: Date.now(),
      status: 'pending',
      metadata: {
        encoding: 'utf-8'
      }
    };

    this.queueOperation(operation);
    return operationId;
  }

  /**
   * Smart batch operations
   */
  async createBatchOperation(operations: Omit<FileOperation, 'id' | 'timestamp' | 'status'>[]): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fileOperations = operations.map((op, index) => ({
      ...op,
      id: `${batchId}_op_${index}`,
      timestamp: Date.now(),
      status: 'pending' as const
    }));

    const batchOperation: BatchOperation = {
      id: batchId,
      operations: fileOperations,
      status: 'pending',
      completedCount: 0,
      failedCount: 0,
      rollbackSupported: true
    };

    this.batchOperations.set(batchId, batchOperation);
    
    // Queue all operations
    fileOperations.forEach(op => this.queueOperation(op));

    this.emit('batchCreated', batchOperation);
    return batchId;
  }

  /**
   * Smart rename with pattern matching
   */
  async smartRename(directory: string, pattern: string, replacement: string): Promise<SmartRename> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    const files = await this.getFilesInDirectory(directory);
    const preview: Array<{ from: string; to: string }> = [];
    const regex = new RegExp(pattern, 'g');

    files.forEach(file => {
      const fileName = file.split('/').pop() || '';
      if (regex.test(fileName)) {
        const newName = fileName.replace(regex, replacement);
        const newPath = file.replace(fileName, newName);
        preview.push({ from: file, to: newPath });
      }
    });

    const renameOperation: SmartRename = {
      pattern,
      replacement,
      preview
    };

    this.emit('smartRenamePreview', renameOperation);
    return renameOperation;
  }

  /**
   * Apply smart rename
   */
  async applySmartRename(smartRename: SmartRename): Promise<string> {
    const operations = smartRename.preview.map(({ from, to }) => ({
      type: 'move' as const,
      sourcePath: from,
      targetPath: to
    }));

    return this.createBatchOperation(operations);
  }

  /**
   * Create directory structure from tree
   */
  async createDirectoryStructure(basePath: string, structure: FileSystemTree): Promise<string> {
    const operations: Omit<FileOperation, 'id' | 'timestamp' | 'status'>[] = [];

    const processNode = (path: string, node: any) => {
      if (typeof node === 'string') {
        // File content
        operations.push({
          type: 'create',
          sourcePath: path,
          content: node
        });
      } else if (node && typeof node === 'object') {
        if ('file' in node) {
          // File with content
          operations.push({
            type: 'create',
            sourcePath: path,
            content: node.file.contents || ''
          });
        } else {
          // Directory
          Object.entries(node).forEach(([name, child]) => {
            const childPath = `${path}/${name}`;
            processNode(childPath, child);
          });
        }
      }
    };

    Object.entries(structure).forEach(([name, child]) => {
      const fullPath = `${basePath}/${name}`;
      processNode(fullPath, child);
    });

    return this.createBatchOperation(operations);
  }

  /**
   * Duplicate file or directory with smart naming
   */
  async smartDuplicate(sourcePath: string, targetDirectory?: string): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    try {
      const stats = await this.webcontainer.fs.stat(sourcePath);
      const isDirectory = stats.isDirectory();
      const fileName = sourcePath.split('/').pop() || '';
      const baseName = fileName.split('.')[0];
      const extension = fileName.includes('.') ? '.' + fileName.split('.').slice(1).join('.') : '';
      
      // Determine target directory
      const targetDir = targetDirectory || sourcePath.split('/').slice(0, -1).join('/');
      
      // Find available name
      let counter = 1;
      let newName = `${baseName}_copy${extension}`;
      let newPath = `${targetDir}/${newName}`;

      while (await this.pathExists(newPath)) {
        counter++;
        newName = `${baseName}_copy_${counter}${extension}`;
        newPath = `${targetDir}/${newName}`;
      }

      if (isDirectory) {
        return this.copyDirectory(sourcePath, newPath);
      } else {
        const operationId = `duplicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operation: FileOperation = {
          id: operationId,
          type: 'copy',
          sourcePath,
          targetPath: newPath,
          timestamp: Date.now(),
          status: 'pending'
        };

        this.queueOperation(operation);
        return operationId;
      }
    } catch (error) {
      throw new Error(`Failed to duplicate ${sourcePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(sourcePath: string, targetPath: string): Promise<string> {
    const operations: Omit<FileOperation, 'id' | 'timestamp' | 'status'>[] = [];
    await this.buildCopyOperations(sourcePath, targetPath, operations);
    return this.createBatchOperation(operations);
  }

  /**
   * Build copy operations recursively
   */
  private async buildCopyOperations(
    sourcePath: string,
    targetPath: string,
    operations: Omit<FileOperation, 'id' | 'timestamp' | 'status'>[]
  ) {
    if (!this.webcontainer) return;

    try {
      const stats = await this.webcontainer.fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        const entries = await this.webcontainer.fs.readdir(sourcePath, { withFileTypes: true });
        
        for (const entry of entries) {
          const sourceChild = `${sourcePath}/${entry.name}`;
          const targetChild = `${targetPath}/${entry.name}`;
          
          if (entry.isDirectory()) {
            await this.buildCopyOperations(sourceChild, targetChild, operations);
          } else {
            operations.push({
              type: 'copy',
              sourcePath: sourceChild,
              targetPath: targetChild
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error building copy operations for ${sourcePath}:`, error);
    }
  }

  /**
   * Safe delete with backup
   */
  async safeDelete(path: string, createBackup: boolean = true): Promise<string> {
    const operationId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: FileOperation = {
      id: operationId,
      type: 'delete',
      sourcePath: path,
      timestamp: Date.now(),
      status: 'pending',
      metadata: {
        backup: createBackup
      }
    };

    this.queueOperation(operation);
    return operationId;
  }

  /**
   * Queue file operation
   */
  private queueOperation(operation: FileOperation) {
    this.operationQueue.push(operation);
    this.emit('operationQueued', operation);
  }

  /**
   * Start processing operation queue
   */
  private startProcessingQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process operation queue
   */
  private async processQueue() {
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (!operation) continue;

      try {
        operation.status = 'executing';
        this.emit('operationStarted', operation);

        await this.executeOperation(operation);

        operation.status = 'completed';
        this.operationHistory.push(operation);
        this.emit('operationCompleted', operation);

        // Update batch operation status
        this.updateBatchStatus(operation.id, true);

      } catch (error) {
        operation.status = 'failed';
        operation.error = (error as Error).message;
        this.operationHistory.push(operation);
        this.emit('operationFailed', operation);

        // Update batch operation status
        this.updateBatchStatus(operation.id, false);
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  /**
   * Execute single file operation
   */
  private async executeOperation(operation: FileOperation) {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    switch (operation.type) {
      case 'create':
        await this.executeCreate(operation);
        break;
      case 'update':
        await this.executeUpdate(operation);
        break;
      case 'delete':
        await this.executeDelete(operation);
        break;
      case 'move':
        await this.executeMove(operation);
        break;
      case 'copy':
        await this.executeCopy(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Execute create operation
   */
  private async executeCreate(operation: FileOperation) {
    const { sourcePath, content = '' } = operation;
    
    // Ensure directory exists
    const directory = sourcePath.split('/').slice(0, -1).join('/');
    await this.ensureDirectory(directory);

    await this.webcontainer.fs.writeFile(sourcePath, content, 'utf-8');
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(operation: FileOperation) {
    const { sourcePath, content = '' } = operation;
    await this.webcontainer.fs.writeFile(sourcePath, content, 'utf-8');
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(operation: FileOperation) {
    const { sourcePath, metadata } = operation;

    // Create backup if requested
    if (metadata?.backup) {
      const backupPath = `${sourcePath}.backup.${Date.now()}`;
      try {
        const stats = await this.webcontainer.fs.stat(sourcePath);
        if (stats.isDirectory()) {
          // For directories, we'd need to implement recursive backup
          console.warn('Directory backup not implemented yet');
        } else {
          const content = await this.webcontainer.fs.readFile(sourcePath, 'utf-8');
          await this.webcontainer.fs.writeFile(backupPath, content, 'utf-8');
        }
      } catch (error) {
        console.warn('Failed to create backup:', error);
      }
    }

    // Delete the file/directory
    const stats = await this.webcontainer.fs.stat(sourcePath);
    if (stats.isDirectory()) {
      await this.webcontainer.fs.rm(sourcePath, { recursive: true });
    } else {
      await this.webcontainer.fs.unlink(sourcePath);
    }
  }

  /**
   * Execute move operation
   */
  private async executeMove(operation: FileOperation) {
    const { sourcePath, targetPath } = operation;
    if (!targetPath) {
      throw new Error('Target path required for move operation');
    }

    // Ensure target directory exists
    const directory = targetPath.split('/').slice(0, -1).join('/');
    await this.ensureDirectory(directory);

    // Read source content
    const stats = await this.webcontainer.fs.stat(sourcePath);
    if (stats.isDirectory()) {
      // For directories, we'd need recursive move
      throw new Error('Directory move not implemented yet');
    } else {
      const content = await this.webcontainer.fs.readFile(sourcePath, 'utf-8');
      await this.webcontainer.fs.writeFile(targetPath, content, 'utf-8');
      await this.webcontainer.fs.unlink(sourcePath);
    }
  }

  /**
   * Execute copy operation
   */
  private async executeCopy(operation: FileOperation) {
    const { sourcePath, targetPath } = operation;
    if (!targetPath) {
      throw new Error('Target path required for copy operation');
    }

    // Ensure target directory exists
    const directory = targetPath.split('/').slice(0, -1).join('/');
    await this.ensureDirectory(directory);

    // Copy file
    const content = await this.webcontainer.fs.readFile(sourcePath, 'utf-8');
    await this.webcontainer.fs.writeFile(targetPath, content, 'utf-8');
  }

  /**
   * Update batch operation status
   */
  private updateBatchStatus(operationId: string, success: boolean) {
    for (const [batchId, batchOp] of this.batchOperations) {
      const operation = batchOp.operations.find(op => op.id === operationId);
      if (operation) {
        if (success) {
          batchOp.completedCount++;
        } else {
          batchOp.failedCount++;
        }

        const totalOps = batchOp.operations.length;
        const processedOps = batchOp.completedCount + batchOp.failedCount;

        if (processedOps === totalOps) {
          if (batchOp.failedCount === 0) {
            batchOp.status = 'completed';
          } else if (batchOp.completedCount === 0) {
            batchOp.status = 'failed';
          } else {
            batchOp.status = 'partial';
          }
        }

        this.emit('batchUpdated', batchOp);
        break;
      }
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(path: string) {
    if (!path || path === '/' || path === '.') return;
    
    try {
      await this.webcontainer.fs.stat(path);
    } catch (error) {
      // Directory doesn't exist, create it
      const parent = path.split('/').slice(0, -1).join('/');
      if (parent && parent !== path) {
        await this.ensureDirectory(parent);
      }
      await this.webcontainer.fs.mkdir(path);
    }
  }

  /**
   * Check if path exists
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await this.webcontainer.fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get files in directory
   */
  private async getFilesInDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await this.webcontainer.fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = `${directory}/${entry.name}`;
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.getFilesInDirectory(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${directory}:`, error);
    }

    return files;
  }

  /**
   * Get available templates
   */
  getTemplates(): FileTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  addTemplate(name: string, template: FileTemplate): void {
    this.templates.set(name, template);
    this.emit('templateAdded', { name, template });
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId: string): FileOperation | undefined {
    return this.operationHistory.find(op => op.id === operationId) ||
           this.operationQueue.find(op => op.id === operationId);
  }

  /**
   * Get batch operation status
   */
  getBatchStatus(batchId: string): BatchOperation | undefined {
    return this.batchOperations.get(batchId);
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.operationQueue.length,
      historyLength: this.operationHistory.length,
      batchCount: this.batchOperations.size,
      templateCount: this.templates.size,
      webcontainerReady: !!this.webcontainer
    };
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operationHistory = [];
    this.batchOperations.clear();
    this.emit('historyCleared');
  }
}
