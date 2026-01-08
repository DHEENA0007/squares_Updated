import { ChevronLeft, ChevronRight, Home, CheckCircle, XCircle, Headphones, BarChart3, Package, FileText, UserCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SubAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

import { useRealtime } from "@/contexts/RealtimeContext";
import { useEffect, useState } from "react";

// ... existing imports ...

const SubAdminSidebar = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: SubAdminSidebarProps) => {
  const location = useLocation();
  const { subscribe } = useRealtime();

  const [counts, setCounts] = useState({
    properties: 0,
    vendors: 0,
    messages: 0
  });

  useEffect(() => {
    // Listen for live metrics from admin service (subadmins also get these if authorized)
    const unsubscribeMetrics = subscribe('admin:live-metrics', (data: any) => {
      if (data && data.alerts) {
        let propertyCount = 0;
        let vendorCount = 0;

        data.alerts.forEach((alert: any) => {
          if (alert.action === 'review_properties') {
            const match = alert.message.match(/(\d+)/);
            if (match) propertyCount = parseInt(match[1]);
          }
          if (alert.action === 'review_users') {
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
      path: '/subadmin/dashboard',
      icon: Home
    },
    {
      label: 'Vendor Approvals',
      path: '/subadmin/vendor-approvals',
      icon: UserCheck,
      count: counts.vendors
    },
    {
      label: 'Property Reviews',
      path: '/subadmin/property-reviews',
      icon: CheckCircle,
      count: counts.properties
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
      label: 'Messages',
      path: '/subadmin/messages',
      icon: MessageSquare,
      count: counts.messages
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Portal Badge */}
        {!isCollapsed && (
          <div className="p-3 mt-2 flex-shrink-0">
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
        <nav className="p-2 space-y-2 mt-2 flex-1 overflow-y-auto">
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

        {/* Footer Toggle */}
        <div className="p-2 border-t border-border mt-auto hidden lg:block">
          <button
            onClick={onToggle}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-accent text-foreground",
              isCollapsed && "justify-center"
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
            {!isCollapsed && <span className="font-medium text-sm">Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SubAdminSidebar;
