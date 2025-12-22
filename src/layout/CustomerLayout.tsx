import { useState } from "react";
import { Outlet } from "react-router-dom";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerSidebar from "@/components/customer/CustomerSidebar";
import { cn } from "@/lib/utils";

const CustomerLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <CustomerNavbar onMenuClick={toggleMobileSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <CustomerSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        
        <main className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;