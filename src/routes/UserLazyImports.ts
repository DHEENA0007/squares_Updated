import { lazy } from "react";

// Pages
export const Dashboard = lazy(() => import("@/pages/Index"));
export const Products = lazy(() => import("@/pages/Products"));
export const SubscriptionPlans = lazy(() => import("@/pages/SubscriptionPlans"));
export const Login = lazy(() => import("@/pages/Login"));
export const Signup = lazy(() => import("@/pages/Signup"));
export const Contact = lazy(() => import("@/pages/Contact"));
export const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
export const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
export const PropertyDetails = lazy(() => import("@/pages/customer/PropertyDetails"));