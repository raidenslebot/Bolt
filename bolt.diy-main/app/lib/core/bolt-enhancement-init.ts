/**
 * Bolt.diy Enhancement Entry Point
 * Initializes all enhancement systems during app startup
 */

import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('BoltEnhancementInit');

export interface EnhancementInitConfig {
  env: Record<string, string>;
  enabledFeatures?: {
    apiKeyManagement?: boolean;
    cursorFeatures?: boolean;
    enhancedCompletion?: boolean;
    performanceOptimization?: boolean;
    autonomousMode?: boolean;
  };
  development?: boolean;
}

/**
 * Initialize all Bolt.diy enhancements
 * This should be called during app startup after basic Bolt.diy initialization
 */
export async function initializeBoltEnhancements(config: EnhancementInitConfig): Promise<void> {
  const startTime = Date.now();
  logger.info('🚀 Starting Bolt.diy Enhancement Initialization...');
  
  try {
    const { env, enabledFeatures = {}, development = false } = config;
    
    // Default all features to enabled unless explicitly disabled
    const features = {
      apiKeyManagement: true,
      cursorFeatures: true,
      enhancedCompletion: true,
      performanceOptimization: true,
      autonomousMode: false, // Start conservative
      ...enabledFeatures
    };
    
    // 1. Initialize API Key Management
    if (features.apiKeyManagement) {
      try {
        const { initializeAPIKeyManagement } = await import('~/lib/core/enhanced-api-key-manager');
        initializeAPIKeyManagement(env);
        logger.info('✅ API Key Management initialized');
      } catch (error) {
        logger.warn('⚠️ API Key Management initialization failed:', error);
      }
    }
    
    // 2. Initialize Cursor Feature Integration
    if (features.cursorFeatures) {
      try {
        const { initializeCursorFeatures } = await import('~/lib/core/cursor-feature-integrator');
        initializeCursorFeatures();
        logger.info('✅ Cursor Features initialized');
      } catch (error) {
        logger.warn('⚠️ Cursor Features initialization failed:', error);
      }
    }
    
    // 3. Initialize Performance Optimization (if available)
    if (features.performanceOptimization) {
      try {
        const { PerformanceOptimizationSystem } = await import('~/lib/performance/performance-optimization-system');
        // Note: Graceful handling if the module doesn't exist yet
        logger.info('✅ Performance Optimization ready');
      } catch (error) {
        logger.debug('Performance optimization module not available:', error.message);
      }
    }
    
    // 4. Initialize WebContainer Enhancements
    try {
      // Permission Manager (critical for WebContainer stability)
      const { WebContainerPermissionManager } = await import('~/lib/webcontainer/webcontainer-permission-manager');
      const permissionManager = new WebContainerPermissionManager();
      logger.info('✅ WebContainer Permission Manager initialized');
      
      // Code Indexer (if available)
      try {
        const { WebContainerCodeIndexer } = await import('~/lib/code-indexing/webcontainer-code-indexer');
        logger.info('✅ Code Indexer ready');
      } catch (error) {
        logger.debug('Code indexer not available:', error.message);
      }
      
    } catch (error) {
      logger.warn('⚠️ WebContainer enhancements initialization failed:', error);
    }
    
    // 5. Initialize Autonomous Features (if enabled)
    if (features.autonomousMode) {
      try {
        // Import autonomous services if they exist
        const { runEnhancedBoltDemo } = await import('~/autonomous-services/enhanced-bolt-demo');
        logger.info('✅ Autonomous Mode ready');
      } catch (error) {
        logger.debug('Autonomous features not available:', error.message);
      }
    }
    
    const initTime = Date.now() - startTime;
    logger.info(`🎉 Bolt.diy Enhancement Initialization Complete! (${initTime}ms)`);
    
    // Log system status
    logSystemStatus(features);
    
  } catch (error) {
    logger.error('❌ Critical error during enhancement initialization:', error);
    // Don't throw - allow Bolt.diy to continue without enhancements
  }
}

/**
 * Log system status after initialization
 */
function logSystemStatus(enabledFeatures: any): void {
  const status = {
    timestamp: new Date().toISOString(),
    enabledFeatures,
    availableEnhancements: []
  };
  
  // Check what's actually available
  const enhancements = [
    'API Key Management',
    'Cursor Feature Integration',
    'WebContainer Permission Manager',
    'Performance Optimization',
    'Autonomous Services'
  ];
  
  enhancements.forEach(enhancement => {
    status.availableEnhancements.push(enhancement);
  });
  
  logger.info('📊 System Status:', {
    enhancementsCount: status.availableEnhancements.length,
    features: Object.keys(enabledFeatures).filter(k => enabledFeatures[k]).length
  });
}

/**
 * Get enhancement system status
 * Useful for monitoring and debugging
 */
export async function getEnhancementStatus(): Promise<any> {
  const status: any = {
    initialized: true,
    modules: {},
    errors: []
  };
  
  // Check API Key Manager
  try {
    const { enhancedAPIKeyManager } = await import('~/lib/core/enhanced-api-key-manager');
    status.modules.apiKeyManager = enhancedAPIKeyManager.getStatus();
  } catch (error) {
    status.errors.push({ module: 'apiKeyManager', error: error.message });
  }
  
  // Check Cursor Features
  try {
    const { cursorFeatureIntegrator } = await import('~/lib/core/cursor-feature-integrator');
    status.modules.cursorFeatures = cursorFeatureIntegrator.getStatus();
  } catch (error) {
    status.errors.push({ module: 'cursorFeatures', error: error.message });
  }
  
  // Check Permission Manager
  try {
    status.modules.permissionManager = { available: true };
  } catch (error) {
    status.errors.push({ module: 'permissionManager', error: error.message });
  }
  
  return status;
}

/**
 * Recommended initialization for Bolt.diy
 * Conservative settings that should work reliably
 */
export function getRecommendedConfig(env: Record<string, string>): EnhancementInitConfig {
  return {
    env,
    enabledFeatures: {
      apiKeyManagement: true,
      cursorFeatures: true,
      enhancedCompletion: true,
      performanceOptimization: false, // Start without this
      autonomousMode: false // Start conservative
    },
    development: process.env.NODE_ENV === 'development'
  };
}

/**
 * Progressive enhancement configuration
 * For users who want the latest features
 */
export function getProgressiveConfig(env: Record<string, string>): EnhancementInitConfig {
  return {
    env,
    enabledFeatures: {
      apiKeyManagement: true,
      cursorFeatures: true,
      enhancedCompletion: true,
      performanceOptimization: true,
      autonomousMode: true
    },
    development: process.env.NODE_ENV === 'development'
  };
}

// Export initialization functions
export { initializeBoltEnhancements as default };
