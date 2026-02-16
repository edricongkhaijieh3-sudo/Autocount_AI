"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CashFlowWidget } from "@/components/dashboard/cash-flow-widget";
import { OutstandingWidget } from "@/components/dashboard/outstanding-widget";
import { ProfitLossWidget } from "@/components/dashboard/profit-loss-widget";
import { ExpensesWidget } from "@/components/dashboard/expenses-widget";

interface DashboardStats {
  revenueThisMonth: number;
  outstandingReceivables: number;
  activeCustomers: number;
  revenueChange: number;
  overdueInvoices: {
    count: number;
    list: {
      id: string;
      invoiceNo: string;
      dueDate: string;
      total: number;
      contactName: string;
      status: string;
    }[];
  };
  recentInvoices: {
    id: string;
    invoiceNo: string;
    date: string;
    dueDate: string;
    total: number;
    status: string;
    contactName: string;
  }[];
  cashFlow: {
    month: string;
    moneyIn: number;
    moneyOut: number;
    netCash: number;
  }[];
  receivablesAging: {
    current: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
  plThisMonth: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
  plYTD: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
  topExpenses: { name: string; amount: number; percentage: number }[];
  totalExpenses: number;
}

function formatAmount(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactAmount(amount: number): string {
  if (amount >= 1000000)
    return `RM ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `RM ${(amount / 1000).toFixed(1)}K`;
  return `RM ${amount.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-50 text-blue-600",
  PAID: "bg-emerald-50 text-emerald-600",
  OVERDUE: "bg-red-50 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Please sign in to view the dashboard.");
            return;
          }
          throw new Error("Failed to load stats");
        }
        setStats(await res.json());
      } catch {
        setError("Failed to load dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Loading your business overview...
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
            >
              <div className="h-3 w-20 rounded bg-gray-100 mb-4" />
              <div className="h-7 w-28 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <p className="text-red-600 text-sm">
            {error ?? "Failed to load dashboard."}
          </p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Sales",
      sublabel: "This month",
      value: formatCompactAmount(stats.revenueThisMonth),
      change: stats.revenueChange,
      color: "emerald" as const,
    },
    {
      label: "Outstanding",
      sublabel: "Receivables",
      value: formatCompactAmount(stats.outstandingReceivables),
      change: null,
      color: "amber" as const,
    },
    {
      label: "Overdue",
      sublabel: `${stats.overdueInvoices.count} invoices`,
      value: formatCompactAmount(
        stats.overdueInvoices.list.reduce((sum, inv) => sum + inv.total, 0)
      ),
      change: null,
      color: "red" as const,
    },
    {
      label: "Net Profit",
      sublabel: "This month",
      value: formatCompactAmount(stats.plThisMonth.netProfit),
      change: null,
      color: "blue" as const,
    },
  ];

  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      icon: "bg-emerald-100",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      icon: "bg-amber-100",
    },
    red: { bg: "bg-red-50", text: "text-red-600", icon: "bg-red-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your business at a glance
          </p>
        </div>
        <Button
          asChild
          className="rounded-xl bg-gray-900 text-white hover:bg-gray-800 shadow-none"
        >
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* KPI Summary Row */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const c = colorMap[kpi.color];
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  {kpi.label}
                </span>
                {kpi.change !== null && kpi.change !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                      kpi.change > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {kpi.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(kpi.change)}%
                  </span>
                )}
              </div>
              <div className={`text-2xl font-bold ${c.text}`}>{kpi.value}</div>
              <p className="text-xs text-gray-400 mt-1">{kpi.sublabel}</p>
            </div>
          );
        })}
      </div>

      {/* Row 2: Sales Chart + Invoices */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CashFlowWidget
          data={stats.cashFlow}
          revenueThisMonth={stats.revenueThisMonth}
          revenueChange={stats.revenueChange}
        />
        <OutstandingWidget
          receivables={stats.receivablesAging}
          overdueList={stats.overdueInvoices.list}
        />
      </div>

      {/* Row 3: P&L + Expenses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitLossWidget thisMonth={stats.plThisMonth} ytd={stats.plYTD} />
        <ExpensesWidget
          expenses={stats.topExpenses}
          total={stats.totalExpenses}
        />
      </div>

      {/* Row 4: Recent Invoices */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent Invoices
          </h2>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            <Link href="/invoices">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="px-6 py-2">
          {stats.recentInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No invoices yet</p>
              <Button asChild variant="outline" size="sm" className="mt-3 rounded-lg">
                <Link href="/invoices/new">Create your first invoice</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left py-3 font-medium">Invoice</th>
                  <th className="text-left py-3 font-medium">Customer</th>
                  <th className="text-left py-3 font-medium">Date</th>
                  <th className="text-right py-3 font-medium">Amount</th>
                  <th className="text-right py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentInvoices.slice(0, 5).map((inv) => (
                  <tr
                    key={inv.id}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="py-3.5 text-sm text-gray-500">
                      {inv.contactName}
                    </td>
                    <td className="py-3.5 text-sm text-gray-400">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3.5 text-sm font-medium text-gray-900 text-right">
                      {formatAmount(inv.total)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                          statusColors[inv.status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
