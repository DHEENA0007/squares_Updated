import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useUserPages } from "@/hooks/useUserPages";
import { Badge } from "@/components/ui/badge";

interface DynamicSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  portalBadge?: {
    title: string;
    subtitle?: string;
    gradient?: string;
    bgColor?: string;
    textColor?: string;
  };
}

const DynamicSidebar = ({ 
  isCollapsed, 
  onToggle, 
  isMobileOpen, 
  onMobileClose,
  portalBadge 
}: DynamicSidebarProps) => {
  const location = useLocation();
  const userPages = useUserPages();

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
          "fixed left-0 top-0 bottom-0 bg-background border-r border-border z-40 transition-all duration-300 overflow-y-auto",
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
        {!isCollapsed && portalBadge && (
          <div className="p-3 mt-2">
            <div 
              className={cn(
                "px-3 py-2 rounded-lg",
                portalBadge.gradient || portalBadge.bgColor || "bg-gradient-to-r from-purple-600 to-blue-600"
              )}
            >
              <p className={cn(
                "text-sm font-semibold text-center",
                portalBadge.textColor || "text-white"
              )}>
                {portalBadge.title}
              </p>
              {portalBadge.subtitle && (
                <p className={cn(
                  "text-xs text-center mt-1",
                  portalBadge.textColor || "text-white/90"
                )}>
                  {portalBadge.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-2 mt-2">
          {userPages.length === 0 && !isCollapsed && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No pages available for your role
            </div>
          )}
          
          {userPages.map((page) => {
            const Icon = page.icon;
            const isActive = location.pathname === page.path;
            
            return (
              <Link
                key={page.id}
                to={page.path}
                onClick={onMobileClose}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  !isActive && "text-foreground",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? page.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-sm">{page.label}</span>
                    {page.subLabel && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {page.subLabel}
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

export default DynamicSidebar;
