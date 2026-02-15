"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: any) => void;
  existingCount: number;
}

export function CustomFieldDialog({
  open,
  onOpenChange,
  onAdd,
  existingCount,
}: CustomFieldDialogProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldName = formData.get("fieldName") as string;
    const fieldKey = fieldName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    onAdd({
      section: formData.get("section") as string,
      fieldName,
      fieldKey,
      fieldType: formData.get("fieldType") as string,
      isRequired: false,
      sortOrder: existingCount,
      options: null,
      defaultVal: (formData.get("defaultVal") as string) || null,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select name="section" defaultValue="docInfo">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="docInfo">Document Info</SelectItem>
                <SelectItem value="billTo">Bill To</SelectItem>
                <SelectItem value="lineItems">Line Items</SelectItem>
                <SelectItem value="totals">Totals</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input name="fieldName" placeholder="e.g. PO Number" required />
          </div>
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select name="fieldType" defaultValue="text">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Value (optional)</Label>
            <Input name="defaultVal" placeholder="Default value" />
          </div>
          <Button type="submit" className="w-full">
            Add Field
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
