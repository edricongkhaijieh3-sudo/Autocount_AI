"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileEdit, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  docType: string;
  createdAt: string;
  customFields: any[];
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        docType: formData.get("docType"),
      }),
    });

    if (res.ok) {
      const template = await res.json();
      toast.success("Template created");
      setDialogOpen(false);
      router.push(`/templates/${template.id}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    toast.success("Template deleted");
    fetchTemplates();
  }

  const docTypeLabel: Record<string, string> = {
    INVOICE: "Invoice",
    QUOTATION: "Quotation",
    CREDIT_NOTE: "Credit Note",
    DEBIT_NOTE: "Debit Note",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice Templates
          </h1>
          <p className="text-muted-foreground">
            Design and manage your document templates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Standard Invoice"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docType">Document Type</Label>
                <Select name="docType" defaultValue="INVOICE">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="QUOTATION">Quotation</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                    <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create & Edit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No templates yet. Create your first template to customize your
              invoice layout.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/templates/${template.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mt-1">
                        {docTypeLabel[template.docType] || template.docType}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/templates/${template.id}`)}
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {template.customFields.length} custom fields
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
