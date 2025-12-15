import { useState, useEffect, useCallback } from "react";
import PropertyFilters from "@/components/PropertyFilters";
import PropertyCard from "@/components/PropertyCard";
import VendorCard from "@/components/VendorCard";
import { Link } from "react-router-dom";
import { propertyService, Property, PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { featuredVendorsService, FeaturedVendor } from "@/services/featuredVendorsService";
import { Loader2, Star, Shield, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [vendors, setVendors] = useState<FeaturedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
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

  const fetchFeaturedVendors = useCallback(async () => {
    try {
      setVendorsLoading(true);
      const response = await featuredVendorsService.getFeaturedVendors(8);
      setVendors(response.vendors);
    } catch (error) {
      console.error("Failed to fetch featured vendors:", error);
      // Toast error is already handled in the service
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters);
    fetchFeaturedVendors();
  }, [fetchProperties, fetchFeaturedVendors, filters]);

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

      {/* Featured Vendors Section */}
      <section className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Our Vendors</h2>
            <p className="text-muted-foreground mt-1">
              Connect with top-rated professional vendors based on their subscription plans
            </p>
          </div>
          {vendors.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{vendors.length} featured vendors</span>
            </div>
          )}
        </div>

        {vendorsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-lg">Loading vendors...</span>
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">
              No featured vendors available
            </p>
            <p className="text-sm text-muted-foreground">
              Check back soon for verified professional vendors
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={vendor._id} vendor={vendor} />
            ))}
          </div>
        )}

        {/* Vendor Legend */}
        {vendors.length > 0 && (
          <div className="mt-8 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-3 text-sm">Vendor Badges:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-500" />
                <span><strong>Top Rated</strong> - Highly rated professionals</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-blue-500" />
                <span><strong>Verified</strong> - Identity & credentials verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span><strong>Marketing Pro</strong> - Advanced marketing tools</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span><strong>Commission Based</strong> - Performance-based pricing</span>
              </div>
            </div>
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
          className="bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/80 hover:brightness-110 hover:shadow-lg hover:scale-105 transition-all duration-300 shadow-[var(--shadow-medium)] inline-block"
        >
          Get Started Today
        </Link>
      </section>
    </>
  );
};

export default Index;