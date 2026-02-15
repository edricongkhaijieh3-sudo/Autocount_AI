import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <ChatPanel />
    </div>
  );
}
