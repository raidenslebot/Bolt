/**
 * Enhanced Bolt.diy Demo - Comprehensive AI Development System
 * 
 * This example demonstrates how to use the Enhanced Bolt.diy system
 * for autonomous full-stack development with AI assistance.
 */

import { getEnhancedBolt } from './enhanced-bolt-core';

async function runEnhancedBoltDemo() {
  console.log('🚀 Starting Enhanced Bolt.diy Demo...\n');

  // Get the enhanced Bolt system instance
  const bolt = getEnhancedBolt();

  try {
    // Initialize the system
    console.log('📋 Initializing Enhanced Bolt System...');
    await bolt.initialize();
    console.log('✅ System initialized successfully!\n');

    // Demonstrate autonomous project creation
    console.log('🏗️  Creating a new project autonomously...');
    const projectExecution = await bolt.createProject(
      'Create a modern React TypeScript todo app with Firebase backend, ' +
      'featuring user authentication, real-time updates, and responsive design'
    );
    console.log(`✅ Project created: ${projectExecution.projectId}\n`);

    // Show system capabilities
    console.log('🔍 System Capabilities:');
    const systemInfo = bolt.getSystemStatus();
    console.log('Status:', systemInfo.status);
    console.log('Active Projects:', systemInfo.activeProjects);
    console.log('Available Tools:', systemInfo.availableTools);
    console.log('Supported Languages:', systemInfo.supportedLanguages.join(', '));
    console.log();

    // Demonstrate intelligent code suggestions
    console.log('💡 Getting code suggestions...');
    const suggestions = await bolt.getCodeSuggestions(
      './src/App.tsx',
      { line: 10, character: 5 },
      'function App() {\n  return (\n    <div>\n      '
    );
    console.log('Suggestions received:', suggestions.length);
    console.log();

    // Demonstrate code quality analysis
    console.log('🔬 Analyzing code quality...');
    const qualityAnalysis = await bolt.analyzeCodeQuality('./src/App.tsx');
    console.log('Quality score:', qualityAnalysis.score || 'Analysis complete');
    console.log();

    // Demonstrate test generation
    console.log('🧪 Generating tests...');
    const testSuggestions = await bolt.generateTests('./src/components/TodoItem.tsx');
    console.log('Test suggestions generated:', testSuggestions.length);
    console.log();

    // Demonstrate security analysis
    console.log('🛡️  Performing security analysis...');
    const securityAnalysis = await bolt.analyzeProjectSecurity('./');
    console.log('Security issues found:', securityAnalysis.issues?.length || 0);
    console.log();

    // Demonstrate file operations
    console.log('📁 Working with local files...');
    await bolt.createFile('./demo-file.txt', 'Hello from Enhanced Bolt.diy!');
    const fileContent = await bolt.readFile('./demo-file.txt');
    console.log('File content:', fileContent);
    console.log();

    // Demonstrate search capabilities
    console.log('🔍 Searching files...');
    const files = await bolt.searchFiles('*.tsx', './src');
    console.log('Found files:', files.length);
    console.log();

    // Demonstrate language server features
    console.log('🔤 Getting document symbols...');
    const symbols = await bolt.getDocumentSymbols('./src/App.tsx');
    console.log('Symbols found:', symbols.length);
    console.log();

    // Demonstrate project overview
    console.log('📊 Getting project overview...');
    const overview = await bolt.getProjectOverview('./');
    console.log('Project analyzed:', overview.projectPath);
    console.log('File count:', overview.fileStructure.length);
    console.log('Recommendations:', overview.recommendations.length);
    console.log();

    // Start watching project for changes
    console.log('👁️  Starting project monitoring...');
    await bolt.watchProject('./');
    console.log('Project monitoring active');
    console.log();

    console.log('🎉 Demo completed successfully!');
    console.log('\nThe Enhanced Bolt.diy system is now ready for development.');
    console.log('Features available:');
    console.log('• Autonomous project creation from natural language');
    console.log('• AI-powered code suggestions and completions');
    console.log('• Intelligent code quality analysis');
    console.log('• Automated test generation');
    console.log('• Security vulnerability detection');
    console.log('• Real-time file monitoring and analysis');
    console.log('• Advanced Git operations with AI commit messages');
    console.log('• Multi-language support with LSP integration');
    console.log('• Direct local filesystem access');
    console.log('• Comprehensive project management');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.error('This may be expected in a mock environment');
  }
}

// Example of using individual services directly
async function demonstrateIndividualServices() {
  console.log('\n🔧 Demonstrating Individual Services...\n');

  const bolt = getEnhancedBolt();
  await bolt.initialize();

  try {
    // Execute specific tools
    console.log('🛠️  Executing specific tools...');
    
    // Use semantic search
    const searchResults = await bolt.executeTool('semantic_search', {
      query: 'React component with hooks'
    });
    console.log('Search results:', searchResults ? 'Found matches' : 'No results');

    // Use file operations
    await bolt.executeTool('create_file', {
      filePath: './example.js',
      content: 'console.log("Hello from tool executor!");'
    });
    console.log('Created example.js');

    // Use terminal operations
    const terminalResult = await bolt.executeTool('run_in_terminal', {
      command: 'echo "Hello from Enhanced Bolt!"',
      explanation: 'Testing terminal integration',
      isBackground: false
    });
    console.log('Terminal output:', terminalResult ? 'Command executed' : 'Failed');

  } catch (error) {
    console.error('Service demonstration error:', error);
  }
}

// Example of project lifecycle management
async function demonstrateProjectLifecycle() {
  console.log('\n📈 Demonstrating Project Lifecycle...\n');

  const bolt = getEnhancedBolt();
  await bolt.initialize();

  try {
    // 1. Create project
    console.log('1️⃣  Creating project...');
    const project = await bolt.createProject(
      'Build a simple Express.js API with user authentication'
    );

    // 2. Load and analyze
    console.log('2️⃣  Loading project...');
    const context = await bolt.loadProject(`./projects/${project.projectId}`);
    console.log('Project context:', context.fileCount, 'files');

    // 3. Get suggestions
    console.log('3️⃣  Getting contextual suggestions...');
    const suggestions = await bolt.getCodeSuggestions(
      './src/routes/auth.js',
      { line: 1, character: 0 },
      ''
    );
    console.log('Received', suggestions.length, 'suggestions');

    // 4. Generate tests
    console.log('4️⃣  Generating tests...');
    const tests = await bolt.generateTests('./src/routes/auth.js');
    console.log('Generated', tests.length, 'test suggestions');

    // 5. Analyze security
    console.log('5️⃣  Analyzing security...');
    const security = await bolt.analyzeProjectSecurity(`./projects/${project.projectId}`);
    console.log('Security analysis complete');

    // 6. Export project
    console.log('6️⃣  Exporting project...');
    await bolt.exportProject(
      `./projects/${project.projectId}`,
      `./exports/${project.projectId}-export`
    );
    console.log('Project exported');

    console.log('✅ Project lifecycle demonstration complete!');

  } catch (error) {
    console.error('Project lifecycle error:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  (async () => {
    await runEnhancedBoltDemo();
    await demonstrateIndividualServices();
    await demonstrateProjectLifecycle();
  })();
}

export {
  runEnhancedBoltDemo,
  demonstrateIndividualServices,
  demonstrateProjectLifecycle
};
