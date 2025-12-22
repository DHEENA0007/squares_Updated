import { useState } from "react";
import { Outlet } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import VendorNavbar from "@/components/vendor/VendorNavbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        {/* Unified navbar at top */}
        <VendorNavbar setSidebarOpen={toggleMobileSidebar} />

        {/* Sidebar and main content below navbar */}
        <div className="flex flex-1 overflow-hidden">
          <VendorSidebar 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={closeMobileSidebar}
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
          />

          <main className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
          )}>
            <div className="p-4 lg:p-6">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default VendorLayout;