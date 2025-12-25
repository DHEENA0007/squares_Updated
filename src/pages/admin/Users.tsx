import { useState, useEffect } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserTable from "@/components/adminpanel/users/UserTable";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import roleService, { Role } from "@/services/roleService";
import { useDebounce } from "@/hooks/use-debounce";

const Users = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [roles, setRoles] = useState<Role[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getRoles({ limit: 100, isActive: true });
        setRoles(response.data.roles);
      } catch (error) {
        console.error("Failed to fetch roles", error);
      }
    };
    fetchRoles();
  }, []);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const clearFilters = () => {
    setRoleFilter("all");
    setMonthFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row justify-between items-start sm:items-center gap-4'}`}>
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Users</h1>
          <p className="text-muted-foreground mt-1">View and manage system users</p>
        </div>
        <Button onClick={() => navigate("/admin/users/add")} className={isMobile ? 'w-full' : ''}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4 md:p-6">
        <div className="space-y-4 mb-6">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-accent" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role._id} value={role.name.toLowerCase()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Month Created</label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <UserTable
          searchQuery={debouncedSearchQuery}
          roleFilter={roleFilter === "all" ? "" : roleFilter}
          monthFilter={monthFilter === "all" ? "" : monthFilter}
        />
      </div>
    </div>
  );
};

export default Users;
