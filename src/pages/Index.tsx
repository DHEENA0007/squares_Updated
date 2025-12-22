import { useState, useEffect, useCallback } from "react";
import PropertyFilters from "@/components/PropertyFilters";
import PropertyCard from "@/components/PropertyCard";
import VendorCard from "@/components/VendorCard";
import { Link } from "react-router-dom";
import { propertyService, Property, PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { featuredVendorsService, FeaturedVendor } from "@/services/featuredVendorsService";
import { Loader2, Star, Shield, Users, Info, TrendingUp } from "lucide-react";
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

      {/* Featured Vendors Section - Horizontal Reel */}
      {!vendorsLoading && vendors.length > 0 && (
        <section className="mt-16 -mx-4 md:mx-0">
          <div className="mb-8 px-4 md:px-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Featured Premium Vendors
                </h2>
                <p className="text-muted-foreground mt-2 text-base">
                  Verified professionals with exclusive badges - Hover to pause
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal Scrolling Reel Container */}
          <div className="relative overflow-hidden py-8" style={{
            maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
          }}>
            <div 
              className="flex gap-6 animate-scroll hover:pause-animation"
              style={{
                width: 'fit-content',
                animation: 'scroll 60s linear infinite'
              }}
            >
              {/* First set of vendors */}
              {vendors.map((vendor) => (
                <div 
                  key={`vendor-${vendor._id}`}
                  className="flex-shrink-0 w-[550px]"
                  style={{
                    minWidth: '550px'
                  }}
                >
                  <VendorCard vendor={vendor} />
                </div>
              ))}
              {/* Duplicate for seamless infinite scroll */}
              {vendors.map((vendor) => (
                <div 
                  key={`vendor-dup-${vendor._id}`}
                  className="flex-shrink-0 w-[550px]"
                  style={{
                    minWidth: '550px'
                  }}
                >
                  <VendorCard vendor={vendor} />
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-50% - 12px));
              }
            }
            
            .animate-scroll {
              animation: scroll 60s linear infinite;
            }
            
            .pause-animation:hover {
              animation-play-state: paused;
            }
          `}</style>

          {/* Badge Legend */}
          <div className="mt-10 p-6 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl border border-muted-foreground/10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h4 className="font-bold text-lg">Vendor Badges</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Top Rated</p>
                  <p className="text-xs text-muted-foreground">Highly rated</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Verified</p>
                  <p className="text-xs text-muted-foreground">Identity verified</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Marketing Pro</p>
                  <p className="text-xs text-muted-foreground">Advanced tools</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <div>
                  <p className="font-semibold text-sm">Commission Based</p>
                  <p className="text-xs text-muted-foreground">Performance pricing</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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