import DynamicSidebar from "@/components/common/DynamicSidebar";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) => {
  return (
    <DynamicSidebar
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
      portalBadge={{
        title: "Super Admin Panel",
        gradient: "bg-gradient-to-r from-purple-600 to-blue-600",
        textColor: "text-white"
      }}
    />
  );
};

export default Sidebar;
