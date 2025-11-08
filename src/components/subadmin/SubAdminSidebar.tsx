import DynamicSidebar from "@/components/common/DynamicSidebar";

interface SubAdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const SubAdminSidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SubAdminSidebarProps) => {
  return (
    <DynamicSidebar
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
      portalBadge={{
        title: "Sub Admin Portal",
        subtitle: "Content & Support Management",
        bgColor: "bg-blue-100 dark:bg-blue-900",
        textColor: "text-blue-700 dark:text-blue-300"
      }}
    />
  );
};

export default SubAdminSidebar;
