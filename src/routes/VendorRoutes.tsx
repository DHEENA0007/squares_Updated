import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import VendorLayout from "@/layout/VendorLayout";
import VendorProtectedRoute from "@/components/auth/VendorProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  VendorDashboard,
  VendorProperties,
  AddProperty,
  PropertyDetails,
  EditProperty,
  VendorLeads,
  VendorMessages,
  VendorAnalytics,
  VendorServices,
  VendorSubscriptionPlans,
  VendorSubscriptionManager,
  VendorBilling,
  VendorReviews,
  VendorProfile,
  VendorNotifications,
  VendorSupportTickets
} from "./VendorLazyImports";

const VendorRoutes = () => {
  return (
    <ErrorBoundary>
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
          <Route path="properties/details/:id" element={
            <Suspense fallback={<div>Loading...</div>}>
              <PropertyDetails />
            </Suspense>
          } />
          <Route path="properties/edit/:id" element={
            <Suspense fallback={<div>Loading...</div>}>
              <EditProperty />
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
          <Route path="subscription-manager" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorSubscriptionManager />
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
          <Route path="settings" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorProfile />
            </Suspense>
          } />
          <Route path="notifications" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorNotifications />
            </Suspense>
          } />
          <Route path="support-tickets" element={
            <Suspense fallback={<div>Loading...</div>}>
              <VendorSupportTickets />
            </Suspense>
          } />
        </Route>
      </Routes>
      </VendorProtectedRoute>
    </ErrorBoundary>
  );
};

export default VendorRoutes;