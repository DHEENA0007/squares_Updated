import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Home, Building2, Plus, MessageSquare, BarChart3, Crown, CreditCard, Star, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface VendorSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const VendorSidebar = ({ sidebarOpen, setSidebarOpen, isCollapsed, onToggle }: VendorSidebarProps) => {
  const location = useLocation();
  const { subscribe } = useRealtime();
  const { user } = useAuth();
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
      label: 'Notifications',
      path: '/vendor/notifications',
      icon: Bell
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
          "fixed left-0 top-16 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* User Profile Section */}
        <div className={cn("p-4 flex flex-col items-center border-b border-border/50", isCollapsed ? "px-2" : "px-4")}>
          <Avatar className={cn("transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-16 h-16 mb-3")}>
            <AvatarImage src={user?.profile?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.profile?.firstName?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Welcome Back!</p>
              <h3 className="font-bold text-sm truncate max-w-[180px]">
                {user?.profile?.firstName} {user?.profile?.lastName}
              </h3>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 mt-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
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
        <div className="p-3 border-t border-border mt-auto hidden lg:block">
          <button
            onClick={onToggle}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-accent text-muted-foreground hover:text-foreground",
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

export default VendorSidebar;
