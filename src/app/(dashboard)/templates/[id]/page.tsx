"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { TemplateConfig, defaultTemplateConfig } from "@/types";
import { ConfigPanel } from "@/components/template-editor/config-panel";
import { LivePreview } from "@/components/template-editor/live-preview";

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

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  docType: string;
  config: TemplateConfig;
  customFields: CustomField[];
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(defaultTemplateConfig);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const fetchTemplate = useCallback(async () => {
    const res = await fetch(`/api/templates/${params.id}`);
    if (!res.ok) {
      toast.error("Template not found");
      router.push("/templates");
      return;
    }
    const data = await res.json();
    setTemplate(data);
    setName(data.name);
    setConfig(data.config || defaultTemplateConfig);
    setCustomFields(data.customFields || []);
  }, [params.id, router]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/templates/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        docType: template?.docType,
        config,
        isDefault: template?.isDefault,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Template saved");
    } else {
      toast.error("Failed to save template");
    }
  }

  async function addCustomField(field: Omit<CustomField, "id">) {
    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...field, templateId: params.id }),
    });
    if (res.ok) {
      const newField = await res.json();
      setCustomFields((prev) => [...prev, newField]);
      toast.success("Custom field added");
    }
  }

  async function removeCustomField(id: string) {
    const res = await fetch(`/api/custom-fields?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCustomFields((prev) => prev.filter((f) => f.id !== id));
      toast.success("Custom field removed");
    }
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold h-10 w-64"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ConfigPanel
          config={config}
          onConfigChange={setConfig}
          customFields={customFields}
          onAddCustomField={addCustomField}
          onRemoveCustomField={removeCustomField}
        />
        <div className="lg:sticky lg:top-20">
          <LivePreview config={config} customFields={customFields} docType={template.docType} />
        </div>
      </div>
    </div>
  );
}
