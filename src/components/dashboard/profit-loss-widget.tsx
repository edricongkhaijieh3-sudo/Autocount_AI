"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const COLORS: Record<string, string> = {
  Revenue: "#10B981",
  COGS: "#F43F5E",
  "Gross Profit": "#6366F1",
  OpEx: "#F97316",
  "Net Profit": "#0EA5E9",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
      <p className="font-medium">{d.name}</p>
      <p style={{ color: d.color }}>{fmt(d.value)}</p>
    </div>
  );
}

export function ProfitLossWidget({ thisMonth, ytd }: ProfitLossWidgetProps) {
  const [view, setView] = useState<"month" | "ytd">("month");
  const pl = view === "month" ? thisMonth : ytd;

  const data = [
    { name: "Revenue", value: pl.revenue, color: COLORS.Revenue },
    { name: "COGS", value: pl.cogs, color: COLORS.COGS },
    { name: "Gross Profit", value: pl.grossProfit, color: COLORS["Gross Profit"] },
    { name: "OpEx", value: pl.expenses, color: COLORS.OpEx },
    { name: "Net Profit", value: pl.netProfit, color: COLORS["Net Profit"] },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Profit & Loss</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setView("month")}
            >
              This Month
            </Button>
            <Button
              variant={view === "ytd" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setView("ytd")}
            >
              YTD
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Waterfall summary */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-1">
            <span className="text-sm">Revenue</span>
            <span className="text-sm font-bold text-emerald-600">{fmt(pl.revenue)}</span>
          </div>
          <div className="flex justify-between items-center py-1 text-muted-foreground">
            <span className="text-sm flex items-center gap-1"><Minus className="h-3 w-3" /> Cost of Goods</span>
            <span className="text-sm">{fmt(pl.cogs)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t font-medium">
            <span className="text-sm">Gross Profit</span>
            <span className="text-sm text-indigo-600">{fmt(pl.grossProfit)}</span>
          </div>
          <div className="flex justify-between items-center py-1 text-muted-foreground">
            <span className="text-sm flex items-center gap-1"><Minus className="h-3 w-3" /> Operating Expenses</span>
            <span className="text-sm">{fmt(pl.expenses)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t-2 font-bold">
            <span className="text-sm">Net Profit</span>
            <span className={`text-base ${pl.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {fmt(pl.netProfit)}
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
