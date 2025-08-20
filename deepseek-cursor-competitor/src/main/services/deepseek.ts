import axios, { AxiosInstance } from 'axios'

interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface DeepSeekChatRequest {
  model: string
  messages: DeepSeekMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface DeepSeekChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: DeepSeekMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface DeepSeekCompletionRequest {
  model: string
  prompt: string
  max_tokens?: number
  temperature?: number
  stop?: string[]
}

export class DeepSeekService {
  private client: AxiosInstance
  private apiKey: string
  private baseURL = 'https://api.deepseek.com/v1'
  private defaultModel = 'deepseek-coder'
  private rateLimitDelay = 1000 // 1 second between requests

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || ''
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes for AI responses
    })

    // Add request interceptor for rate limiting
    let lastRequestTime = 0
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      
      if (timeSinceLastRequest < this.rateLimitDelay) {
        const delay = this.rateLimitDelay - timeSinceLastRequest
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      lastRequestTime = Date.now()
      return config
    })
  }

  async chat(message: string, context?: any): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'DeepSeek API key not configured. Please set DEEPSEEK_API_KEY environment variable.'
        }
      }

      const systemPrompt = this.buildSystemPrompt(context)
      const messages: DeepSeekMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]

      const request: DeepSeekChatRequest = {
        model: this.defaultModel,
        messages,
        temperature: 0.7,
        max_tokens: 2048
      }

      const response = await this.client.post<DeepSeekChatResponse>('/chat/completions', request)
      
      if (response.data.choices && response.data.choices.length > 0) {
        return {
          success: true,
          content: response.data.choices[0].message.content
        }
      } else {
        return {
          success: false,
          error: 'No response from DeepSeek API'
        }
      }
    } catch (error) {
      console.error('DeepSeek API error:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your DeepSeek API key.'
          }
        } else if (error.response?.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.'
          }
        } else if (error.response?.status === 500) {
          return {
            success: false,
            error: 'DeepSeek API server error. Please try again later.'
          }
        }
      }
      
      return {
        success: false,
        error: `DeepSeek API error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async completion(code: string, position?: any): Promise<{ success: boolean; completion?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'DeepSeek API key not configured'
        }
      }

      const prompt = this.buildCompletionPrompt(code, position)
      
      const request: DeepSeekCompletionRequest = {
        model: this.defaultModel,
        prompt,
        max_tokens: 256,
        temperature: 0.3,
        stop: ['\n\n', '// END', '/* END']
      }

      const response = await this.client.post('/completions', request)
      
      if (response.data.choices && response.data.choices.length > 0) {
        return {
          success: true,
          completion: response.data.choices[0].text.trim()
        }
      } else {
        return {
          success: false,
          error: 'No completion from DeepSeek API'
        }
      }
    } catch (error) {
      console.error('DeepSeek completion error:', error)
      return {
        success: false,
        error: `Completion error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private buildSystemPrompt(context?: any): string {
    let prompt = 'You are an expert programming assistant. You help developers with code analysis, debugging, optimization, and implementation.'

    if (context?.currentFile) {
      prompt += `\n\nCurrent file context:`
      prompt += `\nFile: ${context.currentFile.path}`
      prompt += `\nLanguage: ${context.currentFile.language}`
      
      if (context.currentFile.content) {
        const contentPreview = context.currentFile.content.slice(0, 2000)
        prompt += `\nContent preview:\n\`\`\`${context.currentFile.language}\n${contentPreview}\n\`\`\``
        
        if (context.currentFile.content.length > 2000) {
          prompt += '\n... (content truncated)'
        }
      }
    }

    prompt += '\n\nProvide helpful, accurate, and concise responses. Include code examples when relevant.'
    
    return prompt
  }

  private buildCompletionPrompt(code: string, position?: any): string {
    const beforeCursor = code.slice(0, position?.offset || code.length)
    const afterCursor = code.slice(position?.offset || code.length)
    
    let prompt = 'Complete the following code:\n\n'
    prompt += '```\n'
    prompt += beforeCursor
    prompt += '<CURSOR>'
    if (afterCursor.trim()) {
      prompt += afterCursor
    }
    prompt += '\n```\n\n'
    prompt += 'Provide only the code that should be inserted at <CURSOR> position:'
    
    return prompt
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`
  }

  getAvailableModels(): string[] {
    return [
      'deepseek-coder',
      'deepseek-chat',
      'deepseek-coder-1.3b',
      'deepseek-coder-6.7b',
      'deepseek-coder-33b'
    ]
  }

  setModel(model: string): void {
    if (this.getAvailableModels().includes(model)) {
      this.defaultModel = model
    } else {
      throw new Error(`Invalid model: ${model}. Available models: ${this.getAvailableModels().join(', ')}`)
    }
  }
}
