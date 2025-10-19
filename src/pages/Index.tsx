import PropertyFilters from "@/components/PropertyFilters";
import PropertyCard from "@/components/PropertyCard";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import { Link } from "react-router-dom";

const Index = () => {
  const properties = [
    {
      id: 1,
      title: "Luxury 3BHK Apartment in Powai",
      location: "Powai, Mumbai",
      price: "₹1.2 Cr",
      bedrooms: 3,
      bathrooms: 2,
      area: "1450 sq.ft",
      type: "Apartment",
      image: property1,
      featured: true,
    },
    {
      id: 2,
      title: "Modern Villa with Pool",
      location: "Whitefield, Bangalore",
      price: "₹2.5 Cr",
      bedrooms: 4,
      bathrooms: 3,
      area: "2800 sq.ft",
      type: "Villa",
      image: property2,
      featured: true,
    },
    {
      id: 3,
      title: "Spacious 2BHK with City View",
      location: "Bandra West, Mumbai",
      price: "₹85 Lac",
      bedrooms: 2,
      bathrooms: 2,
      area: "1200 sq.ft",
      type: "Apartment",
      image: property3,
      featured: false,
    },
    {
      id: 4,
      title: "Premium 3BHK in Gated Community",
      location: "Gurgaon, Delhi NCR",
      price: "₹1.8 Cr",
      bedrooms: 3,
      bathrooms: 3,
      area: "1850 sq.ft",
      type: "Apartment",
      image: property1,
      featured: false,
    },
    {
      id: 5,
      title: "Elegant Villa with Garden",
      location: "Hinjewadi, Pune",
      price: "₹1.9 Cr",
      bedrooms: 4,
      bathrooms: 4,
      area: "3200 sq.ft",
      type: "Villa",
      image: property2,
      featured: false,
    },
    {
      id: 6,
      title: "Cozy 2BHK Near Metro",
      location: "Indirapuram, Ghaziabad",
      price: "₹65 Lac",
      bedrooms: 2,
      bathrooms: 2,
      area: "1100 sq.ft",
      type: "Apartment",
      image: property3,
      featured: false,
    },
  ];

  return (
    <>
      <PropertyFilters />

      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Featured Properties</h2>
            <p className="text-muted-foreground mt-1">
              Hand-picked premium properties for you
            </p>
          </div>
          <Link
            to="/products"
            className="text-primary hover:underline font-medium"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} {...property} />
          ))}
        </div>
      </section>

      <section className="mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-12 text-center text-primary-foreground">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Find Your Dream Home?
        </h2>
        <p className="text-lg mb-6 opacity-90">
          Join thousands of happy homeowners who found their perfect property
          with us
        </p>
        <button className="bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors shadow-[var(--shadow-medium)]">
          Get Started Today
        </button>
      </section>
    </>
  );
};

export default Index;
