"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Hash,
  Building2,
  CreditCard,
  Settings2,
  User,
  Users,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

type ContactType = "CUSTOMER" | "VENDOR" | "BOTH";

interface Contact {
  id: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  billingAddress: string | null;
  deliveryAddress: string | null;
  sameAsBilling: boolean;
  taxId: string | null;
  brn: string | null;
  creditTerms: string | null;
  creditLimit: number | null;
  type: ContactType;
  taxEntityId: string | null;
}

interface TaxEntity {
  id: string;
  entityName: string;
  tin: string | null;
  brn: string | null;
  sstNo: string | null;
  msicCode: string | null;
}

// ─── Constants ──────────────────────────────────────────────────

const contactTypeBadgeColors: Record<ContactType, string> = {
  CUSTOMER:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  VENDOR:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  BOTH:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const CREDIT_TERM_OPTIONS = [
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 60", label: "Net 60" },
  { value: "Net 90", label: "Net 90" },
];

const emptyForm = {
  name: "",
  code: "",
  email: "",
  phone: "",
  billingAddress: "",
  deliveryAddress: "",
  sameAsBilling: true,
  taxId: "",
  brn: "",
  creditTerms: "",
  creditLimit: "",
  type: "CUSTOMER" as ContactType,
  taxEntityId: "",
  showTaxInfo: false,
  autoCode: true,
};

// ─── Helpers ────────────────────────────────────────────────────

function generateNextCode(
  contacts: Contact[],
  type: ContactType
): string {
  const prefix = type === "VENDOR" ? "V" : "C";
  const relevantCodes = contacts
    .filter((c) => c.code?.startsWith(prefix + "-"))
    .map((c) => {
      const num = parseInt(c.code!.split("-")[1], 10);
      return isNaN(num) ? 0 : num;
    });
  const max = relevantCodes.length > 0 ? Math.max(...relevantCodes) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

// ─── Page Component ─────────────────────────────────────────────

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Loading...</p></div>}>
      <ContactsPageInner />
    </Suspense>
  );
}

function ContactsPageInner() {
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type") as ContactType | null;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [taxEntities, setTaxEntities] = useState<TaxEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | ContactType>(
    urlType && ["CUSTOMER", "VENDOR", "BOTH"].includes(urlType) ? urlType : "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Sync type filter with URL param changes
  useEffect(() => {
    if (urlType && ["CUSTOMER", "VENDOR", "BOTH"].includes(urlType)) {
      setTypeFilter(urlType);
    }
  }, [urlType]);

  // Form state
  const [form, setForm] = useState(emptyForm);

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTaxEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/tax-entities");
      if (res.ok) {
        const data = await res.json();
        setTaxEntities(Array.isArray(data) ? data : []);
      }
    } catch {
      // Tax entities are optional
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchTaxEntities();
  }, [fetchContacts, fetchTaxEntities]);

  // ─── Auto-code generation on type change ────────────────────

  useEffect(() => {
    if (form.autoCode && !editingContact) {
      const nextCode = generateNextCode(contacts, form.type);
      updateForm({ code: nextCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, form.autoCode, contacts, editingContact]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredContacts = contacts.filter((c) => {
    const matchesType = typeFilter === "ALL" || c.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      setActiveTab("general");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      billingAddress: form.billingAddress.trim() || null,
      deliveryAddress: form.sameAsBilling
        ? form.billingAddress.trim() || null
        : form.deliveryAddress.trim() || null,
      sameAsBilling: form.sameAsBilling,
      taxId: form.showTaxInfo ? form.taxId.trim() || null : null,
      brn: form.brn.trim() || null,
      creditTerms: form.creditTerms || null,
      creditLimit: form.creditLimit
        ? parseFloat(form.creditLimit)
        : null,
      type: form.type,
      taxEntityId:
        form.showTaxInfo && form.taxEntityId ? form.taxEntityId : null,
    };

    const url = editingContact
      ? `/api/contacts/${editingContact.id}`
      : "/api/contacts";
    const method = editingContact ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingContact ? "Contact updated" : "Contact created"
        );
        setDialogOpen(false);
        setEditingContact(null);
        fetchContacts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save contact");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contact deleted");
      fetchContacts();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete contact");
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    const hasTaxInfo = !!(contact.taxId || contact.taxEntityId);
    setForm({
      name: contact.name,
      code: contact.code || "",
      email: contact.email || "",
      phone: contact.phone || "",
      billingAddress: contact.billingAddress || "",
      deliveryAddress: contact.deliveryAddress || "",
      sameAsBilling: contact.sameAsBilling,
      taxId: contact.taxId || "",
      brn: contact.brn || "",
      creditTerms: contact.creditTerms || "",
      creditLimit: contact.creditLimit?.toString() || "",
      type: contact.type,
      taxEntityId: contact.taxEntityId || "",
      showTaxInfo: hasTaxInfo,
      autoCode: false,
    });
    setActiveTab("general");
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingContact(null);
    const defaultType: ContactType = urlType === "VENDOR" ? "VENDOR" : "CUSTOMER";
    const nextCode = generateNextCode(contacts, defaultType);
    setForm({ ...emptyForm, type: defaultType, code: nextCode });
    setActiveTab("general");
    setDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {urlType === "CUSTOMER" ? "Customers" : urlType === "VENDOR" ? "Suppliers" : "Contacts"}
          </h1>
          <p className="text-muted-foreground">
            {urlType === "CUSTOMER"
              ? "Manage your customers"
              : urlType === "VENDOR"
                ? "Manage your suppliers"
                : "Manage your customers and vendors"}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingContact(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingContact ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Contact
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Contact
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selector — always visible above tabs */}
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    updateForm({ type: v as ContactType })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">
                      <span className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        Customer
                      </span>
                    </SelectItem>
                    <SelectItem value="VENDOR">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-orange-500" />
                        Vendor
                      </span>
                    </SelectItem>
                    <SelectItem value="BOTH">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        Both
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Tabbed Form */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="general" className="flex-1 gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="flex-1 gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Financial
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* ─── General Tab ───────────────────────────── */}
                <TabsContent value="general" className="space-y-4 pt-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe / ABC Sdn Bhd"
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Code with auto-generate toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="code">Code</Label>
                      {!editingContact && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="autoCode"
                            className="text-xs text-muted-foreground font-normal cursor-pointer"
                          >
                            Auto-generate
                          </Label>
                          <Switch
                            id="autoCode"
                            size="sm"
                            checked={form.autoCode}
                            onCheckedChange={(checked) =>
                              updateForm({ autoCode: !!checked })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="code"
                        placeholder={
                          form.type === "VENDOR" ? "V-0001" : "C-0001"
                        }
                        value={form.code}
                        onChange={(e) =>
                          updateForm({ code: e.target.value })
                        }
                        disabled={form.autoCode && !editingContact}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={(e) =>
                          updateForm({ email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="+60 12 345 6789"
                        value={form.phone}
                        onChange={(e) =>
                          updateForm({ phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Billing Address</Label>
                    <Textarea
                      id="billingAddress"
                      placeholder="123 Main St, City, State, Postcode"
                      value={form.billingAddress}
                      onChange={(e) =>
                        updateForm({ billingAddress: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  {/* Same as Billing checkbox + Delivery Address */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sameAsBilling"
                        checked={form.sameAsBilling}
                        onCheckedChange={(checked) =>
                          updateForm({ sameAsBilling: !!checked })
                        }
                      />
                      <Label
                        htmlFor="sameAsBilling"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Delivery address same as billing
                      </Label>
                    </div>
                    {!form.sameAsBilling && (
                      <div className="space-y-2">
                        <Label htmlFor="deliveryAddress">
                          Delivery Address
                        </Label>
                        <Textarea
                          id="deliveryAddress"
                          placeholder="Delivery address if different from billing"
                          value={form.deliveryAddress}
                          onChange={(e) =>
                            updateForm({
                              deliveryAddress: e.target.value,
                            })
                          }
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ─── Financial Tab ─────────────────────────── */}
                <TabsContent value="financial" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="creditTerms">Credit Terms</Label>
                    <Select
                      value={form.creditTerms}
                      onValueChange={(v) =>
                        updateForm({ creditTerms: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select credit terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDIT_TERM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        RM
                      </span>
                      <Input
                        id="creditLimit"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.creditLimit}
                        onChange={(e) =>
                          updateForm({ creditLimit: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {form.creditTerms && (
                    <p className="text-xs text-muted-foreground">
                      Payment is expected within{" "}
                      <span className="font-medium text-foreground">
                        {form.creditTerms === "COD"
                          ? "delivery"
                          : form.creditTerms.replace("Net ", "") +
                            " days"}
                      </span>{" "}
                      of invoice date.
                    </p>
                  )}
                </TabsContent>

                {/* ─── Settings Tab ──────────────────────────── */}
                <TabsContent value="settings" className="space-y-4 pt-2">
                  {/* BRN */}
                  <div className="space-y-2">
                    <Label htmlFor="brn">
                      Business Registration No (BRN)
                    </Label>
                    <Input
                      id="brn"
                      placeholder="e.g. 202201012345 (12 digits)"
                      value={form.brn}
                      onChange={(e) =>
                        updateForm({ brn: e.target.value })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Progressive Tax Disclosure */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <Label
                          htmlFor="showTaxInfo"
                          className="cursor-pointer"
                        >
                          Add Tax Info
                        </Label>
                      </div>
                      <Switch
                        id="showTaxInfo"
                        checked={form.showTaxInfo}
                        onCheckedChange={(checked) =>
                          updateForm({ showTaxInfo: !!checked })
                        }
                      />
                    </div>

                    {form.showTaxInfo && (
                      <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                        <div className="space-y-2">
                          <Label htmlFor="taxId">Tax ID (TIN)</Label>
                          <Input
                            id="taxId"
                            placeholder="Tax Identification Number"
                            value={form.taxId}
                            onChange={(e) =>
                              updateForm({ taxId: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taxEntityId">
                            Link to Tax Entity
                          </Label>
                          <Select
                            value={form.taxEntityId}
                            onValueChange={(v) =>
                              updateForm({ taxEntityId: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a tax entity (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxEntities.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  No tax entities found
                                </div>
                              ) : (
                                taxEntities.map((te) => (
                                  <SelectItem key={te.id} value={te.id}>
                                    <span className="flex flex-col">
                                      <span>{te.entityName}</span>
                                      {te.tin && (
                                        <span className="text-xs text-muted-foreground">
                                          TIN: {te.tin}
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingContact
                    ? "Update Contact"
                    : "Create Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contact List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as "ALL" | ContactType)
              }
            >
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="CUSTOMER">Customers</TabsTrigger>
                <TabsTrigger value="VENDOR">Vendors</TabsTrigger>
                <TabsTrigger value="BOTH">Both</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, or email..."
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
              <p className="text-muted-foreground">Loading contacts...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credit Terms</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery || typeFilter !== "ALL"
                        ? "No contacts match your filters"
                        : "No contacts yet — click \"Add Contact\" to get started"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {contact.code || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={contactTypeBadgeColors[contact.type]}
                        >
                          {contact.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.creditTerms || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(contact)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(contact.id)}
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
    </div>
  );
}
