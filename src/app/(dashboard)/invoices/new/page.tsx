"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageTracking, useFormTracking } from "@/hooks/use-page-tracking";
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
import { Plus, Trash2 } from "lucide-react";
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

export default function NewInvoicePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});
  const [lines, setLines] = useState<LineItem[]>([
    {
      id: "1",
      itemName: "",
      itemCode: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
    },
  ]);

  // Track page context for AI assistant
  usePageTracking({
    currentPage: "invoices/new",
    currentAction: "creating_invoice",
    pageDescription: "Create New Invoice",
    availableActions: ["select customer", "set date", "add line items", "set tax rate", "add notes", "save invoice"],
  });

  const selectedContact = contacts.find((c) => c.id === contactId);
  useFormTracking({
    customer: selectedContact?.name || "",
    date,
    dueDate,
    lineItemCount: lines.length,
    items: lines.filter((l) => l.itemName).map((l) => ({
      name: l.itemName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
    notes: notes || undefined,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([c, t]) => {
      setContacts(c);
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);
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

  function removeLine(id: string) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(
    id: string,
    field: keyof LineItem,
    value: string | number
  ) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  const subtotal = lines.reduce((sum, l) => {
    return (
      sum +
      l.quantity * l.unitPrice * (1 - l.discount / 100)
    );
  }, 0);
  const taxTotal = lines.reduce((sum, l) => {
    const afterDiscount =
      l.quantity * l.unitPrice * (1 - l.discount / 100);
    return sum + afterDiscount * (l.taxRate / 100);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  async function handleSave(asDraft: boolean) {
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
      status: asDraft ? "DRAFT" : "SENT",
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

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const inv = await res.json();
      toast.success(asDraft ? "Invoice saved as draft" : "Invoice sent");
      router.push(`/invoices/${inv.id}`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save invoice");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={contactId}
                onValueChange={setContactId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
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
              <Select
                value={templateId || "none"}
                onValueChange={(val) => setTemplateId(val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> Add Line
          </Button>
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
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Input
                      value={line.itemName}
                      onChange={(e) =>
                        updateLine(line.id, "itemName", e.target.value)
                      }
                      placeholder="Item name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.itemCode}
                      onChange={(e) =>
                        updateLine(line.id, "itemCode", e.target.value)
                      }
                      placeholder="Code"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.id, "description", e.target.value)
                      }
                      placeholder="Description"
                    />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                Grand Total:{" "}
                <strong>{formatAmount(grandTotal)}</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handleSave(true)}
          disabled={saving}
        >
          Save as Draft
        </Button>
        <Button onClick={() => handleSave(false)} disabled={saving}>
          Send
        </Button>
      </div>
    </div>
  );
}
