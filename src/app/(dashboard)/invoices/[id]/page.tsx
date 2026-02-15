"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  customFields?: { id: string; fieldKey: string; fieldName: string; fieldType: string }[];
}

interface LineItem {
  id: string;
  itemName: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  contactId: string;
  contact: Contact;
  status: string;
  docType: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  customFieldValues: Record<string, string> | null;
  templateId: string | null;
  template?: Template;
  lines: {
    id: string;
    itemName: string;
    itemCode: string | null;
    description: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    amount: number;
  }[];
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

function calcLineAmount(
  quantity: number,
  unitPrice: number,
  discount: number,
  taxRate: number
): number {
  const subtotal = quantity * unitPrice * (1 - discount / 100);
  return subtotal * (1 + taxRate / 100);
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    async function load() {
      const [invRes, contactsRes, templatesRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch("/api/contacts"),
        fetch("/api/templates"),
      ]);
      if (!invRes.ok) {
        toast.error("Invoice not found");
        router.push("/invoices");
        return;
      }
      const inv = await invRes.json();
      setInvoice(inv);
      setContactId(inv.contactId);
      setDate(inv.date?.slice(0, 10) || "");
      setDueDate(inv.dueDate?.slice(0, 10) || "");
      setTemplateId(inv.templateId || "");
      setNotes(inv.notes || "");
      setCustomFieldValues(
        (inv.customFieldValues as Record<string, string>) || {}
      );
      setLines(
        inv.lines?.length
          ? inv.lines.map((l: any) => ({
              id: l.id,
              itemName: l.itemName,
              itemCode: l.itemCode || "",
              description: l.description || "",
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              taxRate: l.taxRate,
            }))
          : [
              {
                id: crypto.randomUUID(),
                itemName: "",
                itemCode: "",
                description: "",
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                taxRate: 0,
              },
            ]
      );
      setContacts(await contactsRes.json());
      setTemplates(await templatesRes.json());
      setLoading(false);
    }
    load();
  }, [id, router]);

  const selectedTemplate =
    templates.find((t) => t.id === templateId) || invoice?.template;
  const customFields = selectedTemplate?.customFields || [];

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemName: "",
        itemCode: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 0,
      },
    ]);
  }

  function removeLine(lineId: string) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }

  function updateLine(
    lineId: string,
    field: keyof LineItem,
    value: string | number
  ) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    );
  }

  const subtotal = lines.reduce((sum, l) => {
    return sum + l.quantity * l.unitPrice * (1 - l.discount / 100);
  }, 0);
  const taxTotal = lines.reduce((sum, l) => {
    const afterDiscount =
      l.quantity * l.unitPrice * (1 - l.discount / 100);
    return sum + afterDiscount * (l.taxRate / 100);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  async function handleStatusUpdate(status: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Invoice marked as ${status}`);
      const inv = await res.json();
      setInvoice((prev) => (prev ? { ...prev, status: inv.status } : null));
    } else {
      toast.error("Failed to update status");
    }
  }

  async function handleSave() {
    if (!contactId) {
      toast.error("Please select a customer");
      return;
    }
    const validLines = lines.filter((l) => l.itemName.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    setSaving(true);
    const payload = {
      contactId,
      date,
      dueDate,
      templateId: templateId || null,
      status: invoice?.status,
      notes: notes || null,
      customFieldValues:
        Object.keys(customFieldValues).length > 0
          ? customFieldValues
          : null,
      lines: validLines.map((l) => ({
        itemName: l.itemName,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        taxRate: l.taxRate,
      })),
    };

    const res = await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const inv = await res.json();
      setInvoice(inv);
      setEditing(false);
      toast.success("Invoice updated");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update invoice");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Invoice deleted");
      router.push("/invoices");
    } else {
      toast.error("Failed to delete invoice");
    }
  }

  if (loading || !invoice) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Invoice</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const canEdit = invoice.status === "DRAFT" || invoice.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={
                  statusBadgeVariants[invoice.status] ||
                  "bg-gray-100 text-gray-800"
                }
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate("SENT")}
            >
              <Send className="mr-2 h-4 w-4" /> Mark as Sent
            </Button>
          )}
          {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate("PAID")}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
            </Button>
          )}
          {canEdit && (
            <Button
              variant={editing ? "default" : "outline"}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Cancel Edit" : "Edit"}
            </Button>
          )}
          {canEdit && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select
                    value={contactId}
                    onValueChange={setContactId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              {customFields.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Custom Fields</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((cf) => (
                      <div key={cf.id} className="space-y-1">
                        <Label className="text-sm font-normal">
                          {cf.fieldName}
                        </Label>
                        <Input
                          type={cf.fieldType === "number" ? "number" : "text"}
                          value={customFieldValues[cf.fieldKey] || ""}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [cf.fieldKey]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                Save Changes
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <p>
                <span className="text-muted-foreground">Customer:</span>{" "}
                {invoice.contact?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                {new Date(invoice.date).toLocaleDateString("en-MY")}
              </p>
              <p>
                <span className="text-muted-foreground">Due Date:</span>{" "}
                {new Date(invoice.dueDate).toLocaleDateString("en-MY")}
              </p>
              {invoice.notes && (
                <p>
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {invoice.notes}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {editing && (
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" /> Add Line
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-28">Unit Price</TableHead>
                <TableHead className="w-20">Disc %</TableHead>
                <TableHead className="w-20">Tax %</TableHead>
                <TableHead className="w-28 text-right">Amount</TableHead>
                {editing && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {editing ? (
                      <Input
                        value={line.itemName}
                        onChange={(e) =>
                          updateLine(line.id, "itemName", e.target.value)
                        }
                      />
                    ) : (
                      line.itemName
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        value={line.itemCode}
                        onChange={(e) =>
                          updateLine(line.id, "itemCode", e.target.value)
                        }
                      />
                    ) : (
                      line.itemCode || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.id, "description", e.target.value)
                        }
                      />
                    ) : (
                      line.description || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    ) : (
                      line.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    ) : (
                      formatAmount(line.unitPrice)
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={line.discount}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "discount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    ) : (
                      `${line.discount}%`
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={line.taxRate}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "taxRate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    ) : (
                      `${line.taxRate}%`
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(
                      calcLineAmount(
                        line.quantity,
                        line.unitPrice,
                        line.discount,
                        line.taxRate
                      )
                    )}
                  </TableCell>
                  {editing && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <div className="space-y-1 text-right">
              <p>
                Subtotal: <strong>{formatAmount(subtotal)}</strong>
              </p>
              <p>
                Tax: <strong>{formatAmount(taxTotal)}</strong>
              </p>
              <p className="text-lg">
                Grand Total: <strong>{formatAmount(grandTotal)}</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
