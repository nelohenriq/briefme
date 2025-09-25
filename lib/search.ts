import { BriefingSource } from './types';

// Using Wikipedia API as a free and reliable source
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

export async function searchWeb(query: string, maxResults: number = 5): Promise<BriefingSource[]> {
  try {
    const searchQuery = encodeURIComponent(query);
    const url = `${WIKIPEDIA_API}?action=opensearch&format=json&search=${searchQuery}&limit=${maxResults}&namespace=0&origin=*`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Wikipedia search failed');
    
    const [term, titles, descriptions, urls] = await response.json();

    return titles.map((title: string, index: number) => ({
      title: title,
      url: urls[index],
      snippet: descriptions[index] || 'No description available'
    })).slice(0, maxResults);

  } catch (error) {
    console.error('Error searching web:', error);
    return [
      {
        title: 'Search Results Unavailable',
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: 'Could not fetch real-time sources. Click to search Google.'
      }
    ];
  }
}