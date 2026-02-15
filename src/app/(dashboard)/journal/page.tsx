"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  description: string | null;
  debit: number;
  credit: number;
  account: Account;
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  description: string | null;
  reference: string | null;
  lines: JournalLine[];
}

interface JournalLineForm {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const formatAmount = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lines, setLines] = useState<JournalLineForm[]>([
    { accountId: "", description: "", debit: "", credit: "" },
  ]);
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/journal?${params}`);
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, [dateFrom, dateTo]);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { accountId: "", description: "", debit: "", credit: "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLineForm, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit) || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const resetForm = () => {
    setLines([{ accountId: "", description: "", debit: "", credit: "" }]);
    setFormDescription("");
    setFormReference("");
    setFormDate(new Date().toISOString().slice(0, 10));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Total debits must equal total credits");
      return;
    }
    const validLines = lines.filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length === 0) {
      toast.error("Add at least one line with an account and amount");
      return;
    }
    const payload = {
      date: formDate,
      description: formDescription || null,
      reference: formReference || null,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        description: l.description || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
    };
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Journal entry created");
      setDialogOpen(false);
      resetForm();
      fetchEntries();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create journal entry");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this journal entry?")) return;
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Journal entry deleted");
      fetchEntries();
    } else {
      toast.error("Failed to delete journal entry");
    }
  }

  const getEntryTotals = (entry: JournalEntry) => {
    const debit = entry.lines.reduce((s, l) => s + l.debit, 0);
    const credit = entry.lines.reduce((s, l) => s + l.credit, 0);
    return { debit, credit };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Journal Entries
          </h1>
          <p className="text-muted-foreground">
            General ledger journal entries
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (optional)</Label>
                  <Input
                    id="reference"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    placeholder="Ref-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Entry description"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-3 w-3" /> Add Line
                  </Button>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px] text-right">Debit</TableHead>
                        <TableHead className="w-[100px] text-right">Credit</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select
                              value={line.accountId}
                              onValueChange={(v) => updateLine(i, "accountId", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code} - {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) =>
                                updateLine(i, "description", e.target.value)
                              }
                              placeholder="Line description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debit}
                              onChange={(e) => updateLine(i, "debit", e.target.value)}
                              className="text-right"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.credit}
                              onChange={(e) => updateLine(i, "credit", e.target.value)}
                              className="text-right"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeLine(i)}
                              disabled={lines.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-4 text-sm">
                  <span>
                    Total Debit: <strong>{formatAmount(totalDebit)}</strong>
                  </span>
                  <span>
                    Total Credit: <strong>{formatAmount(totalCredit)}</strong>
                  </span>
                  {!isBalanced && (
                    <Badge variant="destructive">Not balanced</Badge>
                  )}
                  {isBalanced && totalDebit > 0 && (
                    <Badge variant="secondary">Balanced</Badge>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!isBalanced || totalDebit === 0}>
                Create Journal Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Date range filter</CardTitle>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading journal entries...</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Total Debit</TableHead>
                  <TableHead className="text-right">Total Credit</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No journal entries yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const { debit, credit } = getEntryTotals(entry);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {entry.entryNo}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {entry.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(credit)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
