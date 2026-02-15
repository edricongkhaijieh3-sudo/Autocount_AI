"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Send, CreditCard } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

const COLORS = ["#10B981", "#F59E0B", "#F97316", "#EF4444"];
const LABELS = ["Current", "31-60 Days", "61-90 Days", "90+ Days"];

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
      <p style={{ color: payload[0].payload.fill }}>{payload[0].name}: {fmt(payload[0].value)}</p>
    </div>
  );
}

export function OutstandingWidget({ receivables, overdueList }: OutstandingWidgetProps) {
  const pieData = [
    { name: "Current", value: receivables.current, fill: COLORS[0] },
    { name: "31-60 Days", value: receivables.days31to60, fill: COLORS[1] },
    { name: "61-90 Days", value: receivables.days61to90, fill: COLORS[2] },
    { name: "90+ Days", value: receivables.over90, fill: COLORS[3] },
  ].filter((d) => d.value > 0);

  const hasData = receivables.total > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Outstanding Watchlist</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Receivables Donut */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">RECEIVABLES</p>
            <p className="text-xl font-bold mb-2">{fmt(receivables.total)}</p>
            {hasData ? (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
                No outstanding
              </div>
            )}
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
              {LABELS.map((label, i) => {
                const vals = [receivables.current, receivables.days31to60, receivables.days61to90, receivables.over90];
                if (vals[i] === 0) return null;
                return (
                  <div key={label} className="flex items-center gap-1 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/invoices?status=OVERDUE">
                <Send className="h-3 w-3 mr-1" /> Send Reminders
              </Link>
            </Button>
          </div>

          {/* Overdue Bills */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">OVERDUE BILLS</p>
            <p className="text-xl font-bold mb-2">{overdueList.length} due</p>
            <div className="space-y-2">
              {overdueList.slice(0, 4).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium">{inv.contactName}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoiceNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{fmt(inv.total)}</p>
                      <p className="text-xs text-rose-600">{fmtDate(inv.dueDate)}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {overdueList.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No overdue bills</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/invoices">
                <CreditCard className="h-3 w-3 mr-1" /> View Invoices
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
