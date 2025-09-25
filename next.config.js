/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental options removed; serverActions are enabled by default
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OLLAMA_HOST: process.env.OLLAMA_HOST,
  },
  images: {
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
