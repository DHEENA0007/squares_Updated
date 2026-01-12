import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2, Upload, MapPin, Shield, Check, Eye, Home } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import propertyService, { Property } from "@/services/propertyService";
import EnhancedAddressInput from "@/components/form/EnhancedAddressInput";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DynamicPropertyFields } from "@/components/property/DynamicPropertyFields";
import { configurationService } from "@/services/configurationService";
import type { PropertyType } from "@/types/configuration";

const propertyFormSchema = z.object({
  userType: z.enum(["owner", "agent", "builder"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .min(10, "Phone number must be exactly 10 digits")
    .max(10, "Phone number must be exactly 10 digits"),
  lookingTo: z.enum(["sell", "rent"]),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.string().optional(),
  builtUpArea: z.string().optional(),
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  street: z.string().optional(),
  state: z.string().min(1, "State is required"),
  pincode: z.string()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits")
    .min(6, "Pincode must be exactly 6 digits")
    .max(6, "Pincode must be exactly 6 digits"),
  bathrooms: z.string().optional(),
  balconies: z.string().optional(),
  floorNo: z.string().optional(),
  totalFloors: z.string().optional(),
  furnishing: z.string().optional(),
  parking: z.string().optional(),
  carpetArea: z.string().optional(),
  carpetAreaUnit: z.string().optional(),
  superArea: z.string().optional(),
  superAreaUnit: z.string().optional(),
  possession: z.string().optional(),
  availability: z.string().optional(),
  ageOfProperty: z.string().optional(),
  expectedPrice: z.string().min(1, "Price is required"),
  priceNegotiable: z.boolean().optional(),
  propertyDescription: z.string().optional(),
  isVerified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ url: string; caption?: string; isPrimary: boolean }>>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [propertyTypeId, setPropertyTypeId] = useState<string>("");
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});


  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      userType: "owner",
      lookingTo: "sell",
      priceNegotiable: false,
    },
  });

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;

      try {
        const [propertyResponse, types] = await Promise.all([
          propertyService.getAdminProperty(id),
          configurationService.getAllPropertyTypes()
        ]);
        setProperty(propertyResponse.data.property);
        setPropertyTypes(types);
      } catch (error) {
        console.error("Failed to fetch property or types:", error);
      }
    };

    fetchProperty();
  }, [id]);

  // Populate form when property is loaded
  useEffect(() => {
    if (property) {
      console.log("Populating form with property data:", property);

      // Set existing images
      if (property.images && property.images.length > 0) {
        setExistingImages(property.images);
      }

      // Set property type ID and dynamic fields
      if (propertyTypes.length > 0) {
        const typeConfig = propertyTypes.find(t => t.value === property.type);
        if (typeConfig) {
          setPropertyTypeId(typeConfig._id);
        }
      }

      if ((property as any).customFields) {
        setDynamicFields((property as any).customFields);
      }

      const formData = {
        userType: "owner" as const, // Default or derived if available
        name: property.owner?.profile?.firstName && property.owner?.profile?.lastName
          ? `${property.owner.profile.firstName} ${property.owner.profile.lastName}`
          : "",
        email: property.owner?.email || "",
        phone: property.owner?.profile?.phone || "",
        lookingTo: (property.listingType === 'sale' ? 'sell' : 'rent') as "sell" | "rent",
        propertyType: property.type || "",
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        balconies: (property as any).balconies?.toString() || (property.customFields?.balconies?.toString()) || "",
        // Map builtUp to superArea because that's the visible field in the form
        superArea: property.area?.builtUp?.toString() || property.area?.plot?.toString() || "",
        superAreaUnit: property.area?.unit || "sqft",
        carpetArea: property.area?.carpet?.toString() || "",
        carpetAreaUnit: property.area?.unit || "sqft",
        builtUpArea: property.area?.builtUp?.toString() || "", // Keep this for completeness even if not rendered
        city: property.address?.city || "",
        locality: property.address?.locationName || property.address?.street || "",
        street: property.address?.street || "",
        state: property.address?.state || "",
        pincode: property.address?.pincode || "",
        floorNo: property.floor || "",
        totalFloors: property.totalFloors || "",
        furnishing: property.furnishing || "",
        parking: property.parkingSpaces || "",
        possession: property.possession || "",
        availability: property.availability || "",
        ageOfProperty: property.age || "",
        expectedPrice: property.price?.toString() || "",
        priceNegotiable: property.priceNegotiable || false,
        propertyDescription: property.description || "",
        isVerified: property.verified || false,
        isFeatured: property.featured || false,
        status: property.status || "pending",
      };

      console.log("Resetting form with:", formData);
      form.reset(formData);
    }
  }, [property, form, propertyTypes]);

  // Deprecated manual submit retained only for reference; using react-hook-form's onSubmit

  if (!property) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
            <p className="text-muted-foreground mt-2">Property not found</p>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: PropertyFormValues) => {
    if (!property || !id) return;

    try {
      // Prepare update payload
      const updateData: any = {
        title: property.title, // Keep existing title if not in form
        description: data.propertyDescription,
        type: data.propertyType,
        listingType: data.lookingTo === 'sell' ? 'sale' : 'rent',
        price: parseFloat(data.expectedPrice),
        priceNegotiable: data.priceNegotiable,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms) : undefined,
        floor: data.floorNo,
        totalFloors: data.totalFloors,
        furnishing: data.furnishing,
        parkingSpaces: data.parking,
        possession: data.possession,
        availability: data.availability,
        age: data.ageOfProperty,
        address: {
          ...property.address,
          street: data.street || data.locality,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          locationName: data.locality
        },
        area: {
          builtUp: data.superArea ? parseFloat(data.superArea) : (data.builtUpArea ? parseFloat(data.builtUpArea) : undefined),
          carpet: data.carpetArea ? parseFloat(data.carpetArea) : undefined,
          plot: undefined, // Plot area should be handled via dynamic fields or specific plotArea field if added
          unit: data.carpetAreaUnit || 'sqft'
        },
        customFields: dynamicFields,
        verified: data.isVerified,
        featured: data.isFeatured,
        status: data.status
      };

      // Handle image uploads if any (would need upload logic here, similar to AddProperty)
      // For now, we preserve existing images
      updateData.images = existingImages;

      await propertyService.updateProperty(id, updateData);

      toast({
        title: "Property Updated!",
        description: "Property details have been successfully updated.",
      });
      navigate("/admin/properties");
    } catch (error) {
      console.error("Failed to update property:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update property details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedPhotos(Array.from(e.target.files));
    }
  };




  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
          <p className="text-muted-foreground mt-2">Update property listing details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent>

          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Details */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Personal Details</h2>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>I am *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="owner" id="owner" />
                                <Label htmlFor="owner" className="font-normal cursor-pointer">Owner</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="agent" id="agent" />
                                <Label htmlFor="agent" className="font-normal cursor-pointer">Agent</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="builder" id="builder" />
                                <Label htmlFor="builder" className="font-normal cursor-pointer">Builder</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="10 digit mobile number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Property Details</h2>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="lookingTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Looking to *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sell" id="sell" />
                                <Label htmlFor="sell" className="font-normal cursor-pointer">Sell</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rent" id="rent" />
                                <Label htmlFor="rent" className="font-normal cursor-pointer">Rent / Lease</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="plot">Plot</SelectItem>
                              <SelectItem value="land">Land</SelectItem>
                              <SelectItem value="office">Office</SelectItem>
                              <SelectItem value="pg">PG (Paying Guest)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bedrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bedrooms</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1 BHK</SelectItem>
                                <SelectItem value="2">2 BHK</SelectItem>
                                <SelectItem value="3">3 BHK</SelectItem>
                                <SelectItem value="4">4 BHK</SelectItem>
                                <SelectItem value="5+">5+ BHK</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bathrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bathrooms</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5+">5+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="balconies"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Balconies</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4+">4+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="furnishing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Furnishing</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                                <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
                                <SelectItem value="furnished">Fully Furnished</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="floorNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Floor No.</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Ground" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalFloors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Floors</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="parking"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parking</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3+">3+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Property Fields */}
                {propertyTypeId && (
                  <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Additional Details</h2>
                    <DynamicPropertyFields
                      propertyTypeId={propertyTypeId}
                      values={dynamicFields}
                      onChange={(field, value) => setDynamicFields(prev => ({ ...prev, [field]: value }))}
                    />
                  </div>
                )}

                {/* Property Location */}
                <div className="bg-transparent rounded-lg border border-primary/20 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Property Location
                  </h2>

                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter location details or start with pincode for instant auto-completion
                    </p>

                    <EnhancedAddressInput
                      onLocationChange={(locationData) => {
                        // Update form fields based on location data
                        if (locationData.pincode) {
                          form.setValue('pincode', locationData.pincode);
                        }
                        if (locationData.state) {
                          form.setValue('state', locationData.state);
                        }
                        if (locationData.city || locationData.district) {
                          form.setValue('city', locationData.city || locationData.district || '');
                        }
                        if (locationData.locationName) {
                          form.setValue('locality', locationData.locationName);
                        }
                      }}
                      initialData={{
                        pincode: form.watch('pincode') || '',
                        state: form.watch('state') || '',
                        city: form.watch('city') || '',
                        locationName: form.watch('locality') || ''
                      }}
                      showPincodeFirst={true}
                    />
                  </div>
                </div>

                {/* Area */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Area</h2>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="carpetArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carpet Area</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 1200" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="carpetAreaUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sqft">Sq.ft</SelectItem>
                                <SelectItem value="sqm">Sq.m</SelectItem>
                                <SelectItem value="sqyd">Sq.yd</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="superArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Super / Built-up Area</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 1500" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="superAreaUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sqft">Sq.ft</SelectItem>
                                <SelectItem value="sqm">Sq.m</SelectItem>
                                <SelectItem value="sqyd">Sq.yd</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Transaction Type & Availability */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Transaction Type & Availability</h2>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="possession"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Possession</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ready-to-move">Ready to Move</SelectItem>
                                <SelectItem value="under-construction">Under Construction</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ageOfProperty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age of Property</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0-1">0-1 Year</SelectItem>
                                <SelectItem value="1-5">1-5 Years</SelectItem>
                                <SelectItem value="5-10">5-10 Years</SelectItem>
                                <SelectItem value="10+">10+ Years</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="availability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available From</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Price Details */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Price Details</h2>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="expectedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Price *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter amount in ₹" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priceNegotiable"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Price is negotiable
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Admin Settings */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Admin Settings</h2>
                  </div>

                  <div className="grid gap-6">
                    {/* Property Verification */}
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Verified Status</Label>
                          <p className="text-sm text-muted-foreground">Mark property as verified</p>
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="isVerified"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="h-5 w-5 border-2"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Featured Property */}
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-amber-200/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <Eye className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Featured Status</Label>
                          <p className="text-sm text-muted-foreground">Enhanced visibility</p>
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="h-5 w-5 border-2"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Property Status */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Property Status</Label>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-blue-200/50 bg-background/50">
                                  <SelectValue placeholder="Select property status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Active
                                  </div>
                                </SelectItem>
                                <SelectItem value="available">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Available
                                  </div>
                                </SelectItem>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    Pending
                                  </div>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Rejected
                                  </div>
                                </SelectItem>
                                <SelectItem value="sold">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    Sold
                                  </div>
                                </SelectItem>
                                <SelectItem value="rented">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    Rented
                                  </div>
                                </SelectItem>
                                <SelectItem value="leased">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Leased
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Property Description */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Property Description</h2>

                  <FormField
                    control={form.control}
                    name="propertyDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add more details about your property..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photos Upload */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Photos</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add photos to get better response (Max 20 photos)
                  </p>

                  {/* Display existing images */}
                  {existingImages.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">Existing Images ({existingImages.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.url}
                              alt={image.caption || `Property ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            {image.isPrimary && (
                              <Badge className="absolute top-2 left-2" variant="default">Primary</Badge>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <span className="text-primary font-medium">Click to upload</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    {uploadedPhotos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-foreground mb-3">
                          {uploadedPhotos.length} new photo(s) selected
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {uploadedPhotos.map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pb-8">
                  <Button type="submit" size="lg" className="px-12">
                    Post Property
                  </Button>
                </div>
              </form>
            </Form>
          </div>


        </CardContent>
      </Card>
    </div>
  );
};

export default EditProperty;
