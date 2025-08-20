/**
 * BOLT ENHANCEMENT SYSTEM INITIALIZER
 * Auto-initialization hook for all enhancement services
 * Integrates seamlessly with existing Bolt.diy architecture
 */

import { boltEnhancementSystem, checkBoltStatus } from '~/lib/core/bolt-enhancement-system';

let initializationPromise: Promise<void> | null = null;

/**
 * Auto-initialize enhancement system
 * This runs automatically when the module is imported
 */
async function autoInitialize(): Promise<void> {
  // Prevent multiple initializations
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('🚀 Auto-initializing Bolt Enhancement System...');
      
      // Wait for DOM to be ready in browser environment
      if (typeof window !== 'undefined' && document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(undefined);
          } else {
            window.addEventListener('load', () => resolve(undefined), { once: true });
          }
        });
      }

      // Initialize the enhancement system
      await boltEnhancementSystem.initialize();
      
      // Set up global error handling integration
      setupGlobalIntegration();
      
      console.log('✅ Bolt Enhancement System auto-initialization complete!');
      
    } catch (error) {
      console.error('❌ Failed to auto-initialize Bolt Enhancement System:', error);
      // Don't throw to avoid breaking the main app
    }
  })();

  return initializationPromise;
}

/**
 * Set up global integration points
 */
function setupGlobalIntegration(): void {
  // Add global status check function
  if (typeof window !== 'undefined') {
    (window as any).checkBoltStatus = checkBoltStatus;
    (window as any).boltEnhancementSystem = boltEnhancementSystem;
  }

  // Log system status periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const status = boltEnhancementSystem.getSystemStatus();
      if (status.overallHealth.status !== 'healthy') {
        console.warn('⚠️ Bolt Enhancement System health check:', {
          status: status.overallHealth.status,
          score: status.overallHealth.score.toFixed(1) + '%',
          issues: status.overallHealth.issues
        });
      }
    }, 60000); // Check every minute
  }
}

/**
 * Initialize enhancement system on module load
 * This ensures the system is ready when other modules need it
 */
if (typeof window !== 'undefined') {
  // Browser environment - initialize after a short delay
  setTimeout(() => {
    autoInitialize().catch(console.error);
  }, 100);
} else {
  // Server environment - initialize immediately
  autoInitialize().catch(console.error);
}

// Export the initialization promise for manual waiting if needed
export { initializationPromise };
export { boltEnhancementSystem, checkBoltStatus };

// Export quick access functions
export const getBoltStatus = () => boltEnhancementSystem.getSystemStatus();
export const getBoltMetrics = () => boltEnhancementSystem.getSystemMetrics();
export const enableBoltFeature = (feature: string, enabled: boolean) => {
  // @ts-ignore - dynamic feature access
  boltEnhancementSystem.setFeature(feature, enabled);
};
