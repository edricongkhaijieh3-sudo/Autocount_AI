"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart as PieIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExpenseItem {
  name: string;
  amount: number;
  percentage: number;
}

interface ExpensesWidgetProps {
  expenses: ExpenseItem[];
  total: number;
}

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{d.name}</p>
      <p className="text-emerald-600 font-semibold">{fmt(d.amount)}</p>
      <p className="text-muted-foreground">{d.percentage}% of total</p>
    </div>
  );
}

// Generate gradient colors from warm to cool
const BAR_COLORS = [
  "#F43F5E", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
];

export function ExpensesWidget({ expenses, total }: ExpensesWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Top Expenses</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">Total: {fmt(total)}</span>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No expense data for this period
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={expenses}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20} fill="#F43F5E">
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
