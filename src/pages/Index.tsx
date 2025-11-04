import { useState, useEffect, useCallback } from "react";
import PropertyFilters from "@/components/PropertyFilters";
import PropertyCard from "@/components/PropertyCard";
import { Link } from "react-router-dom";
import { propertyService, Property, PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PropertyFilterType>({});

  const fetchProperties = useCallback(async (currentFilters: PropertyFilterType = {}) => {
    try {
      setLoading(true);
      // Fetch properties with filters applied
      const response = await propertyService.getProperties({
        limit: 12, // Increased limit to show more properties
        page: 1,
        ...currentFilters,
      });
      
      if (response.success) {
        setProperties(response.data.properties);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters);
  }, [fetchProperties, filters]);

  const handleFilterChange = (newFilters: PropertyFilterType) => {
    setFilters(newFilters);
  };

  return (
    <>
      <PropertyFilters onFilterChange={handleFilterChange} />

      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">
              {Object.keys(filters).some(key => filters[key as keyof PropertyFilterType] !== undefined) 
                ? "Filtered Properties" 
                : "Latest Properties"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {Object.keys(filters).some(key => filters[key as keyof PropertyFilterType] !== undefined)
                ? `Found ${properties.length} properties matching your criteria`
                : "Discover our newest property listings"}
            </p>
          </div>
          <Link
            to="/products"
            className="text-primary hover:underline font-medium"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-lg">Loading properties...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No properties available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-12 text-center text-primary-foreground">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Find Your Dream Home?
        </h2>
        <p className="text-lg mb-6 opacity-90">
          Join thousands of happy homeowners who found their perfect property
          with us
        </p>
        <Link
          to="/products"
          className="bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors shadow-[var(--shadow-medium)] inline-block"
        >
          Get Started Today
        </Link>
      </section>
    </>
  );
};

export default Index;