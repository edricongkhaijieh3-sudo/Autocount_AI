"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  FileSpreadsheet,
  Clock,
  Loader2,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

// ── Types ────────────────────────────────────────────────────

interface PLData {
  revenue: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

interface BSData {
  assets: { code: string; name: string; balance: number }[];
  liabilities: { code: string; name: string; balance: number }[];
  equity: { code: string; name: string; balance: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface TBData {
  accounts: { code: string; name: string; type: string; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
}

interface ARData {
  customers: { name: string; current: number; days31to60: number; days61to90: number; over90: number; total: number }[];
  grandTotal: number;
}

interface APData {
  vendors: { name: string; current: number; days31to60: number; days61to90: number; over90: number; total: number }[];
  grandTotal: number;
}

// ── Component ────────────────────────────────────────────────

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(startOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState("");

  const [pl, setPL] = useState<PLData | null>(null);
  const [bs, setBS] = useState<BSData | null>(null);
  const [tb, setTB] = useState<TBData | null>(null);
  const [ar, setAR] = useState<ARData | null>(null);
  const [ap, setAP] = useState<APData | null>(null);

  async function fetchReport(type: string) {
    setLoading(type);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const res = await fetch(`/api/reports/${type}${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      switch (type) {
        case "profit-loss": setPL(data); break;
        case "balance-sheet": setBS(data); break;
        case "trial-balance": setTB(data); break;
        case "aged-receivables": setAR(data); break;
        case "aged-payables": setAP(data); break;
      }
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">
          Generate and view accounting reports
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="profit-loss">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profit-loss" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">P&L</span>
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-1.5">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Balance Sheet</span>
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Trial Balance</span>
          </TabsTrigger>
          <TabsTrigger value="aged-receivables" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">AR Aging</span>
          </TabsTrigger>
          <TabsTrigger value="aged-payables" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">AP Aging</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Profit & Loss ── */}
        <TabsContent value="profit-loss" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Profit & Loss Statement</h2>
            <Button onClick={() => fetchReport("profit-loss")} disabled={loading === "profit-loss"}>
              {loading === "profit-loss" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>
          {pl && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">{fmt(pl.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">{fmt(pl.totalExpenses)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${pl.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(pl.netProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" /> Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pl.revenue.map((r) => (
                        <TableRow key={r.code}>
                          <TableCell className="font-mono">{r.code}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-right">{fmt(r.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={2}>Total Revenue</TableCell>
                        <TableCell className="text-right">{fmt(pl.totalRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" /> Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pl.expenses.map((e) => (
                        <TableRow key={e.code}>
                          <TableCell className="font-mono">{e.code}</TableCell>
                          <TableCell>{e.name}</TableCell>
                          <TableCell className="text-right">{fmt(e.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={2}>Total Expenses</TableCell>
                        <TableCell className="text-right">{fmt(pl.totalExpenses)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
          {!pl && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Click <strong>Generate</strong> to view the Profit &amp; Loss report
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Balance Sheet ── */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Balance Sheet</h2>
            <Button onClick={() => fetchReport("balance-sheet")} disabled={loading === "balance-sheet"}>
              {loading === "balance-sheet" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>
          {bs && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-2xl font-bold">{fmt(bs.totalAssets)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-2xl font-bold">{fmt(bs.totalLiabilities)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-2xl font-bold">{fmt(bs.totalEquity)}</p></CardContent>
                </Card>
              </div>

              {[
                { title: "Assets", items: bs.assets, total: bs.totalAssets },
                { title: "Liabilities", items: bs.liabilities, total: bs.totalLiabilities },
                { title: "Equity", items: bs.equity, total: bs.totalEquity },
              ].map((section) => (
                <Card key={section.title}>
                  <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.items.map((a) => (
                          <TableRow key={a.code}>
                            <TableCell className="font-mono">{a.code}</TableCell>
                            <TableCell>{a.name}</TableCell>
                            <TableCell className="text-right">{fmt(a.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={2}>Total {section.title}</TableCell>
                          <TableCell className="text-right">{fmt(section.total)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!bs && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Click <strong>Generate</strong> to view the Balance Sheet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Trial Balance ── */}
        <TabsContent value="trial-balance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Trial Balance</h2>
            <Button onClick={() => fetchReport("trial-balance")} disabled={loading === "trial-balance"}>
              {loading === "trial-balance" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>
          {tb && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tb.accounts.map((a) => (
                      <TableRow key={a.code}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{a.type}</span>
                        </TableCell>
                        <TableCell className="text-right">{a.debit > 0 ? fmt(a.debit) : "—"}</TableCell>
                        <TableCell className="text-right">{a.credit > 0 ? fmt(a.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell colSpan={3}>Totals</TableCell>
                      <TableCell className="text-right">{fmt(tb.totalDebit)}</TableCell>
                      <TableCell className="text-right">{fmt(tb.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {Math.abs(tb.totalDebit - tb.totalCredit) < 0.01 && (
                  <p className="mt-4 text-sm text-green-600 font-medium text-center">
                    Trial Balance is balanced (Debits = Credits)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {!tb && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Click <strong>Generate</strong> to view the Trial Balance
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Aged Receivables ── */}
        <TabsContent value="aged-receivables" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Aged Receivables (AR Aging)</h2>
            <Button onClick={() => fetchReport("aged-receivables")} disabled={loading === "aged-receivables"}>
              {loading === "aged-receivables" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>
          {ar && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">31–60 Days</TableHead>
                      <TableHead className="text-right">61–90 Days</TableHead>
                      <TableHead className="text-right">90+ Days</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ar.customers.map((c) => (
                      <TableRow key={c.name}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">{c.current > 0 ? fmt(c.current) : "—"}</TableCell>
                        <TableCell className="text-right">{c.days31to60 > 0 ? fmt(c.days31to60) : "—"}</TableCell>
                        <TableCell className="text-right">{c.days61to90 > 0 ? fmt(c.days61to90) : "—"}</TableCell>
                        <TableCell className="text-right">{c.over90 > 0 ? fmt(c.over90) : "—"}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(c.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Grand Total</TableCell>
                      <TableCell className="text-right">
                        {fmt(ar.customers.reduce((s, c) => s + c.current, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ar.customers.reduce((s, c) => s + c.days31to60, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ar.customers.reduce((s, c) => s + c.days61to90, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ar.customers.reduce((s, c) => s + c.over90, 0))}
                      </TableCell>
                      <TableCell className="text-right">{fmt(ar.grandTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {ar.customers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No outstanding receivables</p>
                )}
              </CardContent>
            </Card>
          )}
          {!ar && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Click <strong>Generate</strong> to view the Aged Receivables report
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Aged Payables ── */}
        <TabsContent value="aged-payables" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Aged Payables (AP Aging)</h2>
            <Button onClick={() => fetchReport("aged-payables")} disabled={loading === "aged-payables"}>
              {loading === "aged-payables" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </div>
          {ap && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">31–60 Days</TableHead>
                      <TableHead className="text-right">61–90 Days</TableHead>
                      <TableHead className="text-right">90+ Days</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ap.vendors.map((v) => (
                      <TableRow key={v.name}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-right">{v.current > 0 ? fmt(v.current) : "—"}</TableCell>
                        <TableCell className="text-right">{v.days31to60 > 0 ? fmt(v.days31to60) : "—"}</TableCell>
                        <TableCell className="text-right">{v.days61to90 > 0 ? fmt(v.days61to90) : "—"}</TableCell>
                        <TableCell className="text-right">{v.over90 > 0 ? fmt(v.over90) : "—"}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(v.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Grand Total</TableCell>
                      <TableCell className="text-right">
                        {fmt(ap.vendors.reduce((s, v) => s + v.current, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ap.vendors.reduce((s, v) => s + v.days31to60, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ap.vendors.reduce((s, v) => s + v.days61to90, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(ap.vendors.reduce((s, v) => s + v.over90, 0))}
                      </TableCell>
                      <TableCell className="text-right">{fmt(ap.grandTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {ap.vendors.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No outstanding payables</p>
                )}
              </CardContent>
            </Card>
          )}
          {!ap && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Click <strong>Generate</strong> to view the Aged Payables report
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
