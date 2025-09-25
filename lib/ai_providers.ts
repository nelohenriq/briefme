import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { Ollama } from 'ollama';
import { AIProvider, SummaryLength, BriefingSource, TrendingTopic } from './types';

// Configuration constants
const CONFIG = {
  GEMINI_MODEL: 'gemini-1.5-pro',
  GROQ_MODEL: 'llama3.2:latest',
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

// Simple logger utility
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[AI_PROVIDERS] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[AI_PROVIDERS] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[AI_PROVIDERS] ${message}`, ...args),
};

// Type definitions for API responses
interface TweetsResponse {
  tweets: string[];
}

interface TrendingResponse {
  topics: TrendingTopic[];
}

interface OllamaModel {
  name: string;
  [key: string]: any;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

// Initialize AI clients
const clients = {
  gemini: process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null,
  groq: process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null,
  ollama: new Ollama({ host: CONFIG.OLLAMA_HOST })
};

// Provider state management
let providerState = {
  ollama: {
    models: [] as string[],
    selectedModel: null as string | null
  },
  groq: {
    models: [] as string[],
    selectedModel: CONFIG.GROQ_MODEL as string
  }
};

export const listOllamaModels = async (): Promise<string[]> => {
  try {
    const result = await clients.ollama.list() as OllamaListResponse;
    providerState.ollama.models = result.models?.map((m: OllamaModel) => m.name) || [];
    providerState.ollama.selectedModel = providerState.ollama.models[0] || null;
    logger.info(`Loaded ${providerState.ollama.models.length} Ollama models`);
    return providerState.ollama.models;
  } catch (error) {
    logger.warn('Failed to list Ollama models:', error);
    providerState.ollama.models = [];
    providerState.ollama.selectedModel = null;
    return [];
  }
};

export const setSelectedOllamaModel = (model: string) => {
  if (providerState.ollama.models.includes(model)) {
    providerState.ollama.selectedModel = model;
  }
};

export const getSelectedOllamaModel = (): string | null => providerState.ollama.selectedModel;

// Groq model management
export const listGroqModels = async (): Promise<string[]> => {
  try {
    if (!clients.groq) throw new Error('Groq API key not configured');

    const models = await clients.groq.models.list();
    providerState.groq.models = (models.data || [])
      .filter(model => model.id && model.id.includes('llama')) // Filter for Llama models
      .map(model => model.id!)
      .sort();

    if (providerState.groq.models.length === 0) {
      providerState.groq.models = [CONFIG.GROQ_MODEL]; // Fallback if no llama models
    }

    if (!providerState.groq.selectedModel) {
      providerState.groq.selectedModel = providerState.groq.models[0];
    }

    logger.info(`Loaded ${providerState.groq.models.length} Groq models`);
    return providerState.groq.models;
  } catch (error) {
    logger.warn('Failed to list Groq models:', error);
    providerState.groq.models = [CONFIG.GROQ_MODEL]; // Fallback to default
    providerState.groq.selectedModel = CONFIG.GROQ_MODEL;
    return providerState.groq.models;
  }
};

export const setSelectedGroqModel = (model: string) => {
  if (providerState.groq.models.includes(model)) {
    providerState.groq.selectedModel = model;
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
      return [CONFIG.GEMINI_MODEL]; // Gemini only has one model for now
    default:
      return [];
  }
};

// Check which providers are available
export const getAvailableProviders = async (): Promise<AIProvider[]> => {
  const providers: AIProvider[] = [];

  if (clients.gemini) providers.push('gemini');
  if (clients.groq) providers.push('groq');

  // Check if Ollama is available and list models
  try {
    const models = await listOllamaModels();
    if (models.length > 0) {
      providers.push('ollama');
    }
  } catch (error) {
    console.warn('Ollama not available:', error);
  }

  return providers;
};

// Generate content with different providers
export class AIProviderManager {
  private static getSummaryPrompt(interest: string, summaryLength: SummaryLength): string {
    const lengthInstructions = {
      short: 'Write a concise 2-3 sentence summary',
      medium: 'Write a comprehensive 1-2 paragraph summary',
      detailed: 'Write a detailed analysis with 3-4 paragraphs including context and implications'
    };

    return `${lengthInstructions[summaryLength]} about recent developments in "${interest}". Focus on the most important and recent news from the last 48 hours. Include specific facts, numbers, and key developments. Make it informative and engaging.

Please search for current information about this topic and provide a well-sourced summary.`;
  }

  private static getTweetPrompt(summary: string): string {
    return `Based on this news summary, generate exactly 3 witty, satirical tweets that are:
- Clever and humorous but not offensive
- Under 280 characters each
- Engaging and shareable
- Factually grounded in the summary

Summary: ${summary}

Return the response as a JSON object with this exact structure:
{
  "tweets": ["tweet1", "tweet2", "tweet3"]
}`;
  }

  static async generateSummary(
    provider: AIProvider,
    interest: string,
    summaryLength: SummaryLength
  ): Promise<{ summary: string; sources: BriefingSource[] }> {
    const prompt = this.getSummaryPrompt(interest, summaryLength);

    switch (provider) {
      case 'gemini':
        return this.generateWithGemini(prompt);
      case 'groq':
        return this.generateWithGroq(prompt);
      case 'ollama':
        return this.generateWithOllama(prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  static async generateTweets(provider: AIProvider, summary: string): Promise<string[]> {
    const prompt = this.getTweetPrompt(summary);

    switch (provider) {
      case 'gemini':
        return this.generateTweetsWithGemini(prompt);
      case 'groq':
        return this.generateTweetsWithGroq(prompt);
      case 'ollama':
        return this.generateTweetsWithOllama(prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  static async getTrendingTopics(provider: AIProvider): Promise<TrendingTopic[]> {
    const prompt = `Identify the top 3 most significant global news topics from the last 24 hours. Focus on major developments in technology, politics, economics, science, or significant global events. Avoid celebrity gossip, sports scores, or ephemeral social media trends.

Return the response as a JSON object with this exact structure:
{
  "topics": [
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"},
    {"title": "Topic Title", "description": "Brief description"}
  ]
}`;

    switch (provider) {
      case 'gemini':
        return this.getTrendingWithGemini(prompt);
      case 'groq':
        return this.getTrendingWithGroq(prompt);
      case 'ollama':
        return this.getTrendingWithOllama(prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Gemini implementations
  private static async generateWithGemini(prompt: string): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!clients.gemini) throw new Error('Gemini API key not configured');

    const model = clients.gemini.getGenerativeModel({
      model: CONFIG.GEMINI_MODEL
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Note: Grounding/sources not available in current Gemini API version
    return { summary: text, sources: [] };
  }

  private static async generateTweetsWithGemini(prompt: string): Promise<string[]> {
    if (!clients.gemini) throw new Error('Gemini API key not configured');

    const model = clients.gemini.getGenerativeModel({
      model: CONFIG.GEMINI_MODEL
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      const parsed: TweetsResponse = JSON.parse(content);
      return parsed.tweets || [];
    } catch (error) {
      logger.warn('Failed to parse Gemini tweets response as JSON, using fallback parsing');
      // Fallback: extract tweets manually if JSON parsing fails
      const tweets = content.split('\n').filter((line: string) => line.trim().startsWith('"')).slice(0, 3);
      return tweets.map((tweet: string) => tweet.replace(/^"|"$/g, ''));
    }
  }

  private static async getTrendingWithGemini(prompt: string): Promise<TrendingTopic[]> {
    if (!clients.gemini) throw new Error('Gemini API key not configured');

    const model = clients.gemini.getGenerativeModel({
      model: CONFIG.GEMINI_MODEL
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      const parsed: TrendingResponse = JSON.parse(content);
      return parsed.topics || [];
    } catch (error) {
      logger.warn('Failed to parse Gemini trending response as JSON, using fallback');
      // Fallback
      return [
        { title: "Technology Updates", description: "Latest tech developments" },
        { title: "Global Politics", description: "Recent political developments" },
        { title: "Economic News", description: "Financial market updates" }
      ];
    }
  }

  // Groq implementations
  private static async generateWithGroq(prompt: string): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!clients.groq) throw new Error('Groq API key not configured');

    const model = providerState.groq.selectedModel || CONFIG.GROQ_MODEL;
    const completion = await clients.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: CONFIG.TEMPERATURE.SUMMARY,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.SUMMARY
    });

    return {
      summary: completion.choices[0]?.message?.content || '',
      sources: [] // Groq doesn't have built-in search, sources would need separate implementation
    };
  }

  private static async generateTweetsWithGroq(prompt: string): Promise<string[]> {
    if (!clients.groq) throw new Error('Groq API key not configured');

    const model = providerState.groq.selectedModel || CONFIG.GROQ_MODEL;
    const completion = await clients.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: CONFIG.TEMPERATURE.TWEETS,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.TWEETS
    });

    const content = completion.choices[0]?.message?.content || '';
    try {
      const parsed: TweetsResponse = JSON.parse(content);
      return parsed.tweets || [];
    } catch (error) {
      logger.warn('Failed to parse Groq tweets response as JSON, using fallback parsing');
      // Fallback: extract tweets manually if JSON parsing fails
      const tweets = content.split('\n').filter((line: string) => line.trim().startsWith('"')).slice(0, 3);
      return tweets.map((tweet: string) => tweet.replace(/^"|"$/g, ''));
    }
  }

  private static async getTrendingWithGroq(prompt: string): Promise<TrendingTopic[]> {
    if (!clients.groq) throw new Error('Groq API key not configured');

    const model = providerState.groq.selectedModel || CONFIG.GROQ_MODEL;
    const completion = await clients.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: CONFIG.TEMPERATURE.TRENDING,
      max_tokens: CONFIG.DEFAULT_MAX_TOKENS.TRENDING
    });

    const content = completion.choices[0]?.message?.content || '';
    try {
      const parsed: TrendingResponse = JSON.parse(content);
      return parsed.topics || [];
    } catch (error) {
      logger.warn('Failed to parse Groq trending response as JSON, using fallback');
      // Fallback for manual parsing
      return [
        { title: "Technology Updates", description: "Latest tech developments" },
        { title: "Global Politics", description: "Recent political developments" },
        { title: "Economic News", description: "Financial market updates" }
      ];
    }
  }

  // Ollama implementations
  private static async generateWithOllama(prompt: string): Promise<{ summary: string; sources: BriefingSource[] }> {
    if (!providerState.ollama.selectedModel) throw new Error('No Ollama model selected');
    const response = await clients.ollama.generate({
      model: providerState.ollama.selectedModel,
      prompt,
      stream: false
    });
    return {
      summary: response.response || '',
      sources: [] // Local models don't have search capabilities
    };
  }

  private static async generateTweetsWithOllama(prompt: string): Promise<string[]> {
    if (!providerState.ollama.selectedModel) throw new Error('No Ollama model selected');
    const response = await clients.ollama.generate({
      model: providerState.ollama.selectedModel,
      prompt,
      stream: false
    });
    const content = response.response || '';
    try {
      const parsed: TweetsResponse = JSON.parse(content);
      return parsed.tweets || [];
    } catch (error) {
      logger.warn('Failed to parse Ollama tweets response as JSON, using fallback parsing');
      // Fallback parsing
      const tweets = content.split('\n').filter((line: string) => line.trim().length > 10).slice(0, 3);
      return tweets;
    }
  }

  private static async getTrendingWithOllama(prompt: string): Promise<TrendingTopic[]> {
    if (!providerState.ollama.selectedModel) throw new Error('No Ollama model selected');
    const response = await clients.ollama.generate({
      model: providerState.ollama.selectedModel,
      prompt,
      stream: false
    });
    const content = response.response || '';
    try {
      const parsed: TrendingResponse = JSON.parse(content);
      return parsed.topics || [];
    } catch (error) {
      logger.warn('Failed to parse Ollama trending response as JSON, using fallback');
      // Fallback
      return [
        { title: "AI Development", description: "Latest AI advancements" },
        { title: "Tech Innovation", description: "New technology releases" },
        { title: "Market Updates", description: "Financial developments" }
      ];
    }
  }
}