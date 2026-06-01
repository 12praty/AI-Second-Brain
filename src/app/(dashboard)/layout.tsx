import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { CaptureProvider } from "@/components/capture-context";
import { QuickCapture } from "@/components/quick-capture";
import { MobileTopbar } from "@/components/mobile-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <CaptureProvider>
      <div className="min-h-screen flex bg-bg-base">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopbar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <QuickCapture />
      </div>
    </CaptureProvider>
  );
}
