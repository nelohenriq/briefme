declare module 'rss-parser' {
  export interface Item {
    title?: string;
    link?: string;
    content?: string;
    contentSnippet?: string;
  }

  export interface Output {
    items: Item[];
  }

  export default class Parser {
    parseURL(url: string): Promise<Output>;
  }
}