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

  const getRoleBasedPath = (path: string) => {
    // Priority order: SuperAdmin -> SubAdmin -> Admin -> Vendor -> Customer
    if (isSuperAdmin) return `/admin/${path}`;
    if (isSubAdmin) return `/subadmin/${path}`;
    if (isAdmin) return `/admin/${path}`;
    if (isVendor) return `/vendor/${path}`;
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
    // Priority check for Vendor first because isAdmin might be true for vendors with permissions
    if (isVendor) {
      navigate('/vendor/support-tickets');
    } else if (isSuperAdmin || isAdmin) {
      navigate('/admin/support-tickets');
    } else if (isSubAdmin) {
      navigate('/subadmin/support-tickets');
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
    isVendor ? "Vendor User" : "Customer";
  const userEmail = user?.email || "user@example.com";
  const initials = user?.profile ? 
    `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`.toUpperCase() : 
    isSuperAdmin ? "SA" :
    isSubAdmin ? "SU" :
    isAdmin ? "AU" : 
    isVendor ? "VU" : "CU";

  const getRoleBadge = () => {
    if (user?.role === 'superadmin') return 'Super Admin';
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'subadmin') return 'Sub Admin';
    if (user?.role === 'agent') return 'Vendor';
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
          <span>
            {isVendor ? 'Profile Settings' : 
             isSuperAdmin || isAdmin ? 'Admin Profile' : 
             isSubAdmin ? 'SubAdmin Profile' : 
             'My Profile'}
          </span>
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
        
        {/* Settings - Show for Customer, Vendor, SubAdmin, and Admin (all roles) */}
        <DropdownMenuItem 
          onClick={handleSettings}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

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

        {/* Support - Show for vendors and subadmin only (removed for superadmin) */}
        {(isVendor || isSubAdmin) && (
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
