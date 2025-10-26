import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Building2,
  Users,
  MessageSquare,
  Settings,
  CreditCard,
  Star,
  Plus,
  BarChart3,
  Package,
  Menu,
  X,
  Briefcase,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VendorSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const VendorSidebar = ({ sidebarOpen, setSidebarOpen }: VendorSidebarProps) => {
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/vendor/dashboard", icon: Home },
    { name: "My Properties", href: "/vendor/properties", icon: Building2 },
    { name: "Add Property", href: "/vendor/properties/add", icon: Plus },
    { name: "Leads", href: "/vendor/leads", icon: Users },
    { name: "Messages", href: "/vendor/messages", icon: MessageSquare },
    { name: "Analytics", href: "/vendor/analytics", icon: BarChart3 },
    // { name: "Packages", href: "/vendor/packages", icon: Package },
    { name: "Services", href: "/vendor/services", icon: Briefcase },
    { name: "Subscription", href: "/vendor/subscription-manager", icon: Crown },
    { name: "Billing", href: "/vendor/billing", icon: CreditCard },
    { name: "Reviews", href: "/vendor/reviews", icon: Star },
    { name: "Profile", href: "/vendor/profile", icon: Settings },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="flex h-16 items-center justify-end px-6 border-b border-sidebar-border lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <div className="text-xs text-sidebar-foreground/60">
              © 2024 Squares Vendor Portal
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorSidebar;