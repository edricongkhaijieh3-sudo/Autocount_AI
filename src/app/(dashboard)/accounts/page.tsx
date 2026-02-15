"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

interface TreeNode extends Account {
  children: TreeNode[];
  level: number;
}

interface ParsedAccount {
  code: string;
  name: string;
  type: string;
  description: string;
  parentCode: string;
  confidence: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const;

const accountTypeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800",
  LIABILITY: "bg-red-100 text-red-800",
  EQUITY: "bg-purple-100 text-purple-800",
  REVENUE: "bg-green-100 text-green-800",
  EXPENSE: "bg-orange-100 text-orange-800",
};

const accountTypeEmoji: Record<string, string> = {
  ASSET: "\u{1F4B0}",
  LIABILITY: "\u{1F4CB}",
  EQUITY: "\u{1F3E6}",
  REVENUE: "\u{1F4C8}",
  EXPENSE: "\u{1F4C9}",
};

// ─── Mock AI Parser ─────────────────────────────────────────────────────────

async function parseCOAWithAI(fileContent: string): Promise<ParsedAccount[]> {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const lines = fileContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // AI-style header mapping — matches common variations
  const headerMap: Record<string, number> = {};
  headers.forEach((header, idx) => {
    if (/code|number|acct.*no|account.*code/i.test(header))
      headerMap.code = idx;
    else if (/^name$|title|account.*name/i.test(header))
      headerMap.name = idx;
    else if (/type|category|class|group/i.test(header))
      headerMap.type = idx;
    else if (/desc|detail|memo|note/i.test(header))
      headerMap.description = idx;
    else if (/parent|parent.*code|parent.*id/i.test(header))
      headerMap.parentCode = idx;
  });

  // Fallback positions
  if (headerMap.code === undefined) headerMap.code = 0;
  if (headerMap.name === undefined) headerMap.name = 1;
  if (headerMap.type === undefined) headerMap.type = 2;
  if (headerMap.description === undefined) headerMap.description = 3;
  if (headerMap.parentCode === undefined) headerMap.parentCode = 4;

  const parsed: ParsedAccount[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[headerMap.code]) continue;

    const rawType = (cols[headerMap.type] || "ASSET").toUpperCase();
    const type = (ACCOUNT_TYPES as readonly string[]).includes(rawType)
      ? rawType
      : "ASSET";

    parsed.push({
      code: cols[headerMap.code] || "",
      name: cols[headerMap.name] || "",
      type,
      description: cols[headerMap.description] || "",
      parentCode: cols[headerMap.parentCode] || "",
      confidence: Math.round((Math.random() * 30 + 70)) / 100, // 0.70 – 1.00
    });
  }

  return parsed;
}

// ─── Tree Utilities ─────────────────────────────────────────────────────────

function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  accounts.forEach((a) => {
    map.set(a.id, { ...a, children: [], level: 0 });
  });

  accounts.forEach((a) => {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  function assignLevels(nodes: TreeNode[], level: number) {
    for (const n of nodes) {
      n.level = level;
      assignLevels(n.children, level + 1);
    }
  }
  assignLevels(roots, 0);

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    nodes.forEach((n) => sortNodes(n.children));
  }
  sortNodes(roots);

  return roots;
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0
  );
}

function getDescendantIds(
  accounts: Account[],
  accountId: string
): Set<string> {
  const ids = new Set<string>();
  function collect(parentId: string) {
    for (const a of accounts) {
      if (a.parentId === parentId) {
        ids.add(a.id);
        collect(a.id);
      }
    }
  }
  collect(accountId);
  return ids;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AccountsPage() {
  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [accountType, setAccountType] = useState("ASSET");
  const [parentId, setParentId] = useState<string>("none");

  // Filters
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Tree expand/collapse
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Smart Import
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch {
      toast.error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ─── Derived Data ─────────────────────────────────────────────────────

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (filter !== "ALL") {
      result = result.filter((a) => a.type === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      // When searching, include accounts that match AND their ancestors
      // so the tree context is preserved
      const matchingIds = new Set<string>();
      result.forEach((a) => {
        if (
          a.code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
        ) {
          matchingIds.add(a.id);
          // Walk up to include ancestors
          let current = a;
          while (current.parentId) {
            matchingIds.add(current.parentId);
            const parent = accounts.find((p) => p.id === current.parentId);
            if (!parent) break;
            current = parent;
          }
        }
      });
      result = result.filter((a) => matchingIds.has(a.id));
    }
    return result;
  }, [accounts, filter, searchQuery]);

  const groupedTrees = useMemo(() => {
    const grouped: Record<string, TreeNode[]> = {};
    for (const type of ACCOUNT_TYPES) {
      const typeAccounts = filteredAccounts.filter((a) => a.type === type);
      if (typeAccounts.length > 0) {
        grouped[type] = buildTree(typeAccounts);
      }
    }
    return grouped;
  }, [filteredAccounts]);

  const typeEntries = useMemo(
    () =>
      Object.entries(groupedTrees).sort(
        ([a], [b]) =>
          ACCOUNT_TYPES.indexOf(a as (typeof ACCOUNT_TYPES)[number]) -
          ACCOUNT_TYPES.indexOf(b as (typeof ACCOUNT_TYPES)[number])
      ),
    [groupedTrees]
  );

  // Parent account options for the dialog dropdown
  const parentOptions = useMemo(() => {
    const sameType = accounts.filter((a) => a.type === accountType);
    if (!editingAccount) {
      return sameType.sort((a, b) => a.code.localeCompare(b.code));
    }
    const excludeIds = getDescendantIds(accounts, editingAccount.id);
    excludeIds.add(editingAccount.id);
    return sameType
      .filter((a) => !excludeIds.has(a.id))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, accountType, editingAccount]);

  // ─── Expand / Collapse ──────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const ids = new Set<string>();
    accounts.forEach((a) => {
      if (accounts.some((child) => child.parentId === a.id)) {
        ids.add(a.id);
      }
    });
    setExpandedIds(ids);
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────

  function openCreate(presetType?: string, presetParentId?: string) {
    setEditingAccount(null);
    setAccountType(presetType || "ASSET");
    setParentId(presetParentId || "none");
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setAccountType(account.type);
    setParentId(account.parentId || "none");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: accountType,
      description: formData.get("description") as string,
      parentId: parentId === "none" ? null : parentId,
    };

    const url = editingAccount
      ? `/api/accounts/${editingAccount.id}`
      : "/api/accounts";
    const method = editingAccount ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingAccount ? "Account updated" : "Account created");
      setDialogOpen(false);
      setEditingAccount(null);
      setParentId("none");
      setAccountType("ASSET");
      fetchAccounts();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save account");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account? Child accounts will become root-level."))
      return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account deleted");
      fetchAccounts();
    } else {
      toast.error("Failed to delete account");
    }
  }

  // ─── Smart Import ─────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xlsx", ".xls"].includes(ext)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    setImportFile(file);
    setIsParsing(true);
    setParsedAccounts([]);

    try {
      const content = await file.text();
      const parsed = await parseCOAWithAI(content);
      setParsedAccounts(parsed);
      toast.success(`AI parsed ${parsed.length} accounts from ${file.name}`);
    } catch {
      toast.error("Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImportAccounts() {
    if (parsedAccounts.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const account of parsedAccounts) {
      try {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: account.code,
            name: account.name,
            type: account.type,
            description: account.description || null,
            parentId: null,
          }),
        });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setIsImporting(false);

    if (successCount > 0)
      toast.success(`Imported ${successCount} accounts successfully`);
    if (errorCount > 0)
      toast.error(`${errorCount} accounts failed to import (duplicates?)`);

    fetchAccounts();
    setImportSheetOpen(false);
    setParsedAccounts([]);
    setImportFile(null);
  }

  // ─── Tree Row Renderer ────────────────────────────────────────────────

  function renderTreeRow(node: TreeNode) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id}>
        {/* Row */}
        <div
          className="flex items-center gap-2 py-1.5 px-3 hover:bg-muted/50 rounded-md group transition-colors"
          style={{ paddingLeft: `${node.level * 24 + 12}px` }}
        >
          {/* Chevron */}
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm transition-colors ${
              hasChildren
                ? "hover:bg-muted cursor-pointer text-muted-foreground"
                : "text-transparent pointer-events-none"
            }`}
            tabIndex={hasChildren ? 0 : -1}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="w-4 h-4" />
            )}
          </button>

          {/* Code */}
          <span className="font-mono text-sm text-muted-foreground w-20 flex-shrink-0">
            {node.code}
          </span>

          {/* Name */}
          <span
            className={`flex-1 truncate ${
              hasChildren ? "font-semibold" : "font-medium"
            }`}
          >
            {node.name}
          </span>

          {/* Descendants count */}
          {hasChildren && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {countDescendants(node)}
            </Badge>
          )}

          {/* Description (large screens) */}
          <span className="text-sm text-muted-foreground truncate max-w-48 hidden lg:block">
            {node.description || ""}
          </span>

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Add child account"
              onClick={() => openCreate(node.type, node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEdit(node)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDelete(node.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeRow(child))}
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your account hierarchy and codes
            {!loading && (
              <span className="ml-1">
                &middot; {accounts.length} account{accounts.length !== 1 && "s"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setImportSheetOpen(true);
              setParsedAccounts([]);
              setImportFile(null);
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Smart Import
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {["ALL", ...ACCOUNT_TYPES].map((type) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {type === "ALL"
                ? "All"
                : type.charAt(0) + type.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 max-w-xs h-8"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
            Expand
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
            Collapse
          </Button>
        </div>
      </div>

      {/* Account Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading accounts...
          </span>
        </div>
      ) : typeEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No accounts found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery
                ? "No accounts match your search."
                : "Create your first account or import from a spreadsheet."}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setImportSheetOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Smart Import
                </Button>
                <Button onClick={() => openCreate()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        typeEntries.map(([type, trees]) => {
          const total = accounts.filter((a) => a.type === type).length;

          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{accountTypeEmoji[type]}</span>
                  <Badge className={accountTypeColors[type]}>{type}</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    ({total} account{total !== 1 && "s"})
                  </span>
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openCreate(type)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Column headers */}
                <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground font-medium border-b mb-1">
                  <span className="w-5 flex-shrink-0" />
                  <span className="w-20 flex-shrink-0">Code</span>
                  <span className="flex-1">Name</span>
                  <span className="max-w-48 hidden lg:block">Description</span>
                  <span className="w-[88px] text-right flex-shrink-0">
                    Actions
                  </span>
                </div>

                {/* Tree rows */}
                {trees.map((node) => renderTreeRow(node))}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* ─── Create / Edit Dialog ──────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingAccount(null);
            setAccountType("ASSET");
            setParentId("none");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "New Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Account Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="1000"
                  defaultValue={editingAccount?.code || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={accountType}
                  onValueChange={(value) => {
                    setAccountType(value);
                    setParentId("none"); // reset parent when type changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Cash and Cash Equivalents"
                defaultValue={editingAccount?.name || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentAccount">Parent Account</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent (root account)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No parent (root account)
                  </SelectItem>
                  {parentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} &mdash; {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Main cash account"
                defaultValue={editingAccount?.description || ""}
              />
            </div>

            <Button type="submit" className="w-full">
              {editingAccount ? "Update" : "Create"} Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Smart Import Sheet ────────────────────────────────────── */}
      <Sheet open={importSheetOpen} onOpenChange={setImportSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Smart Import
            </SheetTitle>
            <SheetDescription>
              Upload a CSV or Excel file and AI will automatically map columns
              to your chart of accounts structure.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 space-y-4">
            {/* Upload zone */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              {importFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-green-600" />
                  <p className="text-sm font-medium">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Click to upload CSV or Excel file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .csv, .xlsx, .xls formats
                  </p>
                </div>
              )}
            </div>

            {/* Parsing indicator */}
            {isParsing && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    AI is analyzing your file...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mapping columns and classifying account types
                  </p>
                </div>
              </div>
            )}

            {/* Parsed results preview */}
            {parsedAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Preview ({parsedAccounts.length} accounts detected)
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Mapped
                  </Badge>
                </div>

                <ScrollArea className="h-64 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-20">Type</TableHead>
                        <TableHead className="w-16 text-right">
                          Conf.
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAccounts.map((acc, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {acc.code}
                          </TableCell>
                          <TableCell className="text-sm">{acc.name}</TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${
                                accountTypeColors[acc.type] || ""
                              }`}
                            >
                              {acc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`text-xs font-mono ${
                                acc.confidence >= 0.9
                                  ? "text-green-600"
                                  : acc.confidence >= 0.8
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {Math.round(acc.confidence * 100)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800">
                    Review the mapped accounts above. Duplicate account codes
                    will be skipped during import.
                  </p>
                </div>
              </div>
            )}

            {/* Sample format hint */}
            {!importFile && !isParsing && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Expected CSV format</h4>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs leading-5 overflow-auto">
                  <p>Code,Name,Type,Description,ParentCode</p>
                  <p>1000,Assets,ASSET,Top-level assets,</p>
                  <p>1100,Current Assets,ASSET,Short-term,1000</p>
                  <p>1110,Cash,ASSET,Cash on hand,1100</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will auto-detect column headers even if they differ from
                  the example above.
                </p>
              </div>
            )}
          </div>

          <SheetFooter>
            {parsedAccounts.length > 0 && (
              <Button
                className="w-full"
                onClick={handleImportAccounts}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Import {parsedAccounts.length} Accounts
                  </>
                )}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
