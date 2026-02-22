import { NavLink } from "@/components/NavLink";
import { useHubSpotStore } from "@/lib/hubspot-store";
import markLogo from "@/assets/mark-logo.png";
import { LayoutList, PlusCircle, Palette, Plug, CheckCircle2 } from "lucide-react";

function SidebarSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
      {label}
    </p>
  );
}

function SidebarNavItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-150"
      activeClassName="bg-secondary text-secondary-foreground font-semibold"
    >
      <span className="h-4 w-4 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge}
    </NavLink>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const hubspotConnected = useHubSpotStore((s) => s.connected);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen flex flex-col">
        {/* Logo area */}
        <div
          className="flex items-center gap-2.5 px-5 py-[18px] shrink-0"
          style={{ background: "linear-gradient(135deg, #683c19, #3f240f)" }}
        >
          <img src={markLogo} alt="Mark" className="h-7 w-7" />
          <div className="leading-none">
            <p className="text-[15px] font-display font-bold text-white tracking-tight">
              Mark
            </p>
            <p className="text-[10px] text-white/50 font-mono-display mt-0.5">
              AI Campaign Agent
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 pb-3 overflow-y-auto">
          <SidebarSection label="Workspace" />
          <SidebarNavItem
            to="/campaigns"
            icon={<LayoutList className="h-4 w-4" />}
            label="Campaigns"
          />
          <SidebarNavItem
            to="/create"
            icon={<PlusCircle className="h-4 w-4" />}
            label="Create"
          />

          <SidebarSection label="Settings" />
          <SidebarNavItem
            to="/brand"
            icon={<Palette className="h-4 w-4" />}
            label="Brand"
          />
          <SidebarNavItem
            to="/"
            icon={<Plug className="h-4 w-4" />}
            label="Integrations"
            badge={
              hubspotConnected ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              )
            }
          />
        </nav>

        {/* HubSpot status footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-3 py-2.5">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                hubspotConnected ? "bg-emerald-500" : "bg-sidebar-foreground/20"
              }`}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-sidebar-foreground truncate">
                HubSpot CRM
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {hubspotConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] text-sidebar-foreground/30 font-mono-display">
            Mark AI v1.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
