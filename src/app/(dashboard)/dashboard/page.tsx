"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  ArrowRight,
  Plus,
} from "lucide-react";

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
  cashFlow: { month: string; moneyIn: number; moneyOut: number; netCash: number }[];
  receivablesAging: {
    current: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
  plThisMonth: { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number };
  plYTD: { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number };
  topExpenses: { name: string; amount: number; percentage: number }[];
  totalExpenses: number;
}

const statusBadgeVariants: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SENT: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-200",
};

function formatAmount(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) {
          if (res.status === 401) { setError("Please sign in to view the dashboard."); return; }
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your business overview...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-8 w-32 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-destructive">{error ?? "Failed to load dashboard."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your business at a glance</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new"><Plus className="mr-2 h-4 w-4" /> New Invoice</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.revenueThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              This month
              {stats.revenueChange !== 0 && (
                <span className={stats.revenueChange > 0 ? " text-emerald-600" : " text-rose-600"}>
                  {" "}({stats.revenueChange > 0 ? "+" : ""}{stats.revenueChange}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.outstandingReceivables)}</div>
            <p className="text-xs text-muted-foreground">Receivables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">Active contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdueInvoices.count > 0 ? "text-rose-600" : ""}`}>
              {stats.overdueInvoices.count}
            </div>
            <p className="text-xs text-muted-foreground">Invoices past due</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Cash Flow (2/3) + Watchlist (1/3) */}
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

      {/* Row 2: P&L (1/2) + Expenses (1/2) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitLossWidget
          thisMonth={stats.plThisMonth}
          ytd={stats.plYTD}
        />
        <ExpensesWidget
          expenses={stats.topExpenses}
          total={stats.totalExpenses}
        />
      </div>

      {/* Row 3: Recent Invoices + Overdue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-primary hover:underline">Create your first invoice</Link>
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">{inv.invoiceNo}</Link>
                      </TableCell>
                      <TableCell>{inv.contactName}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell>{formatAmount(inv.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeVariants[inv.status] ?? "bg-muted"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Overdue Invoices
            </CardTitle>
            {stats.overdueInvoices.count > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/invoices?status=OVERDUE">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {stats.overdueInvoices.count === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue invoices. Great job staying on top of payments!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.overdueInvoices.list.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">{inv.invoiceNo}</Link>
                      </TableCell>
                      <TableCell>{inv.contactName}</TableCell>
                      <TableCell>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell>{formatAmount(inv.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
