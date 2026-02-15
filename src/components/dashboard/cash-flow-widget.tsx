"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CashFlowData {
  month: string;
  moneyIn: number;
  moneyOut: number;
  netCash: number;
}

interface CashFlowWidgetProps {
  data: CashFlowData[];
  revenueThisMonth: number;
  revenueChange: number;
}

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function CashFlowWidget({ data, revenueThisMonth, revenueChange }: CashFlowWidgetProps) {
  const isPositive = revenueChange >= 0;

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Cash Flow Trend</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={isPositive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
            }
          >
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isPositive ? "+" : ""}{revenueChange}% vs last month
          </Badge>
        </div>
        <div className="mt-1">
          <span className="text-3xl font-bold">{fmt(revenueThisMonth)}</span>
          <span className="text-sm text-muted-foreground ml-2">revenue this month</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="moneyIn" name="Money In" fill="#10B981" radius={[3, 3, 0, 0]} barSize={24} />
              <Bar dataKey="moneyOut" name="Money Out" fill="#F43F5E" radius={[3, 3, 0, 0]} barSize={24} />
              <Line
                type="monotone"
                dataKey="netCash"
                name="Net Cash"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={{ fill: "#6366F1", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
