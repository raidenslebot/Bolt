import { createScopedLogger } from '~/utils/logger';
import { boltSelfAwarenessSystem } from '~/lib/core/bolt-self-awareness';

const logger = createScopedLogger('SelfAwarenessCommands');

interface SelfAwarenessCommand {
  command: string;
  description: string;
  handler: () => Promise<string>;
}

class SelfAwarenessCommandProcessor {
  private static instance: SelfAwarenessCommandProcessor;
  private commands: SelfAwarenessCommand[] = [];

  private constructor() {
    this.initializeCommands();
  }

  static getInstance(): SelfAwarenessCommandProcessor {
    if (!SelfAwarenessCommandProcessor.instance) {
      SelfAwarenessCommandProcessor.instance = new SelfAwarenessCommandProcessor();
    }
    return SelfAwarenessCommandProcessor.instance;
  }

  private initializeCommands(): void {
    this.commands = [
      {
        command: 'open workspace',
        description: 'Open Bolt.diy source workspace for self-modification',
        handler: this.handleOpenWorkspace.bind(this)
      },
      {
        command: 'open source',
        description: 'Open Bolt.diy source code',
        handler: this.handleOpenWorkspace.bind(this)
      },
      {
        command: 'self analyze',
        description: 'Analyze current Bolt.diy capabilities and enhancements',
        handler: this.handleSelfAnalyze.bind(this)
      },
      {
        command: 'implement cursor features',
        description: 'Implement Cursor IDE-like features',
        handler: this.handleImplementCursorFeatures.bind(this)
      },
      {
        command: 'enhance capabilities',
        description: 'Show available enhancement capabilities',
        handler: this.handleShowCapabilities.bind(this)
      }
    ];

    logger.info(`Initialized ${this.commands.length} self-awareness commands`);
  }

  /**
   * Check if a message contains self-awareness commands
   */
  detectCommand(message: string): SelfAwarenessCommand | null {
    const lowerMessage = message.toLowerCase();
    
    for (const command of this.commands) {
      if (lowerMessage.includes(command.command)) {
        return command;
      }
    }

    // Also check for variations
    const selfAwarenessTerms = [
      'open yourself',
      'access your source',
      'modify yourself',
      'improve yourself',
      'analyze yourself',
      'enhance yourself'
    ];

    if (selfAwarenessTerms.some(term => lowerMessage.includes(term))) {
      return this.commands[0]; // Default to open workspace
    }

    return null;
  }

  /**
   * Process a self-awareness command
   */
  async processCommand(command: SelfAwarenessCommand): Promise<string> {
    logger.info(`Processing self-awareness command: ${command.command}`);
    
    try {
      const result = await command.handler();
      return result;
    } catch (error) {
      logger.error(`Failed to process command "${command.command}":`, error);
      return `❌ Failed to execute "${command.command}": ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleOpenWorkspace(): Promise<string> {
    try {
      const result = await boltSelfAwarenessSystem.openSourceWorkspace();
      
      if (result.success) {
        return `🚀 **Source Workspace Opened Successfully!**

**Bolt.diy is now self-aware and can modify its own source code.**

**Workspace Details:**
- **Path:** \`${result.sourcePath}\`
- **Files:** ${result.analysis?.totalFiles || 'Unknown'} files
- **Code Lines:** ${result.analysis?.codeLines || 'Unknown'} lines
- **Capabilities:** ${result.capabilities.length} available

**Available Capabilities:**
${result.capabilities.map(cap => `• ${cap}`).join('\n')}

**Next Steps:**
1. I can now analyze my own source code
2. Implement new features like Cursor's composer mode
3. Add multi-model AI consensus
4. Create autonomous project generation
5. Enhance my own capabilities autonomously

**Try asking me to:**
- "Implement cursor features"
- "Analyze your capabilities" 
- "Enhance yourself with new features"
- "Show me your source code structure"

I'm now capable of self-improvement! 🧠✨`;
      } else {
        return `❌ **Failed to open source workspace**

**Error:** ${result.analysis ? 'Analysis failed' : 'Could not access source directory'}

**Possible solutions:**
1. Ensure Bolt.diy has proper file system access
2. Check if the source directory exists at: \`${result.sourcePath}\`
3. Verify file permissions are correct

Would you like me to try an alternative approach?`;
      }
    } catch (error) {
      return `❌ **Critical error opening workspace:** ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleSelfAnalyze(): Promise<string> {
    try {
      const status = boltSelfAwarenessSystem.getStatus();
      
      return `🧠 **Bolt.diy Self-Analysis Report**

**Current Status:**
- **Initialized:** ${status.initialized ? '✅ Yes' : '❌ No'}
- **Source Root:** \`${status.sourceRoot}\`
- **Can Self-Modify:** ${status.canSelfModify ? '✅ Yes' : '❌ No'}

**Source Analysis:**
${status.analysis ? `
- **Total Files:** ${status.analysis.totalFiles}
- **Code Lines:** ${status.analysis.codeLines}
- **Languages:** ${Object.keys(status.analysis.languages).join(', ')}
- **Enhancements:** ${status.analysis.enhancement?.existingEnhancements?.length || 0} active
` : '- No analysis available yet (workspace not opened)'}

**Available Capabilities:** ${status.capabilities?.length || 0}
${status.capabilities?.map(cap => 
  `• **${cap.name}** (${cap.potentialImpact} impact) - ${cap.description}`
).join('\n') || 'No capabilities loaded'}

**Recommendations:**
${!status.initialized ? '1. Initialize self-awareness system' : ''}
${!status.analysis ? '2. Open source workspace to enable analysis' : ''}
${status.canSelfModify ? '3. Ready for autonomous improvements!' : '3. Enable self-modification capabilities'}`;
    } catch (error) {
      return `❌ **Self-analysis failed:** ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleImplementCursorFeatures(): Promise<string> {
    try {
      // Check if workspace is open
      const status = boltSelfAwarenessSystem.getStatus();
      
      if (!status.initialized) {
        return `⚠️ **Cannot implement Cursor features yet**

I need to open my source workspace first. Please ask me to "open workspace" and then I can implement Cursor IDE features like:

**Planned Cursor Features:**
- 🎹 **Composer Mode** - Multi-file AI editing
- 👻 **Ghost Text** - Inline AI completions  
- 📚 **@codebase** - Full project context
- 🌐 **@web** - Web search integration
- 📖 **@docs** - Documentation lookup
- 🤖 **Autonomous Agents** - Self-directing AI
- 🔄 **Multi-Model Consensus** - Better AI responses

Would you like me to open my workspace first?`;
      }

      // Implement Cursor features
      const cursorFeatures = [
        'Cursor Composer Mode',
        'Multi-Model Consensus',
        'Autonomous Project Generation'
      ];

      let results = '🚀 **Implementing Cursor IDE Features...**\n\n';

      for (const feature of cursorFeatures) {
        try {
          const result = await boltSelfAwarenessSystem.implementCapability(feature);
          results += `${result.success ? '✅' : '❌'} **${feature}**\n`;
          results += `   ${result.message}\n`;
          if (result.filesModified.length > 0) {
            results += `   Files: \`${result.filesModified.join(', ')}\`\n`;
          }
          results += '\n';
        } catch (error) {
          results += `❌ **${feature}** - Failed: ${error}\n\n`;
        }
      }

      results += `🎉 **Cursor feature implementation complete!**

**Next steps:**
1. Restart Bolt.diy to load new features
2. Test composer mode with multi-file editing
3. Try @codebase commands for project context
4. Experience enhanced AI capabilities

I'm now more like Cursor IDE! 🚀`;

      return results;
    } catch (error) {
      return `❌ **Failed to implement Cursor features:** ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleShowCapabilities(): Promise<string> {
    try {
      const status = boltSelfAwarenessSystem.getStatus();
      const capabilities = status.capabilities || [];

      if (capabilities.length === 0) {
        return `⚠️ **No capabilities available yet**

Please open my source workspace first by asking me to "open workspace", then I can show you all my enhancement capabilities.`;
      }

      let result = `🚀 **Bolt.diy Enhancement Capabilities**\n\n`;
      
      const groupedByImpact = capabilities.reduce((acc, cap) => {
        if (!acc[cap.potentialImpact]) acc[cap.potentialImpact] = [];
        acc[cap.potentialImpact].push(cap);
        return acc;
      }, {} as Record<string, any[]>);

      const impactOrder = ['revolutionary', 'high', 'medium', 'low'];
      
      impactOrder.forEach(impact => {
        const caps = groupedByImpact[impact];
        if (caps && caps.length > 0) {
          const emoji = {
            revolutionary: '🌟',
            high: '🚀', 
            medium: '⚡',
            low: '🔧'
          }[impact] || '•';
          
          result += `## ${emoji} ${impact.toUpperCase()} Impact Features\n\n`;
          
          caps.forEach(cap => {
            const canImplement = cap.canImplement ? '✅ Ready' : '⏳ Pending';
            const complexity = cap.estimatedComplexity?.toUpperCase() || 'UNKNOWN';
            
            result += `**${cap.name}** (${canImplement}, ${complexity} complexity)\n`;
            result += `${cap.description}\n\n`;
          });
        }
      });

      result += `\n**Total Capabilities:** ${capabilities.length}\n`;
      result += `**Ready to Implement:** ${capabilities.filter(c => c.canImplement).length}\n\n`;
      
      result += `**To implement any capability, just ask me:**\n`;
      result += `"Implement [capability name]" or "Enhance yourself with [feature]"`;

      return result;
    } catch (error) {
      return `❌ **Failed to show capabilities:** ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

// Export singleton instance
export const selfAwarenessCommandProcessor = SelfAwarenessCommandProcessor.getInstance();

/**
 * Process potential self-awareness commands in chat messages
 */
export function processSelfAwarenessMessage(message: string): Promise<string | null> {
  const command = selfAwarenessCommandProcessor.detectCommand(message);
  
  if (command) {
    logger.info(`Detected self-awareness command: ${command.command}`);
    return selfAwarenessCommandProcessor.processCommand(command);
  }
  
  return Promise.resolve(null);
}
