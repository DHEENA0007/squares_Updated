import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Award, Shield, TrendingUp, Zap, Loader2 } from "lucide-react";
import { vendorService } from "@/services/vendorService";
import { Link } from "react-router-dom";

interface FeaturedVendor {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
    phone?: string;
    vendorInfo: {
      companyName?: string;
      experience: number;
      rating: {
        average: number;
        count: number;
      };
      serviceAreas: string[];
    };
  };
  subscription?: {
    plan: {
      name: string;
      benefits: Record<string, boolean>;
    };
  };
  badges: string[];
}

const FeaturedVendors = () => {
  const [vendors, setVendors] = useState<FeaturedVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const response = await vendorService.getFeaturedVendors(8);
        if (response.success) {
          setVendors(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch featured vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const getBadgeIcon = (badgeKey: string) => {
    const icons: Record<string, JSX.Element> = {
      topRated: <Award className="h-3 w-3" />,
      verifiedBadge: <Shield className="h-3 w-3" />,
      marketingManager: <TrendingUp className="h-3 w-3" />,
      commissionBased: <Zap className="h-3 w-3" />,
    };
    return icons[badgeKey] || <Award className="h-3 w-3" />;
  };

  const getBadgeLabel = (badgeKey: string): string => {
    const labels: Record<string, string> = {
      topRated: "Featured Agent",
      verifiedBadge: "Verified Pro",
      marketingManager: "Premium",
      commissionBased: "Top Rated"
    };
    return labels[badgeKey] || badgeKey.replace(/([A-Z])/g, ' $1').trim();
  };

  const getBadgeVariant = (badgeKey: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      topRated: "default",
      verifiedBadge: "default",
      marketingManager: "secondary",
      commissionBased: "outline"
    };
    return variants[badgeKey] || "secondary";
  };

  if (loading) {
    return (
      <section className="mt-16 mb-12">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading featured vendors...</p>
        </div>
      </section>
    );
  }

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 mb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Our Featured Vendors</h2>
        <p className="text-muted-foreground">
          Connect with verified professionals offering premium real estate services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {vendors.map((vendor) => {
          const fullName = `${vendor.profile.firstName} ${vendor.profile.lastName}`;
          const initials = `${vendor.profile.firstName[0]}${vendor.profile.lastName[0]}`.toUpperCase();
          const activeBadges = vendor.subscription?.plan?.benefits 
            ? Object.entries(vendor.subscription.plan.benefits)
                .filter(([_, value]) => value === true)
                .map(([key]) => key)
            : [];

          return (
            <Link key={vendor._id} to={`/vendor/${vendor._id}`}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-3 ring-2 ring-primary/10">
                      <AvatarImage src={vendor.profile.avatar} alt={fullName} />
                      <AvatarFallback className="text-lg font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-semibold text-lg mb-1">{fullName}</h3>
                    
                    {vendor.profile.vendorInfo.companyName && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {vendor.profile.vendorInfo.companyName}
                      </p>
                    )}

                    {activeBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mb-3">
                        {activeBadges.slice(0, 2).map((badge) => (
                          <Badge 
                            key={badge} 
                            variant={getBadgeVariant(badge)}
                            className="text-xs flex items-center gap-1"
                          >
                            {getBadgeIcon(badge)}
                            {getBadgeLabel(badge)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {vendor.profile.vendorInfo.rating.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({vendor.profile.vendorInfo.rating.count} reviews)
                      </span>
                    </div>

                    {vendor.profile.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {vendor.profile.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {vendor.profile.vendorInfo.serviceAreas.slice(0, 2).join(", ")}
                        {vendor.profile.vendorInfo.serviceAreas.length > 2 && " +more"}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      {vendor.profile.vendorInfo.experience}+ years experience
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedVendors;
