import { ChevronLeft, ChevronRight, Home, Users, UserCheck, MessageSquare, Shield, Building2, CreditCard, Package, Filter, Menu, Wrench, FileText, Bell, Star, BarChart3, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

import { useRealtime } from "@/contexts/RealtimeContext";
import { useEffect, useState } from "react";

// ... existing imports ...

const Sidebar = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: SidebarProps) => {
  const location = useLocation();
  const { subscribe } = useRealtime();

  const [counts, setCounts] = useState({
    properties: 0,
    vendors: 0,
    messages: 0
  });

  useEffect(() => {
    // Listen for live metrics from admin service
    const unsubscribeMetrics = subscribe('admin:live-metrics', (data: any) => {
      if (data && data.alerts) {
        let propertyCount = 0;
        let vendorCount = 0;

        data.alerts.forEach((alert: any) => {
          if (alert.action === 'review_properties') {
            // Extract number from message "X properties pending review"
            const match = alert.message.match(/(\d+)/);
            if (match) propertyCount = parseInt(match[1]);
          }
          if (alert.action === 'review_users') {
            // Extract number from message "X users pending approval"
            const match = alert.message.match(/(\d+)/);
            if (match) vendorCount = parseInt(match[1]);
          }
        });

        setCounts(prev => ({
          ...prev,
          properties: propertyCount,
          vendors: vendorCount
        }));
      }
    });

    // Listen for new messages
    const unsubscribeMessages = subscribe('new_message', () => {
      setCounts(prev => ({
        ...prev,
        messages: prev.messages + 1
      }));
    });

    // Listen for direct notifications
    const unsubscribeNotifications = subscribe('admin:notification', (data: any) => {
      if (data.type === 'property_created') {
        setCounts(prev => ({ ...prev, properties: prev.properties + 1 }));
      }
      if (data.type === 'vendor_created') {
        setCounts(prev => ({ ...prev, vendors: prev.vendors + 1 }));
      }
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeMessages();
      unsubscribeNotifications();
    };
  }, [subscribe]);

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
      label: 'Subscribed Users',
      path: '/admin/clients',
      icon: Users
    },
    {
      label: 'Vendor Approvals',
      path: '/admin/vendor-approvals',
      icon: UserCheck,
      count: counts.vendors
    },
    {
      label: 'Messages',
      path: '/admin/messages',
      icon: MessageSquare,
      count: counts.messages
    },
    {
      label: 'Roles',
      path: '/admin/roles',
      icon: Shield
    },
    {
      label: 'Property Approvals',
      path: '/admin/properties',
      icon: Building2,
      count: counts.properties
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
      label: 'Notifications',
      path: '/admin/notifications',
      icon: Bell
    },
    {
      label: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3
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
      label: 'Hero Management',
      path: '/admin/hero-management',
      icon: Image,
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 overflow-y-auto",
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
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative",
                  "hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  !isActive && "text-foreground",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isCollapsed && (item.count || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {(item.count || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center">
                          {item.count}
                        </Badge>
                      )}
                      {item.badge && (
                        <Badge variant="outline" className="text-xs ml-2">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
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
