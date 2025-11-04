import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SubAdminSidebar from "./SubAdminSidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isSuperAdmin, isSubAdmin } = useAuth();

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
      <Navbar onMenuClick={toggleMobileSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {isSuperAdmin ? (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
        ) : (
          <SubAdminSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
        )}
        
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 lg:p-6 transition-all duration-300"
          )}
        >
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
