"use client";

import { useState, useCallback, useRef } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessages, type ChatMessage } from "./chat-messages";
import { SuggestionChips } from "./suggestion-chips";

const MAX_MESSAGES = 20;

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: new Date(),
        },
      ];
      return next.slice(-MAX_MESSAGES);
    });
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      addMessage("user", trimmed);
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg =
            data?.error === "Unauthorized"
              ? "Please sign in to use the AI assistant."
              : typeof data?.error === "string"
                ? data.error
                : "Something went wrong. Please try again.";
          setError(errMsg);
          addMessage("assistant", errMsg);
          return;
        }

        const responseText =
          typeof data?.response === "string"
            ? data.response
            : "I couldn't process that. Please try again.";
        addMessage("assistant", responseText);
      } catch {
        const fallback = "Network error. Please check your connection and try again.";
        setError(fallback);
        addMessage("assistant", fallback);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [addMessage, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionSelect = (text: string) => {
    sendMessage(text);
  };

  const showSuggestions = isOpen && messages.length === 0 && !isLoading;

  return (
    <>
      {/* Floating chat button - hide when panel is open */}
      {!isOpen && (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:bottom-8 md:right-8 animate-pulse"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[calc(100vh-8rem)] md:w-[400px] md:rounded-xl md:shadow-xl ${
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-full"
        }`}
      >
        <Card className="flex h-full flex-col overflow-hidden border-0 md:rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">AI Assistant</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages area */}
          <div className="flex min-h-0 flex-1 flex-col">
            {showSuggestions ? (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <p className="text-sm text-muted-foreground">
                  Ask me anything about your business data. Try one of these:
                </p>
                <SuggestionChips onSelect={handleSuggestionSelect} />
              </div>
            ) : (
              <ChatMessages
                messages={messages}
                isLoading={isLoading}
                className="min-h-0"
              />
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t p-4"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
