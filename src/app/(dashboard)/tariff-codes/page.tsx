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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  FileBarChart,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface TariffCode {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  description: "",
};

// ─── Page Component ─────────────────────────────────────────────

export default function TariffCodesPage() {
  const [tariffCodes, setTariffCodes] = useState<TariffCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTariffCode, setDeletingTariffCode] = useState<TariffCode | null>(null);
  const [editingTariffCode, setEditingTariffCode] = useState<TariffCode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchTariffCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/tariff-codes");
      const data = await res.json();
      setTariffCodes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTariffCodes();
  }, [fetchTariffCodes]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredTariffCodes = tariffCodes.filter((tc) => {
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
      toast.error("Tariff code is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      code: form.code.trim(),
      description: form.description.trim(),
    };

    const url = editingTariffCode
      ? `/api/tariff-codes/${editingTariffCode.id}`
      : "/api/tariff-codes";
    const method = editingTariffCode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingTariffCode ? "Tariff code updated" : "Tariff code created"
        );
        setDialogOpen(false);
        setEditingTariffCode(null);
        fetchTariffCodes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save tariff code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingTariffCode) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/tariff-codes/${deletingTariffCode.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Tariff code deleted");
        setDeleteDialogOpen(false);
        setDeletingTariffCode(null);
        fetchTariffCodes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete tariff code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(tariffCode: TariffCode) {
    setEditingTariffCode(tariffCode);
    setForm({
      code: tariffCode.code,
      description: tariffCode.description,
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingTariffCode(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openDeleteConfirm(tariffCode: TariffCode) {
    setDeletingTariffCode(tariffCode);
    setDeleteDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Tariff Codes
          </h1>
          <p className="text-muted-foreground">
            Manage HS tariff codes for customs and e-Invoicing
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTariffCode(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Tariff Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingTariffCode ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Tariff Code
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Tariff Code
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingTariffCode
                  ? "Update the tariff code details below."
                  : "Add a new HS tariff code."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  Tariff Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. 8471.30.1000"
                  value={form.code}
                  onChange={(e) => updateForm({ code: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Harmonized System (HS) code for customs classification
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="e.g. Portable digital automatic data processing machines"
                  value={form.description}
                  onChange={(e) =>
                    updateForm({ description: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingTariffCode
                    ? "Update Tariff Code"
                    : "Create Tariff Code"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tariff Code List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {tariffCodes.length} tariff{" "}
              {tariffCodes.length === 1 ? "code" : "codes"} registered
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
              <p className="text-muted-foreground">Loading tariff codes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-28">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTariffCodes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery
                        ? "No tariff codes match your search"
                        : 'No tariff codes yet — click "Add Tariff Code" to get started'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTariffCodes.map((tariffCode) => (
                    <TableRow key={tariffCode.id}>
                      <TableCell className="font-mono font-medium">
                        {tariffCode.code}
                      </TableCell>
                      <TableCell>{tariffCode.description}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            tariffCode.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400"
                          }
                        >
                          {tariffCode.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(tariffCode)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => openDeleteConfirm(tariffCode)}
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
              Delete Tariff Code
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingTariffCode?.code}
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
