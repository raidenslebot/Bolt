/**
 * Enhanced API Key Manager for Bolt.diy
 * Provides intelligent API key management, validation, and rotation
 */

import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('APIKeyManager');

interface APIKeyConfig {
  key: string;
  provider: string;
  isValid: boolean;
  lastValidated: Date;
  usageCount: number;
  rateLimitRemaining?: number;
  dailyQuotaRemaining?: number;
  expiresAt?: Date;
  priority: number; // Higher number = higher priority
}

interface ProviderConfig {
  name: string;
  baseURL: string;
  defaultModel: string;
  supportedFeatures: string[];
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  healthCheckEndpoint?: string;
}

class EnhancedAPIKeyManager {
  private static instance: EnhancedAPIKeyManager;
  private apiKeys = new Map<string, APIKeyConfig[]>();
  private providerConfigs = new Map<string, ProviderConfig>();
  private lastHealthCheck = new Map<string, Date>();
  
  private constructor() {
    this.initializeProviderConfigs();
  }
  
  static getInstance(): EnhancedAPIKeyManager {
    if (!EnhancedAPIKeyManager.instance) {
      EnhancedAPIKeyManager.instance = new EnhancedAPIKeyManager();
    }
    return EnhancedAPIKeyManager.instance;
  }
  
  /**
   * Initialize provider configurations
   */
  private initializeProviderConfigs(): void {
    const providers: ProviderConfig[] = [
      {
        name: 'anthropic',
        baseURL: 'https://api.anthropic.com',
        defaultModel: 'claude-3-5-sonnet-20241022',
        supportedFeatures: ['chat', 'completion', 'reasoning'],
        rateLimit: { requests: 4000, window: 60 },
        healthCheckEndpoint: '/v1/messages'
      },
      {
        name: 'openai',
        baseURL: 'https://api.openai.com',
        defaultModel: 'gpt-4o-mini',
        supportedFeatures: ['chat', 'completion', 'vision', 'function-calling'],
        rateLimit: { requests: 10000, window: 60 }
      },
      {
        name: 'deepseek',
        baseURL: 'https://api.deepseek.com',
        defaultModel: 'deepseek-coder',
        supportedFeatures: ['chat', 'completion', 'code-generation'],
        rateLimit: { requests: 1000, window: 60 }
      },
      {
        name: 'groq',
        baseURL: 'https://api.groq.com',
        defaultModel: 'llama-3.1-70b-versatile',
        supportedFeatures: ['chat', 'completion', 'fast-inference'],
        rateLimit: { requests: 14400, window: 60 }
      },
      {
        name: 'openrouter',
        baseURL: 'https://openrouter.ai/api',
        defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
        supportedFeatures: ['chat', 'completion', 'multi-model'],
        rateLimit: { requests: 200, window: 60 }
      }
    ];
    
    providers.forEach(provider => {
      this.providerConfigs.set(provider.name, provider);
    });
  }
  
  /**
   * Add API key for a provider
   */
  addAPIKey(provider: string, key: string, priority: number = 1): void {
    if (!key || key.trim().length === 0) {
      logger.warn(`Empty API key provided for provider: ${provider}`);
      return;
    }
    
    const keyConfig: APIKeyConfig = {
      key: key.trim(),
      provider,
      isValid: false, // Will be validated
      lastValidated: new Date(0), // Never validated
      usageCount: 0,
      priority
    };
    
    const existingKeys = this.apiKeys.get(provider) || [];
    
    // Check for duplicates
    if (existingKeys.some(k => k.key === keyConfig.key)) {
      logger.warn(`API key already exists for provider: ${provider}`);
      return;
    }
    
    existingKeys.push(keyConfig);
    existingKeys.sort((a, b) => b.priority - a.priority); // Sort by priority desc
    
    this.apiKeys.set(provider, existingKeys);
    logger.info(`Added API key for provider: ${provider} (priority: ${priority})`);
  }
  
  /**
   * Get the best available API key for a provider
   */
  async getBestAPIKey(provider: string): Promise<string | null> {
    const keys = this.apiKeys.get(provider);
    if (!keys || keys.length === 0) {
      return null;
    }
    
    // Find valid keys, validate if needed
    for (const keyConfig of keys) {
      if (await this.isKeyValid(keyConfig)) {
        keyConfig.usageCount++;
        return keyConfig.key;
      }
    }
    
    return null;
  }
  
  /**
   * Validate an API key
   */
  private async isKeyValid(keyConfig: APIKeyConfig): Promise<boolean> {
    const now = new Date();
    const validationAge = now.getTime() - keyConfig.lastValidated.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    // If validated recently and was valid, assume still valid
    if (validationAge < fiveMinutes && keyConfig.isValid) {
      return true;
    }
    
    // Perform actual validation
    try {
      const isValid = await this.validateKeyWithProvider(keyConfig);
      keyConfig.isValid = isValid;
      keyConfig.lastValidated = now;
      
      if (isValid) {
        logger.debug(`API key validated successfully for provider: ${keyConfig.provider}`);
      } else {
        logger.warn(`API key validation failed for provider: ${keyConfig.provider}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`API key validation error for ${keyConfig.provider}:`, error);
      keyConfig.isValid = false;
      keyConfig.lastValidated = now;
      return false;
    }
  }
  
  /**
   * Validate key with the actual provider
   */
  private async validateKeyWithProvider(keyConfig: APIKeyConfig): Promise<boolean> {
    const providerConfig = this.providerConfigs.get(keyConfig.provider);
    if (!providerConfig) {
      return false;
    }
    
    try {
      // Simple validation - try to make a minimal request
      const response = await fetch(`${providerConfig.baseURL}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keyConfig.key}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Load API keys from environment
   */
  loadFromEnvironment(env: Record<string, string>): void {
    const keyMappings = {
      'ANTHROPIC_API_KEY': 'anthropic',
      'OPENAI_API_KEY': 'openai',
      'DEEPSEEK_API_KEY': 'deepseek',
      'GROQ_API_KEY': 'groq',
      'OPEN_ROUTER_API_KEY': 'openrouter',
      'GOOGLE_GENERATIVE_AI_API_KEY': 'google',
      'MISTRAL_API_KEY': 'mistral',
      'TOGETHER_API_KEY': 'together',
      'XAI_API_KEY': 'xai',
      'PERPLEXITY_API_KEY': 'perplexity'
    };
    
    Object.entries(keyMappings).forEach(([envKey, provider]) => {
      const apiKey = env[envKey];
      if (apiKey && apiKey.trim().length > 0) {
        this.addAPIKey(provider, apiKey, 1);
      } else {
        logger.debug(`No API key found for ${provider} (${envKey})`);
      }
    });
    
    logger.info(`Loaded API keys for ${this.apiKeys.size} providers`);
  }
  
  /**
   * Get system status
   */
  getStatus(): any {
    const status: any = {
      totalProviders: this.providerConfigs.size,
      providersWithKeys: this.apiKeys.size,
      providers: {}
    };
    
    this.providerConfigs.forEach((config, provider) => {
      const keys = this.apiKeys.get(provider) || [];
      const validKeys = keys.filter(k => k.isValid).length;
      
      status.providers[provider] = {
        configured: keys.length > 0,
        totalKeys: keys.length,
        validKeys,
        defaultModel: config.defaultModel,
        features: config.supportedFeatures
      };
    });
    
    return status;
  }
  
  /**
   * Get provider configuration
   */
  getProviderConfig(provider: string): ProviderConfig | undefined {
    return this.providerConfigs.get(provider);
  }
  
  /**
   * Get all configured providers
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.apiKeys.keys());
  }
  
  /**
   * Get recommended provider for a task type
   */
  getRecommendedProvider(taskType: 'code' | 'chat' | 'reasoning' | 'fast'): string | null {
    const recommendations = {
      code: ['deepseek', 'anthropic', 'openai'],
      chat: ['anthropic', 'openai', 'groq'],
      reasoning: ['anthropic', 'openai', 'deepseek'],
      fast: ['groq', 'openrouter', 'deepseek']
    };
    
    const candidates = recommendations[taskType] || [];
    
    // Find the first configured provider from the recommendations
    for (const provider of candidates) {
      if (this.apiKeys.has(provider)) {
        const keys = this.apiKeys.get(provider)!;
        if (keys.some(k => k.isValid)) {
          return provider;
        }
      }
    }
    
    // Fallback to any configured provider
    for (const [provider, keys] of this.apiKeys.entries()) {
      if (keys.some(k => k.isValid)) {
        return provider;
      }
    }
    
    return null;
  }
}

// Export singleton instance
export const enhancedAPIKeyManager = EnhancedAPIKeyManager.getInstance();

// Export types
export type { APIKeyConfig, ProviderConfig };

/**
 * Initialize API key management for Bolt.diy
 */
export function initializeAPIKeyManagement(env: Record<string, string>): void {
  logger.info('Initializing Enhanced API Key Management...');
  enhancedAPIKeyManager.loadFromEnvironment(env);
  
  const status = enhancedAPIKeyManager.getStatus();
  logger.info(`API Key Management Ready: ${status.providersWithKeys}/${status.totalProviders} providers configured`);
}
