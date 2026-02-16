"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ReceivablesAging {
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

interface OverdueItem {
  id: string;
  invoiceNo: string;
  dueDate: string;
  total: number;
  contactName: string;
}

interface OutstandingWidgetProps {
  receivables: ReceivablesAging;
  overdueList: OverdueItem[];
}

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

const AGING_SEGMENTS = [
  { key: "current", label: "Current", color: "#10B981" },
  { key: "days31to60", label: "31-60 days", color: "#F59E0B" },
  { key: "days61to90", label: "61-90 days", color: "#F97316" },
  { key: "over90", label: "90+ days", color: "#EF4444" },
] as const;

export function OutstandingWidget({
  receivables,
  overdueList,
}: OutstandingWidgetProps) {
  const hasData = receivables.total > 0;
  const segments = AGING_SEGMENTS.map((seg) => ({
    ...seg,
    value: receivables[seg.key],
    pct: hasData
      ? Math.round((receivables[seg.key] / receivables.total) * 100)
      : 0,
  })).filter((s) => s.value > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
          Invoices
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {fmt(receivables.total)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Total outstanding</p>
      </div>

      {/* Aging Bar */}
      {hasData && (
        <div className="mb-5">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
            {segments.map((seg) => (
              <div
                key={seg.key}
                className="h-full transition-all duration-500"
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                  minWidth: seg.pct > 0 ? "4px" : "0",
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-gray-400">{seg.label}</span>
                <span className="font-medium text-gray-600">{seg.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue List */}
      <div className="border-t border-gray-50 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500">
            Overdue ({overdueList.length})
          </span>
          {overdueList.length > 0 && (
            <Link
              href="/invoices?status=OVERDUE"
              className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {overdueList.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No overdue invoices
          </p>
        ) : (
          <div className="space-y-2">
            {overdueList.slice(0, 4).map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {inv.contactName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {inv.invoiceNo} &middot; Due {fmtDate(inv.dueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-500 ml-3 shrink-0">
                  {fmt(inv.total)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
