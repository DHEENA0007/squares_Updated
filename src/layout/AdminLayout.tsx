// import Navbar from "./Navbar";
// import Sidebar from "./Sidebar";
// import { useSelector } from "react-redux";
// import { Outlet, useLocation } from "react-router-dom";
// import { useEffect, useRef } from "react";
// import { RootState } from "../../store"; // adjust path to your store type

// const AdminLayout: React.FC = () => {
//   const isSidebarOpen = useSelector(
//     (state: RootState) => state.users.responsive
//   );

//   const location = useLocation();
//   const contentRef = useRef<HTMLDivElement>(null);

//   // Scroll to top on route change
//   useEffect(() => {
//     if (contentRef.current) {
//       contentRef.current.scrollTo({ top: 0, behavior: "auto" });
//     }
//   }, [location.pathname]);

//   return (
//     <div className="flex max-h-screen overflow-hidden">
//       {/* Sidebar */}
//       <div
//         className={`transition-all duration-300 ease-in-out bg-white shadow-lg h-screen overflow-y-auto
//           ${isSidebarOpen ? "w-64" : "w-24"}`}
//       >
//         <Sidebar />
//       </div>

//       {/* Main content */}
//       <div className="flex flex-col flex-1">
//         {/* Sticky navbar */}
//         <div className="sticky top-0 z-30 bg-white shadow">
//           <Navbar />
//         </div>

//         {/* Page content */}
//         <div        >
//           <Outlet />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminLayout;
