"use client";

import { useState } from "react";

interface PLSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

interface ProfitLossWidgetProps {
  thisMonth: PLSummary;
  ytd: PLSummary;
}

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ProfitLossWidget({ thisMonth, ytd }: ProfitLossWidgetProps) {
  const [view, setView] = useState<"month" | "ytd">("month");
  const pl = view === "month" ? thisMonth : ytd;

  const rows = [
    { label: "Income", value: pl.revenue, color: "text-emerald-600", indent: false },
    { label: "Cost of Goods", value: -pl.cogs, color: "text-gray-500", indent: true },
    { label: "Gross Profit", value: pl.grossProfit, color: "text-gray-900", indent: false, border: true },
    { label: "Expenses", value: -pl.expenses, color: "text-gray-500", indent: true },
    { label: "Net Income", value: pl.netProfit, color: pl.netProfit >= 0 ? "text-emerald-600" : "text-red-600", indent: false, border: true, bold: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            Profit & Loss
          </h3>
          <span
            className={`text-3xl font-bold ${
              pl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {fmt(pl.netProfit)}
          </span>
          <p className="text-xs text-gray-400 mt-1">
            Net income {view === "month" ? "this month" : "year to date"}
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              view === "month"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("ytd")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              view === "ytd"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            YTD
          </button>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-3 ${
              row.border ? "border-t border-gray-100" : ""
            }`}
          >
            <span
              className={`text-sm ${row.indent ? "pl-4 text-gray-400" : "text-gray-700"} ${
                row.bold ? "font-semibold" : ""
              }`}
            >
              {row.indent && "- "}
              {row.label}
            </span>
            <span
              className={`text-sm font-medium ${row.color} ${
                row.bold ? "text-base font-bold" : ""
              }`}
            >
              {fmt(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      {/* Visual Bar */}
      {pl.revenue > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-50">
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
            <div
              className="bg-emerald-400 rounded-l-full transition-all duration-500"
              style={{
                width: `${Math.max((pl.grossProfit / pl.revenue) * 100, 0)}%`,
              }}
            />
            <div
              className="bg-amber-400 transition-all duration-500"
              style={{
                width: `${Math.max((pl.cogs / pl.revenue) * 100, 0)}%`,
              }}
            />
            <div
              className="bg-rose-400 rounded-r-full transition-all duration-500"
              style={{
                width: `${Math.max((pl.expenses / pl.revenue) * 100, 0)}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Profit
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              COGS
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              Expenses
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
