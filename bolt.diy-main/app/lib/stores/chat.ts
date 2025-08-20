import { map } from 'nanostores';

// High-performance chat store with caching and optimization
export const chatStore = map({
  started: false,
  aborted: false,
  showChat: true,
  // Performance optimization caches
  responseCache: new Map<string, any>(),
  contextCache: new Map<string, any>(),
  lastProcessedTimestamp: Date.now(),
  // Resource utilization tracking
  maxConcurrentRequests: Math.max(8, (navigator.hardwareConcurrency || 4) * 2),
  processingQueueSize: 0,
});
