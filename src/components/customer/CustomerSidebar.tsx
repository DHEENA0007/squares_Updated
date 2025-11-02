import { 
  Home, 
  Search, 
  Heart, 
  GitCompare, 
  Building,
  MessageSquare,
  Wrench,
  Star,
  User,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

interface CustomerSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { icon: Home, label: "Dashboard", path: "/customer/dashboard" },
  { icon: Search, label: "Search Properties", path: "/customer/search" },
  { icon: Heart, label: "My Favorites", path: "/customer/favorites" },
  { icon: GitCompare, label: "Compare", path: "/customer/compare" },
  { icon: Building, label: "My Properties", path: "/customer/my-properties" },
  { icon: MessageSquare, label: "Messages", path: "/customer/messages" },
  { icon: Wrench, label: "Services", path: "/customer/services" },
  { icon: Star, label: "Reviews", path: "/customer/reviews" },
  { icon: User, label: "Profile", path: "/customer/profile" },
  { icon: Settings, label: "Settings", path: "/customer/settings" },
];

const CustomerSidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: CustomerSidebarProps) => {
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
          "fixed top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border z-40 transition-all duration-300 flex flex-col",
          "lg:relative lg:top-0 lg:h-full",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Toggle button for desktop */}
        <button
          onClick={onToggle}
          className={cn(
            "hidden lg:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-card border border-border items-center justify-center hover:bg-accent/10 transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-accent/10 hover:text-accent-foreground",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0")} />
                {!isCollapsed && (
                  <span className="font-medium truncate" style={{ fontSize: 'var(--sidebar-font-size)' }}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">BuildHomeMart</p>
              <p>Customer Portal v1.0</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default CustomerSidebar;