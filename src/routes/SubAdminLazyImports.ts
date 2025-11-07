import { lazy } from "react";

// Sub Admin specific page imports
export const SubAdminDashboard = lazy(() => import("@/pages/subadmin/SubAdminDashboard"));
export const PropertyReviews = lazy(() => import("@/pages/subadmin/PropertyReviews"));
export const PropertyRejections = lazy(() => import("@/pages/subadmin/PropertyRejections"));
export const ContentModeration = lazy(() => import("@/pages/subadmin/ContentModeration"));
export const SupportTickets = lazy(() => import("@/pages/subadmin/SupportTickets"));
export const VendorPerformance = lazy(() => import("@/pages/subadmin/VendorPerformance"));
export const AddonServices = lazy(() => import("@/pages/subadmin/AddonServices"));
export const Notifications = lazy(() => import("@/pages/subadmin/Notifications"));
export const Reports = lazy(() => import("@/pages/subadmin/Reports"));