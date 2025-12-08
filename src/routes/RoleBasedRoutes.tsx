import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

// Lazy load role-based pages
const Dashboard = lazy(() => import("@/pages/rolebased/Dashboard"));
const Users = lazy(() => import("@/pages/admin/Users"));
const AddUser = lazy(() => import("@/pages/admin/AddUser"));
const Roles = lazy(() => import("@/pages/admin/Roles"));
const AddRole = lazy(() => import("@/pages/admin/AddRole"));
const EditRole = lazy(() => import("@/pages/admin/EditRole"));
const Properties = lazy(() => import("@/pages/admin/Properties"));
const Vendors = lazy(() => import("@/pages/rolebased/Vendors"));
const VendorDetails = lazy(() => import("@/pages/rolebased/VendorDetails"));
const Reviews = lazy(() => import("@/pages/rolebased/Reviews"));
const Messages = lazy(() => import("@/pages/rolebased/Messages"));
const Notifications = lazy(() => import("@/pages/rolebased/Notifications"));
const Analytics = lazy(() => import("@/pages/rolebased/Analytics"));
const Settings = lazy(() => import("@/pages/rolebased/Settings"));
const VendorSettings = lazy(() => import("@/pages/vendor/VendorSettings"));

const RoleBasedRoutes = () => {
    const { user } = useAuth();

    // Sanitize role name for URL
    const sanitizedRole = user?.role
        ? user.role.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : 'rolebased';
    const roleBasePath = `/${sanitizedRole}`;

    // Determine which Settings component to use based on role
    const SettingsComponent = user?.role === 'agent' ? VendorSettings : Settings;

    return (
        <AdminProtectedRoute>
            <DashboardLayout>
                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="users" element={<Users />} />
                        <Route path="users/add" element={<AddUser />} />
                        <Route path="roles" element={<Roles />} />
                        <Route path="roles/add" element={<AddRole />} />
                        <Route path="roles/edit/:id" element={<EditRole />} />
                        <Route path="properties" element={<Properties />} />
                        <Route path="vendors" element={<Vendors />} />
                        <Route path="vendor-details" element={<VendorDetails />} />
                        <Route path="reviews" element={<Reviews />} />
                        <Route path="messages" element={<Messages />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="settings" element={<SettingsComponent />} />
                        <Route path="*" element={<Navigate to={roleBasePath} replace />} />
                    </Routes>
                </Suspense>
            </DashboardLayout>
        </AdminProtectedRoute>
    );
};

export default RoleBasedRoutes;
