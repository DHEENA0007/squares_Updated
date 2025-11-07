import { 
  Home, 
  CheckCircle, 
  XCircle, 
  Shield, 
  HeadphonesIcon, 
  TrendingUp, 
  Package, 
  Bell, 
  BarChart3,
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

interface SubAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const subAdminNavItems = [
  { icon: Home, label: "Dashboard", path: "/subadmin/dashboard" },
  { icon: CheckCircle, label: "Property Reviews", path: "/subadmin/property-reviews" },
  { icon: XCircle, label: "Property Rejections", path: "/subadmin/property-rejections" },
  { icon: Shield, label: "Content Moderation", path: "/subadmin/content-moderation" },
  { icon: HeadphonesIcon, label: "Support Tickets", path: "/subadmin/support-tickets" },
  { icon: TrendingUp, label: "Vendor Performance", path: "/subadmin/vendor-performance" },
  { icon: Package, label: "Addon Services", path: "/subadmin/addon-services" },
  { icon: Bell, label: "Notifications", path: "/subadmin/notifications" },
  { icon: BarChart3, label: "Reports", path: "/subadmin/reports" },
];

const SubAdminSidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SubAdminSidebarProps) => {
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

        {/* Sub Admin Badge */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border">
            <div className="bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-lg text-center">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Sub Admin Portal
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Content & Support Management
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-2 mt-4">
          {subAdminNavItems.map((item) => {
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

export default SubAdminSidebar;
