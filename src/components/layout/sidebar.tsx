"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Palette,
  Package,
  Shield,
  ChevronDown,
  Coins,
  FileBarChart,
  FolderTree,
  Building2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Navigation Structure ────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavSection {
  title: string;
  groups: NavGroup[];
}

const standalone: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const masterData: NavSection = {
  title: "MASTER DATA",
  groups: [
    {
      label: "General",
      items: [
        { name: "Currencies", href: "/currencies", icon: Coins },
        { name: "Tax Entities", href: "/tax-entities", icon: Shield },
        { name: "Tax Codes", href: "/tax-codes", icon: Receipt },
        { name: "Tariff Codes", href: "/tariff-codes", icon: FileBarChart },
      ],
    },
    {
      label: "Accounting",
      items: [
        { name: "Chart of Accounts", href: "/accounts", icon: BookOpen },
        { name: "Customers", href: "/contacts?type=CUSTOMER", icon: User },
        { name: "Suppliers", href: "/contacts?type=VENDOR", icon: Building2 },
      ],
    },
    {
      label: "Sales & Purchase",
      items: [
        { name: "Products", href: "/products", icon: Package },
        { name: "Product Categories", href: "/product-categories", icon: FolderTree },
      ],
    },
  ],
};

const transactions: NavSection = {
  title: "TRANSACTIONS",
  groups: [
    {
      label: "",
      items: [
        { name: "Journal", href: "/journal", icon: FileText },
        { name: "Invoices", href: "/invoices", icon: Receipt },
      ],
    },
  ],
};

const bottomNav: NavItem[] = [
  { name: "Templates", href: "/templates", icon: Palette },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

// ─── Sidebar Component ───────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "MASTER DATA": true,
    TRANSACTIONS: true,
  });

  function toggleSection(title: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }

  function isActive(href: string): boolean {
    // Strip query params for comparison
    const basePath = href.split("?")[0];
    if (pathname === basePath) return true;
    if (pathname?.startsWith(basePath + "/")) return true;
    // Check if query params match for contacts filtering
    if (href.includes("?") && pathname === "/contacts") {
      return false; // Don't highlight both Customer & Supplier when on /contacts
    }
    return false;
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
          active
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        <item.icon
          className={cn(
            "mr-3 h-4 w-4 flex-shrink-0",
            active
              ? "text-blue-400"
              : "text-slate-400 group-hover:text-slate-300"
          )}
        />
        {item.name}
      </Link>
    );
  }

  function Section({ section }: { section: NavSection }) {
    const isExpanded = expandedSections[section.title] !== false;

    return (
      <div>
        <button
          onClick={() => toggleSection(section.title)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
        >
          {section.title}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              isExpanded ? "" : "-rotate-90"
            )}
          />
        </button>

        {isExpanded && (
          <div className="space-y-3 mt-1">
            {section.groups.map((group) => (
              <div key={group.label || "ungrouped"}>
                {group.label && (
                  <div className="px-3 py-1 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5 pl-1">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-white tracking-tight">
            <span className="text-blue-400">Auto</span>Count
          </h1>
        </div>

        <nav className="mt-8 flex-1 px-2 space-y-1">
          {/* Dashboard */}
          {standalone.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Divider */}
          <div className="pt-4" />

          {/* Master Data */}
          <Section section={masterData} />

          {/* Divider */}
          <div className="pt-3" />

          {/* Transactions */}
          <Section section={transactions} />

          {/* Divider */}
          <div className="pt-3" />

          {/* Bottom nav */}
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
