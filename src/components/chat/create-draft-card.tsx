"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { AnyCreateDraft } from "@/lib/ai/chat-create-types";

interface CreateDraftCardProps {
  draft: AnyCreateDraft;
  onApprove: () => void;
  onCancel: () => void;
  isApproving?: boolean;
}

function DraftSummary({ draft }: { draft: AnyCreateDraft }) {
  switch (draft.draftType) {
    case "contact":
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{draft.name}</p>
          {draft.email && <p className="text-muted-foreground text-xs">{draft.email}</p>}
          {draft.phone && <p className="text-muted-foreground text-xs">{draft.phone}</p>}
          <p className="text-xs capitalize text-muted-foreground">{draft.type?.toLowerCase()}</p>
        </div>
      );
    case "account":
      return (
        <div className="space-y-0.5 text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> — {draft.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{draft.type?.toLowerCase()}</p>
        </div>
      );
    case "product":
      return (
        <div className="space-y-0.5 text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> — {draft.name}</p>
          {(draft.defaultPrice != null && draft.defaultPrice > 0) && (
            <p className="text-xs text-muted-foreground">RM {draft.defaultPrice.toFixed(2)}</p>
          )}
        </div>
      );
    case "productCategory":
      return (
        <div className="text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> — {draft.name}</p>
        </div>
      );
    case "currency":
      return (
        <div className="text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> {draft.symbol} — {draft.name}</p>
          {draft.exchangeRate != null && draft.exchangeRate !== 1 && (
            <p className="text-xs text-muted-foreground">Rate: {draft.exchangeRate}</p>
          )}
        </div>
      );
    case "taxCode":
      return (
        <div className="text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> — {draft.description}</p>
          <p className="text-xs text-muted-foreground">{draft.rate}%</p>
        </div>
      );
    case "tariffCode":
      return (
        <div className="text-sm">
          <p><span className="font-mono font-medium">{draft.code}</span> — {draft.description}</p>
        </div>
      );
    case "taxEntity":
      return (
        <div className="space-y-0.5 text-sm">
          <p className="font-medium">{draft.entityName}</p>
          {(draft.tin || draft.brn) && (
            <p className="text-xs text-muted-foreground">{[draft.tin, draft.brn].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      );
    default:
      return null;
  }
}

const TYPE_LABEL: Record<string, string> = {
  contact: "Contact",
  account: "Account",
  product: "Product",
  productCategory: "Category",
  currency: "Currency",
  taxCode: "Tax code",
  tariffCode: "Tariff code",
  taxEntity: "Tax entity",
};

export function CreateDraftCard({
  draft,
  onApprove,
  onCancel,
  isApproving,
}: CreateDraftCardProps) {
  const label = TYPE_LABEL[draft.draftType] ?? draft.draftType;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="border-b bg-muted/50 px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          New {label}
        </p>
        <DraftSummary draft={draft} />
      </div>
      <div className="flex gap-2 p-3 border-t bg-muted/30">
        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={onApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </span>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Approve & save
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
