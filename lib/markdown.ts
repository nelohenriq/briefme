import { marked } from 'marked';

// Configure marked with basic options
marked.setOptions({
  gfm: true,
  breaks: true
});

export const renderMarkdown = (markdown: string): string => {
  try {
    // Clean up the markdown by removing any potential script tags
    const cleanMarkdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return marked(cleanMarkdown) as string;
  } catch (error) {
    console.warn('Failed to render markdown, returning original text:', error);
    return markdown;
  }
};