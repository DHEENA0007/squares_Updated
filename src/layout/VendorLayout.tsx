import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import VendorNavbar from "@/components/vendor/VendorNavbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useTrafficTracking } from "@/hooks/useTrafficTracking";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const location = useLocation();
  const isMessagesPage = location.pathname.includes('/messages');

  // Track page visits for analytics
  useTrafficTracking({ pageType: 'dashboard' });

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
        <div className="flex flex-1 overflow-hidden pt-14 xs:pt-15 sm:pt-16">
          <VendorSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={closeMobileSidebar}
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
          />

          <main className={cn(
            "flex-1 transition-all duration-300",
            isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64",
            isMessagesPage ? "overflow-hidden" : "overflow-y-auto"
          )}>
            <div className={isMessagesPage ? "h-full" : "p-4 lg:p-6"}>
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