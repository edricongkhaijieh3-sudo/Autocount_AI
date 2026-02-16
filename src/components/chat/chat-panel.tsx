"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { ChatMessages, type ChatMessage } from "./chat-messages";
import { SuggestionChips } from "./suggestion-chips";
import { usePageContext } from "@/lib/page-context";
import type { InvoiceDraft } from "@/lib/ai/invoice-draft";
import type { AnyCreateDraft } from "@/lib/ai/chat-create-types";
import { toast } from "sonner";

function getCreateDraftFromMessage(m: ChatMessage): AnyCreateDraft | undefined {
  return m.contactDraft ?? m.accountDraft ?? m.productDraft ?? m.productCategoryDraft
    ?? m.currencyDraft ?? m.taxCodeDraft ?? m.tariffCodeDraft ?? m.taxEntityDraft;
}

const MAX_MESSAGES = 20;

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
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
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string, extras?: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            role,
            content,
            timestamp: new Date(),
            ...extras,
          },
        ];
        return next.slice(-MAX_MESSAGES);
      });
    },
    []
  );

  const lastDraft = messages.slice().reverse().find((m) => m.role === "assistant" && m.invoiceDraft)?.invoiceDraft;
  const lastCreateDraft = messages.slice().reverse().map(getCreateDraftFromMessage).find(Boolean) as AnyCreateDraft | undefined;
  const lastPendingCustomer = messages.slice().reverse().find(
    (m) => m.role === "assistant" && m.contactNotFound && m.extraction
  );

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      addMessage("user", trimmed);
      setError(null);
      setIsLoading(true);

      try {
        const body: Record<string, unknown> = {
          question: trimmed,
          pageContext: {
            currentPage: pageContext.currentPage,
            currentAction: pageContext.currentAction,
            pageDescription: pageContext.pageDescription,
            formData: pageContext.formData,
            availableActions: pageContext.availableActions,
          },
        };
        if (lastDraft) body.currentDraft = lastDraft;
        if (lastCreateDraft) body.currentCreateDraft = lastCreateDraft;
        if (lastPendingCustomer?.contactNotFound && lastPendingCustomer?.extraction) {
          body.pendingCustomerForInvoice = {
            customerName: lastPendingCustomer.contactNotFound,
            extraction: lastPendingCustomer.extraction,
          };
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

        const responseText = typeof data?.response === "string" ? data.response : "I couldn't process that. Please try again.";
        if (data.invoiceDraft) {
          addMessage("assistant", responseText, {
            invoiceDraft: data.invoiceDraft,
            ...(data.contactCreatedForInvoice && { contactCreatedForInvoice: true }),
          });
        } else if (data.contactNotFound && data.extraction) {
          addMessage("assistant", responseText, {
            contactNotFound: data.contactNotFound,
            extraction: data.extraction,
          });
        } else if (data.invoiceCreated) {
          addMessage("assistant", responseText, { invoiceCreated: true });
        } else if (data.contactDraft) {
          addMessage("assistant", responseText, { contactDraft: data.contactDraft });
        } else if (data.accountDraft) {
          addMessage("assistant", responseText, { accountDraft: data.accountDraft });
        } else if (data.productDraft) {
          addMessage("assistant", responseText, { productDraft: data.productDraft });
        } else if (data.productCategoryDraft) {
          addMessage("assistant", responseText, { productCategoryDraft: data.productCategoryDraft });
        } else if (data.currencyDraft) {
          addMessage("assistant", responseText, { currencyDraft: data.currencyDraft });
        } else if (data.taxCodeDraft) {
          addMessage("assistant", responseText, { taxCodeDraft: data.taxCodeDraft });
        } else if (data.tariffCodeDraft) {
          addMessage("assistant", responseText, { tariffCodeDraft: data.tariffCodeDraft });
        } else if (data.taxEntityDraft) {
          addMessage("assistant", responseText, { taxEntityDraft: data.taxEntityDraft });
        } else if (data.createDraftApproved) {
          addMessage("assistant", responseText, { createDraftApproved: true });
        } else {
          addMessage("assistant", responseText);
        }
      } catch {
        const fallback = "Network error. Please check your connection and try again.";
        setError(fallback);
        addMessage("assistant", fallback);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [addMessage, isLoading, pageContext, lastDraft, lastCreateDraft, lastPendingCustomer]
  );

  const draftToInvoicePayload = useCallback((draft: InvoiceDraft) => ({
    contactId: draft.contactId,
    date: draft.date,
    dueDate: draft.dueDate,
    notes: draft.notes || undefined,
    lines: draft.lineItems.map((line) => ({
      itemName: line.description,
      itemCode: "",
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.amount / line.quantity,
      discount: 0,
      taxRate: line.taxRate ?? draft.taxRateDefault,
    })),
  }), []);

  const handleApproveDraft = useCallback(
    async (draft: InvoiceDraft) => {
      setIsApproving(true);
      try {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftToInvoicePayload(draft)),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error || "Failed to create invoice");
          addMessage("assistant", data?.error || "Failed to save the invoice. Try again or create it from the Invoices page.");
          return;
        }
        toast.success(`Invoice ${data.invoiceNo ?? ""} created`);
        addMessage("assistant", `Invoice **${data.invoiceNo ?? draft.invoiceNo}** has been created. You can view or send it from the Invoices page.`, { invoiceCreated: true });
        setMessages((prev) =>
          prev.map((m) => (m.invoiceDraft ? { ...m, invoiceDraft: undefined } : m))
        );
      } catch {
        toast.error("Network error");
        addMessage("assistant", "Couldn't save the invoice. Please try again.");
      } finally {
        setIsApproving(false);
      }
    },
    [addMessage, draftToInvoicePayload]
  );

  const handleCancelDraft = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, invoiceDraft: undefined } : m))
    );
    addMessage("assistant", "Draft cancelled. You can create a new invoice anytime by asking in the chat.");
  }, [addMessage]);

  const handleApproveCreateDraft = useCallback(
    async (draft: AnyCreateDraft) => {
      setIsApproving(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "approve",
            currentCreateDraft: draft,
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
        const responseText = typeof data?.response === "string" ? data.response : "Saved.";
        if (!res.ok) {
          toast.error(data?.error || "Failed to save");
          addMessage("assistant", data?.response || responseText);
          return;
        }
        toast.success("Created successfully");
        addMessage("assistant", responseText, { createDraftApproved: true });
        setMessages((prev) =>
          prev.map((m) => {
            const d = getCreateDraftFromMessage(m);
            if (!d) return m;
            return { ...m, contactDraft: undefined, accountDraft: undefined, productDraft: undefined, productCategoryDraft: undefined, currencyDraft: undefined, taxCodeDraft: undefined, tariffCodeDraft: undefined, taxEntityDraft: undefined };
          })
        );
      } catch {
        toast.error("Network error");
        addMessage("assistant", "Couldn't save. Please try again.");
      } finally {
        setIsApproving(false);
      }
    },
    [addMessage, pageContext]
  );

  const handleCancelCreateDraft = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              contactDraft: undefined,
              accountDraft: undefined,
              productDraft: undefined,
              productCategoryDraft: undefined,
              currencyDraft: undefined,
              taxCodeDraft: undefined,
              tariffCodeDraft: undefined,
              taxEntityDraft: undefined,
            }
          : m
      )
    );
    addMessage("assistant", "Cancelled. You can create one anytime by asking in the chat.");
  }, [addMessage]);

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
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            className="min-h-0"
            onApproveDraft={handleApproveDraft}
            onCancelDraft={handleCancelDraft}
            onApproveCreateDraft={handleApproveCreateDraft}
            onCancelCreateDraft={handleCancelCreateDraft}
            isApproving={isApproving}
          />
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
