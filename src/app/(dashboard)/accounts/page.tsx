"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
}

const accountTypeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800",
  LIABILITY: "bg-red-100 text-red-800",
  EQUITY: "bg-purple-100 text-purple-800",
  REVENUE: "bg-green-100 text-green-800",
  EXPENSE: "bg-orange-100 text-orange-800",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [filter, setFilter] = useState("ALL");

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      description: formData.get("description") as string,
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
      fetchAccounts();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save account");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account deleted");
      fetchAccounts();
    } else {
      toast.error("Failed to delete account");
    }
  }

  const filtered =
    filter === "ALL" ? accounts : accounts.filter((a) => a.type === filter);

  const grouped = filtered.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your account categories and codes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAccount(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Account
            </Button>
          </DialogTrigger>
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
                    name="type"
                    defaultValue={editingAccount?.type || "ASSET"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="EQUITY">Equity</SelectItem>
                      <SelectItem value="REVENUE">Revenue</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Cash"
                  defaultValue={editingAccount?.name || ""}
                  required
                />
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
      </div>

      <div className="flex gap-2 flex-wrap">
        {["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(
          (type) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
            </Button>
          )
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading accounts...</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => {
            const order = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([type, accs]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={accountTypeColors[type]}>{type}</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    ({accs.length} accounts)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accs
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono text-sm">
                            {account.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {account.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.description || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingAccount(account);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                onClick={() => handleDelete(account.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}
