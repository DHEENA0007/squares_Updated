import { lazy } from "react";

// Customer Portal Pages
export const CustomerDashboard = lazy(() => import("@/pages/customer/Dashboard"));
export const PropertySearch = lazy(() => import("@/pages/customer/PropertySearch"));
export const MyFavorites = lazy(() => import("@/pages/customer/MyFavorites"));
export const PropertyComparison = lazy(() => import("@/pages/customer/PropertyComparison"));
export const MyProperties = lazy(() => import("@/pages/customer/MyProperties"));
export const PostCustomerProperty = lazy(() => import("@/pages/customer/PostProperty"));
export const ServiceRequests = lazy(() => import("@/pages/customer/ServiceRequests"));
export const MySubscription = lazy(() => import("@/pages/customer/MySubscription"));
export const CustomerProfile = lazy(() => import("@/pages/customer/Profile"));
export const Messages = lazy(() => import("@/pages/customer/Messages"));
export const ReviewsRatings = lazy(() => import("@/pages/customer/ReviewsRatings"));