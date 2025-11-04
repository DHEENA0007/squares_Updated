import { useState } from "react";
import SubAdminSidebar from "./SubAdminSidebar";
import Navbar from "../adminpanel/Navbar";

interface SubAdminLayoutProps {
  children: React.ReactNode;
}

const SubAdminLayout = ({ children }: SubAdminLayoutProps) => {
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
      <Navbar onMenuClick={toggleMobileSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <SubAdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        
        {/* Main content area */}
        <main 
          className={`flex-1 overflow-auto transition-all duration-300 ${
            isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
          } mt-16 p-6`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default SubAdminLayout;
