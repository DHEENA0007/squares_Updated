import { ChevronLeft, ChevronRight, Home, Users, UserCheck, MessageSquare, Shield, Building2, CreditCard, Package, Filter, Menu, Wrench, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: SidebarProps) => {
  const location = useLocation();

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: Home
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: Users
    },
    {
      label: 'Vendor Approvals',
      path: '/admin/vendor-approvals',
      icon: UserCheck
    },
    {
      label: 'Messages',
      path: '/admin/messages',
      icon: MessageSquare
    },
    {
      label: 'Roles',
      path: '/admin/roles',
      icon: Shield
    },
    {
      label: 'Clients',
      path: '/admin/clients',
      icon: Building2
    },
    {
      label: 'Properties',
      path: '/admin/properties',
      icon: Building2
    },
    {
      label: 'Plans',
      path: '/admin/plans',
      icon: CreditCard
    },
    {
      label: 'Addons',
      path: '/admin/addons',
      icon: Package
    },
    {
      label: 'Property Management',
      path: '/admin/property-management',
      icon: Wrench,
      badge: 'Config'
    },
    {
      label: 'Filter Management',
      path: '/admin/filter-management',
      icon: Filter,
      badge: 'Config'
    },
    {
      label: 'Navigation Management',
      path: '/admin/navigation-management',
      icon: Menu,
      badge: 'Config'
    },
    {
      label: 'Privacy Policy',
      path: '/admin/policy-editor/privacy-policy',
      icon: FileText,
      badge: 'Policy'
    },
    {
      label: 'Refund Policy',
      path: '/admin/policy-editor/refund-policy',
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
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
              <p className="text-sm font-semibold text-center text-white">
                Super Admin Panel
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

export default Sidebar;
