import { 
    ChevronLeft, 
    ChevronRight, 
    Home, 
    Users, 
    Shield, 
    FileText, 
    ShoppingBag, 
    LayoutDashboard,
    Bell,
    BarChart3,
    Star,
    Activity,
    Filter,
    Headphones,
    Package,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { useState } from "react";

interface UniversalSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

const UniversalSidebar = ({
    isCollapsed,
    onToggle,
    isMobileOpen,
    onMobileClose
}: UniversalSidebarProps) => {
    const location = useLocation();
    const { user } = useAuth();
    const permissions = user?.rolePermissions || [];
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    const hasPermission = (permission: string) => permissions.includes(permission);

    const hasAnyReportablePermission = () => {
        return permissions.some(p => 
            p.includes('view') || 
            p.includes('read') || 
            p.includes('create') || 
            p.includes('edit') || 
            p.includes('delete')
        );
    };

    const isCustomRole = user?.role && 
        !['superadmin', 'admin', 'subadmin', 'agent', 'customer'].includes(user.role.toLowerCase());

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => 
            prev.includes(label) 
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    // Use /rolebased prefix for all custom roles
    const roleBasePath = '/rolebased';

    // Base menu items that are always visible or conditional based on permissions
    const menuItems = [
        {
            label: 'Dashboard',
            path: roleBasePath,
            icon: LayoutDashboard,
            show: true // Dashboard is always visible
        },
        {
            label: 'Users',
            path: `${roleBasePath}/users`,
            icon: Users,
            show: hasPermission(PERMISSIONS.USERS_VIEW)
        },
        {
            label: 'Roles',
            path: `${roleBasePath}/roles`,
            icon: Shield,
            show: hasPermission(PERMISSIONS.ROLES_VIEW)
        },
        {
            label: 'Properties',
            path: `${roleBasePath}/properties`,
            icon: Home,
            show: hasPermission(PERMISSIONS.PROPERTIES_VIEW)
        },
        {
            label: 'Vendors',
            path: `${roleBasePath}/vendors`,
            icon: ShoppingBag,
            show: hasPermission(PERMISSIONS.VENDORS_VIEW)
        },
        {
            label: 'Reviews',
            path: `${roleBasePath}/reviews`,
            icon: Star,
            show: hasPermission(PERMISSIONS.REVIEWS_VIEW)
        },
        {
            label: 'Clients',
            path: `${roleBasePath}/clients`,
            icon: Users,
            show: hasPermission(PERMISSIONS.CLIENTS_READ)
        },
        {
            label: 'Plans',
            path: `${roleBasePath}/plans`,
            icon: FileText,
            show: hasPermission(PERMISSIONS.PLANS_READ)
        },
        {
            label: 'Addons',
            path: `${roleBasePath}/addons`,
            icon: Activity,
            show: hasPermission(PERMISSIONS.ADDONS_READ)
        },
        {
            label: 'Property Management',
            path: `${roleBasePath}/property-management`,
            icon: Home,
            show: hasPermission(PERMISSIONS.PM_READ)
        },
        {
            label: 'Filter Management',
            path: `${roleBasePath}/filter-management`,
            icon: Filter,
            show: hasPermission(PERMISSIONS.FILTER_READ)
        },
        {
            label: 'Support Tickets',
            path: `${roleBasePath}/support-tickets`,
            icon: Headphones,
            show: hasPermission(PERMISSIONS.SUPPORT_TICKETS_READ)
        },
        {
            label: 'Addon Services',
            path: `${roleBasePath}/addon-services`,
            icon: Package,
            show: hasPermission(PERMISSIONS.ADDON_SERVICES_READ)
        },
        {
            label: 'Policies',
            path: '',
            icon: FileText,
            show: hasPermission(PERMISSIONS.POLICIES_READ),
            children: [
                {
                    label: 'Privacy Policy',
                    path: `${roleBasePath}/policies/privacy-policy`,
                    show: hasPermission(PERMISSIONS.POLICIES_READ)
                },
                {
                    label: 'Refund Policy',
                    path: `${roleBasePath}/policies/refund-policy`,
                    show: hasPermission(PERMISSIONS.POLICIES_READ)
                }
            ]
        },
        {
            label: 'Notifications',
            path: `${roleBasePath}/notifications`,
            icon: Bell,
            show: hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)
        },
        {
            label: 'Analytics',
            path: `${roleBasePath}/analytics`,
            icon: BarChart3,
            show: hasPermission(PERMISSIONS.ANALYTICS_VIEW)
        },
        {
            label: 'Reports',
            path: `${roleBasePath}/reports`,
            icon: FileText,
            show: isCustomRole && hasAnyReportablePermission()
        }
    ];



    const visibleMenuItems = menuItems.filter(item => item.show);

    return (
        <>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[70] lg:hidden"
                    onClick={onMobileClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 bottom-0 bg-background border-r border-border z-[70] transition-all duration-300 overflow-y-auto",
                    "lg:relative lg:top-0",
                    isCollapsed ? "w-16" : "w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Toggle button - desktop only */}
                <button
                    onClick={onToggle}
                    className="hidden lg:flex absolute right-1 top-2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center hover:bg-secondary transition-colors z-50"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                    ) : (
                        <ChevronLeft className="w-3 h-3" />
                    )}
                </button>

                {/* Role Badge */}
                {!isCollapsed && (
                    <div className="p-3 mt-2">
                        <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                            <p className="text-sm font-semibold text-center capitalize">
                                {user?.role || 'User'} Panel
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="p-2 space-y-2 mt-2">
                    {visibleMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isExpanded = expandedMenus.includes(item.label);
                        const hasChildren = item.children && item.children.length > 0;

                        return (
                            <div key={item.label}>
                                {hasChildren ? (
                                    <>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                                "hover:bg-accent",
                                                isCollapsed && "justify-center"
                                            )}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            {!isCollapsed && (
                                                <>
                                                    <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </>
                                            )}
                                        </button>
                                        {isExpanded && !isCollapsed && (
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                                                {item.children?.filter(child => child.show).map((child) => {
                                                    const isChildActive = location.pathname === child.path;
                                                    return (
                                                        <Link
                                                            key={child.path}
                                                            to={child.path}
                                                            onClick={onMobileClose}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                                                                "hover:bg-accent",
                                                                isChildActive && "bg-accent text-accent-foreground font-medium",
                                                                !isChildActive && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        to={item.path}
                                        onClick={onMobileClose}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                                            "hover:bg-accent",
                                            isActive && "bg-accent text-accent-foreground",
                                            !isActive && "text-foreground",
                                            isCollapsed && "justify-center"
                                        )}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        {!isCollapsed && (
                                            <span className="font-medium text-sm">{item.label}</span>
                                        )}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
};

export default UniversalSidebar;
