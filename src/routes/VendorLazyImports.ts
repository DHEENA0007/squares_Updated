import { lazy } from "react";

// Lazy load vendor components for better performance
export const VendorDashboard = lazy(() => import("@/pages/vendor/VendorDashboard"));
export const VendorProperties = lazy(() => import("@/pages/vendor/VendorProperties"));
export const AddProperty = lazy(() => import("@/pages/vendor/AddProperty"));
export const PropertyDetails = lazy(() => import("@/pages/vendor/PropertyDetails"));
export const EditProperty = lazy(() => import("@/pages/vendor/EditProperty"));
export const VendorLeads = lazy(() => import("@/pages/vendor/VendorLeads"));
export const VendorMessages = lazy(() => import("@/pages/vendor/VendorMessages"));
export const VendorAnalytics = lazy(() => import("@/pages/vendor/VendorAnalytics"));
// Commented out packages - will be used in future
// export const VendorPackages = lazy(() => import("@/pages/vendor/VendorPackages"));
export const VendorServices = lazy(() => import("@/pages/vendor/VendorServices"));
export const VendorSubscriptionPlans = lazy(() => import("@/pages/vendor/VendorSubscriptionPlans"));
export const VendorSubscriptionManager = lazy(() => import("@/pages/vendor/VendorSubscriptionManager"));
export const VendorBilling = lazy(() => import("@/pages/vendor/VendorBilling"));
export const VendorReviews = lazy(() => import("@/pages/vendor/VendorReviews"));
export const VendorProfile = lazy(() => import("@/pages/vendor/VendorProfile"));