import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import SubAdminProtectedRoute from "@/components/auth/SubAdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";
import {
  SubAdminDashboard,
  VendorApprovals,
  PropertyReviews,
  PropertyRejections,
  SupportTickets,
  VendorPerformance,
  AddonServices,
  Notifications,
  Reports,
  Promotions
} from "@/routes/SubAdminLazyImports";
import { ProfilePage, SettingsPage, MessagesPage } from "@/routes/AdminLazyImports";
import PolicyEditor from "@/pages/subadmin/PolicyEditor";

const SubAdminRoutes = () => {
  return (
    <SubAdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/subadmin/dashboard" />} />
            <Route path="/dashboard" element={<SubAdminDashboard />} />
            <Route path="/vendor-approvals" element={<VendorApprovals />} />
            <Route path="/property-reviews" element={<PropertyReviews />} />
            <Route path="/property-rejections" element={<PropertyRejections />} />
            <Route path="/support-tickets" element={<SupportTickets />} />
            <Route path="/vendor-performance" element={<VendorPerformance />} />
            <Route path="/addon-services" element={<AddonServices />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/policy-editor/:policyType" element={<PolicyEditor />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </SubAdminProtectedRoute>
  );
};

export default SubAdminRoutes;