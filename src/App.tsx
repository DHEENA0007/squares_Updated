import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import NotFound from "@/pages/NotFound";
import AdminRoutes from "@/routes/AdminRoutes";
import UserRoutes from "@/routes/UserRoutes";
import CustomerRoutes from "@/routes/CustomerRoutes";
import VendorRoutes from "@/routes/VendorRoutes";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";

// Lazy load vendor components
const VendorLogin = lazy(() => import("@/pages/vendor/VendorLogin"));
const VendorRegister = lazy(() => import("@/pages/vendor/VendorRegister"));
const VendorForgotPassword = lazy(() => import("@/pages/vendor/VendorForgotPassword"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/*" element={<UserRoutes />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/customer/*" element={<CustomerRoutes />} />
              
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
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
