import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { HomePage, UsersPage, AddUserPage, MessagesPage, ProfilePage, SettingsPage, RoleListPage,RoleEditPage,AddRolePage,ClientListPage,PlanListPage,PropertyListPage,PropertyEditPage,AddPropertyPage,PlanEditPage,PlanCreatePage,ClientEditPage,AddonManagementPage } from "@/routes/AdminLazyImports";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import SubAdminRoutes from "./SubAdminRoutes";


const AdminRoutes = () => {
  const { isSuperAdmin, isSubAdmin, user } = useAuth();
  
  console.log('AdminRoutes: User:', user);
  console.log('AdminRoutes: isSuperAdmin:', isSuperAdmin);
  console.log('AdminRoutes: isSubAdmin:', isSubAdmin);
  
  // If user is sub admin, render sub admin routes
  if (isSubAdmin && !isSuperAdmin) {
    console.log('AdminRoutes: Rendering SubAdminRoutes');
    return <SubAdminRoutes />;
  }
  
  console.log('AdminRoutes: Rendering full admin routes for superadmin/admin');
  // Super admin gets full access to all routes
  return (
    <AdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader/>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/add" element={<AddUserPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/roles" element={<RoleListPage/>} />
            <Route path="/roles/add" element={<AddRolePage/>} />
            <Route path="/roles/edit/:id" element={<RoleEditPage/>} />
            <Route path="/clients" element={<ClientListPage/>} />
            <Route path="/clients/edit/:id" element={<ClientEditPage/>} />
            <Route path="/plans" element={<PlanListPage/>} />
            <Route path="/plans/create" element={<PlanCreatePage/>} />
            <Route path="/plans/edit/:id" element={<PlanEditPage/>} />
            <Route path="/properties" element={<PropertyListPage/>} />
            <Route path="/properties/add" element={<AddPropertyPage/>} />
            <Route path="/properties/edit/:id" element={<PropertyEditPage/>} />
            <Route path="/addons" element={<AddonManagementPage/>} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </AdminProtectedRoute>
  );
};

export default AdminRoutes;



// const AdminRoutes = () => {
//   return (
//     <Suspense fallback="Loading....">
//       <Routes>
//         {/* Public Admin Routes (No Layout) */}
//         {/* <Route element={<AdminPublicRoute />}> */}
//           {/* <Route path="/admin/login" element={<AdminLogin />} /> */}
//         {/* </Route> */}

//         {/* Protected Admin Routes (With Layout) */}
//         {/* <Route element={<AdminPrivateRoute />}> */}
//           {/* <Route element={<AdminLayout />}> */}
//             <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
//             <Route path="/admin/dashboard" element={<HomePage />} />
//           {/* </Route> */}
//         {/* </Route> */}
//       </Routes>
//     </Suspense>
//   );
// };
