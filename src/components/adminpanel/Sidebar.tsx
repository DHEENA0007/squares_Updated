import { Home, Users, ChevronLeft, ChevronRight, PaintRoller, LandPlot, SquareChartGantt, NotebookPen, Package, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: MessageSquare, label: "Messages", path: "/admin/messages" },
  { icon: PaintRoller, label: "Roles", path: "/admin/roles" },
  { icon: SquareChartGantt, label: "Clients", path: "/admin/clients" },
  { icon: LandPlot, label: "Properties", path: "/admin/properties" },
  { icon: NotebookPen, label: "Plans", path: "/admin/plans" },
  { icon: Package, label: "Addons", path: "/admin/addons" },
];

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 overflow-y-auto",
          "lg:relative lg:top-16",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Toggle button - desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute right-1 top-2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center hover:bg-secondary transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Super Admin Badge */}
        {!isCollapsed && (
          <div className="p-3 mt-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium text-center">
              Super Admin Panel
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  !isActive && "text-foreground",
                  isCollapsed && "justify-center"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
