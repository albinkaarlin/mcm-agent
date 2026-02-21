import { CampaignStepper } from "@/components/CampaignStepper";
import markLogo from "@/assets/mark-logo.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border" style={{ background: 'linear-gradient(135deg, #683c19, #3f240f)' }}>
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src={markLogo} alt="Mark logo" className="h-7 w-7" />
            <span className="text-xl font-display font-bold tracking-tight text-primary-foreground">
              Mark
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
