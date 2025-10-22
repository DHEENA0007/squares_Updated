import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import VendorLayout from "@/layout/VendorLayout";
import VendorProtectedRoute from "@/components/auth/VendorProtectedRoute";
import {
  VendorDashboard,
  VendorProperties,
  AddProperty,
  VendorLeads,
  VendorMessages,
  VendorAnalytics,
  VendorPackages,
  VendorServices,
  VendorSubscriptionPlans,
  VendorBilling,
  VendorReviews,
  VendorProfile
} from "./VendorLazyImports";

const VendorRoutes = () => {
  return (
    <VendorProtectedRoute>
      <Routes>
        <Route path="/" element={<VendorLayout />}>
          <Route index element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorDashboard />
            </Suspense>
          } />
          <Route path="dashboard" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorDashboard />
            </Suspense>
          } />
          <Route path="properties" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorProperties />
            </Suspense>
          } />
          <Route path="properties/add" element={
            <Suspense fallback={<div>Loading...</div>}>
              <AddProperty />
            </Suspense>
          } />
          <Route path="leads" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorLeads />
            </Suspense>
          } />
          <Route path="messages" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorMessages />
            </Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorAnalytics />
            </Suspense>
          } />
          <Route path="packages" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorPackages />
            </Suspense>
          } />
          <Route path="services" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorServices />
            </Suspense>
          } />
          <Route path="subscription-plans" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorSubscriptionPlans />
            </Suspense>
          } />
          <Route path="billing" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorBilling />
            </Suspense>
          } />
          <Route path="reviews" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorReviews />
            </Suspense>
          } />
          <Route path="profile" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorProfile />
            </Suspense>
          } />
        </Route>
      </Routes>
    </VendorProtectedRoute>
  );
};

export default VendorRoutes;