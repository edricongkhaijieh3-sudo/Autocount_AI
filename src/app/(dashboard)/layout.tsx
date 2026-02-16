"use client";

import { useState } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { PageContextProvider } from "@/lib/page-context";
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <PageContextProvider>
      <OnboardingGuard>
        <div className="min-h-screen bg-gray-50">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Mobile sidebar drawer */}
          <MobileSidebar
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <div className="md:pl-64 flex flex-col flex-1">
            <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
            <main className="flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </OnboardingGuard>
      {/* ChatPanel is OUTSIDE the OnboardingGuard so it's always accessible */}
      <ChatPanel />
    </PageContextProvider>
  );
}
