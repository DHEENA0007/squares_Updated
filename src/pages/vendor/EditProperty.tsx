import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Upload,
  X,
  Plus,
  Video,
  Camera
} from "lucide-react";
import { propertyService, type Property } from "@/services/propertyService";

// Upload function using server-side endpoint
const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/upload/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Upload failed');
    }
    
    return data.data.url;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
};

const EditProperty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string | number;
    name: string;
    url: string;
    file?: File;
    isPrimary: boolean;
  }>>([]);

  const [uploadedVideos, setUploadedVideos] = useState<Array<{
    id: string | number;
    name: string;
    url: string;
    file?: File;
  }>>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    listingType: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    builtUpArea: "",
    carpetArea: "",
    plotArea: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    amenities: [] as string[],
    virtualTour: ""
  });

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "house", label: "House" },
    { value: "commercial", label: "Commercial" },
    { value: "plot", label: "Plot" },
    { value: "land", label: "Land" },
    { value: "office", label: "Office Space" },
    { value: "pg", label: "PG (Paying Guest)" }
  ];

  const amenitiesList = [
    "Swimming Pool", "Gym/Fitness Center", "Parking", "Security",
    "Garden/Park", "Playground", "Clubhouse", "Power Backup",
    "Elevator", "WiFi", "CCTV Surveillance", "Intercom",
    "Water Supply", "Waste Management", "Fire Safety", "Visitor Parking",
    "Shopping Complex", "Restaurant", "Spa", "Jogging Track"
  ];

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const response = await propertyService.getProperty(propertyId);
      const propertyData = response.data.property;
      
      setProperty(propertyData);
      
      // Populate form data
      setFormData({
        title: propertyData.title,
        description: propertyData.description,
        type: propertyData.type,
        listingType: propertyData.listingType,
        price: propertyData.price.toString(),
        bedrooms: propertyData.bedrooms.toString(),
        bathrooms: propertyData.bathrooms.toString(),
        builtUpArea: propertyData.area.builtUp?.toString() || "",
        carpetArea: propertyData.area.carpet?.toString() || "",
        plotArea: propertyData.area.plot?.toString() || "",
        street: propertyData.address.street,
        city: propertyData.address.city,
        state: propertyData.address.state,
        pincode: propertyData.address.pincode,
        amenities: propertyData.amenities || [],
        virtualTour: (propertyData as any).virtualTour || ""
      });

      // Set existing videos
      if ((propertyData as any).videos) {
        setUploadedVideos((propertyData as any).videos.map((video: any, index: number) => ({
          id: `existing-video-${index}`,
          name: video.caption || `Video ${index + 1}`,
          url: video.url
        })));
      }

      // Set existing images
      if (propertyData.images) {
        setUploadedImages(propertyData.images.map((img, index) => ({
          id: `existing-${index}`,
          name: img.caption || `Image ${index + 1}`,
          url: img.url,
          isPrimary: img.isPrimary
        })));
      }
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages(prev => [
        ...prev,
        ...files.map(file => ({
          id: Date.now() + Math.random(),
          name: file.name,
          url: URL.createObjectURL(file),
          file: file,
          isPrimary: prev.length === 0 // First image is primary
        }))
      ]);
    }
  };

  const removeImage = (id: string | number) => {
    setUploadedImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // If we removed the primary image, make the first remaining image primary
      if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedVideos(prev => [
        ...prev,
        ...files.map(file => ({
          id: Date.now() + Math.random(),
          name: file.name,
          url: URL.createObjectURL(file),
          file: file
        }))
      ]);
    }
  };

  const removeVideo = (id: string | number) => {
    setUploadedVideos(prev => prev.filter(video => video.id !== id));
  };

  const setPrimaryImage = (id: string | number) => {
    setUploadedImages(prev => prev.map(img => ({
      ...img,
      isPrimary: img.id === id
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || saving) return;

    // Validate required fields
    const requiredFields = {
      title: formData.title?.trim(),
      description: formData.description?.trim(),
      type: formData.type,
      listingType: formData.listingType,
      price: formData.price,
      city: formData.city?.trim(),
      pincode: formData.pincode?.trim()
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Upload new images to Cloudinary
      const uploadedImageUrls = [];
      for (const image of uploadedImages) {
        if (image.file) {
          // New image - upload to Cloudinary
          const uploadedUrl = await uploadToCloudinary(image.file, 'property_images');
          uploadedImageUrls.push({
            url: uploadedUrl,
            caption: image.name,
            isPrimary: image.isPrimary
          });
        } else {
          // Existing image - keep as is
          uploadedImageUrls.push({
            url: image.url,
            caption: image.name,
            isPrimary: image.isPrimary
          });
        }
      }

      // Upload new videos to Cloudinary
      const uploadedVideoUrls = [];
      for (const video of uploadedVideos) {
        if (video.file) {
          // New video - upload to Cloudinary
          const uploadedUrl = await uploadToCloudinary(video.file, 'property_videos');
          uploadedVideoUrls.push({
            url: uploadedUrl,
            caption: video.name
          });
        } else {
          // Existing video - keep as is
          uploadedVideoUrls.push({
            url: video.url,
            caption: video.name
          });
        }
      }

      // Prepare property data for update
      const propertyData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type as Property['type'],
        listingType: formData.listingType as Property['listingType'],
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        area: {
          builtUp: formData.builtUpArea ? parseFloat(formData.builtUpArea) : undefined,
          carpet: formData.carpetArea ? parseFloat(formData.carpetArea) : undefined,
          plot: formData.plotArea ? parseFloat(formData.plotArea) : undefined,
          unit: 'sqft' as const
        },
        address: {
          street: formData.street.trim() || '',
          locality: '', // Remove locality field
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim()
        },
        amenities: formData.amenities,
        images: uploadedImageUrls,
        videos: uploadedVideoUrls
      };

      // Add optional fields if they have values
      if (formData.virtualTour?.trim()) {
        propertyData.virtualTour = formData.virtualTour.trim();
      }

      // Update property
      await propertyService.updateProperty(property._id, propertyData);
      
      toast({
        title: "Success!",
        description: "Property updated successfully.",
      });

      navigate(`/vendor/properties/details/${property._id}`);
    } catch (error) {
      console.error("Error updating property:", error);
      
      let errorMessage = "Failed to update property. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
        <p className="text-muted-foreground mb-4">The property you're trying to edit doesn't exist.</p>
        <Button onClick={() => navigate('/vendor/properties')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/properties')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Property</h1>
            <p className="text-muted-foreground mt-1">Update your property details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter property title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Listing Type *</Label>
                <RadioGroup 
                  value={formData.listingType} 
                  onValueChange={(value) => handleInputChange('listingType', value)}
                  className="flex flex-row space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sale" id="sale" />
                    <Label htmlFor="sale">For Sale</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rent" id="rent" />
                    <Label htmlFor="rent">For Rent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lease" id="lease" />
                    <Label htmlFor="lease">For Lease</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your property..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="Enter price"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    placeholder="Number of bedrooms"
                    min="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    placeholder="Number of bathrooms"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="builtUpArea">Built-up Area (sq ft)</Label>
                  <Input
                    id="builtUpArea"
                    type="number"
                    value={formData.builtUpArea}
                    onChange={(e) => handleInputChange('builtUpArea', e.target.value)}
                    placeholder="Built-up area"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="carpetArea">Carpet Area (sq ft)</Label>
                  <Input
                    id="carpetArea"
                    type="number"
                    value={formData.carpetArea}
                    onChange={(e) => handleInputChange('carpetArea', e.target.value)}
                    placeholder="Carpet area"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plotArea">Plot Area (sq ft)</Label>
                  <Input
                    id="plotArea"
                    type="number"
                    value={formData.plotArea}
                    onChange={(e) => handleInputChange('plotArea', e.target.value)}
                    placeholder="Plot area"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pincode">PIN Code *</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    placeholder="PIN Code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenitiesList.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <Label htmlFor={amenity} className="text-sm">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Property Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Add Images
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Upload high-quality images of your property
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <div className="absolute top-1 right-1 flex gap-1">
                        {!image.isPrimary && (
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPrimaryImage(image.id)}
                            title="Set as primary image"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Property Videos (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => document.getElementById('video-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    MP4, MOV, AVI (max 100MB)
                  </p>
                </div>
                <input
                  id="video-upload"
                  type="file"
                  multiple
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>

              {uploadedVideos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedVideos.map((video) => (
                    <div key={video.id} className="relative border rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Video className="w-8 h-8 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{video.name}</p>
                          <p className="text-xs text-muted-foreground">Video file</p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-6 w-6"
                          onClick={() => removeVideo(video.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Virtual Tour */}
          <Card>
            <CardHeader>
              <CardTitle>Virtual Tour (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="virtualTour">Virtual Tour URL</Label>
                <Input
                  id="virtualTour"
                  placeholder="e.g., https://your-virtual-tour-link.com or YouTube link"
                  value={formData.virtualTour}
                  onChange={(e) => handleInputChange('virtualTour', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Add a virtual tour link, YouTube video, or 360° tour to showcase your property
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/vendor/properties')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProperty;
