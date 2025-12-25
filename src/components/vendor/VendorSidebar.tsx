import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Home, Building2, Plus, MessageSquare, BarChart3, Crown, CreditCard, Star, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Badge } from "@/components/ui/badge";

interface VendorSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const VendorSidebar = ({ sidebarOpen, setSidebarOpen, isCollapsed, onToggle }: VendorSidebarProps) => {
  const location = useLocation();
  const { subscribe } = useRealtime();
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const unsubscribeMessages = subscribe('new_message', () => {
      setMessageCount(prev => prev + 1);
    });

    // Also listen for message notifications
    const unsubscribeNotifications = subscribe('message_notification', () => {
      setMessageCount(prev => prev + 1);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
    };
  }, [subscribe]);

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/vendor/dashboard',
      icon: Home
    },
    {
      label: 'My Properties',
      path: '/vendor/properties',
      icon: Building2
    },
    {
      label: 'Add Property',
      path: '/vendor/properties/add',
      icon: Plus
    },
    {
      label: 'Messages',
      path: '/vendor/messages',
      icon: MessageSquare,
      count: messageCount
    },
    {
      label: 'Analytics',
      path: '/vendor/analytics',
      icon: BarChart3
    },
    {
      label: 'Subscription',
      path: '/vendor/subscription-manager',
      icon: Crown
    },
    {
      label: 'Billing',
      path: '/vendor/billing',
      icon: CreditCard
    },
    {
      label: 'Reviews',
      path: '/vendor/reviews',
      icon: Star
    },
    {
      label: 'Profile',
      path: '/vendor/profile',
      icon: Settings
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 overflow-y-auto",
          isCollapsed ? "w-16" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-teal-600">
              <p className="text-sm font-semibold text-center text-white">
                Vendor Portal
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
                onClick={() => setSidebarOpen(false)}
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
                    {(item.count || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center">
                        {item.count}
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

export default VendorSidebar;
