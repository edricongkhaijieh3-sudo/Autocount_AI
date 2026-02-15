"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { TemplateConfig } from "@/types";
import { CustomFieldDialog } from "./custom-field-dialog";

interface CustomField {
  id: string;
  section: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
  options: any;
  defaultVal: string | null;
}

const PRESET_FIELDS = [
  { section: "docInfo", fieldName: "PO Number", fieldKey: "poNumber", fieldType: "text" },
  { section: "docInfo", fieldName: "Blanket Order (BO)", fieldKey: "boNumber", fieldType: "text" },
  { section: "docInfo", fieldName: "Delivery Order (DO)", fieldKey: "doNumber", fieldType: "text" },
  { section: "docInfo", fieldName: "Sales Order No.", fieldKey: "salesOrderNo", fieldType: "text" },
  { section: "docInfo", fieldName: "Payment Terms", fieldKey: "paymentTerms", fieldType: "dropdown", options: ["Net 30", "Net 60", "Net 90", "COD", "Due on Receipt"] },
  { section: "docInfo", fieldName: "Project Code", fieldKey: "projectCode", fieldType: "text" },
  { section: "docInfo", fieldName: "Salesperson", fieldKey: "salesperson", fieldType: "text" },
  { section: "footer", fieldName: "Bank Details", fieldKey: "bankDetails", fieldType: "text" },
  { section: "footer", fieldName: "Authorized Signature", fieldKey: "authSignature", fieldType: "checkbox" },
];

const DOC_INFO_FIELDS = [
  { key: "invoiceNo", label: "Invoice Number" },
  { key: "date", label: "Invoice Date" },
  { key: "dueDate", label: "Due Date" },
];

const LINE_ITEM_COLUMNS = [
  { key: "itemCode", label: "Item Code / SKU" },
  { key: "description", label: "Description" },
  { key: "quantity", label: "Quantity" },
  { key: "unitPrice", label: "Unit Price" },
  { key: "discount", label: "Discount %" },
  { key: "tax", label: "Tax" },
  { key: "amount", label: "Amount" },
];

interface ConfigPanelProps {
  config: TemplateConfig;
  onConfigChange: (config: TemplateConfig) => void;
  customFields: CustomField[];
  onAddCustomField: (field: Omit<CustomField, "id">) => void;
  onRemoveCustomField: (id: string) => void;
}

export function ConfigPanel({
  config,
  onConfigChange,
  customFields,
  onAddCustomField,
  onRemoveCustomField,
}: ConfigPanelProps) {
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);

  function updateSection<K extends keyof TemplateConfig["sections"]>(
    section: K,
    updates: Partial<TemplateConfig["sections"][K]>
  ) {
    onConfigChange({
      ...config,
      sections: {
        ...config.sections,
        [section]: { ...config.sections[section], ...updates },
      },
    });
  }

  function toggleDocInfoField(fieldKey: string) {
    const fields = config.sections.docInfo.fields;
    const newFields = fields.includes(fieldKey)
      ? fields.filter((f) => f !== fieldKey)
      : [...fields, fieldKey];
    updateSection("docInfo", { fields: newFields });
  }

  function toggleLineItemColumn(col: string) {
    const columns = config.sections.lineItems.columns;
    const newCols = columns.includes(col)
      ? columns.filter((c) => c !== col)
      : [...columns, col];
    updateSection("lineItems", { columns: newCols });
  }

  function addPreset(preset: typeof PRESET_FIELDS[number]) {
    const exists = customFields.some((f) => f.fieldKey === preset.fieldKey);
    if (exists) return;
    onAddCustomField({
      section: preset.section,
      fieldName: preset.fieldName,
      fieldKey: preset.fieldKey,
      fieldType: preset.fieldType,
      isRequired: false,
      sortOrder: customFields.length,
      options: preset.options || null,
      defaultVal: null,
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Accordion type="multiple" defaultValue={["header", "docInfo", "lineItems", "totals", "footer", "style"]} className="space-y-2">
          {/* Header Section */}
          <AccordionItem value="header">
            <AccordionTrigger className="text-sm font-semibold">
              Header Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Section</Label>
                <Switch
                  checked={config.sections.header.visible}
                  onCheckedChange={(v) => updateSection("header", { visible: v })}
                />
              </div>
              {config.sections.header.visible && (
                <>
                  <SwitchRow label="Company Logo" checked={config.sections.header.showLogo} onChange={(v) => updateSection("header", { showLogo: v })} />
                  <SwitchRow label="Address" checked={config.sections.header.showAddress} onChange={(v) => updateSection("header", { showAddress: v })} />
                  <SwitchRow label="Phone" checked={config.sections.header.showPhone} onChange={(v) => updateSection("header", { showPhone: v })} />
                  <SwitchRow label="Email" checked={config.sections.header.showEmail} onChange={(v) => updateSection("header", { showEmail: v })} />
                  <SwitchRow label="Website" checked={config.sections.header.showWebsite} onChange={(v) => updateSection("header", { showWebsite: v })} />
                  <SwitchRow label="Registration No." checked={config.sections.header.showRegNo} onChange={(v) => updateSection("header", { showRegNo: v })} />
                  <SwitchRow label="Tax ID" checked={config.sections.header.showTaxId} onChange={(v) => updateSection("header", { showTaxId: v })} />
                  <SwitchRow label="Tagline" checked={config.sections.header.showTagline} onChange={(v) => updateSection("header", { showTagline: v })} />
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Document Info Section */}
          <AccordionItem value="docInfo">
            <AccordionTrigger className="text-sm font-semibold">
              Document Info
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Section</Label>
                <Switch
                  checked={config.sections.docInfo.visible}
                  onCheckedChange={(v) => updateSection("docInfo", { visible: v })}
                />
              </div>
              {config.sections.docInfo.visible && (
                <>
                  <p className="text-xs text-muted-foreground font-medium">Standard Fields</p>
                  {DOC_INFO_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={config.sections.docInfo.fields.includes(field.key)}
                        onCheckedChange={() => toggleDocInfoField(field.key)}
                      />
                      <Label className="text-sm">{field.label}</Label>
                    </div>
                  ))}

                  {/* Custom fields for this section */}
                  {customFields.filter((f) => f.section === "docInfo").length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mt-3">Custom Fields</p>
                      {customFields.filter((f) => f.section === "docInfo").map((field) => (
                        <div key={field.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{field.fieldType}</Badge>
                            <span className="text-sm">{field.fieldName}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveCustomField(field.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Preset buttons */}
                  <p className="text-xs text-muted-foreground font-medium mt-3">Quick Add Presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_FIELDS.filter((p) => p.section === "docInfo").map((preset) => {
                      const exists = customFields.some((f) => f.fieldKey === preset.fieldKey);
                      return (
                        <Button
                          key={preset.fieldKey}
                          variant={exists ? "secondary" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          disabled={exists}
                          onClick={() => addPreset(preset)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {preset.fieldName}
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Bill To / Ship To */}
          <AccordionItem value="billTo">
            <AccordionTrigger className="text-sm font-semibold">
              Bill To / Ship To
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <SwitchRow label="Show Section" checked={config.sections.billTo.visible} onChange={(v) => updateSection("billTo", { visible: v })} />
              {config.sections.billTo.visible && (
                <SwitchRow label="Show Shipping Address" checked={config.sections.billTo.showShipTo} onChange={(v) => updateSection("billTo", { showShipTo: v })} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Line Items */}
          <AccordionItem value="lineItems">
            <AccordionTrigger className="text-sm font-semibold">
              Line Item Columns
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <SwitchRow label="Show Section" checked={config.sections.lineItems.visible} onChange={(v) => updateSection("lineItems", { visible: v })} />
              {config.sections.lineItems.visible && (
                <>
                  {LINE_ITEM_COLUMNS.map((col) => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={config.sections.lineItems.columns.includes(col.key)}
                        onCheckedChange={() => toggleLineItemColumn(col.key)}
                      />
                      <Label className="text-sm">{col.label}</Label>
                    </div>
                  ))}
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Totals */}
          <AccordionItem value="totals">
            <AccordionTrigger className="text-sm font-semibold">
              Totals
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <SwitchRow label="Show Section" checked={config.sections.totals.visible} onChange={(v) => updateSection("totals", { visible: v })} />
              {config.sections.totals.visible && (
                <>
                  <SwitchRow label="Show Discount Total" checked={config.sections.totals.showDiscount} onChange={(v) => updateSection("totals", { showDiscount: v })} />
                  <SwitchRow label="Amount in Words" checked={config.sections.totals.showAmountInWords} onChange={(v) => updateSection("totals", { showAmountInWords: v })} />
                  <SwitchRow label="Shipping / Handling" checked={config.sections.totals.showShipping} onChange={(v) => updateSection("totals", { showShipping: v })} />
                  <SwitchRow label="Rounding Adjustment" checked={config.sections.totals.showRounding} onChange={(v) => updateSection("totals", { showRounding: v })} />
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Footer */}
          <AccordionItem value="footer">
            <AccordionTrigger className="text-sm font-semibold">
              Footer
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <SwitchRow label="Show Section" checked={config.sections.footer.visible} onChange={(v) => updateSection("footer", { visible: v })} />
              {config.sections.footer.visible && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Thank You Message</Label>
                    <Input
                      value={config.sections.footer.thankYouMessage}
                      onChange={(e) => updateSection("footer", { thankYouMessage: e.target.value })}
                      placeholder="Thank you for your business!"
                    />
                  </div>
                  <SwitchRow label="Bank Details" checked={config.sections.footer.showBankDetails} onChange={(v) => updateSection("footer", { showBankDetails: v })} />
                  {config.sections.footer.showBankDetails && (
                    <Textarea
                      value={config.sections.footer.bankDetails}
                      onChange={(e) => updateSection("footer", { bankDetails: e.target.value })}
                      placeholder="Bank Name&#10;Account No: 1234567890&#10;Swift Code: ABCDEF"
                      rows={3}
                    />
                  )}
                  <SwitchRow label="Terms & Conditions" checked={config.sections.footer.showTerms} onChange={(v) => updateSection("footer", { showTerms: v })} />
                  {config.sections.footer.showTerms && (
                    <Textarea
                      value={config.sections.footer.termsText}
                      onChange={(e) => updateSection("footer", { termsText: e.target.value })}
                      placeholder="Payment is due within 30 days..."
                      rows={3}
                    />
                  )}
                  <SwitchRow label="Authorized Signature" checked={config.sections.footer.showSignature} onChange={(v) => updateSection("footer", { showSignature: v })} />
                  <SwitchRow label="Company Stamp" checked={config.sections.footer.showStamp} onChange={(v) => updateSection("footer", { showStamp: v })} />

                  {/* Footer custom fields */}
                  {customFields.filter((f) => f.section === "footer").length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground font-medium">Custom Fields</p>
                      {customFields.filter((f) => f.section === "footer").map((field) => (
                        <div key={field.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{field.fieldType}</Badge>
                            <span className="text-sm">{field.fieldName}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveCustomField(field.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_FIELDS.filter((p) => p.section === "footer").map((preset) => {
                      const exists = customFields.some((f) => f.fieldKey === preset.fieldKey);
                      return (
                        <Button
                          key={preset.fieldKey}
                          variant={exists ? "secondary" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          disabled={exists}
                          onClick={() => addPreset(preset)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {preset.fieldName}
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Style */}
          <AccordionItem value="style">
            <AccordionTrigger className="text-sm font-semibold">
              Style
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label className="text-sm">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.style.primaryColor}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        style: { ...config.style, primaryColor: e.target.value },
                      })
                    }
                    className="h-8 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={config.style.primaryColor}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        style: { ...config.style, primaryColor: e.target.value },
                      })
                    }
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Font</Label>
                <select
                  value={config.style.fontFamily}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      style: { ...config.style, fontFamily: e.target.value },
                    })
                  }
                  className="w-full border rounded-md p-2 text-sm"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times Roman</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Font Size: {config.style.fontSize}pt</Label>
                <input
                  type="range"
                  min={8}
                  max={14}
                  value={config.style.fontSize}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      style: { ...config.style, fontSize: Number(e.target.value) },
                    })
                  }
                  className="w-full"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Add Custom Field Button */}
        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCustomFieldDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Custom Field
          </Button>
        </div>

        <CustomFieldDialog
          open={customFieldDialogOpen}
          onOpenChange={setCustomFieldDialogOpen}
          onAdd={onAddCustomField}
          existingCount={customFields.length}
        />
      </CardContent>
    </Card>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
