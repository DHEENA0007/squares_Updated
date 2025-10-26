import { useState } from "react";
import { Outlet } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import VendorNavbar from "@/components/vendor/VendorNavbar";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Unified navbar at top */}
      <VendorNavbar setSidebarOpen={setSidebarOpen} />
      
      {/* Sidebar and main content below navbar */}
      <div className="flex flex-1 overflow-hidden">
        <VendorSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;