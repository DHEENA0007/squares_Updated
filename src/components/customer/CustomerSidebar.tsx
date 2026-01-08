import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Home, Search, Heart, GitCompare, HomeIcon as HouseIcon, MessageSquare, Star, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Badge } from "@/components/ui/badge";

interface CustomerSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const CustomerSidebar = ({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: CustomerSidebarProps) => {
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
      path: '/customer/dashboard',
      icon: Home
    },
    {
      label: 'Search Properties',
      path: '/customer/search',
      icon: Search
    },
    {
      label: 'My Favorites',
      path: '/customer/favorites',
      icon: Heart
    },
    {
      label: 'Compare',
      path: '/customer/compare',
      icon: GitCompare
    },
    {
      label: 'Owned Properties',
      path: '/customer/owned-properties',
      icon: HouseIcon
    },
    {
      label: 'Messages',
      path: '/customer/messages',
      icon: MessageSquare,
      count: messageCount
    },
    {
      label: 'Reviews',
      path: '/customer/reviews',
      icon: Star
    },
    {
      label: 'Profile',
      path: '/customer/profile',
      icon: User
    },
    {
      label: 'Settings',
      path: '/customer/settings',
      icon: Settings
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
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-50 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Portal Badge */}
        {!isCollapsed && (
          <div className="p-3 mt-2 flex-shrink-0">
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-pink-600">
              <p className="text-sm font-semibold text-center text-white">
                Customer Portal
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

export default CustomerSidebar;
