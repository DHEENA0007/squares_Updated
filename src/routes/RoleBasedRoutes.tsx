import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

// Lazy load role-based pages
const Dashboard = lazy(() => import("@/pages/rolebased/Dashboard"));
const Profile = lazy(() => import("@/pages/rolebased/Profile"));
const Users = lazy(() => import("@/pages/admin/Users"));
const AddUser = lazy(() => import("@/pages/admin/AddUser"));
const Roles = lazy(() => import("@/pages/admin/Roles"));
const AddRole = lazy(() => import("@/pages/admin/AddRole"));
const EditRole = lazy(() => import("@/pages/admin/EditRole"));
const Properties = lazy(() => import("@/pages/admin/Properties"));
const Clients = lazy(() => import("@/pages/admin/Clients"));
const EditClient = lazy(() => import("@/pages/admin/EditClient"));
const Plans = lazy(() => import("@/pages/admin/Plans"));
const CreatePlan = lazy(() => import("@/pages/admin/CreatePlan"));
const EditPlan = lazy(() => import("@/pages/admin/EditPlan"));
const Addons = lazy(() => import("@/pages/admin/AddonManagement"));
const PropertyManagement = lazy(() => import("@/pages/admin/PropertyManagement"));
const FilterManagement = lazy(() => import("@/pages/admin/FilterManagement"));
const SupportTickets = lazy(() => import("@/pages/rolebased/SupportTickets"));
const AddonServices = lazy(() => import("@/pages/rolebased/AddonServices"));
const PolicyEditor = lazy(() => import("@/pages/rolebased/PolicyEditor"));
const Messages = lazy(() => import("@/pages/admin/Messages"));
const Vendors = lazy(() => import("@/pages/rolebased/Vendors"));
const VendorDetails = lazy(() => import("@/pages/rolebased/VendorDetails"));
const Reviews = lazy(() => import("@/pages/rolebased/Reviews"));
const Notifications = lazy(() => import("@/pages/rolebased/Notifications"));
const Analytics = lazy(() => import("@/pages/rolebased/Analytics"));
const Settings = lazy(() => import("@/pages/rolebased/Settings"));
const Reports = lazy(() => import("@/pages/rolebased/Reports"));
const HeroManagement = lazy(() => import("@/pages/admin/HeroManagement"));
const SubscribedClients = lazy(() => import("@/pages/rolebased/SubscribedClients"));
const SuperAdminAnalytics = lazy(() => import("@/pages/rolebased/SuperAdminAnalytics"));

const RoleBasedRoutes = () => {
    const { user } = useAuth();

    // Sanitize role name for URL
    const sanitizedRole = user?.role
        ? user.role.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : 'rolebased';
    const roleBasePath = `/${sanitizedRole}`;

    return (
        <AdminProtectedRoute>
            <DashboardLayout>
                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="users" element={<Users />} />
                        <Route path="users/add" element={<AddUser />} />
                        <Route path="roles" element={<Roles />} />
                        <Route path="roles/add" element={<AddRole />} />
                        <Route path="roles/edit/:id" element={<EditRole />} />
                        <Route path="properties" element={<Properties />} />
                        <Route path="clients" element={<Clients />} />
                        <Route path="clients/edit/:id" element={<EditClient />} />
                        <Route path="plans" element={<Plans />} />
                        <Route path="plans/create" element={<CreatePlan />} />
                        <Route path="plans/edit/:id" element={<EditPlan />} />
                        <Route path="addons" element={<Addons />} />
                        <Route path="property-management" element={<PropertyManagement />} />
                        <Route path="filter-management" element={<FilterManagement />} />
                        <Route path="messages" element={<Messages />} />
                        <Route path="support-tickets" element={<SupportTickets />} />
                        <Route path="addon-services" element={<AddonServices />} />
                        <Route path="policies/:policyType" element={<PolicyEditor />} />
                        <Route path="vendors" element={<Vendors />} />
                        <Route path="vendor-details" element={<VendorDetails />} />
                        <Route path="reviews" element={<Reviews />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="hero-management" element={<HeroManagement />} />
                        <Route path="subscribed-clients" element={<SubscribedClients />} />
                        <Route path="superadmin-analytics" element={<SuperAdminAnalytics />} />
                        <Route path="*" element={<Navigate to={roleBasePath} replace />} />
                    </Routes>
                </Suspense>
            </DashboardLayout>
        </AdminProtectedRoute>
    );
};

export default RoleBasedRoutes;
