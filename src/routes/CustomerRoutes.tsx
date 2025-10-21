import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import CustomerLayout from "@/layout/CustomerLayout";
import { PageLoader } from "@/components/ui/loader/PageLoader";

// Lazy imports for customer pages
import { 
  CustomerDashboard,
  PropertySearch,
  MyFavorites,
  PropertyComparison,
  MyProperties,
  PostCustomerProperty,
  ServiceRequests,
  MySubscription,
  CustomerProfile,
  Messages,
  ReviewsRatings
} from "@/routes/CustomerLazyImports";

const CustomerRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <CustomerDashboard />
          </Suspense>
        } />
        
        {/* Property Management */}
        <Route path="search" element={
          <Suspense fallback={<PageLoader />}>
            <PropertySearch />
          </Suspense>
        } />
        <Route path="favorites" element={
          <Suspense fallback={<PageLoader />}>
            <MyFavorites />
          </Suspense>
        } />
        <Route path="compare" element={
          <Suspense fallback={<PageLoader />}>
            <PropertyComparison />
          </Suspense>
        } />
        <Route path="my-properties" element={
          <Suspense fallback={<PageLoader />}>
            <MyProperties />
          </Suspense>
        } />
        <Route path="post-property" element={
          <Suspense fallback={<PageLoader />}>
            <PostCustomerProperty />
          </Suspense>
        } />
        
        {/* Communication */}
        <Route path="messages" element={
          <Suspense fallback={<PageLoader />}>
            <Messages />
          </Suspense>
        } />
        
        {/* Services */}
        <Route path="services" element={
          <Suspense fallback={<PageLoader />}>
            <ServiceRequests />
          </Suspense>
        } />
        <Route path="reviews" element={
          <Suspense fallback={<PageLoader />}>
            <ReviewsRatings />
          </Suspense>
        } />
        
        {/* Account */}
        <Route path="subscription" element={
          <Suspense fallback={<PageLoader />}>
            <MySubscription />
          </Suspense>
        } />
        <Route path="profile" element={
          <Suspense fallback={<PageLoader />}>
            <CustomerProfile />
          </Suspense>
        } />
      </Route>
    </Routes>
  );
};

export default CustomerRoutes;