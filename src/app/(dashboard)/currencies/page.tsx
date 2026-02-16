"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Coins,
  Star,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  name: "",
  symbol: "",
  exchangeRate: "1.0",
  isBase: false,
};

// ─── Page Component ─────────────────────────────────────────────

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await fetch("/api/currencies");
      const data = await res.json();
      setCurrencies(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredCurrencies = currencies.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Currency code is required");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Currency name is required");
      return;
    }
    if (!form.symbol.trim()) {
      toast.error("Currency symbol is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      exchangeRate: parseFloat(form.exchangeRate) || 1.0,
      isBase: form.isBase,
    };

    const url = editingCurrency
      ? `/api/currencies/${editingCurrency.id}`
      : "/api/currencies";
    const method = editingCurrency ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingCurrency ? "Currency updated" : "Currency created"
        );
        setDialogOpen(false);
        setEditingCurrency(null);
        fetchCurrencies();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save currency");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingCurrency) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/currencies/${deletingCurrency.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Currency deleted");
        setDeleteDialogOpen(false);
        setDeletingCurrency(null);
        fetchCurrencies();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete currency");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(currency: Currency) {
    setEditingCurrency(currency);
    setForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate.toString(),
      isBase: currency.isBase,
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingCurrency(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openDeleteConfirm(currency: Currency) {
    setDeletingCurrency(currency);
    setDeleteDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Currencies
          </h1>
          <p className="text-muted-foreground">
            Manage currencies and exchange rates
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCurrency(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Currency
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingCurrency ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Currency
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Currency
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingCurrency
                  ? "Update the currency details below."
                  : "Add a new currency to your system."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code & Symbol */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. MYR"
                    value={form.code}
                    onChange={(e) =>
                      updateForm({ code: e.target.value.toUpperCase() })
                    }
                    maxLength={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">
                    Symbol <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="symbol"
                    placeholder="e.g. RM"
                    value={form.symbol}
                    onChange={(e) => updateForm({ symbol: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Malaysian Ringgit"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  required
                />
              </div>

              {/* Exchange Rate */}
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Exchange Rate</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="1.0"
                  value={form.exchangeRate}
                  onChange={(e) =>
                    updateForm({ exchangeRate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Rate relative to the base currency. Base currency = 1.0
                </p>
              </div>

              {/* Base Currency Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <div>
                    <Label htmlFor="isBase" className="cursor-pointer">
                      Base Currency
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Set as the default currency for your company
                    </p>
                  </div>
                </div>
                <Switch
                  id="isBase"
                  checked={form.isBase}
                  onCheckedChange={(checked) =>
                    updateForm({ isBase: !!checked })
                  }
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingCurrency
                    ? "Update Currency"
                    : "Create Currency"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Currency List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {currencies.length} {currencies.length === 1 ? "currency" : "currencies"} configured
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <p className="text-muted-foreground">Loading currencies...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20">Symbol</TableHead>
                  <TableHead className="text-right">Exchange Rate</TableHead>
                  <TableHead className="text-center">Base</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCurrencies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery
                        ? "No currencies match your search"
                        : 'No currencies yet — click "Add Currency" to get started'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCurrencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-mono font-medium">
                        {currency.code}
                      </TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {currency.symbol}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {currency.exchangeRate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-center">
                        {currency.isBase && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-3 w-3 mr-1" />
                            Base
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            currency.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400"
                          }
                        >
                          {currency.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(currency)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => openDeleteConfirm(currency)}
                            disabled={currency.isBase}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Currency
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingCurrency?.code} - {deletingCurrency?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
