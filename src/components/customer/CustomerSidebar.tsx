import { ChevronLeft, ChevronRight, Home, Search, Heart, GitCompare, HomeIcon as HouseIcon, MessageSquare, Star, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

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
      icon: MessageSquare
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
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-pink-600">
              <p className="text-sm font-semibold text-center text-white">
                Customer Portal
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

export default CustomerSidebar;
