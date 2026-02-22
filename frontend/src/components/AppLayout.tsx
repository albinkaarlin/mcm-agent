import { NavLink } from "@/components/NavLink";
import markLogo from "@/assets/mark-logo.png";
import { LayoutList, PlusCircle, Palette } from "lucide-react";

function SidebarNavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
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
      {label}
    </NavLink>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen flex flex-col">
        {/* Logo area */}
        <div
          className="flex items-center gap-2 px-5 py-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #683c19, #3f240f)" }}
        >
          <img src={markLogo} alt="Mark" className="h-6 w-6" />
          <span className="text-lg font-display font-bold text-white tracking-tight">
            Mark
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5">
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
          <SidebarNavItem
            to="/brand"
            icon={<Palette className="h-4 w-4" />}
            label="Brand"
          />
        </nav>

        {/* Version footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[11px] text-muted-foreground font-mono-display">
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
