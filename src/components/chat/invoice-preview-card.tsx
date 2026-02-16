"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { InvoiceDraft } from "@/lib/ai/invoice-draft";

interface InvoicePreviewCardProps {
  draft: InvoiceDraft;
  onApprove: () => void;
  onCancel: () => void;
  isApproving?: boolean;
}

function formatMoney(amount: number, currency: string = "MYR"): string {
  const symbol = currency === "MYR" ? "RM" : currency;
  return `${symbol} ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePreviewCard({
  draft,
  onApprove,
  onCancel,
  isApproving,
}: InvoicePreviewCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="border-b bg-muted/50 px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Invoice draft · {draft.invoiceNo}
        </p>
        <p className="font-medium text-sm mt-0.5">{draft.contactName}</p>
      </div>
      <div className="p-3 space-y-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left border-b text-xs uppercase">
              <th className="pb-1.5 font-medium">Description</th>
              <th className="pb-1.5 font-medium text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            {draft.lineItems.map((line, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5">
                  {line.description}
                  {line.quantity !== 1 && (
                    <span className="text-muted-foreground ml-1">× {line.quantity}</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {formatMoney(line.amount * line.quantity, draft.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col gap-0.5 pt-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(draft.subtotal, draft.currency)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({draft.taxRateDefault}%)</span>
            <span>{formatMoney(draft.taxTotal, draft.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
            <span>Total</span>
            <span>{formatMoney(draft.total, draft.currency)}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Due {new Date(draft.dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
        </p>
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
