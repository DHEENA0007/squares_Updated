import DynamicSidebar from "@/components/common/DynamicSidebar";

interface CustomerSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const CustomerSidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: CustomerSidebarProps) => {
  return (
    <DynamicSidebar
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
    />
  );
};

export default CustomerSidebar;