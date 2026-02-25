import Sidebar from "@/components/Sidebar";
import DashboardGuard from "@/components/DashboardGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </DashboardGuard>
  );
}
