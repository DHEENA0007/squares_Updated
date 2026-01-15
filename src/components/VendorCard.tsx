import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Phone, MapPin, Clock, Shield, Crown, TrendingUp, DollarSign } from "lucide-react";
import { FeaturedVendor } from "@/services/featuredVendorsService";

interface VendorCardProps {
  vendor: FeaturedVendor;
}

const VendorCard = ({ vendor }: VendorCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadgeIcon = (iconName?: string) => {
    if (!iconName) return <Star className="w-3 h-3 mr-1" />;
    
    switch (iconName) {
      case 'star':
        return <Star className="w-3 h-3 mr-1" />;
      case 'shield':
      case 'shield-check':
        return <Shield className="w-3 h-3 mr-1" />;
      case 'trending-up':
        return <TrendingUp className="w-3 h-3 mr-1" />;
      case 'dollar-sign':
        return <DollarSign className="w-3 h-3 mr-1" />;
      case 'crown':
        return <Crown className="w-3 h-3 mr-1" />;
      default:
        return <Star className="w-3 h-3 mr-1" />;
    }
  };

  const getBadgeVariant = (index: number = 0) => {
    const variants: Array<'default' | 'secondary' | 'outline' | 'destructive'> = ['default', 'secondary', 'outline', 'destructive'];
    return variants[index % variants.length];
  };

  // Only use data from backend - array format only
  const activeBadges = Array.isArray(vendor.badges) 
    ? vendor.badges.filter(badge => badge.enabled)
    : [];

  return (
    <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/30 hover:-translate-y-2 hover:scale-[1.03]">
      <CardContent className="p-7">
        <div className="flex items-center gap-7">
          {/* Left side - Avatar and rating */}
          <div className="flex-shrink-0 text-center">
            <Avatar className="h-24 w-24 mb-3 border-2 border-primary/20">
              <AvatarImage 
                src={vendor.avatar || undefined} 
                alt={vendor.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {getInitials(vendor.name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Rating below avatar */}
            {vendor.rating.count > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-base font-bold">{vendor.rating.average.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({vendor.rating.count} reviews)
                </span>
              </div>
            )}
          </div>
          
          {/* Right side - All details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-2xl leading-tight text-foreground">
                  {vendor.name}
                </h3>
                {vendor.companyName && (
                  <p className="text-base text-muted-foreground font-medium">
                    {vendor.companyName}
                  </p>
                )}
              </div>
              
              {/* Premium Badges */}
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {activeBadges.map((badge, index) => (
                  <Badge 
                    key={badge.key}
                    variant={getBadgeVariant(index)}
                    className="text-xs font-medium"
                  >
                    {getBadgeIcon(badge.icon)}
                    {badge.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                {/* Location */}
                {(vendor.location.city || vendor.location.state) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">
                      {[vendor.location.city, vendor.location.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {/* Response Time */}
                {vendor.responseTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <span>{vendor.responseTime} response</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Specialization */}
                {vendor.specialization.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {vendor.specialization.slice(0, 3).map((spec, index) => (
                      <Badge key={index} variant="outline" className="text-sm font-medium">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {vendor.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {vendor.bio}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorCard;
