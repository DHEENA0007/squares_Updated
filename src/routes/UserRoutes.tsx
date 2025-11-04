import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
// import LoadingEffect from "@/components/common/LoadingEffect";

import {
  Dashboard,
  Products,
  SubscriptionPlans,
  Login,
  Signup,
  Contact,
  PrivacyPolicy,
  RefundPolicy,
  PropertyDetails,
} from "@/routes/UserLazyImports";
import UserLayout from "@/layout/UserLayout";
import { PageLoader } from "@/components/ui/loader/PageLoader";

const UserRoutes = () => {
  return (
    <Suspense fallback={<PageLoader/>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<UserLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default UserRoutes;
