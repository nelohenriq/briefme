'use server';

import {
  AIProviderManager,
  getAvailableProviders,
  getAvailableModels as getAvailableModelsFromLib,
  listOllamaModels as listOllamaModelsFromLib,
  listGroqModels as listGroqModelsFromLib,
  setSelectedOllamaModel as setSelectedOllamaModelFromLib,
  setSelectedGroqModel as setSelectedGroqModelFromLib,
  getSelectedOllamaModel as getSelectedOllamaModelFromLib,
  getSelectedGroqModel as getSelectedGroqModelFromLib
} from '../lib/ai_providers';
import { 
  BriefingItem, 
  GenerateBriefingResponse, 
  SummaryLength, 
  AIProvider, 
  TrendingTopic 
} from '../lib/types';

// Get available AI providers
export async function getProviders(): Promise<AIProvider[]> {
  try {
    return await getAvailableProviders();
  } catch (error) {
    console.error('Error getting providers:', error);
    return [];
  }
}

// Generate briefing for user interests
export async function generateBriefing(
  interests: string[], 
  summaryLength: SummaryLength,
  provider: AIProvider = 'gemini'
): Promise<GenerateBriefingResponse> {
  const briefings: BriefingItem[] = [];
  const errors: string[] = [];

  // Check if provider is available
  const availableProviders = await getAvailableProviders();
  if (!availableProviders.includes(provider)) {
    // Fallback to first available provider
    if (availableProviders.length > 0) {
      provider = availableProviders[0];
    } else {
      return {
        briefings: [],
        errors: ['No AI providers available. Please configure at least one provider.']
      };
    }
  }

  // Process each interest in parallel
  const promises = interests.map(interest => 
    generateSingleBriefingForInterest(interest, summaryLength, provider)
  );

  try {
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        briefings.push(result.value);
      } else {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`Failed to generate briefing for "${interests[index]}": ${errorMessage}`);
        // Add error briefing item
        briefings.push({
          interest: interests[index],
          summary: 'Failed to generate summary due to an error.',
          sources: [],
          tweets: [],
          error: errorMessage
        });
      }
    });

    return { briefings, errors };
  } catch (error) {
    return {
      briefings: [],
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// Generate trending topics briefing
export async function generateTrendingBriefing(
  summaryLength: SummaryLength,
  provider: AIProvider = 'gemini'
): Promise<GenerateBriefingResponse> {
  try {
    // Check if provider is available
    const availableProviders = await getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      if (availableProviders.length > 0) {
        provider = availableProviders[0];
      } else {
        return {
          briefings: [],
          errors: ['No AI providers available. Please configure at least one provider.']
        };
      }
    }

    // Get trending topics
    const topics = await AIProviderManager.getTrendingTopics(provider);
    
    if (!topics || topics.length === 0) {
      return {
        briefings: [],
        errors: ['Unable to fetch trending topics. Please try again later.']
      };
    }

    // Generate briefings for each trending topic
    const briefings: BriefingItem[] = [];
    const errors: string[] = [];

    const promises = topics.slice(0, 3).map(topic => 
      generateSingleBriefingForInterest(topic.title, summaryLength, provider)
    );

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        briefings.push(result.value);
      } else {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`Failed to generate briefing for trending topic "${topics[index].title}": ${errorMessage}`);
        briefings.push({
          interest: topics[index].title,
          summary: 'Failed to generate summary due to an error.',
          sources: [],
          tweets: [],
          error: errorMessage
        });
      }
    });

    return { briefings, errors };
  } catch (error) {
    return {
      briefings: [],
      errors: [`Failed to generate trending briefing: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// Helper function to generate a single briefing
async function generateSingleBriefingForInterest(
  interest: string, 
  summaryLength: SummaryLength, 
  provider: AIProvider
): Promise<BriefingItem> {
  try {
    // Generate summary
    const { summary, sources } = await AIProviderManager.generateSummary(
      provider, 
      interest, 
      summaryLength
    );

    if (!summary) {
      throw new Error('Empty summary generated');
    }

    // Generate tweets
    let tweets: string[] = [];
    try {
      tweets = await AIProviderManager.generateTweets(provider, summary);
    } catch (tweetError) {
      console.warn(`Failed to generate tweets for "${interest}":`, tweetError);
      // Continue without tweets rather than failing the entire briefing
      tweets = [
        `Breaking: New developments in ${interest}! 🚀`,
        `Stay informed about the latest ${interest} updates. Knowledge is power! 💡`,
        `Another day, another ${interest} breakthrough. The future is now! ⚡`
      ];
    }

    return {
      interest,
      summary: summary.trim(),
      sources: sources || [],
      tweets: tweets.slice(0, 3) // Ensure only 3 tweets
    };

  } catch (error) {
    console.error(`Error generating briefing for "${interest}":`, error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

// Test connection to a specific provider
export async function testProviderConnection(provider: AIProvider): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const availableProviders = await getAvailableProviders();

    if (!availableProviders.includes(provider)) {
      return {
        success: false,
        message: `${provider} is not available. Please check your configuration.`
      };
    }

    // Test with a simple request
    const testResult = await AIProviderManager.generateSummary(
      provider,
      'artificial intelligence',
      'short'
    );

    if (testResult.summary) {
      return {
        success: true,
        message: `${provider} is working correctly!`
      };
    } else {
      return {
        success: false,
        message: `${provider} returned empty response.`
      };
    }

  } catch (error) {
    return {
      success: false,
      message: `${provider} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Model management functions
export async function getAvailableModels(provider: AIProvider): Promise<string[]> {
  try {
    return await getAvailableModelsFromLib(provider);
  } catch (error) {
    console.error(`Error getting models for ${provider}:`, error);
    return [];
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    return await listOllamaModelsFromLib();
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

export async function listGroqModels(): Promise<string[]> {
  try {
    return await listGroqModelsFromLib();
  } catch (error) {
    console.error('Error listing Groq models:', error);
    return [];
  }
}

export async function setSelectedOllamaModel(model: string): Promise<void> {
  setSelectedOllamaModelFromLib(model);
}

export async function setSelectedGroqModel(model: string): Promise<void> {
  setSelectedGroqModelFromLib(model);
}

export async function getSelectedOllamaModel(): Promise<string | null> {
  return getSelectedOllamaModelFromLib();
}

export async function getSelectedGroqModel(): Promise<string | null> {
  return getSelectedGroqModelFromLib();
}