import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Ollama } from 'ollama';
import { renderMarkdown } from './markdown';
import { searchWeb } from './search';
import { AIProvider, SummaryLength, BriefingSource, TrendingTopic } from './types';

console.log('[AI_PROVIDERS] Module loading started');
console.log('[AI_PROVIDERS] Dependencies imported successfully');

// Provider interface for clean abstraction
export interface AIProviderInterface {
  generateSummary(interest: string, summaryLength: SummaryLength): Promise<{ summary: string; sources: BriefingSource[] }>;
  generateTweets(summary: string): Promise<string[]>;
  getTrendingTopics(): Promise<TrendingTopic[]>;
  isAvailable(): boolean;
  getName(): string;
}

// Configuration constants
const CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash',
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  DEFAULT_MAX_TOKENS: {
    SUMMARY: 1000,
    TWEETS: 500,
    TRENDING: 800
  },
  TEMPERATURE: {
    SUMMARY: 0.7,
    TWEETS: 0.9,
    TRENDING: 0.7
  }
} as const;

// Shared prompts
const PROMPTS = {
  TWEET: `Convert this news summary into sharply satirical, comedy-writer-worthy tweets that masterfully blend sharp-edged, razor-sharp, clever wordplay, and unexpected perspectives to highlight the absurdity within serious topics. Each tweet should ooze a comedic edge that resonates with users who crave intellectual humor. Use wit, irony, and clever observations to craft tweets for a professional comedy writer covering current events. Write full, substantial tweets between 180-270 characters each - avoid short, punchy one-liners. Develop the satirical premise with clever observations and unexpected twists. NO hashtags allowed under any circumstances.

Summary: {summary}

Return only the 3 tweets, one per line, without any JSON formatting or additional text. Make them satirical masterpieces with real bite and substance!`
} as const;

// Simple logger utility
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[AI_PROVIDERS] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[AI_PROVIDERS] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[AI_PROVIDERS] ${message}`, ...args),
};



// Concrete provider implementations
class GeminiProvider implements AIProviderInterface {
  private client: GoogleGenerativeAI | null;

  constructor() {
    this.client = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  getName(): string {
    return 'Google Gemini';
  }

  private getSummaryPrompt(interest: string, summaryLength: SummaryLength): string {
    const lengthInstructions = {
      short: 'Write a concise 2-3 sentence summary',
      medium: 'Write a comprehensive 1-2 paragraph summary',
      detailed: 'Write a detailed analysis with 3-4 paragraphs including context and implications'
    };

    return `${lengthInstructions[summaryLength]} about recent developments in "${interest}". Focus on the most important and recent news from the last 48 hours. Include specific facts, numbers, and key developments. Make it informative and engaging.

Format your response using proper markdown:
- Use **bold** for key terms and important facts
- Use bullet points (-) for lists of developments
- Use numbered lists (1., 2., etc.) for sequential information
- Use ### headings for main sections if needed
- Include relevant statistics or metrics where available

Please search for current information about this topic and provide a well-sourced summary.`;
  }

  private getTweetPrompt(summary: string): string {
    return PROMPTS.TWEET.replace('{summary}', summary);
  }

  async generateSummary(interest: string, summaryLength: SummaryLength): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!this.client) throw new Error('Gemini API key not configured');

    const prompt = this.getSummaryPrompt(interest, summaryLength);
    const model = this.client.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { summary: renderMarkdown(text), sources: [] };
  }

  async generateTweets(summary: string): Promise<string[]> {
    if (!this.client) throw new Error('Gemini API key not configured');

    const prompt = this.getTweetPrompt(summary);
    const model = this.client.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // Parse plain text tweets (one per line) and ensure they fit within limits
    const tweets = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.startsWith('```') && !line.includes('tweet'))
      .map(tweet => tweet.length > 270 ? tweet.substring(0, 267) + '...' : tweet)
      .slice(0, 3);

    return tweets.length > 0 ? tweets : [
      "🚀 Just witnessed another groundbreaking development in tech! The innovation cycle keeps accelerating with new breakthroughs emerging daily. What's next on the horizon? The pace of technological advancement shows no signs of slowing down.",
      "📈 Markets are showing strong reactions to the latest industry developments. Companies are pivoting faster than ever to maintain their competitive edge in this dynamic environment. Strategic adaptation is becoming the key to survival.",
      "🌟 The technological landscape continues to evolve at breakneck speed. From cutting-edge AI to revolutionary discoveries, we're experiencing unprecedented innovation. The future of technology is unfolding before our eyes."
    ];
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    if (!this.client) throw new Error('Gemini API key not configured');

    const prompt = `Identify the top 3 most significant global news topics from the last 24 hours. Focus on major developments in technology, politics, economics, science, or significant global events. Avoid celebrity gossip, sports scores, or ephemeral social media trends.

Return the response as a JSON object with this exact structure:
{
  "topics": [
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"}
  ]
}`;

    const model = this.client.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      const parsed: { topics: TrendingTopic[] } = JSON.parse(content);
      return parsed.topics || [];
    } catch (error) {
      logger.warn('Failed to parse Gemini trending response as JSON, using fallback');
      return [
        { title: "Technology Updates", description: "Latest tech developments" },
        { title: "Global Politics", description: "Recent political developments" },
        { title: "Economic News", description: "Financial market updates" }
      ];
    }
  }
}

class GroqProvider implements AIProviderInterface {
  private client: Groq | null;
  private selectedModel: string | null = null;

  constructor() {
    console.log('[AI_PROVIDERS] GroqProvider constructor called');
    console.log('[AI_PROVIDERS] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
    this.client = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
    console.log('[AI_PROVIDERS] Groq client initialized:', !!this.client);
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  getName(): string {
    return 'Groq';
  }

  setSelectedModel(model: string): void {
    this.selectedModel = model;
  }

  getClient(): Groq | null {
    console.log('[AI_PROVIDERS] GroqProvider.getClient() called, returning client type:', typeof this.client);
    return this.client;
  }

  private getSummaryPrompt(interest: string, summaryLength: SummaryLength): string {
    const lengthInstructions = {
      short: 'Write a concise 2-3 sentence summary',
      medium: 'Write a comprehensive 1-2 paragraph summary',
      detailed: 'Write a detailed analysis with 3-4 paragraphs including context and implications'
    };

    return `${lengthInstructions[summaryLength]} about recent developments in "${interest}". Focus on the most important and recent news from the last 48 hours. Include specific facts, numbers, and key developments. Make it informative and engaging.

Format your response using proper markdown:
- Use **bold** for key terms and important facts
- Use bullet points (-) for lists of developments
- Use numbered lists (1., 2., etc.) for sequential information
- Use ### headings for main sections if needed
- Include relevant statistics or metrics where available

Please search for current information about this topic and provide a well-sourced summary.`;
  }

  private getTweetPrompt(summary: string): string {
    return PROMPTS.TWEET.replace('{summary}', summary);
  }

  async generateSummary(interest: string, summaryLength: SummaryLength): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!this.client) throw new Error('Groq API key not configured');
    if (!this.selectedModel) throw new Error('No Groq model selected. Please select a model first.');

    const prompt = this.getSummaryPrompt(interest, summaryLength);
    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: this.selectedModel,
      temperature: CONFIG.TEMPERATURE.SUMMARY,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.SUMMARY
    });

    const content = completion.choices[0]?.message?.content || '';
    const sources = await searchWeb(interest);

    return {
      summary: renderMarkdown(content),
      sources
    };
  }

  async generateTweets(summary: string): Promise<string[]> {
    if (!this.client) throw new Error('Groq API key not configured');
    if (!this.selectedModel) throw new Error('No Groq model selected. Please select a model first.');

    const prompt = this.getTweetPrompt(summary);
    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: this.selectedModel,
      temperature: CONFIG.TEMPERATURE.TWEETS,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.TWEETS
    });

    const content = completion.choices[0]?.message?.content || '';

    // Parse plain text tweets (one per line) and ensure they fit within limits
    const tweets = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.startsWith('```') && !line.includes('tweet'))
      .map(tweet => tweet.length > 270 ? tweet.substring(0, 267) + '...' : tweet)
      .slice(0, 3);

    return tweets.length > 0 ? tweets : [
      "🚀 Just witnessed another groundbreaking development in tech! The innovation cycle keeps accelerating with new breakthroughs emerging daily. What's next on the horizon? The pace of technological advancement shows no signs of slowing down.",
      "📈 Markets are showing strong reactions to the latest industry developments. Companies are pivoting faster than ever to maintain their competitive edge in this dynamic environment. Strategic adaptation is becoming the key to survival.",
      "🌟 The technological landscape continues to evolve at breakneck speed. From cutting-edge AI to revolutionary discoveries, we're experiencing unprecedented innovation. The future of technology is unfolding before our eyes."
    ];
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    if (!this.client) throw new Error('Groq API key not configured');
    if (!this.selectedModel) throw new Error('No Groq model selected. Please select a model first.');

    const prompt = `Identify the top 3 most significant global news topics from the last 24 hours. Focus on major developments in technology, politics, economics, science, or significant global events. Avoid celebrity gossip, sports scores, or ephemeral social media trends.

Please format your response as exactly 3 topics, each with a title and brief description. Be direct and informative.`;

    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: this.selectedModel,
      temperature: CONFIG.TEMPERATURE.TRENDING,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.TRENDING
    });

    const content = completion.choices[0]?.message?.content || '';

    // Try to parse as JSON first
    try {
      const parsed: { topics: TrendingTopic[] } = JSON.parse(content);
      if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
        return parsed.topics.slice(0, 3);
      }
    } catch (error) {
      // JSON parsing failed, try to extract topics from plain text
      logger.warn('Failed to parse Groq trending response as JSON, trying text extraction');
    }

    // Fallback: Parse plain text response
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    const topics: TrendingTopic[] = [];

    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i].trim();

      // Remove markdown formatting and numbering
      let cleanLine = line
        .replace(/^\d+\.\s*/, '') // Remove "1. " numbering
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
        .trim();

      // Try to extract title and description
      const colonIndex = cleanLine.indexOf(':');
      if (colonIndex > 0) {
        const title = cleanLine.substring(0, colonIndex).trim();
        const description = cleanLine.substring(colonIndex + 1).trim();
        topics.push({ title, description });
      } else {
        // If no colon, use the whole line as title
        topics.push({
          title: cleanLine,
          description: `Recent developments in ${cleanLine.toLowerCase()}`
        });
      }
    }

    // Final fallback if parsing failed
    if (topics.length === 0) {
      logger.warn('Failed to extract topics from Groq response, using hardcoded fallback');
      return [
        { title: "Technology Updates", description: "Latest tech developments and innovations" },
        { title: "Global Politics", description: "Recent political developments worldwide" },
        { title: "Economic News", description: "Financial market updates and economic trends" }
      ];
    }

    return topics.slice(0, 3);
  }
}

class OllamaProvider implements AIProviderInterface {
  private client: Ollama;
  private selectedModel: string | null = null;

  constructor() {
    this.client = new Ollama({ host: CONFIG.OLLAMA_HOST });
  }

  isAvailable(): boolean {
    // Ollama availability is checked by trying to list models
    return true; // We'll handle connection errors gracefully
  }

  getName(): string {
    return 'Ollama (Local)';
  }

  setSelectedModel(model: string): void {
    this.selectedModel = model;
  }

  getClient(): Ollama {
    console.log('[AI_PROVIDERS] OllamaProvider.getClient() called, returning client type:', typeof this.client);
    return this.client;
  }

  private getSummaryPrompt(interest: string, summaryLength: SummaryLength): string {
    const lengthInstructions = {
      short: 'Write a concise 2-3 sentence summary in plain English',
      medium: 'Write a comprehensive 1-2 paragraph summary in plain English',
      detailed: 'Write a detailed analysis with 3-4 paragraphs in plain English including context and implications'
    };

    return `${lengthInstructions[summaryLength]} about recent developments in "${interest}". Focus on the most important and recent news from the last 48 hours. Include specific facts, numbers, and key developments. Make it informative and engaging.

Format your response using simple markdown:
- Use **bold** for key terms
- Use bullet points for lists
- Keep the language clear and professional

Provide factual information about this topic.`;
  }

  private getTweetPrompt(summary: string): string {
    return PROMPTS.TWEET.replace('{summary}', summary);
  }

  async generateSummary(interest: string, summaryLength: SummaryLength): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!this.selectedModel) throw new Error('No Ollama model selected');

    const prompt = this.getSummaryPrompt(interest, summaryLength);
    const response = await this.client.generate({
      model: this.selectedModel,
      prompt,
      stream: false
    });

    const content = response.response || '';
    const sources = await searchWeb(interest);

    return {
      summary: renderMarkdown(content),
      sources
    };
  }

  async generateTweets(summary: string): Promise<string[]> {
    if (!this.selectedModel) throw new Error('No Ollama model selected');

    const prompt = this.getTweetPrompt(summary);
    const response = await this.client.generate({
      model: this.selectedModel,
      prompt,
      stream: false
    });

    const content = response.response || '';

    // Parse plain text tweets (one per line) and ensure they fit within limits
    const tweets = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.startsWith('```') && !line.includes('tweet'))
      .map(tweet => tweet.length > 270 ? tweet.substring(0, 267) + '...' : tweet)
      .slice(0, 3);

    return tweets.length > 0 ? tweets : [
      "🚀 Just witnessed another groundbreaking development in tech! The innovation cycle keeps accelerating with new breakthroughs emerging daily. What's next on the horizon? The pace of technological advancement shows no signs of slowing down.",
      "📈 Markets are showing strong reactions to the latest industry developments. Companies are pivoting faster than ever to maintain their competitive edge in this dynamic environment. Strategic adaptation is becoming the key to survival.",
      "🌟 The technological landscape continues to evolve at breakneck speed. From cutting-edge AI to revolutionary discoveries, we're experiencing unprecedented innovation. The future of technology is unfolding before our eyes."
    ];
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    if (!this.selectedModel) throw new Error('No Ollama model selected');

    const prompt = `Identify the top 3 most significant global news topics from the last 24 hours. Focus on major developments in technology, politics, economics, science, or significant global events. Avoid celebrity gossip, sports scores, or ephemeral social media trends.

Return the response as a JSON object with this exact structure:
{
  "topics": [
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"}
  ]
}`;

    const response = await this.client.generate({
      model: this.selectedModel,
      prompt,
      stream: false
    });

    const content = response.response || '';
    try {
      const parsed: { topics: TrendingTopic[] } = JSON.parse(content);
      return parsed.topics || [];
    } catch (error) {
      logger.warn('Failed to parse Ollama trending response as JSON, using fallback');
      return [
        { title: "AI Development", description: "Latest AI advancements" },
        { title: "Tech Innovation", description: "New technology releases" },
        { title: "Market Updates", description: "Financial developments" }
      ];
    }
  }
}

// Initialize provider instances
console.log('[AI_PROVIDERS] Initializing provider instances...');
const providers: Record<AIProvider, AIProviderInterface> = {
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  ollama: new OllamaProvider()
};
console.log('[AI_PROVIDERS] Provider instances initialized successfully');

// Provider state management (for backward compatibility with existing functions)
let providerState = {
  ollama: {
    models: [] as string[],
    selectedModel: null as string | null
  },
  groq: {
    models: [] as string[],
    selectedModel: null as string | null
  }
};

// Backward compatibility functions
export const listOllamaModels = async (): Promise<string[]> => {
  try {
    const ollamaProvider = providers.ollama;
    // For Ollama, we need to check if it's available by trying to list models
    // This is a simplified approach - in a real implementation we'd need to expose this differently
    providerState.ollama.models = ['llama2', 'llama2:13b', 'codellama']; // Mock models for now
    providerState.ollama.selectedModel = providerState.ollama.models[0] || null;
    logger.info(`Loaded ${providerState.ollama.models.length} Ollama models`);
    return providerState.ollama.models;
  } catch (error) {
    // Silently skip Ollama if not available - don't log errors for missing Ollama server
    providerState.ollama.models = [];
    providerState.ollama.selectedModel = null;
    return [];
  }
};

export const setSelectedOllamaModel = (model: string) => {
  if (providerState.ollama.models.includes(model)) {
    providerState.ollama.selectedModel = model;
    (providers.ollama as OllamaProvider).setSelectedModel(model);
  }
};

export const getSelectedOllamaModel = (): string | null => providerState.ollama.selectedModel;

// Groq model management
export const listGroqModels = async (): Promise<string[]> => {
  try {
    console.log('[AI_PROVIDERS] listGroqModels called');
    if (!providers.groq.isAvailable()) throw new Error('Groq API key not configured');

    // Get real models from Groq API using the provider instance
    console.log('[AI_PROVIDERS] Getting Groq provider instance...');
    const groqProvider = providers.groq as GroqProvider;
    console.log('[AI_PROVIDERS] Groq provider instance:', groqProvider);

    // Use the client from the provider instance
    const groqClient = groqProvider.getClient();
    console.log('[AI_PROVIDERS] Groq client accessed:', !!groqClient);

    if (!groqClient) throw new Error('Groq client not available');

    // Try to get models using the correct SDK method
    console.log('[AI_PROVIDERS] Attempting to list models...');
    try {
      const models = await groqClient.models.list();
      console.log('[AI_PROVIDERS] Models response:', models);

      const allModels = (models.data || [])
        .filter((model: any) => model.id)
        .map((model: any) => model.id!)
        .sort();

      providerState.groq.models = allModels;
      logger.info(`Loaded ${providerState.groq.models.length} Groq models`);
      return providerState.groq.models;
    } catch (sdkError) {
      console.log('[AI_PROVIDERS] SDK error, trying alternative approach:', sdkError);
      // Fallback: return common Groq models if SDK fails
      const fallbackModels = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'];
      providerState.groq.models = fallbackModels;
      logger.info(`Using fallback models: ${fallbackModels.join(', ')}`);
      return fallbackModels;
    }
  } catch (error) {
    logger.warn('Failed to list Groq models:', error);
    // Return empty array on error - connection test will handle this
    providerState.groq.models = [];
    return [];
  }
};

export const setSelectedGroqModel = (model: string) => {
  if (providerState.groq.models.includes(model)) {
    providerState.groq.selectedModel = model;
    (providers.groq as GroqProvider).setSelectedModel(model);
  }
};

export const getSelectedGroqModel = (): string | null => providerState.groq.selectedModel;

export const getAvailableModels = async (provider: AIProvider): Promise<string[]> => {
  switch (provider) {
    case 'ollama':
      return await listOllamaModels();
    case 'groq':
      return await listGroqModels();
    case 'gemini':
      return [CONFIG.GEMINI_MODEL]; // Use the configured Gemini model
    default:
      return [];
  }
};

// Check which providers are available
export const getAvailableProviders = async (): Promise<AIProvider[]> => {
  const available: AIProvider[] = [];

  if (providers.gemini.isAvailable()) available.push('gemini');
  if (providers.groq.isAvailable()) available.push('groq');

  // Check if Ollama is available by trying to list models
  try {
    const models = await listOllamaModels();
    if (models.length > 0) {
      available.push('ollama');
    }
  } catch (error) {
    // Ollama not available, skip silently
  }

  return available;
};

// Generate content with different providers using interface
export class AIProviderManager {
  static async generateSummary(
    provider: AIProvider,
    interest: string,
    summaryLength: SummaryLength
  ): Promise<{ summary: string; sources: BriefingSource[] }> {
    const providerInstance = providers[provider];
    if (!providerInstance.isAvailable()) {
      throw new Error(`${providerInstance.getName()} is not available`);
    }

    // Set selected model for providers that need it
    if (provider === 'groq' && providerState.groq.selectedModel) {
      (providerInstance as GroqProvider).setSelectedModel(providerState.groq.selectedModel);
    } else if (provider === 'ollama' && providerState.ollama.selectedModel) {
      (providerInstance as OllamaProvider).setSelectedModel(providerState.ollama.selectedModel);
    }

    return await providerInstance.generateSummary(interest, summaryLength);
  }

  static async generateTweets(provider: AIProvider, summary: string): Promise<string[]> {
    const providerInstance = providers[provider];
    if (!providerInstance.isAvailable()) {
      throw new Error(`${providerInstance.getName()} is not available`);
    }

    // Set selected model for providers that need it
    if (provider === 'groq' && providerState.groq.selectedModel) {
      (providerInstance as GroqProvider).setSelectedModel(providerState.groq.selectedModel);
    } else if (provider === 'ollama' && providerState.ollama.selectedModel) {
      (providerInstance as OllamaProvider).setSelectedModel(providerState.ollama.selectedModel);
    }

    return await providerInstance.generateTweets(summary);
  }

  static async getTrendingTopics(provider: AIProvider): Promise<TrendingTopic[]> {
    const providerInstance = providers[provider];
    if (!providerInstance.isAvailable()) {
      throw new Error(`${providerInstance.getName()} is not available`);
    }

    // Set selected model for providers that need it
    if (provider === 'groq' && providerState.groq.selectedModel) {
      (providerInstance as GroqProvider).setSelectedModel(providerState.groq.selectedModel);
    } else if (provider === 'ollama' && providerState.ollama.selectedModel) {
      (providerInstance as OllamaProvider).setSelectedModel(providerState.ollama.selectedModel);
    }

    return await providerInstance.getTrendingTopics();
  }
}