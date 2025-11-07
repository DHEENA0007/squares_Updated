import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import SubAdminProtectedRoute from "@/components/auth/SubAdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";
import { 
  SubAdminDashboard, 
  PropertyReviews, 
  PropertyRejections, 
  ContentModeration, 
  SupportTickets, 
  VendorPerformance, 
  AddonServices, 
  Notifications, 
  Reports
} from "@/routes/SubAdminLazyImports";

const SubAdminRoutes = () => {
  return (
    <SubAdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/subadmin/dashboard" />} />
            <Route path="/dashboard" element={<SubAdminDashboard />} />
            <Route path="/property-reviews" element={<PropertyReviews />} />
            <Route path="/property-rejections" element={<PropertyRejections />} />
            <Route path="/content-moderation" element={<ContentModeration />} />
            <Route path="/support-tickets" element={<SupportTickets />} />
            <Route path="/vendor-performance" element={<VendorPerformance />} />
            <Route path="/addon-services" element={<AddonServices />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </SubAdminProtectedRoute>
  );
};

export default SubAdminRoutes;