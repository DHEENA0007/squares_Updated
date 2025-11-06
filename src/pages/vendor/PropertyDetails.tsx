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
  IndianRupee,
  ExternalLink
} from "lucide-react";
import { propertyService, type Property } from "@/services/propertyService";

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty(id);
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
    if (property.address.street) parts.push(property.address.street);
    if (property.address.locationName) parts.push(property.address.locationName);
    if (property.address.taluk) parts.push(property.address.taluk);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/properties')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground flex items-center mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {getLocationString(property)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link to={`/vendor/properties/edit/${property._id}`}>
            <Button variant="outline">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={handleToggleFeatured}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {property.featured ? 'Unfeature' : 'Promote'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status and Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${propertyService.getStatusColor(property.status)} text-white`}>
            {propertyService.getStatusText(property.status)}
          </Badge>
          {property.featured && (
            <Badge variant="secondary">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {property.verified && (
            <Badge className="bg-green-600 text-white">Verified</Badge>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">
            {propertyService.formatPrice(property.price, property.listingType)}
          </p>
          {/* Negotiable pricing info can be added when available */}
        </div>
      </div>

      {/* Image Gallery */}
      {property.images && property.images.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {property.images.map((image, index) => (
                <div key={index} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.caption || `Property image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                  {image.isPrimary && (
                    <Badge className="absolute top-3 left-3 bg-primary text-white">
                      Primary Photo
                    </Badge>
                  )}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                      <p className="text-sm">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms > 0 && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.bedrooms}</p>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                  </div>
                )}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{property.bathrooms}</p>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Maximize className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{propertyService.formatArea(property.area).split(' ')[0]}</p>
                  <p className="text-sm text-muted-foreground">Sq Ft</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold capitalize">{property.type}</p>
                  <p className="text-sm text-muted-foreground">Type</p>
                </div>
              </div>

              {property.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Type:</span>
                    <span className="font-medium capitalize">{property.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Type:</span>
                    <span className="font-medium capitalize">{property.listingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bedrooms:</span>
                    <span className="font-medium">{property.bedrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bathrooms:</span>
                    <span className="font-medium">{property.bathrooms}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Area:</span>
                    <span className="font-medium">{propertyService.formatArea(property.area)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{property.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listed On:</span>
                    <span className="font-medium">{formatDate(property.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">{formatDate(property.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      <span className="text-sm">{amenity}</span>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-semibold">{property.views}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-sm">Leads</span>
                </div>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-2 text-red-600" />
                  <span className="text-sm">Favorites</span>
                </div>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-purple-600" />
                  <span className="text-sm">Phone Calls</span>
                </div>
                <span className="font-semibold">0</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property.virtualTour && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open(property.virtualTour, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Virtual Tour
                </Button>
              )}
              <Link to={`/vendor/properties/edit/${property._id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Property
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" onClick={handleToggleFeatured}>
                <TrendingUp className="w-4 h-4 mr-2" />
                {property.featured ? 'Unfeature Property' : 'Promote Property'}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Share2 className="w-4 h-4 mr-2" />
                Share Property
              </Button>
              <Separator />
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
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
