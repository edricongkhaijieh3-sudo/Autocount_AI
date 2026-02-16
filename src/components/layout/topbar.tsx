"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Building2, ArrowLeftRight, Menu } from "lucide-react";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const companyName = (session?.user as any)?.companyName || "My Company";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-3 sm:px-6">
      {/* Mobile: Hamburger + Logo */}
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center justify-between min-w-0">
        {/* Company name — visible on all screens */}
        <button
          onClick={() => router.push("/select-company")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group min-w-0"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{companyName}</span>
          <ArrowLeftRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
        </button>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-0.5 leading-none">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/select-company")}>
              <Building2 className="mr-2 h-4 w-4" />
              Switch Company
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
