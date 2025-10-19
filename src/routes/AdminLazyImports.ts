import { lazy } from "react";

export const HomePage = lazy(() => import("@/pages/admin/Dashboard"));
export const UsersPage = lazy(() => import("@/pages/admin/Users"));
export const AddUserPage = lazy(() => import("@/pages/admin/AddUser"));
export const EditUserPage = lazy(() => import("@/pages/admin/EditUser"));
export const ProfilePage = lazy(() => import("@/pages/admin/Profile"));
export const RoleListPage = lazy(() => import("@/pages/admin/Roles"));
export const RoleEditPage = lazy(() => import("@/pages/admin/EditRole"));
export const ClientListPage = lazy(() => import("@/pages/admin/Clients"));
export const ClientEditPage = lazy(() => import("@/pages/admin/EditClient"));
export const PlanListPage = lazy(() => import("@/pages/admin/Plans"));
export const PlanEditPage = lazy(() => import("@/pages/admin/EditPlan"));
export const PropertyListPage = lazy(() => import("@/pages/admin/Properties"));
export const PropertyEditPage = lazy(() => import("@/pages/admin/EditProperty"));
