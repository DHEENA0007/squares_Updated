import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import NotFound from "@/pages/NotFound";
import AdminRoutes from "@/routes/AdminRoutes";
import SubAdminRoutes from "@/routes/SubAdminRoutes";
import UserRoutes from "@/routes/UserRoutes";
import CustomerRoutes from "@/routes/CustomerRoutes";
import VendorRoutes from "@/routes/VendorRoutes";
import RoleBasedRoutes from "@/routes/RoleBasedRoutes";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load vendor components
const VendorLogin = lazy(() => import("@/pages/vendor/VendorLogin"));
const VendorRegister = lazy(() => import("@/pages/vendor/VendorRegister"));
const VendorForgotPassword = lazy(() => import("@/pages/vendor/VendorForgotPassword"));

// Lazy load account confirmation pages
const ConfirmDeactivation = lazy(() => import("@/pages/auth/ConfirmDeactivation"));
const ConfirmDeletion = lazy(() => import("@/pages/auth/ConfirmDeletion"));
const RoleBasedDashboard = lazy(() => import("@/pages/rolebased/Dashboard"));

import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import SessionManager from "@/components/auth/SessionManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/en-new">
            <SessionManager />
            <ScrollToTop />
            <Routes>
              {/* Specific routes first - these must come before wildcard routes */}
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/subadmin/*" element={<SubAdminRoutes />} />
              <Route path="/customer/*" element={<CustomerRoutes />} />

              {/* Account confirmation routes (public) */}
              <Route path="/confirm-deactivation" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ConfirmDeactivation />
                </Suspense>
              } />
              <Route path="/confirm-deletion" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ConfirmDeletion />
                </Suspense>
              } />

              {/* Vendor Authentication Routes (outside protection) */}
              <Route path="/vendor/login" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <VendorLogin />
                </Suspense>
              } />
              <Route path="/vendor/register" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <VendorRegister />
                </Suspense>
              } />
              <Route path="/vendor/forgot-password" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <VendorForgotPassword />
                </Suspense>
              } />

              {/* Protected Vendor Routes */}
              <Route path="/vendor/*" element={<VendorRoutes />} />

              {/* Role Based Routes - for custom roles */}
              <Route path="/rolebased/*" element={<RoleBasedRoutes />} />

              {/* Role Based Dashboard - legacy single route */}
              <Route path="/rolebased" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <AdminProtectedRoute>
                    <DashboardLayout>
                      <RoleBasedDashboard />
                    </DashboardLayout>
                  </AdminProtectedRoute>
                </Suspense>
              } />

              {/* UserRoutes - handles public pages like /login, /signup, /, /products, etc. */}
              {/* This must come before the dynamic role route to ensure /login works */}
              <Route path="/*" element={<UserRoutes />} />

              {/* Dynamic role-based routes - catches any custom role name like /test/*, /manager/*, etc. */}
              {/* IMPORTANT: This is intentionally AFTER UserRoutes */}
              {/* React Router will try UserRoutes first, and if no match, fall through to this */}
              {/* However, this won't work as expected because /* in UserRoutes catches everything */}
              {/* We need a different approach - remove this route for now */}
              {/* <Route path="/:roleName/*" element={<RoleBasedRoutes />} /> */}

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
