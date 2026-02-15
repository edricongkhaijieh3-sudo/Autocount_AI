"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  price: number | null;
  cost: number | null;
  isActive: boolean;
}

interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  baseUom: string;
  defaultPrice: number;
  defaultCost: number;
  hasVariants: boolean;
  isActive: boolean;
  variants: ProductVariant[];
}

// ─── Constants ──────────────────────────────────────────────────

const UOM_OPTIONS = [
  { value: "UNIT", label: "Unit" },
  { value: "PCS", label: "Pieces (PCS)" },
  { value: "KG", label: "Kilogram (KG)" },
  { value: "LTR", label: "Litre (LTR)" },
  { value: "BOX", label: "Box" },
  { value: "SET", label: "Set" },
];

const CATEGORY_OPTIONS = [
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Furniture",
  "Services",
  "Raw Materials",
  "Packaging",
  "Other",
];

const emptyForm = {
  code: "",
  name: "",
  category: "",
  description: "",
  baseUom: "UNIT",
  defaultPrice: "",
  defaultCost: "",
  hasVariants: false,
  isActive: true,
};

// ─── Helpers ────────────────────────────────────────────────────

function formatRM(value: number): string {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Page Component ─────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariantName, setNewVariantName] = useState("");

  const updateForm = (updates: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter) params.set("category", categoryFilter);
      const qs = params.toString();
      const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ─── Filtering ──────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    if (activeFilter === "active" && !p.isActive) return false;
    if (activeFilter === "inactive" && p.isActive) return false;
    return true;
  });

  // ─── Unique categories from existing products ───────────────

  const existingCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean) as string[])
  ).sort();

  const allCategories = Array.from(
    new Set([...CATEGORY_OPTIONS, ...existingCategories])
  ).sort();

  // ─── Variant Management ─────────────────────────────────────

  function addVariant() {
    const name = newVariantName.trim();
    if (!name) return;
    if (variants.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A variant with this name already exists");
      return;
    }
    setVariants((prev) => [
      ...prev,
      { name, sku: "", price: null, cost: null, isActive: true },
    ]);
    setNewVariantName("");
  }

  function addVariantOnEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addVariant();
    }
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, updates: Partial<ProductVariant>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...updates } : v))
    );
  }

  // ─── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.code.trim()) {
      toast.error("Product code is required");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (form.hasVariants && variants.length === 0) {
      toast.error("Add at least one variant or disable variants");
      return;
    }

    setSubmitting(true);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category || null,
      description: form.description.trim() || null,
      baseUom: form.baseUom,
      defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : 0,
      defaultCost: form.defaultCost ? parseFloat(form.defaultCost) : 0,
      hasVariants: form.hasVariants,
      isActive: form.isActive,
      variants: form.hasVariants
        ? variants.map((v) => ({
            id: v.id || undefined,
            name: v.name,
            sku: v.sku || null,
            price: v.price,
            cost: v.cost,
            isActive: v.isActive,
          }))
        : [],
    };

    const url = editingProduct
      ? `/api/products/${editingProduct.id}`
      : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          editingProduct ? "Product updated" : "Product created"
        );
        setDialogOpen(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save product");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted");
      fetchProducts();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete product");
    }
  }

  // ─── Toggle Active ─────────────────────────────────────────

  async function toggleActive(product: Product) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...product,
        isActive: !product.isActive,
        variants: product.variants,
      }),
    });
    if (res.ok) {
      toast.success(
        product.isActive ? "Product deactivated" : "Product activated"
      );
      fetchProducts();
    } else {
      toast.error("Failed to update product status");
    }
  }

  // ─── Dialog Open Helpers ────────────────────────────────────

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      code: product.code,
      name: product.name,
      category: product.category || "",
      description: product.description || "",
      baseUom: product.baseUom,
      defaultPrice: product.defaultPrice?.toString() || "",
      defaultCost: product.defaultCost?.toString() || "",
      hasVariants: product.hasVariants,
      isActive: product.isActive,
    });
    setVariants(
      product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku || "",
        price: v.price,
        cost: v.cost,
        isActive: v.isActive,
      }))
    );
    setNewVariantName("");
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setVariants([]);
    setNewVariantName("");
    setDialogOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Products
          </h1>
          <p className="text-muted-foreground">
            Manage your products and variants
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              setForm(emptyForm);
              setVariants([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingProduct ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Product
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Product
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Code & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Product Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. PRD-001"
                    value={form.code}
                    onChange={(e) => updateForm({ code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Wireless Mouse"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Category & UOM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => updateForm({ category: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base UOM</Label>
                  <Select
                    value={form.baseUom}
                    onValueChange={(v) => updateForm({ baseUom: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UOM_OPTIONS.map((uom) => (
                        <SelectItem key={uom.value} value={uom.value}>
                          {uom.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Product description (optional)"
                  value={form.description}
                  onChange={(e) =>
                    updateForm({ description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPrice">Default Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      RM
                    </span>
                    <Input
                      id="defaultPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.defaultPrice}
                      onChange={(e) =>
                        updateForm({ defaultPrice: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCost">Default Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      RM
                    </span>
                    <Input
                      id="defaultCost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.defaultCost}
                      onChange={(e) =>
                        updateForm({ defaultCost: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active Product
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive products won&apos;t appear in selections
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    updateForm({ isActive: !!checked })
                  }
                />
              </div>

              <Separator />

              {/* Has Variants Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="hasVariants" className="cursor-pointer">
                      Has Variants?
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to add size, color, or other variants
                    </p>
                  </div>
                </div>
                <Switch
                  id="hasVariants"
                  checked={form.hasVariants}
                  onCheckedChange={(checked) =>
                    updateForm({ hasVariants: !!checked })
                  }
                />
              </div>

              {/* Variant Generator UI */}
              {form.hasVariants && (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Variants
                      {variants.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {variants.length}
                        </Badge>
                      )}
                    </h3>
                  </div>

                  {/* Add variant input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder='Type variant name (e.g. "Red", "Large", "500ml")...'
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      onKeyDown={addVariantOnEnter}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addVariant}
                      disabled={!newVariantName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  {/* Variant rows */}
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_120px_120px_120px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                        <span>Name</span>
                        <span>SKU</span>
                        <span>Price (RM)</span>
                        <span>Cost (RM)</span>
                        <span></span>
                      </div>

                      {variants.map((variant, idx) => (
                        <div
                          key={variant.id || `new-${idx}`}
                          className="grid grid-cols-[1fr_120px_120px_120px_36px] gap-2 items-center"
                        >
                          {/* Variant name */}
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-normal shrink-0"
                            >
                              {variant.name}
                            </Badge>
                          </div>

                          {/* SKU */}
                          <Input
                            placeholder="SKU"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(idx, { sku: e.target.value })
                            }
                            className="h-8 text-sm"
                          />

                          {/* Price override */}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={
                              form.defaultPrice
                                ? `${Number(form.defaultPrice).toLocaleString("en-MY", { minimumFractionDigits: 2 })} (inherited)`
                                : "Inherited"
                            }
                            value={
                              variant.price !== null &&
                              variant.price !== undefined
                                ? variant.price
                                : ""
                            }
                            onChange={(e) =>
                              updateVariant(idx, {
                                price: e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              })
                            }
                            className="h-8 text-sm"
                          />

                          {/* Cost override */}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={
                              form.defaultCost
                                ? `${Number(form.defaultCost).toLocaleString("en-MY", { minimumFractionDigits: 2 })} (inherited)`
                                : "Inherited"
                            }
                            value={
                              variant.cost !== null &&
                              variant.cost !== undefined
                                ? variant.cost
                                : ""
                            }
                            onChange={(e) =>
                              updateVariant(idx, {
                                cost: e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              })
                            }
                            className="h-8 text-sm"
                          />

                          {/* Delete variant */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeVariant(idx)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      <p className="text-xs text-muted-foreground pt-1">
                        Leave price/cost empty to inherit from parent product (
                        {form.defaultPrice
                          ? formatRM(Number(form.defaultPrice))
                          : "RM 0.00"}
                        {" / "}
                        {form.defaultCost
                          ? formatRM(Number(form.defaultCost))
                          : "RM 0.00"}
                        )
                      </p>
                    </div>
                  )}

                  {variants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No variants yet. Type a name above and press Enter or
                      click Add.
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : editingProduct
                    ? "Update Product"
                    : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {/* Category filter */}
              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter(v === "ALL" ? "" : v)
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Active filter */}
              <Select
                value={activeFilter}
                onValueChange={(v) =>
                  setActiveFilter(v as "all" | "active" | "inactive")
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, or description..."
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
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-center">Variants</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-12"
                    >
                      {searchQuery || categoryFilter || activeFilter !== "all"
                        ? "No products match your filters"
                        : 'No products yet — click "Add Product" to get started'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className={!product.isActive ? "opacity-50" : ""}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {product.baseUom}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatRM(product.defaultPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatRM(product.defaultCost)}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.hasVariants ? (
                          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                            <Tag className="h-3 w-3 mr-1" />
                            {product.variants.length}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            product.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 cursor-pointer"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 cursor-pointer"
                          }
                          onClick={() => toggleActive(product)}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(product.id)}
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
