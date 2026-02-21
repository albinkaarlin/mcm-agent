import { CampaignStepper } from "@/components/CampaignStepper";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Mark
            </span>
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground font-mono-display">
              AI
            </span>
          </div>
          <CampaignStepper />
          <div className="w-[100px]" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">{children}</main>
    </div>
  );
}
