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

  const getBadgeIcon = (badgeType: string, customIcon?: string) => {
    // Use custom icon if provided
    if (customIcon) {
      switch (customIcon) {
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
    }

    // Fallback to legacy icon mapping
    switch (badgeType) {
      case 'topRated':
        return <Star className="w-3 h-3 mr-1" />;
      case 'verifiedBadge':
        return <Shield className="w-3 h-3 mr-1" />;
      case 'marketingManager':
        return <TrendingUp className="w-3 h-3 mr-1" />;
      case 'commissionBased':
        return <DollarSign className="w-3 h-3 mr-1" />;
      default:
        return <Star className="w-3 h-3 mr-1" />;
    }
  };

  const getBadgeText = (badgeType: string, customName?: string) => {
    // Use custom name if provided
    if (customName) {
      return customName;
    }

    // Fallback to legacy text mapping
    switch (badgeType) {
      case 'topRated':
        return 'Top Rated';
      case 'verifiedBadge':
        return 'Verified';
      case 'marketingManager':
        return 'Marketing Pro';
      case 'commissionBased':
        return 'Commission Based';
      default:
        return badgeType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  };

  const getBadgeVariant = (badgeType: string, index: number = 0) => {
    const variants = ['default', 'secondary', 'outline', 'destructive'];
    
    // Legacy mapping
    switch (badgeType) {
      case 'topRated':
        return 'default'; // Yellow/primary
      case 'verifiedBadge':
        return 'secondary'; // Blue/green
      case 'marketingManager':
        return 'outline'; // Purple outline
      case 'commissionBased':
        return 'destructive'; // Red/orange
      default:
        return variants[index % variants.length] as 'default' | 'secondary' | 'outline' | 'destructive';
    }
  };

  // Get active badges - handle both legacy object format and new array format
  const activeBadges = Array.isArray(vendor.badges) 
    ? vendor.badges.filter(badge => badge.enabled)
    : Object.entries(vendor.badges)
        .filter(([_, isActive]) => isActive)
        .map(([badgeType, _]) => ({ 
          key: badgeType, 
          name: getBadgeText(badgeType),
          enabled: true,
          icon: undefined 
        }));

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage 
              src={vendor.avatar || undefined} 
              alt={vendor.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {getInitials(vendor.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight text-foreground truncate">
              {vendor.name}
            </h3>
            {vendor.companyName && (
              <p className="text-sm text-muted-foreground font-medium truncate">
                {vendor.companyName}
              </p>
            )}
            
            {/* Rating */}
            {vendor.rating.count > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">
                  {vendor.rating.average.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({vendor.rating.count} reviews)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Premium Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {activeBadges.map((badge, index) => {
            const badgeKey = typeof badge === 'object' ? badge.key : badge;
            const badgeName = typeof badge === 'object' ? badge.name : getBadgeText(badge);
            const badgeIcon = typeof badge === 'object' ? badge.icon : undefined;
            
            return (
              <Badge 
                key={badgeKey}
                variant={getBadgeVariant(badgeKey, index)}
                className="text-xs font-medium"
              >
                {getBadgeIcon(badgeKey, badgeIcon)}
                {badgeName}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Location */}
        {(vendor.location.city || vendor.location.state) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {[vendor.location.city, vendor.location.state]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {/* Response Time */}
        {vendor.responseTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{vendor.responseTime} response time</span>
          </div>
        )}

        {/* Contact Info */}
        {vendor.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span className="truncate">{vendor.phone}</span>
          </div>
        )}

        {/* Specialization */}
        {vendor.specialization.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {vendor.specialization.slice(0, 3).map((spec, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {spec}
              </Badge>
            ))}
            {vendor.specialization.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{vendor.specialization.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Bio */}
        {vendor.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis'
          }}>
            {vendor.bio}
          </p>
        )}

        {/* Plan Info */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <Crown className="w-3 h-3 inline mr-1" />
            {vendor.planName} Plan
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorCard;
