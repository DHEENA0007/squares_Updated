import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SubAdminSidebar from "@/components/subadmin/SubAdminSidebar";
import UniversalSidebar from "@/components/common/UniversalSidebar";
import AdminFooter from "./AdminFooter";
import SubAdminFooter from "@/components/subadmin/SubAdminFooter";
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar with proper z-index */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar onMenuClick={toggleMobileSidebar} />
      </div>

      {/* Content with proper spacing */}
      <div className="flex flex-1 pt-14 xs:pt-15 sm:pt-16">
        {isSuperAdmin ? (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
        ) : isSubAdmin ? (
          <SubAdminSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
        ) : (
          <UniversalSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={closeMobileSidebar}
          />
        )}

        <main
          className={cn(
            "flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] transition-all duration-300"
          )}
        >
          <div className="flex-1 p-6">
            {children}
          </div>
          {isSuperAdmin ? <AdminFooter /> : <SubAdminFooter />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
