import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
// import LoadingEffect from "@/components/common/LoadingEffect";

import {
  Dashboard,
  Products,
  SubscriptionPlans,
  Login,
  Signup,
  ForgotPassword,
  Contact,
  PrivacyPolicy,
  RefundPolicy,
  PropertyDetails,
  TrackSupport,
} from "@/routes/UserLazyImports";
import UserLayout from "@/layout/UserLayout";
import { PageLoader } from "@/components/ui/loader/PageLoader";

const UserRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<UserLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/track-support" element={<TrackSupport />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default UserRoutes;
