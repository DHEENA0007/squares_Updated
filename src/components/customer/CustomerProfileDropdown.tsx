import { User, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { authService } from "@/services/authService";

const CustomerProfileDropdown = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Get user data from localStorage
    const userData = authService.getStoredUser();
    setUser(userData);
  }, []);

  const handleProfile = () => {
    navigate("/customer/profile");
  };



  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // Get user display name and initials
  const displayName = user?.profile ? 
    `${user.profile.firstName} ${user.profile.lastName}` : 
    "Guest User";
  const userEmail = user?.email || "guest@example.com";
  const initials = user?.profile ? 
    `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`.toUpperCase() : 
    "GU";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
          <AvatarImage src={user?.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'customer'}`} alt="Profile" />
          <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {user?.role === 'customer' ? 'Customer' : 'Premium Member'}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleProfile}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CustomerProfileDropdown;