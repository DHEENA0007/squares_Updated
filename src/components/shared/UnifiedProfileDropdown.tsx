import { User, Settings, LogOut, Building, CreditCard, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const UnifiedProfileDropdown = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSuperAdmin, isSubAdmin, isVendor } = useAuth();

  // Check if user has a custom role (not one of the default system roles)
  const isCustomRole = user?.role && 
    !['superadmin', 'admin', 'subadmin', 'agent', 'customer'].includes(user.role.toLowerCase());

  const getRoleBasedPath = (path: string) => {
    // Check roles in priority order
    // Vendor check MUST come before admin checks since agents might have admin-like permissions
    if (isVendor) return `/vendor/${path}`;
    if (isCustomRole) return `/rolebased/${path}`;
    if (isSuperAdmin) return `/admin/${path}`;
    if (isSubAdmin) return `/subadmin/${path}`;
    if (isAdmin) return `/admin/${path}`;
    return `/customer/${path}`;
  };

  const handleProfile = () => {
    navigate(getRoleBasedPath('profile'));
  };

  const handleSettings = () => {
    navigate(getRoleBasedPath('settings'));
  };

  const handleCompanyDetails = () => {
    if (isVendor) {
      navigate('/vendor/profile');
    }
  };

  const handleBilling = () => {
    if (isVendor) {
      navigate('/vendor/billing');
    } else if (isSuperAdmin || isAdmin) {
      navigate('/admin/settings');
    } else if (isSubAdmin) {
      // SubAdmin doesn't have billing access, redirect to dashboard
      navigate('/subadmin/dashboard');
    }
  };

  const handleSupport = () => {
    // Route support clicks to the appropriate pages per role
    if (isVendor) {
      navigate('/vendor/support-tickets');
    } else if (isSuperAdmin || isAdmin) {
      navigate('/admin/support-tickets');
    } else if (isSubAdmin) {
      navigate('/subadmin/support-tickets');
    } else if (isCustomRole) {
      navigate('/rolebased/support-tickets');
    } else {
      // Customers -> contact page or track support
      navigate('/contact');
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.profile ? 
    `${user.profile.firstName} ${user.profile.lastName}` : 
    isSuperAdmin ? "Super Admin" : 
    isSubAdmin ? "Sub Admin" : 
    isAdmin ? "Admin User" : 
    isCustomRole ? user?.role?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || "Role User" :
    isVendor ? "Vendor User" : "Customer";
  const userEmail = user?.email || "user@example.com";
  const initials = user?.profile ? 
    `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`.toUpperCase() : 
    isSuperAdmin ? "SA" :
    isSubAdmin ? "SU" :
    isAdmin ? "AU" : 
    isCustomRole ? user?.role?.substring(0, 2).toUpperCase() || "RU" :
    isVendor ? "VU" : "CU";

  const getRoleBadge = () => {
    if (user?.role === 'superadmin') return 'Super Admin';
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'subadmin') return 'Sub Admin';
    if (user?.role === 'agent') return 'Vendor';
    if (isCustomRole) {
      // Format custom role name (e.g., "content_manager" -> "Content Manager")
      return user?.role?.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') || 'Custom Role';
    }
    return 'Customer';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
          <AvatarImage 
            src={user?.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`} 
            alt="Profile" 
          />
          <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 md:w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            <Badge variant="secondary" className="text-xs w-fit mt-1">
              {getRoleBadge()}
            </Badge>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleProfile}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        {isVendor && (
          <DropdownMenuItem 
            onClick={handleCompanyDetails}
            className="cursor-pointer"
          >
            <Building className="mr-2 h-4 w-4" />
            <span>Company Details</span>
          </DropdownMenuItem>
        )}
        
        {/* Settings - Show for all roles except custom roles (they use rolebased settings page) */}
        {!isCustomRole && (
          <DropdownMenuItem 
            onClick={handleSettings}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}

        {/* Billing - Only for Vendors */}
        {isVendor && (
          <DropdownMenuItem 
            onClick={handleBilling}
            className="cursor-pointer"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
        )}

        {/* Support - Show for vendors, subadmin, and custom roles */}
        {(isVendor || isSubAdmin || isCustomRole) && (
          <DropdownMenuItem 
            onClick={handleSupport}
            className="cursor-pointer"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Support</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isVendor ? 'Sign out' : 'Logout'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UnifiedProfileDropdown;
