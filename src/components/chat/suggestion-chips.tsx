"use client";

import {
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  HelpCircle,
  ClipboardList,
  Calculator,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Suggestion {
  text: string;
  icon: LucideIcon;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { text: "Total sales this month", icon: DollarSign },
  { text: "Outstanding invoices", icon: FileText },
  { text: "Top 5 customers", icon: Users },
  { text: "Monthly expenses", icon: TrendingUp },
];

const PAGE_SUGGESTIONS: Record<string, Suggestion[]> = {
  "invoices/new": [
    { text: "What payment terms should I use?", icon: HelpCircle },
    { text: "How do I add tax to this invoice?", icon: Calculator },
    { text: "What's the customer's last invoice?", icon: FileText },
    { text: "Help me fill in this invoice", icon: ClipboardList },
  ],
  invoices: [
    { text: "Which invoices are overdue?", icon: FileText },
    { text: "Total outstanding amount", icon: DollarSign },
    { text: "Revenue breakdown by month", icon: TrendingUp },
    { text: "Customers with unpaid invoices", icon: Users },
  ],
  contacts: [
    { text: "Who are my top customers?", icon: Users },
    { text: "Customers with highest credit limit", icon: DollarSign },
    { text: "How do I add a new supplier?", icon: HelpCircle },
    { text: "Contacts without email addresses", icon: ClipboardList },
  ],
  products: [
    { text: "What are my best-selling products?", icon: Package },
    { text: "Products without a category", icon: ClipboardList },
    { text: "How do product variants work?", icon: HelpCircle },
    { text: "Average product price", icon: DollarSign },
  ],
  accounts: [
    { text: "What's my trial balance?", icon: Calculator },
    { text: "Revenue vs expenses this month", icon: TrendingUp },
    { text: "How should I categorize this expense?", icon: HelpCircle },
    { text: "Account balances summary", icon: DollarSign },
  ],
  journal: [
    { text: "Recent journal entries", icon: FileText },
    { text: "How do I record a payment?", icon: HelpCircle },
    { text: "Total debits this month", icon: Calculator },
    { text: "Entries for a specific account", icon: ClipboardList },
  ],
  dashboard: [
    { text: "How's my business doing this month?", icon: TrendingUp },
    { text: "Total revenue year-to-date", icon: DollarSign },
    { text: "Upcoming overdue invoices", icon: FileText },
    { text: "Cash flow summary", icon: Calculator },
  ],
  reports: [
    { text: "Generate profit & loss summary", icon: TrendingUp },
    { text: "Aged receivables breakdown", icon: FileText },
    { text: "Expense categories breakdown", icon: Calculator },
    { text: "Monthly revenue trend", icon: DollarSign },
  ],
};

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
  currentPage?: string;
  currentAction?: string;
  className?: string;
}

export function SuggestionChips({
  onSelect,
  currentPage,
  currentAction,
  className,
}: SuggestionChipsProps) {
  // Pick the most specific suggestions available
  const key = currentAction || currentPage || "dashboard";
  const suggestions = PAGE_SUGGESTIONS[key] || DEFAULT_SUGGESTIONS;

  return (
    <div className={cn("grid grid-cols-1 gap-2", className)}>
      {suggestions.map(({ text, icon: Icon }) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          className="flex items-center gap-2.5 rounded-lg border bg-muted/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
        >
          <Icon className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="line-clamp-2">{text}</span>
        </button>
      ))}
    </div>
  );
}
