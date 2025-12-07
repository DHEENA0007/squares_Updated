import { ChevronLeft, ChevronRight, Home, CheckCircle, XCircle, Headphones, BarChart3, Package, FileText, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SubAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const SubAdminSidebar = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: SubAdminSidebarProps) => {
  const location = useLocation();

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/subadmin/dashboard',
      icon: Home
    },
    {
      label: 'Vendor Approvals',
      path: '/subadmin/vendor-approvals',
      icon: UserCheck
    },
    {
      label: 'Property Reviews',
      path: '/subadmin/property-reviews',
      icon: CheckCircle
    },
    {
      label: 'Property Rejections',
      path: '/subadmin/property-rejections',
      icon: XCircle
    },
    {
      label: 'Support Tickets',
      path: '/subadmin/support-tickets',
      icon: Headphones
    },
    {
      label: 'Vendor Performance',
      path: '/subadmin/vendor-performance',
      icon: BarChart3
    },
    {
      label: 'Addon Services',
      path: '/subadmin/addon-services',
      icon: Package
    },
    {
      label: 'Reports',
      path: '/subadmin/reports',
      icon: FileText
    },
    {
      label: 'Privacy Policy',
      path: '/subadmin/policy-editor/privacy-policy',
      icon: FileText,
      badge: 'Policy'
    },
    {
      label: 'Refund Policy',
      path: '/subadmin/policy-editor/refund-policy',
      icon: FileText,
      badge: 'Policy'
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[70] lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 bg-background border-r border-border z-[70] transition-all duration-300 overflow-y-auto",
          "lg:relative lg:top-0",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Toggle button - desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute right-1 top-2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center hover:bg-secondary transition-colors z-50"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Portal Badge */}
        {!isCollapsed && (
          <div className="p-3 mt-2">
            <div className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <p className="text-sm font-semibold text-center text-blue-700 dark:text-blue-300">
                Sub Admin Portal
              </p>
              <p className="text-xs text-center mt-1 text-blue-600 dark:text-blue-400">
                Content & Support Management
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-2 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  !isActive && "text-foreground",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
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
