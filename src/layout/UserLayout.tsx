import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";

const UserLayout = () => {
  const location = useLocation();
  // Show Hero only on the Dashboard route
  const showHero = location.pathname === "/";
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {showHero && <Hero />}
      <main className="container mx-auto px-4 py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
