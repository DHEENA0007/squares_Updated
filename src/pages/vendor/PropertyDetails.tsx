import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Eye,
  Users,
  Calendar,
  Star,
  MapPin,
  Building2,
  Bed,
  Bath,
  Car,
  Maximize,
  Phone,
  Mail,
  Share2,
  Heart,
  TrendingUp,
  Camera,
  Video,
  Globe,
  ExternalLink,
  IndianRupee
} from "lucide-react";
import { propertyService, type Property } from "@/services/propertyService";

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [interactionStats, setInteractionStats] = useState<{
    views: number;
    uniqueViewers: number;
    phoneClicks: number;
    messageClicks: number;
    shares: number;
    favorites: number;
  } | null>(null);

  useEffect(() => {
    if (id) {
      loadProperty(id);
      loadInteractionStats(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const response = await propertyService.getProperty(propertyId);
      setProperty(response.data.property);
    } catch (error) {
      console.error('Failed to load property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
      navigate('/vendor/properties');
    } finally {
      setLoading(false);
    }
  };

  const loadInteractionStats = async (propertyId: string) => {
    try {
      const stats = await propertyService.getPropertyInteractionStats(propertyId);
      setInteractionStats(stats);
    } catch (error) {
      console.error('Failed to load interaction stats:', error);
      // Stats are non-critical, don't show error toast
    }
  };

  const handleDelete = async () => {
    if (!property) return;

    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      try {
        setDeleteLoading(true);
        await propertyService.deleteProperty(property._id);
        toast({
          title: "Success",
          description: "Property deleted successfully",
        });
        navigate('/vendor/properties');
      } catch (error) {
        console.error('Failed to delete property:', error);
        toast({
          title: "Error",
          description: "Failed to delete property",
          variant: "destructive",
        });
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const handleToggleFeatured = async () => {
    if (!property) return;

    try {
      await propertyService.togglePropertyFeatured(property._id, !property.featured);
      setProperty(prev => prev ? { ...prev, featured: !prev.featured } : prev);
      toast({
        title: "Success",
        description: `Property ${property.featured ? 'unfeatured' : 'promoted'} successfully`,
      });
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      toast({
        title: "Error",
        description: "Failed to update property status",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLocationString = (property: Property) => {
    const parts = [];
    if (property.address.locationName) parts.push(property.address.locationName);
    if (property.address.city) parts.push(property.address.city);
    if (property.address.district) parts.push(property.address.district);
    if (property.address.state) parts.push(property.address.state);
    if (property.address.pincode) parts.push(property.address.pincode);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
        <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
        <Link to="/vendor/properties">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/properties')} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Badge className={`${propertyService.getStatusColor(property.status)} text-white border-0 px-3 py-1`}>
                {propertyService.getStatusText(property.status)}
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1">
                For {property.listingType.charAt(0).toUpperCase() + property.listingType.slice(1)}
              </Badge>
              {property.featured && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Featured
                </Badge>
              )}
              {property.verified && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">Verified</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
            <p className="text-muted-foreground flex items-center text-base">
              <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
              {getLocationString(property)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          <p className="text-3xl md:text-4xl font-bold text-primary">
            {propertyService.formatPrice(property.price, property.listingType)}
          </p>
          <div className="flex gap-2 w-full md:w-auto">
            <Link to={`/vendor/properties/edit/${property._id}`} className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleToggleFeatured}
              className="flex-1 md:flex-none"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {property.featured ? 'Unfeature' : 'Promote'}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {property.images && property.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[400px] md:h-[500px]">
          {/* Primary Image - Takes up 2x2 space on desktop */}
          <div className="md:col-span-2 md:row-span-2 relative rounded-xl overflow-hidden group">
            <img
              src={propertyService.getPrimaryImage(property)}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            />
            <div className="absolute top-4 left-4">
              <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 hover:bg-black/70">
                Primary Photo
              </Badge>
            </div>
          </div>

          {/* Secondary Images */}
          {property.images.filter(img => !img.isPrimary).slice(0, 4).map((image, index) => (
            <div key={index} className="relative rounded-xl overflow-hidden group">
              <img
                src={image.url}
                alt={image.caption || `Property image ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-medium truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}

          {/* View All Overlay if more than 5 images */}
          {property.images.length > 5 && (
            <div className="relative rounded-xl overflow-hidden group cursor-pointer">
              <img
                src={property.images[5].url}
                alt="More photos"
                className="w-full h-full object-cover blur-sm"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                <p className="text-white font-bold text-lg">+{property.images.length - 5} more</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Overview */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.bedrooms}</p>
                    <p className="text-sm text-blue-600/80 font-medium">Bedrooms</p>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <p className="text-2xl font-bold text-gray-900">{property.bathrooms}</p>
                    <p className="text-sm text-indigo-600/80 font-medium">Bathrooms</p>
                  </div>
                )}
                {propertyService.hasValidArea(property.area) && (
                  <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <Maximize className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                    <p className="text-2xl font-bold text-gray-900">{propertyService.formatArea(property.area).split(' ')[0]}</p>
                    <p className="text-sm text-emerald-600/80 font-medium">Sq Ft</p>
                  </div>
                )}
                {property.type && (
                  <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                    <p className="text-2xl font-bold text-gray-900 capitalize">{property.type}</p>
                    <p className="text-sm text-amber-600/80 font-medium">Type</p>
                  </div>
                )}
              </div>

              {property.description && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="font-semibold mb-3 text-lg">Description</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-4">
                  {property.type && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-muted-foreground">Property Type</span>
                      <span className="font-semibold capitalize text-gray-900">{property.type}</span>
                    </div>
                  )}
                  {property.listingType && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-muted-foreground">Listing Type</span>
                      <span className="font-semibold capitalize text-gray-900">{property.listingType}</span>
                    </div>
                  )}
                  {property.bedrooms > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-muted-foreground">Bedrooms</span>
                      <span className="font-semibold text-gray-900">{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-muted-foreground">Bathrooms</span>
                      <span className="font-semibold text-gray-900">{property.bathrooms}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {propertyService.hasValidArea(property.area) && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-semibold text-gray-900">{propertyService.formatArea(property.area)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold capitalize text-gray-900">{property.status}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Listed On</span>
                    <span className="font-semibold text-gray-900">{formatDate(property.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-semibold text-gray-900">{formatDate(property.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-colors">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3 shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>
                      <span className="text-sm font-medium text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media section can be added when videos and virtual tours are available in the Property model */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Stats */}
          <Card className="border-none shadow-md bg-gradient-to-b from-white to-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Views</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{interactionStats?.views || property.views || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg mr-3">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Leads</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{interactionStats?.messageClicks || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-red-50 rounded-lg mr-3">
                    <Heart className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Favorites</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{interactionStats?.favorites || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg mr-3">
                    <Phone className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Phone Clicks</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{interactionStats?.phoneClicks || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property.virtualTour && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-11 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                  onClick={() => window.open(property.virtualTour, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  Virtual Tour
                </Button>
              )}
              <Link to={`/vendor/properties/edit/${property._id}`}>
                <Button variant="outline" className="w-full justify-start h-11 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all">
                  <Edit3 className="w-4 h-4 mr-3" />
                  Edit Property
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start h-11 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                onClick={handleToggleFeatured}
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                {property.featured ? 'Unfeature Property' : 'Promote Property'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-11 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
              >
                <Share2 className="w-4 h-4 mr-3" />
                Share Property
              </Button>
              <Separator className="my-2" />
              <Button
                variant="destructive"
                className="w-full justify-start h-11 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete Property
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
