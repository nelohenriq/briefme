import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBriefingAsMarkdown(briefings: any[], title: string): string {
  const date = new Date().toLocaleDateString();
  let markdown = `# ${title}\n\n*Generated on ${date}*\n\n---\n\n`;

  briefings.forEach((briefing, index) => {
    markdown += `## ${briefing.interest}\n\n`;
    markdown += `${briefing.summary}\n\n`;

    if (briefing.sources && briefing.sources.length > 0) {
      markdown += `### Sources\n\n`;
      briefing.sources.forEach((source: any, sourceIndex: number) => {
        markdown += `${sourceIndex + 1}. [${source.title}](${source.url})\n`;
        if (source.snippet) {
          markdown += `   > ${source.snippet}\n`;
        }
      });
      markdown += `\n`;
    }

    if (briefing.tweets && briefing.tweets.length > 0) {
      markdown += `### Social Media Ready\n\n`;
      briefing.tweets.forEach((tweet: string, tweetIndex: number) => {
        markdown += `**Tweet ${tweetIndex + 1}:** ${tweet}\n\n`;
      });
    }

    if (index < briefings.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

// Local storage utilities with error handling
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error writing to localStorage key "${key}":`, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }
};