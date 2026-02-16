"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
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
  if (n >= 1000000) return `RM ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `RM ${(n / 1000).toFixed(1)}K`;
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}</span>
          </div>
          <span className="font-medium text-gray-900">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowWidget({
  data,
  revenueThisMonth,
  revenueChange,
}: CashFlowWidgetProps) {
  const isPositive = revenueChange >= 0;

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            Sales Overview
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {fmt(revenueThisMonth)}
            </span>
            {revenueChange !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositive ? "+" : ""}
                {revenueChange}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Revenue this month</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Money In
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            Money Out
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: 224, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={224}>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
          >
            <defs>
              <linearGradient id="moneyInGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v) =>
                v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`
              }
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="moneyIn"
              name="Money In"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              barSize={20}
              fillOpacity={0.8}
            />
            <Bar
              dataKey="moneyOut"
              name="Money Out"
              fill="#F43F5E"
              radius={[4, 4, 0, 0]}
              barSize={20}
              fillOpacity={0.6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
