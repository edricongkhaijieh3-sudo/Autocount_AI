"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import {
  Building2,
  Plus,
  Search,
  LogOut,
  Settings,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyItem {
  id: string;
  name: string;
  industry: string | null;
  role: string;
  createdAt: string;
  isActive: boolean;
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const { update } = useSession();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function selectCompany(companyId: string) {
    setSwitching(companyId);
    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        toast.error("Failed to switch company");
        setSwitching(null);
        return;
      }

      // Refresh the NextAuth JWT so all pages see the new companyId
      await update();

      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
      setSwitching(null);
    }
  }

  async function createCompany() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create company");
        setCreating(false);
        return;
      }

      const newCompany = await res.json();
      toast.success(`"${newCompany.name}" created!`);
      setNewName("");
      setCreateOpen(false);
      fetchCompanies();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-bold">
            <span className="text-blue-600">Auto</span>Count
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Please select a company
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which company you want to work with
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Company
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Company table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-600 hover:bg-blue-600">
                  <TableHead className="text-white font-semibold">
                    Company Name
                  </TableHead>
                  <TableHead className="text-white font-semibold hidden sm:table-cell">
                    Industry
                  </TableHead>
                  <TableHead className="text-white font-semibold hidden md:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="text-white font-semibold text-right w-40">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {search
                            ? "No companies match your search"
                            : "No companies yet. Create your first one!"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((company) => (
                    <TableRow
                      key={company.id}
                      className="group cursor-pointer hover:bg-blue-50/50"
                      onClick={() => selectCompany(company.id)}
                    >
                      <TableCell>
                        <button
                          className="text-left text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectCompany(company.id);
                          }}
                        >
                          {company.name}
                        </button>
                        {company.isActive && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground capitalize">
                        {company.industry || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground capitalize">
                        {company.role}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectCompany(company.id);
                            }}
                            disabled={switching === company.id}
                            className="gap-1.5"
                          >
                            {switching === company.id ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            ) : (
                              <BookOpen className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Open</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Empty rows to fill space like the screenshot */}
                {!loading &&
                  filtered.length > 0 &&
                  filtered.length < 5 &&
                  Array.from({ length: 5 - filtered.length }).map((_, i) => (
                    <TableRow key={`empty-${i}`}>
                      <TableCell colSpan={4} className="h-12">
                        &nbsp;
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create company dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Create New Company
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCompany();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g. My Business Sdn Bhd"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creating ? "Creating..." : "Create Company"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
