export type SummaryLength = 'short' | 'medium' | 'detailed';

export type AIProvider = 'gemini' | 'groq' | 'ollama';

export interface BriefingSource {
  title: string;
  url: string;
  snippet: string;
}

export interface BriefingItem {
  interest: string;
  summary: string;
  sources: BriefingSource[];
  tweets: string[];
  error?: string;
}

export interface TrendingTopic {
  title: string;
  description: string;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  enabled: boolean;
}

export interface AppConfig {
  aiProviders: {
    gemini: AIConfig;
    groq: AIConfig;
    ollama: AIConfig;
  };
  defaultProvider: AIProvider;
}

export interface GenerateBriefingResponse {
  briefings: BriefingItem[];
  errors: string[];
}

export interface GenerateTweetsResponse {
  tweets: string[];
}