import { useState } from "react";
import SubAdminSidebar from "./SubAdminSidebar";
import Navbar from "../adminpanel/Navbar";
import SubAdminFooter from "./SubAdminFooter";
import { cn } from "@/lib/utils";
import { useTrafficTracking } from "@/hooks/useTrafficTracking";

interface SubAdminLayoutProps {
  children: React.ReactNode;
}

const SubAdminLayout = ({ children }: SubAdminLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Track page visits for analytics
  useTrafficTracking({ pageType: 'admin' });

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar with proper z-index */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar onMenuClick={toggleMobileSidebar} />
      </div>

      {/* Content with proper spacing */}
      <div className="flex flex-1 pt-14 xs:pt-15 sm:pt-16">
        <SubAdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />

        {/* Main content area with footer */}
        <main className={cn("flex-1 flex flex-col min-h-[calc(100vh-3.5rem)]", isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
          <div className="flex-1 p-6">
            {children}
          </div>
          <SubAdminFooter />
        </main>
      </div>
    </div>
  );
};

export default SubAdminLayout;