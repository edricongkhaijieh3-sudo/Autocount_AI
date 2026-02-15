"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and company settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Your company details used across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Company:</span> {(session?.user as any)?.companyName || "—"}</p>
            <p><span className="font-medium">User:</span> {session?.user?.name || "—"}</p>
            <p><span className="font-medium">Email:</span> {session?.user?.email || "—"}</p>
            <p><span className="font-medium">Role:</span> {(session?.user as any)?.role || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
