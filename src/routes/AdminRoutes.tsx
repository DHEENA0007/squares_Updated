import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { HomePage, UsersPage, AddUserPage, EditUserPage, ProfilePage,RoleListPage,RoleEditPage,ClientListPage,PlanListPage,PropertyListPage,PropertyEditPage,PlanEditPage,ClientEditPage } from "@/routes/AdminLazyImports";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { PageLoader } from "@/components/ui/loader/PageLoader";


const AdminRoutes = () => {
  return (
    <AdminProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader/>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/add" element={<AddUserPage />} />
            <Route path="/users/edit/:id" element={<EditUserPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/roles" element={<RoleListPage/>} />
            <Route path="/roles/edit/:id" element={<RoleEditPage/>} />
            <Route path="/clients" element={<ClientListPage/>} />
            <Route path="/clients/edit/:id" element={<ClientEditPage/>} />
            <Route path="/plans" element={<PlanListPage/>} />
            <Route path="/plans/edit/:id" element={<PlanEditPage/>} />
            <Route path="/properties" element={<PropertyListPage/>} />
            <Route path="/properties/edit/:id" element={<PropertyEditPage/>} />
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
