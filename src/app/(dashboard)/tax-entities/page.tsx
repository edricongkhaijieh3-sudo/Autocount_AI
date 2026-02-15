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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Shield,
  HelpCircle,
  Loader2,
  CheckCircle,
  Users,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface TaxEntity {
  id: string;
  entityName: string;
  tin: string | null;
  brn: string | null;
  sstNo: string | null;
  msicCode: string | null;
  contactCount: number;
}

const emptyForm = {
  entityName: "",
  tin: "",
  brn: "",
  sstNo: "",
  msicCode: "",
};

// ─── Page Component ─────────────────────────────────────────────

export default function TaxEntitiesPage() {
  const [entities, setEntities] = useState<TaxEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEntity, setDeletingEntity] = useState<TaxEntity | null>(null);
  const [editingEntity, setEditingEntity] = useState<TaxEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/tax-entities");
      const data = await res.json();
      setEntities(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredEntities = entities.filter((e) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      e.entityName.toLowerCase().includes(q) ||
      e.tin?.toLowerCase().includes(q) ||
      e.brn?.toLowerCase().includes(q) ||
      e.sstNo?.toLowerCase().includes(q) ||
      e.msicCode?.toLowerCase().includes(q)
    );
  });

  // ─── Mock SSM/LHDN Verify ─────────────────────────────────

  async function handleVerifyBRN() {
    if (!form.brn.trim()) {
      toast.error("Enter a BRN first to verify");
      return;
    }

    setVerifying(true);
    setVerified(false);

    // Simulate API call to SSM/LHDN
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // If entity name is empty, mock-fill it
    if (!form.entityName.trim()) {
      updateForm({ entityName: `Company ${form.brn.trim()}` });
      toast.success("Entity name auto-filled from SSM/LHDN registry");
    } else {
      toast.success("BRN verified with SSM/LHDN");
    }

    setVerified(true);
    setVerifying(false);

    // Reset verified icon after 3 seconds
    setTimeout(() => setVerified(false), 3000);
  }

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entityName.trim()) {
      toast.error("Entity name is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      entityName: form.entityName.trim(),
      tin: form.tin.trim() || null,
      brn: form.brn.trim() || null,
      sstNo: form.sstNo.trim() || null,
      msicCode: form.msicCode.trim() || null,
    };

    const url = editingEntity
      ? `/api/tax-entities/${editingEntity.id}`
      : "/api/tax-entities";
    const method = editingEntity ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingEntity ? "Tax entity updated" : "Tax entity created"
        );
        setDialogOpen(false);
        setEditingEntity(null);
        fetchEntities();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save tax entity");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete() {
    if (!deletingEntity) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/tax-entities/${deletingEntity.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Tax entity deleted");
        setDeleteDialogOpen(false);
        setDeletingEntity(null);
        fetchEntities();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete tax entity");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(entity: TaxEntity) {
    setEditingEntity(entity);
    setForm({
      entityName: entity.entityName,
      tin: entity.tin || "",
      brn: entity.brn || "",
      sstNo: entity.sstNo || "",
      msicCode: entity.msicCode || "",
    });
    setVerified(false);
    setVerifying(false);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingEntity(null);
    setForm({ ...emptyForm });
    setVerified(false);
    setVerifying(false);
    setDialogOpen(true);
  }

  function openDeleteConfirm(entity: TaxEntity) {
    setDeletingEntity(entity);
    setDeleteDialogOpen(true);
  }

  // ─── Tooltip Help Icon Component ──────────────────────────

  function FieldTooltip({ text }: { text: string }) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Tax Entities
          </h1>
          <p className="text-muted-foreground">
            Manage tax registration entities for LHDN e-Invoicing compliance
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingEntity(null);
              setForm(emptyForm);
              setVerified(false);
              setVerifying(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Tax Entity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingEntity ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Tax Entity
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Tax Entity
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingEntity
                  ? "Update the tax entity details below."
                  : "Register a new tax entity for LHDN e-Invoicing."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Entity Name */}
              <div className="space-y-2">
                <Label htmlFor="entityName">
                  Entity Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="entityName"
                  placeholder="e.g. ABC Trading Sdn Bhd"
                  value={form.entityName}
                  onChange={(e) => updateForm({ entityName: e.target.value })}
                  required
                />
              </div>

              {/* TIN with tooltip */}
              <div className="space-y-2">
                <Label htmlFor="tin" className="flex items-center">
                  TIN
                  <FieldTooltip text="Tax Identification Number — Required for LHDN e-Invoicing" />
                </Label>
                <Input
                  id="tin"
                  placeholder="e.g. C2584563200"
                  value={form.tin}
                  onChange={(e) => updateForm({ tin: e.target.value })}
                />
              </div>

              {/* BRN with Verify button */}
              <div className="space-y-2">
                <Label htmlFor="brn">Business Registration No (BRN)</Label>
                <div className="flex gap-2">
                  <Input
                    id="brn"
                    placeholder="e.g. 202201012345 (12 digits)"
                    value={form.brn}
                    onChange={(e) => {
                      updateForm({ brn: e.target.value });
                      setVerified(false);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={handleVerifyBRN}
                    disabled={verifying || !form.brn.trim()}
                    className="shrink-0 min-w-[160px]"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : verified ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Verify with SSM/LHDN
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* SST No with tooltip */}
              <div className="space-y-2">
                <Label htmlFor="sstNo" className="flex items-center">
                  SST No
                  <FieldTooltip text="Sales & Service Tax Registration Number" />
                </Label>
                <Input
                  id="sstNo"
                  placeholder="e.g. W10-1234-56789012"
                  value={form.sstNo}
                  onChange={(e) => updateForm({ sstNo: e.target.value })}
                />
              </div>

              {/* MSIC Code with tooltip */}
              <div className="space-y-2">
                <Label htmlFor="msicCode" className="flex items-center">
                  MSIC Code
                  <FieldTooltip text="Malaysia Standard Industrial Classification Code" />
                </Label>
                <Input
                  id="msicCode"
                  placeholder="e.g. 46510"
                  value={form.msicCode}
                  onChange={(e) => updateForm({ msicCode: e.target.value })}
                />
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingEntity
                    ? "Update Tax Entity"
                    : "Create Tax Entity"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Entity List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {entities.length} tax{" "}
              {entities.length === 1 ? "entity" : "entities"} registered
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, TIN, BRN..."
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
              <p className="text-muted-foreground">Loading tax entities...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Name</TableHead>
                  <TableHead>TIN</TableHead>
                  <TableHead>BRN</TableHead>
                  <TableHead>SST No</TableHead>
                  <TableHead>MSIC Code</TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-center gap-1 cursor-help">
                            <Users className="h-3.5 w-3.5" />
                            Contacts
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of contacts linked to this entity</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery
                        ? "No tax entities match your search"
                        : "No tax entities yet — click \"Add Tax Entity\" to get started"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                          {entity.entityName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {entity.tin || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {entity.brn || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {entity.sstNo || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {entity.msicCode || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="tabular-nums"
                        >
                          {entity.contactCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(entity)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => openDeleteConfirm(entity)}
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
              Delete Tax Entity
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deletingEntity?.entityName}
              </span>
              ? This action cannot be undone.
              {deletingEntity && deletingEntity.contactCount > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This entity has {deletingEntity.contactCount} linked
                  contact(s). You must unlink them before deleting.
                </span>
              )}
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
