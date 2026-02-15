"use client";

import { DollarSign, FileText, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { text: "Total sales this month", icon: DollarSign },
  { text: "Outstanding invoices", icon: FileText },
  { text: "Top 5 customers", icon: Users },
  { text: "Monthly expenses", icon: TrendingUp },
] as const;

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
  className?: string;
}

export function SuggestionChips({ onSelect, className }: SuggestionChipsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2",
        className
      )}
    >
      {SUGGESTIONS.map(({ text, icon: Icon }) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="line-clamp-2">{text}</span>
        </button>
      ))}
    </div>
  );
}
