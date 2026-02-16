"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { ChatMessages, type ChatMessage } from "./chat-messages";
import { SuggestionChips } from "./suggestion-chips";
import { usePageContext } from "@/lib/page-context";

const MAX_MESSAGES = 20;

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { context: pageContext } = usePageContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when chat is open on mobile
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    // Only lock on smaller screens
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        { id: crypto.randomUUID(), role, content, timestamp: new Date() },
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
          body: JSON.stringify({
            question: trimmed,
            pageContext: {
              currentPage: pageContext.currentPage,
              currentAction: pageContext.currentAction,
              pageDescription: pageContext.pageDescription,
              formData: pageContext.formData,
              availableActions: pageContext.availableActions,
            },
          }),
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

        addMessage(
          "assistant",
          typeof data?.response === "string"
            ? data.response
            : "I couldn't process that. Please try again."
        );
      } catch {
        const fallback = "Network error. Please check your connection and try again.";
        setError(fallback);
        addMessage("assistant", fallback);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [addMessage, isLoading, pageContext]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionSelect = (text: string) => {
    sendMessage(text);
  };

  const showSuggestions = isOpen && messages.length === 0 && !isLoading;

  const placeholder = pageContext.currentAction
    ? `Ask about ${pageContext.currentPage}...`
    : "Ask a question...";

  if (!mounted) return null;

  const chatContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">AI Assistant</h2>
            {pageContext.currentAction && (
              <p className="text-[11px] text-muted-foreground truncate">
                Viewing: {pageContext.pageDescription || pageContext.currentPage}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
          className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors -mr-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {showSuggestions ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <p className="text-sm text-muted-foreground">
              {pageContext.currentAction
                ? `I can see you're on the ${pageContext.pageDescription || pageContext.currentPage} page. How can I help?`
                : "Ask me anything about your business data. Try one of these:"}
            </p>
            <SuggestionChips
              onSelect={handleSuggestionSelect}
              currentPage={pageContext.currentPage}
              currentAction={pageContext.currentAction}
            />
          </div>
        ) : (
          <ChatMessages messages={messages} isLoading={isLoading} className="min-h-0" />
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t bg-white px-3 py-3 sm:px-4 shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          autoComplete="off"
          enterKeyHint="send"
          className="flex-1 min-w-0 rounded-full border border-input bg-background px-4 py-2.5 text-base sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  return createPortal(
    /*
     * This wrapper div forces pointer-events back on.
     * Radix Dialog sets `pointer-events: none` on <body> when open,
     * which disables all body children including our portal.
     * The inline style here overrides that inheritance.
     */
    <div data-chat-portal="" style={{ pointerEvents: "auto" }}>
      {/* ── FAB button ── always visible when chat is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="fixed bottom-5 right-5 z-[99999] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* ── Mobile full-screen panel (< md) ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white md:hidden">
          {chatContent}
        </div>
      )}

      {/* ── Desktop floating panel (md+) ── */}
      {isOpen && (
        <div className="hidden md:flex fixed bottom-6 right-6 z-[99999] h-[min(calc(100vh-6rem),640px)] w-[400px] flex-col rounded-xl border bg-white shadow-2xl">
          {chatContent}
        </div>
      )}
    </div>,
    document.body
  );
}
