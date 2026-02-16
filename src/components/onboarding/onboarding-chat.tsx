"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OnboardingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface OnboardingChatProps {
  onComplete: () => void;
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [messages, setMessages] = useState<OnboardingMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your accounting assistant. Let's get your business set up — it'll only take a minute.\n\nWhat's your company name?",
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [setupResults, setSetupResults] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      const userMsg: OnboardingMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);

      const newHistory = [...conversationHistory, { role: "user" as const, content: trimmed }];
      setIsLoading(true);

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory: newHistory,
          }),
        });

        const data = await res.json();

        if (data.progress) {
          setProgress(data.progress);
        }

        const assistantContent = data.message || "Let's continue setting up.";
        const assistantMsg: OnboardingMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setConversationHistory([
          ...newHistory,
          { role: "assistant", content: assistantContent },
        ]);

        if (data.setupResult) {
          setSetupResults(data.setupResult);
        }

        if (data.action === "complete" || data.action === "setup_company") {
          setIsComplete(true);
          setProgress(100);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Oops, something went wrong. Let's try that again — what's your company name?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 mx-4 overflow-hidden" style={{ maxHeight: "min(700px, 90vh)" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Welcome to AutoCount</h1>
              <p className="text-sm text-blue-100">Let's set up your business</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5">
              <span>Setup Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user"
                  ? "ml-auto bg-blue-600 text-white rounded-br-md"
                  : "mr-auto bg-gray-100 text-gray-800 rounded-bl-md"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {isLoading && (
            <div className="mr-auto rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </div>
            </div>
          )}

          {/* Setup results */}
          {isComplete && setupResults.length > 0 && (
            <div className="mx-auto w-full rounded-xl border border-green-200 bg-green-50 p-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 text-sm">Setup Complete!</span>
              </div>
              <ul className="space-y-1">
                {setupResults.map((r, i) => (
                  <li key={i} className="text-xs text-green-700 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-green-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {!isComplete ? (
          <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              disabled={isLoading}
              className="flex-1 rounded-full px-4"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="border-t p-4">
            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
