import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { HomePage, UsersPage, AddUserPage, VendorApprovalsPage, MessagesPage, ProfilePage, SettingsPage, RoleListPage,RoleEditPage,AddRolePage,ClientListPage,PlanListPage,PropertyListPage,PropertyEditPage,AddPropertyPage,PlanEditPage,PlanCreatePage,ClientEditPage,AddonManagementPage, SendNotificationsPage } from "@/routes/AdminLazyImports";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";
import PolicyEditor from "@/pages/admin/PolicyEditor";

const RevenueDetails = lazy(() => import("@/pages/admin/RevenueDetails"));
const UsersDetails = lazy(() => import("@/pages/admin/UsersDetails"));
const PropertiesDetails = lazy(() => import("@/pages/admin/PropertiesDetails"));
const EngagementDetails = lazy(() => import("@/pages/admin/EngagementDetails"));
const PropertyManagement = lazy(() => import("@/pages/admin/PropertyManagement"));
const FilterManagement = lazy(() => import("@/pages/admin/FilterManagement"));
const NavigationManagement = lazy(() => import("@/pages/admin/NavigationManagement"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));


const AdminRoutes = () => {
  console.log('AdminRoutes: Rendering full admin routes for superadmin/admin');
  // Super admin gets full access to all routes
  return (
    <AdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader/>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/revenue-details" element={<RevenueDetails />} />
            <Route path="/users-details" element={<UsersDetails />} />
            <Route path="/properties-details" element={<PropertiesDetails />} />
            <Route path="/engagement-details" element={<EngagementDetails />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/add" element={<AddUserPage />} />
            <Route path="/vendor-approvals" element={<VendorApprovalsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/roles" element={<RoleListPage/>} />
            <Route path="/roles/add" element={<AddRolePage/>} />
            <Route path="/roles/edit/:id" element={<RoleEditPage/>} />
            <Route path="/clients" element={<ClientListPage/>} />
            <Route path="/clients/edit/:id" element={<ClientEditPage/>} />
            <Route path="/plans" element={<PlanListPage/>} />
            <Route path="/plans/create" element={<PlanCreatePage/>} />
            <Route path="/plans/edit/:id" element={<PlanEditPage/>} />
            <Route path="/properties" element={<PropertyListPage/>} />
            <Route path="/properties/add" element={<AddPropertyPage/>} />
            <Route path="/properties/edit/:id" element={<PropertyEditPage/>} />
            <Route path="/addons" element={<AddonManagementPage/>} />
            <Route path="/notifications" element={<SendNotificationsPage/>} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/policy-editor/:policyType" element={<PolicyEditor />} />
            <Route path="/property-management" element={<PropertyManagement />} />
            <Route path="/filter-management" element={<FilterManagement />} />
            <Route path="/navigation-management" element={<NavigationManagement />} />
</Routes>
        </Suspense>
      </DashboardLayout>
    </AdminProtectedRoute>
  );
};

export default AdminRoutes;
