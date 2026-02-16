"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { InvoicePreviewCard } from "./invoice-preview-card";
import { CreateDraftCard } from "./create-draft-card";
import type { InvoiceDraft, InvoiceExtraction } from "@/lib/ai/invoice-draft";
import type { AnyCreateDraft } from "@/lib/ai/chat-create-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  invoiceDraft?: InvoiceDraft;
  invoiceCreated?: boolean;
  /** When set, next user reply can be "Yes, add them" to create customer then invoice. */
  contactNotFound?: string;
  extraction?: InvoiceExtraction;
  contactDraft?: AnyCreateDraft;
  accountDraft?: AnyCreateDraft;
  productDraft?: AnyCreateDraft;
  productCategoryDraft?: AnyCreateDraft;
  currencyDraft?: AnyCreateDraft;
  taxCodeDraft?: AnyCreateDraft;
  tariffCodeDraft?: AnyCreateDraft;
  taxEntityDraft?: AnyCreateDraft;
  createDraftApproved?: boolean;
}

function getCreateDraft(msg: ChatMessage): AnyCreateDraft | undefined {
  return msg.contactDraft ?? msg.accountDraft ?? msg.productDraft ?? msg.productCategoryDraft
    ?? msg.currencyDraft ?? msg.taxCodeDraft ?? msg.tariffCodeDraft ?? msg.taxEntityDraft;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  className?: string;
  onApproveDraft?: (draft: InvoiceDraft) => void;
  onCancelDraft?: (messageId: string) => void;
  onApproveCreateDraft?: (draft: AnyCreateDraft) => void;
  onCancelCreateDraft?: (messageId: string) => void;
  isApproving?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
      </span>
    </div>
  );
}

export function ChatMessages({
  messages,
  isLoading,
  className,
  onApproveDraft,
  onCancelDraft,
  onApproveCreateDraft,
  onCancelCreateDraft,
  isApproving,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="flex flex-col gap-3 p-4">
        {messages.map((msg) => {
          const createDraft = getCreateDraft(msg);
          return (
            <div key={msg.id} className="flex flex-col gap-2 max-w-full">
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
              {msg.role === "assistant" && msg.invoiceDraft && (
                <div className="mr-auto max-w-[85%] w-full min-w-0">
                  <InvoicePreviewCard
                    draft={msg.invoiceDraft}
                    onApprove={() => onApproveDraft?.(msg.invoiceDraft!)}
                    onCancel={() => onCancelDraft?.(msg.id)}
                    isApproving={isApproving}
                  />
                </div>
              )}
              {msg.role === "assistant" && createDraft && (
                <div className="mr-auto max-w-[85%] w-full min-w-0">
                  <CreateDraftCard
                    draft={createDraft}
                    onApprove={() => onApproveCreateDraft?.(createDraft)}
                    onCancel={() => onCancelCreateDraft?.(msg.id)}
                    isApproving={isApproving}
                  />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="mr-auto rounded-lg bg-muted px-3 py-2">
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
