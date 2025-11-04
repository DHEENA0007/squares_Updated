import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";
import { 
  SubAdminDashboard, 
  PropertyReview, 
  PropertyApproval, 
  ContentModeration, 
  SupportTickets, 
  PerformanceTracking, 
  PromotionApproval, 
  SendNotifications, 
  GenerateReports 
} from "./SubAdminLazyImports";

const SubAdminRoutes = () => {
  return (
    <AdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader/>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/dashboard" element={<SubAdminDashboard />} />
            <Route path="/properties/review" element={<PropertyReview />} />
            <Route path="/properties/approval" element={<PropertyApproval />} />
            <Route path="/content/moderation" element={<ContentModeration />} />
            <Route path="/support/tickets" element={<SupportTickets />} />
            <Route path="/performance" element={<PerformanceTracking />} />
            <Route path="/promotions/approval" element={<PromotionApproval />} />
            <Route path="/notifications" element={<SendNotifications />} />
            <Route path="/reports" element={<GenerateReports />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </AdminProtectedRoute>
  );
};

export default SubAdminRoutes;
