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
} from "lucide-react";

interface DashboardStats {
  revenueThisMonth: number;
  outstandingReceivables: number;
  activeCustomers: number;
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
  monthlyRevenue: { month: string; revenue: number }[];
}

const statusBadgeVariants: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SENT: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-800 border-slate-200",
};

function formatAmount(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
          if (res.status === 401) {
            setError("Please sign in to view the dashboard.");
            return;
          }
          throw new Error("Failed to load stats");
        }
        const data = await res.json();
        setStats(data);
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
          <p className="text-muted-foreground">
            Loading your business overview...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-destructive">{error ?? "Failed to load dashboard."}</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(
    ...stats.monthlyRevenue.map((m) => m.revenue),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to AutoCount. Here is an overview of your business.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats.revenueThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats.outstandingReceivables)}
            </div>
            <p className="text-xs text-muted-foreground">Receivables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">Active contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueInvoices.count}</div>
            <p className="text-xs text-muted-foreground">Invoices past due</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue (Last 6 Months)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paid invoices by month
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-2">
            {stats.monthlyRevenue.map(({ month, revenue }) => (
              <div key={month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full min-w-0 rounded-t bg-primary/80 transition-all"
                  style={{
                    height: `${Math.max((revenue / maxRevenue) * 100, 4)}%`,
                  }}
                />
                <span className="text-xs text-muted-foreground">{month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices yet. Create your first invoice from the Invoices page.
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
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.contactName}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell>{formatAmount(inv.total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            statusBadgeVariants[inv.status] ?? "bg-muted"
                          }
                        >
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

        {/* Overdue invoices alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Overdue Invoices
            </CardTitle>
            {stats.overdueInvoices.count > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/invoices?status=OVERDUE">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {stats.overdueInvoices.count === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue invoices. Great job staying on top of payments!
              </p>
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
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
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
