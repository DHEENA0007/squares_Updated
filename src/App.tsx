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
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load vendor components
const VendorLogin = lazy(() => import("@/pages/vendor/VendorLogin"));
const VendorRegister = lazy(() => import("@/pages/vendor/VendorRegister"));
const VendorForgotPassword = lazy(() => import("@/pages/vendor/VendorForgotPassword"));

// Lazy load account confirmation pages
const ConfirmDeactivation = lazy(() => import("@/pages/auth/ConfirmDeactivation"));
const ConfirmDeletion = lazy(() => import("@/pages/auth/ConfirmDeletion"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename="/v2">
              <ScrollToTop />
              <Routes>
                <Route path="/*" element={<UserRoutes />} />
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
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
