import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Briefing AI",
  description: "Your personalized news intelligence powered by AI",
  keywords: "AI, news, briefing, personalized, trending, Gemini, Groq, Ollama",
  authors: [{ name: "Daily Briefing AI Team" }],
  openGraph: {
    title: "Daily Briefing AI",
    description: "Your personalized news intelligence powered by AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Briefing AI",
    description: "Your personalized news intelligence powered by AI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
