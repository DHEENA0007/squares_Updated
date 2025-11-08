import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DynamicSidebar from "@/components/common/DynamicSidebar";

interface VendorSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const VendorSidebar = ({ sidebarOpen, setSidebarOpen }: VendorSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile close button overlay - only show on mobile */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <div className="flex h-16 items-center justify-end px-6 border-b border-sidebar-border bg-sidebar">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "lg:block",
        sidebarOpen ? "block" : "hidden"
      )}>
        <DynamicSidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>
    </>
  );
};

export default VendorSidebar;