import { Home, CheckCircle, XCircle, Shield, Headphones, BarChart3, Star, Bell, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

interface SubAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const subAdminNavItems = [
  { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
  { icon: CheckCircle, label: "Property Review", path: "/admin/properties/review" },
  { icon: XCircle, label: "Property Approval", path: "/admin/properties/approval" },
  { icon: Shield, label: "Content Moderation", path: "/admin/content/moderation" },
  { icon: Headphones, label: "Support Tickets", path: "/admin/support/tickets" },
  { icon: BarChart3, label: "Performance Tracking", path: "/admin/performance" },
  { icon: Star, label: "Promotion Approval", path: "/admin/promotions/approval" },
  { icon: Bell, label: "Send Notifications", path: "/admin/notifications" },
  { icon: FileText, label: "Generate Reports", path: "/admin/reports" },
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
          <div className="p-3 mt-2">
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium text-center">
              Sub Admin Panel
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-2 mt-2">
          {subAdminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (location.pathname.startsWith(item.path) && item.path !== '/admin/dashboard');
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
