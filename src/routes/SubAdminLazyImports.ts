import { lazy } from "react";

// Sub Admin specific page imports
export const SubAdminDashboard = lazy(() => import("@/pages/admin/SubAdminDashboard"));
export const PropertyReview = lazy(() => import("@/pages/admin/PropertyReview"));
export const PropertyApproval = lazy(() => import("@/pages/admin/PropertyApproval"));
export const ContentModeration = lazy(() => import("@/pages/admin/ContentModeration"));
export const SupportTickets = lazy(() => import("@/pages/admin/SupportTickets"));
export const PerformanceTracking = lazy(() => import("@/pages/admin/PerformanceTracking"));
export const PromotionApproval = lazy(() => import("@/pages/admin/PromotionApproval"));
export const SendNotifications = lazy(() => import("@/pages/admin/SendNotifications"));
export const GenerateReports = lazy(() => import("@/pages/admin/GenerateReports"));
