import { Header } from "@/components/layout/header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { BookingsList } from "@/components/dashboard/bookings-list";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";

export const metadata = {
  title: "Dashboard — LiveCity для бизнеса",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Управляйте вашим заведением и отслеживайте Live Score
            </p>
          </div>

          <DashboardOverview />

          <div className="grid gap-6 lg:grid-cols-2">
            <BookingsList />
            <AnalyticsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
