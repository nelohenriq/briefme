# Daily Briefing AI 🤖📰

A modern, free AI-powered daily briefing application that provides personalized news summaries and trending topics using multiple AI providers. Built with Next.js, TypeScript, and Tailwind CSS.

![Daily Briefing AI](https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=400&fit=crop)

## ✨ Features

- **🎯 Personalized Briefings**: Add your interests and get custom AI-generated news summaries
- **📈 Trending Topics**: Auto-discover and analyze the top 3 global trending topics
- **🤖 Multiple AI Providers**: 
  - **Google Gemini** (Free with search capabilities)
  - **Groq** (Free, ultra-fast inference)
  - **Ollama** (Local/private AI models)
- **📏 Adjustable Length**: Short, medium, or detailed summaries
- **🐦 Social Ready**: Auto-generated satirical tweets for each topic
- **📚 Smart Sources**: Automatic source detection and citation (Gemini)
- **💾 Persistent Preferences**: Your settings saved locally
- **📋 Export Options**: Download briefings as Markdown files
- **🎨 Modern UI**: Beautiful, responsive design with dark mode support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- At least one AI provider API key (all free options available)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/daily-briefing-ai.git
cd daily-briefing-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Configure AI providers** (choose one or more):

#### Option 1: Google Gemini (Recommended)
- Get free API key: https://makersuite.google.com/app/apikey
- Add to `.env.local`: `GEMINI_API_KEY=your_key_here`
- ✅ Includes web search and source citations

#### Option 2: Groq (Ultra-fast)
- Get free API key: https://console.groq.com/keys  
- Add to `.env.local`: `GROQ_API_KEY=your_key_here`
- ⚡ Fastest inference, 100% free

#### Option 3: Ollama (Local/Private)
- Install Ollama: https://ollama.ai
- Run: `ollama pull llama3.2`
- Start: `ollama serve`
- 🔒 Complete privacy, runs locally

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to http://localhost:3000

## 🛠️ Configuration

### AI Provider Setup

| Provider | Speed | Sources | Privacy | Setup |
|----------|-------|---------|---------|-------|
| **Gemini** | Fast | ✅ Web Search | Cloud | Free API key |
| **Groq** | Ultra-fast | ❌ | Cloud | Free API key |  
| **Ollama** | Medium | ❌ | ✅ Local | Local install |

### Environment Variables

```bash
# Google Gemini (with web search)
GEMINI_API_KEY=your_gemini_api_key_here

# Groq (fastest inference)
GROQ_API_KEY=your_groq_api_key_here

# Ollama (local AI)
OLLAMA_HOST=http://localhost:11434
```

## 📖 Usage Guide

### Adding Personal Interests

1. Go to the **"My Interests"** tab
2. Add topics like "AI advancements", "Climate solutions", "Space exploration"
3. Click **"Generate My Briefing"**
4. Get personalized summaries with sources and social media content

### Trending Topics

1. Switch to **"Trending Now"** tab  
2. Click **"Generate Trending Briefing"**
3. Get AI-curated analysis of top 3 global topics from last 24 hours

### Customization

- **Summary Length**: Choose Short (2-3 sentences), Medium (1-2 paragraphs), or Detailed (3-4 paragraphs)
- **AI Provider**: Switch between Gemini, Groq, and Ollama in settings
- **Export**: Download briefings as formatted Markdown files

## 🏗️ Project Structure

```
daily-briefing-ai/
├── app/
│   ├── actions.ts          # Server actions for AI operations
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main application component
├── components/
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── ai-providers.ts     # AI provider implementations
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
└── public/                # Static assets
```

## 🤝 Contributing

We welcome contributions! Here are some ideas:

- **New AI Providers**: Add support for Claude, Cohere, etc.
- **Data Sources**: Integrate Reddit, Twitter, RSS feeds
- **Export Formats**: PDF, EPUB, email summaries  
- **Visualizations**: Charts, graphs, trend analysis
- **Voice Features**: Audio briefings, speech input
- **Mobile App**: React Native version

### Development

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 API Limits & Costs

| Provider | Rate Limit | Cost | Features |
|----------|------------|------|----------|
| **Gemini** | 60 requests/minute | Free | Web search, citations |
| **Groq** | 30 requests/minute | Free | Ultra-fast inference |
| **Ollama** | No limits | Free | Private, local processing |

## 🔧 Troubleshooting

### Common Issues

**"No AI Providers Available"**
- Check your API keys in `.env.local`
- Verify API keys are valid and active
- For Ollama: ensure `ollama serve` is running

**Slow Performance**
- Try switching to Groq for faster inference
- Use "Short" summary length for quicker results
- Check your internet connection for Gemini web search

**Missing Sources**
- Sources only available with Google Gemini
- Groq and Ollama don't have built-in web search
- Consider using Gemini for source-rich briefings

### Getting Help

- 📖 Check the [documentation](https://github.com/yourusername/daily-briefing-ai/wiki)
- 🐛 [Report bugs](https://github.com/yourusername/daily-briefing-ai/issues)
- 💬 [Join discussions](https://github.com/yourusername/daily-briefing-ai/discussions)

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google for the free Gemini API
- Groq for ultra-fast inference
- Ollama for local AI capabilities  
- Vercel for deployment platform
- Shadcn/ui for beautiful components

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/daily-briefing-ai&type=Date)](https://star-history.com/#yourusername/daily-briefing-ai&Date)

---

**Built with ❤️ using free AI services** | [Documentation](https://github.com/yourusername/daily-briefing-ai/wiki) | [Live Demo](https://daily-briefing-ai.vercel.app)