"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface TaxCode {
  id: string;
  code: string;
  description: string;
  rate: number;
  taxType: string;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  description: "",
  rate: "",
  taxType: "OUTPUT",
};

const TAX_TYPE_OPTIONS = [
  { value: "OUTPUT", label: "Output Tax (Sales)" },
  { value: "INPUT", label: "Input Tax (Purchases)" },
  { value: "BOTH", label: "Both" },
];

const taxTypeBadgeColors: Record<string, string> = {
  OUTPUT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  INPUT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  BOTH: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

// ─── Page Component ─────────────────────────────────────────────

export default function TaxCodesPage() {
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTaxCode, setDeletingTaxCode] = useState<TaxCode | null>(null);
  const [editingTaxCode, setEditingTaxCode] = useState<TaxCode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchTaxCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/tax-codes");
      const data = await res.json();
      setTaxCodes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxCodes();
  }, [fetchTaxCodes]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredTaxCodes = taxCodes.filter((tc) => {
    if (typeFilter !== "ALL" && tc.taxType !== typeFilter) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      tc.code.toLowerCase().includes(q) ||
      tc.description.toLowerCase().includes(q)
    );
  });

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Tax code is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      rate: parseFloat(form.rate) || 0,
      taxType: form.taxType,
    };

    const url = editingTaxCode
      ? `/api/tax-codes/${editingTaxCode.id}`
      : "/api/tax-codes";
    const method = editingTaxCode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingTaxCode ? "Tax code updated" : "Tax code created"
        );
        setDialogOpen(false);
        setEditingTaxCode(null);
        fetchTaxCodes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save tax code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingTaxCode) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/tax-codes/${deletingTaxCode.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Tax code deleted");
        setDeleteDialogOpen(false);
        setDeletingTaxCode(null);
        fetchTaxCodes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete tax code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(taxCode: TaxCode) {
    setEditingTaxCode(taxCode);
    setForm({
      code: taxCode.code,
      description: taxCode.description,
      rate: taxCode.rate.toString(),
      taxType: taxCode.taxType,
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingTaxCode(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openDeleteConfirm(taxCode: TaxCode) {
    setDeletingTaxCode(taxCode);
    setDeleteDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Tax Codes
          </h1>
          <p className="text-muted-foreground">
            Manage tax codes and rates for your transactions
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTaxCode(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Tax Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingTaxCode ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Tax Code
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Tax Code
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingTaxCode
                  ? "Update the tax code details below."
                  : "Add a new tax code for your transactions."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code & Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. SR"
                    value={form.code}
                    onChange={(e) =>
                      updateForm({ code: e.target.value.toUpperCase() })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate (%)</Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0.00"
                      value={form.rate}
                      onChange={(e) => updateForm({ rate: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="e.g. Standard Rate (6%)"
                  value={form.description}
                  onChange={(e) =>
                    updateForm({ description: e.target.value })
                  }
                  required
                />
              </div>

              {/* Tax Type */}
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <Select
                  value={form.taxType}
                  onValueChange={(v) => updateForm({ taxType: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingTaxCode
                    ? "Update Tax Code"
                    : "Create Tax Code"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tax Code List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {TAX_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code or description..."
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
              <p className="text-muted-foreground">Loading tax codes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-28">Rate (%)</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxCodes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery || typeFilter !== "ALL"
                        ? "No tax codes match your filters"
                        : 'No tax codes yet — click "Add Tax Code" to get started'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTaxCodes.map((taxCode) => (
                    <TableRow key={taxCode.id}>
                      <TableCell className="font-mono font-medium">
                        {taxCode.code}
                      </TableCell>
                      <TableCell>{taxCode.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {taxCode.rate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            taxTypeBadgeColors[taxCode.taxType] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {taxCode.taxType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            taxCode.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400"
                          }
                        >
                          {taxCode.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(taxCode)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => openDeleteConfirm(taxCode)}
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
              Delete Tax Code
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingTaxCode?.code} - {deletingTaxCode?.description}
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
