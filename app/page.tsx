"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Newspaper,
  TrendingUp,
  Plus,
  X,
  Download,
  Sparkles,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react";

import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Toast,
} from "@/components/ui";

import {
  generateBriefing,
  generateTrendingBriefing,
  getProviders,
  testProviderConnection,
  getAvailableModels,
  setSelectedOllamaModel,
  setSelectedGroqModel,
  getSelectedOllamaModel,
  getSelectedGroqModel,
} from "./actions";
import {
  storage,
  downloadMarkdown,
  formatBriefingAsMarkdown,
} from "@/lib/utils";
import { BriefingItem, SummaryLength, AIProvider } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const DEFAULT_INTERESTS = [
  "Artificial Intelligence advancements",
  "Quantum Computing developments",
  "Climate change solutions",
  "Space exploration",
  "Renewable energy technologies",
];

export default function DailyBriefingApp() {
  // State management
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [activeTab, setActiveTab] = useState("interests");
  const [briefings, setBriefings] = useState<BriefingItem[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(
    []
  );
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("gemini");
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  } | null>(null);

  // Model selection states
  const [availableModels, setAvailableModels] = useState<
    Record<AIProvider, string[]>
  >({
    gemini: [],
    groq: [],
    ollama: [],
  });
  const [selectedModels, setSelectedModels] = useState<
    Record<AIProvider, string | null>
  >({
    gemini: null,
    groq: null,
    ollama: null,
  });
  const [isLoadingModels, setIsLoadingModels] = useState<
    Record<AIProvider, boolean>
  >({
    gemini: false,
    groq: false,
    ollama: false,
  });

  // Loading states
  const [isPending, startTransition] = useTransition();
  const [isTestingProvider, setIsTestingProvider] = useState(false);

  // Load preferences and providers on mount
  useEffect(() => {
    const savedInterests = storage.get("interests", DEFAULT_INTERESTS);
    const savedSummaryLength = storage.get("summaryLength", "medium");
    const savedProvider = storage.get("selectedProvider", "gemini");

    setInterests(savedInterests);
    setSummaryLength(savedSummaryLength);
    setSelectedProvider(savedProvider);

    // Load available providers
    getProviders().then((providers) => {
      setAvailableProviders(providers);
      if (providers.length > 0 && !providers.includes(savedProvider)) {
        setSelectedProvider(providers[0]);
      }
    });
  }, []);

  // Save preferences when they change
  useEffect(() => {
    storage.set("interests", interests);
  }, [interests]);

  useEffect(() => {
    storage.set("summaryLength", summaryLength);
  }, [summaryLength]);

  useEffect(() => {
    storage.set("selectedProvider", selectedProvider);
  }, [selectedProvider]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (
    title: string,
    description?: string,
    variant: "default" | "destructive" = "default"
  ) => {
    setToast({ title, description, variant });
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
      showToast(
        "Interest added",
        `"${newInterest.trim()}" has been added to your interests.`
      );
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter((interest) => interest !== interestToRemove));
    showToast(
      "Interest removed",
      `"${interestToRemove}" has been removed from your interests.`
    );
  };

  const handleGenerateBriefing = () => {
    if (interests.length === 0) {
      showToast(
        "No interests",
        "Please add at least one interest to generate a briefing.",
        "destructive"
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await generateBriefing(
          interests,
          summaryLength,
          selectedProvider
        );
        setBriefings(result.briefings);

        if (result.errors.length > 0) {
          showToast(
            "Partial success",
            `Generated ${result.briefings.length} briefings with ${result.errors.length} errors.`,
            "destructive"
          );
        } else {
          showToast(
            "Success",
            `Generated ${result.briefings.length} briefings successfully!`
          );
        }
      } catch (error) {
        showToast(
          "Error",
          "Failed to generate briefings. Please try again.",
          "destructive"
        );
        console.error("Error generating briefing:", error);
      }
    });
  };

  const handleGenerateTrending = () => {
    startTransition(async () => {
      try {
        const result = await generateTrendingBriefing(
          summaryLength,
          selectedProvider
        );
        setBriefings(result.briefings);

        if (result.errors.length > 0) {
          showToast(
            "Partial success",
            `Generated ${result.briefings.length} trending briefings with ${result.errors.length} errors.`,
            "destructive"
          );
        } else {
          showToast(
            "Success",
            `Generated ${result.briefings.length} trending briefings successfully!`
          );
        }
      } catch (error) {
        showToast(
          "Error",
          "Failed to generate trending briefings. Please try again.",
          "destructive"
        );
        console.error("Error generating trending briefing:", error);
      }
    });
  };

  const handleDownloadBriefing = () => {
    if (briefings.length === 0) {
      showToast(
        "No briefings",
        "No briefings available to download.",
        "destructive"
      );
      return;
    }

    const title =
      activeTab === "interests"
        ? "My Daily Briefing"
        : "Trending Topics Briefing";
    const markdown = formatBriefingAsMarkdown(briefings, title);
    const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${
      new Date().toISOString().split("T")[0]
    }.md`;

    downloadMarkdown(markdown, filename);
    showToast("Downloaded", `${title} has been downloaded as ${filename}`);
  };

  const copyTweet = (tweet: string) => {
    navigator.clipboard
      .writeText(tweet)
      .then(() => {
        showToast("Copied", "Tweet copied to clipboard!");
      })
      .catch(() => {
        showToast(
          "Failed",
          "Failed to copy tweet to clipboard.",
          "destructive"
        );
      });
  };

  const loadModelsForProvider = async (provider: AIProvider) => {
    if (provider === "gemini") return; // Gemini doesn't need model selection

    setIsLoadingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const models = await getAvailableModels(provider);
      setAvailableModels((prev) => ({ ...prev, [provider]: models }));

      if (models.length > 0) {
        const currentSelected = selectedModels[provider];
        if (!currentSelected || !models.includes(currentSelected)) {
          const newSelected = models[0];
          setSelectedModels((prev) => ({ ...prev, [provider]: newSelected }));

          // Update the backend state
          if (provider === "ollama") {
            setSelectedOllamaModel(newSelected);
          } else if (provider === "groq") {
            setSelectedGroqModel(newSelected);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load models for ${provider}:`, error);
      showToast(
        "Model loading failed",
        `Failed to load available models for ${provider}.`,
        "destructive"
      );
    } finally {
      setIsLoadingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const testProvider = async () => {
    if (!selectedProvider) return;

    setIsTestingProvider(true);
    try {
      const result = await testProviderConnection(selectedProvider);
      showToast(
        result.success ? "Provider working" : "Provider failed",
        result.message,
        result.success ? "default" : "destructive"
      );

      // Load models if connection successful
      if (result.success && selectedProvider !== "gemini") {
        await loadModelsForProvider(selectedProvider);
      }
    } catch (error) {
      showToast(
        "Test failed",
        "Failed to test provider connection.",
        "destructive"
      );
    } finally {
      setIsTestingProvider(false);
    }
  };

  const handleModelChange = async (provider: AIProvider, model: string) => {
    setSelectedModels((prev) => ({ ...prev, [provider]: model }));

    // Update backend state
    try {
      if (provider === "ollama") {
        await setSelectedOllamaModel(model);
      } else if (provider === "groq") {
        await setSelectedGroqModel(model);
      }
    } catch (error) {
      console.error("Failed to update selected model:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Daily Briefing AI
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your personalized news intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {selectedProvider.toUpperCase()}{" "}
                {availableProviders.includes(selectedProvider) ? "🟢" : "🔴"}
              </Badge>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) =>
                    setSelectedProvider(e.target.value as AIProvider)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="gemini">Google Gemini (Free)</option>
                  <option value="groq">Groq (Free)</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Summary Length
                </label>
                <select
                  value={summaryLength}
                  onChange={(e) =>
                    setSummaryLength(e.target.value as SummaryLength)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="short">Short (2-3 sentences)</option>
                  <option value="medium">Medium (1-2 paragraphs)</option>
                  <option value="detailed">Detailed (3-4 paragraphs)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Test Connection
                </label>
                <Button
                  variant="outline"
                  onClick={testProvider}
                  disabled={
                    isTestingProvider ||
                    !availableProviders.includes(selectedProvider)
                  }
                  className="w-full"
                >
                  {isTestingProvider ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Test Provider
                </Button>
              </div>
            </div>

            {/* Model Selection - Show after successful connection */}
            {(selectedProvider === "ollama" || selectedProvider === "groq") &&
              availableModels[selectedProvider].length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {selectedProvider === "ollama"
                          ? "Ollama Model"
                          : "Groq Model"}
                      </label>
                      <select
                        value={selectedModels[selectedProvider] || ""}
                        onChange={(e) =>
                          handleModelChange(selectedProvider, e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={isLoadingModels[selectedProvider]}
                      >
                        {availableModels[selectedProvider].map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                      {isLoadingModels[selectedProvider] && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Loading models...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="interests">
                <Sparkles className="h-4 w-4 mr-2" />
                My Interests
              </TabsTrigger>
              <TabsTrigger value="trending">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending Now
              </TabsTrigger>
            </TabsList>

            {/* My Interests Tab */}
            <TabsContent value="interests">
              <Card>
                <CardHeader>
                  <CardTitle>Your Interests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a new interest (e.g., Machine Learning)"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addInterest()}
                      className="flex-1"
                    />
                    <Button onClick={addInterest}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <Badge
                        key={interest}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        {interest}
                        <button
                          onClick={() => removeInterest(interest)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateBriefing}
                    disabled={
                      isPending ||
                      interests.length === 0 ||
                      !availableProviders.includes(selectedProvider)
                    }
                    className="w-full"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate My Briefing
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trending Topics Tab */}
            <TabsContent value="trending">
              <Card>
                <CardHeader>
                  <CardTitle>Trending Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-6">
                      Get AI-curated briefings on the top 3 global trending
                      topics from the last 24 hours.
                    </p>
                    <Button
                      onClick={handleGenerateTrending}
                      disabled={
                        isPending ||
                        !availableProviders.includes(selectedProvider)
                      }
                      className="w-full max-w-sm"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Generate Trending Briefing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Briefing Results */}
          {briefings.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {activeTab === "interests"
                    ? "Your Daily Briefing"
                    : "Trending Topics Briefing"}
                </h2>
                <Button variant="outline" onClick={handleDownloadBriefing}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Markdown
                </Button>
              </div>

              <Accordion type="single" collapsible>
                {briefings.map((briefing, index) => (
                  <AccordionItem key={index} value={`briefing-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-left font-semibold">
                          {briefing.interest}
                        </span>
                        {briefing.error && (
                          <AlertCircle className="h-4 w-4 text-destructive mr-4" />
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6">
                        {/* Summary */}
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">
                            Summary
                          </h4>
                          {briefing.error ? (
                            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/10">
                              <p className="text-destructive font-medium">
                                Error generating summary
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {briefing.error}
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {briefing.summary}
                            </p>
                          )}
                        </div>

                        {/* Sources */}
                        {briefing.sources && briefing.sources.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 text-lg">
                              Sources
                            </h4>
                            <div className="space-y-3">
                              {briefing.sources.map((source, sourceIndex) => (
                                <div
                                  key={sourceIndex}
                                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-medium mb-1">
                                        {source.title}
                                      </h5>
                                      {source.snippet && (
                                        <p className="text-sm text-muted-foreground mb-2">
                                          {source.snippet}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(source.url, "_blank")
                                      }
                                      className="ml-2 shrink-0"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tweets */}
                        {briefing.tweets && briefing.tweets.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 text-lg">
                              Social Media Ready
                            </h4>
                            <div className="grid gap-3">
                              {briefing.tweets.map((tweet, tweetIndex) => (
                                <div
                                  key={tweetIndex}
                                  className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20"
                                >
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm flex-1 pr-4">
                                      {tweet}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyTweet(tweet)}
                                      className="shrink-0"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {tweet.length}/280 characters
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Generation Info */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Generated using {selectedProvider.toUpperCase()}</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Provider Status */}
          {availableProviders.length === 0 && (
            <Card className="mt-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-200">
                      No AI Providers Available
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      To use Daily Briefing AI, you need to configure at least
                      one AI provider:
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                      <li>
                        • <strong>Google Gemini:</strong> Add GEMINI_API_KEY to
                        your environment variables
                      </li>
                      <li>
                        • <strong>Groq:</strong> Add GROQ_API_KEY to your
                        environment variables
                      </li>
                      <li>
                        • <strong>Ollama:</strong> Install and run Ollama
                        locally (default: http://localhost:11434)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
          />
        </div>
      )}
    </div>
  );
}
