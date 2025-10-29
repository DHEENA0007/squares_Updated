import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import propertyService from "@/services/propertyService";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import EnhancedAddressInput from "@/components/form/EnhancedAddressInput";

const propertyFormSchema = z.object({
  // Admin/Owner info
  userType: z.enum(["admin", "owner", "agent", "builder"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  
  // Property basics
  title: z.string().min(5, "Title must be at least 5 characters"),
  lookingTo: z.enum(["sell", "rent"]),
  propertyType: z.string().min(1, "Property type is required"),
  
  // Property details
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  balconies: z.string().optional(),
  floorNo: z.string().optional(),
  totalFloors: z.string().optional(),
  furnishing: z.string().optional(),
  parking: z.string().optional(),
  
  // Area details
  builtUpArea: z.string().optional(),
  builtUpAreaUnit: z.string().optional(),
  carpetArea: z.string().optional(),
  carpetAreaUnit: z.string().optional(),
  superArea: z.string().optional(),
  superAreaUnit: z.string().optional(),
  
  // Location
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  street: z.string().optional(),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  
  // Transaction & Availability
  possession: z.string().optional(),
  availability: z.string().optional(),
  ageOfProperty: z.string().optional(),
  
  // Price
  expectedPrice: z.string().min(1, "Price is required"),
  priceNegotiable: z.boolean().optional(),
  
  // Description
  propertyDescription: z.string().optional(),
  
  // Admin specific
  status: z.enum(["active", "available", "pending", "sold", "rented", "rejected"]).default("active"),
  featured: z.boolean().default(false),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const AddProperty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      userType: "admin",
      lookingTo: "sell",
      priceNegotiable: false,
      status: "active",
      featured: false,
    },
  });

  const onSubmit = async (data: PropertyFormValues) => {
    try {
      setSubmitting(true);
      
      // Transform form data to match API expectations
      const propertyData = {
        title: data.title,
        description: data.propertyDescription || '',
        type: data.propertyType as 'apartment' | 'house' | 'villa' | 'plot' | 'land' | 'commercial' | 'office' | 'pg',
        listingType: data.lookingTo === "sell" ? "sale" : data.lookingTo as 'sale' | 'rent' | 'lease',
        price: parseFloat(data.expectedPrice),
        area: {
          builtUp: data.builtUpArea ? parseFloat(data.builtUpArea) : undefined,
          carpet: data.carpetArea ? parseFloat(data.carpetArea) : undefined,
          super: data.superArea ? parseFloat(data.superArea) : undefined,
          unit: (data.builtUpAreaUnit || 'sqft') as 'sqft' | 'sqm' | 'acre',
        },
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : 0,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms) : 0,
        address: {
          street: data.street || '',
          locality: data.locality,
          city: data.city,
          state: 'Karnataka', // Default for now
          pincode: data.pincode,
        },
        amenities: [], // Can be enhanced later
        contact: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
        status: data.status,
        featured: data.featured,
        // Add more fields as needed
      };

      await propertyService.createAdminProperty(propertyData);
      
      toast({
        title: "Success!",
        description: "Property has been created successfully.",
      });
      
      navigate("/admin/properties");
    } catch (error) {
      console.error("Failed to create property:", error);
      toast({
        title: "Error",
        description: "Failed to create property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedPhotos(Array.from(e.target.files));
    }
  };

  return (
    <div className="space-y-6 relative top-[60px]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Property</h1>
          <p className="text-muted-foreground mt-2">Create a new property listing</p>
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
                {/* Admin Details */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Contact Details</h2>
                  
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
                                <RadioGroupItem value="admin" id="admin" />
                                <Label htmlFor="admin" className="font-normal cursor-pointer">Admin</Label>
                              </div>
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="your.email@example.com" {...field} />
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
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 3BHK Apartment in Whitefield" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                                <Label htmlFor="rent" className="font-normal cursor-pointer">Rent</Label>
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
                              <SelectItem value="house">Independent House</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="plot">Plot/Land</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="office">Office</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-3 gap-4">
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
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num} BHK
                                  </SelectItem>
                                ))}
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
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                {[0, 1, 2, 3, 4].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
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
                                <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                                <SelectItem value="semi-furnished">Semi Furnished</SelectItem>
                                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                              </SelectContent>
                            </Select>
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
                                <SelectItem value="none">No Parking</SelectItem>
                                <SelectItem value="two-wheeler">Two Wheeler</SelectItem>
                                <SelectItem value="car">Car</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Area Details */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Area Details</h2>
                  
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="builtUpArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Built-up Area</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter area" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="builtUpAreaUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "sqft"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
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

                {/* Location */}
                <div className="bg-transparent rounded-lg border border-primary/20 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Smart Location Finder
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Enter location details or start with pincode for instant auto-completion
                  </p>
                  
                  <EnhancedAddressInput
                    onLocationChange={(locationData) => {
                      // Update form fields when location changes
                      if (locationData.city) {
                        form.setValue('city', locationData.city);
                      }
                      if (locationData.district) {
                        form.setValue('locality', locationData.district);
                      }
                      if (locationData.pincode) {
                        form.setValue('pincode', locationData.pincode);
                      }
                      if (locationData.formattedAddress) {
                        form.setValue('street', locationData.formattedAddress);
                      }
                    }}
                    initialData={{
                      city: form.getValues('city'),
                      district: form.getValues('locality'),
                      pincode: form.getValues('pincode'),
                      formattedAddress: form.getValues('street')
                    }}
                    showPincodeFirst={true}
                    className="w-full"
                  />

                  {/* Hidden form fields to maintain form validation */}
                  <div className="hidden">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locality"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Price & Status */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Price & Status</h2>
                  
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="expectedPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Price *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter price" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="rented">Rented</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <FormField
                        control={form.control}
                        name="priceNegotiable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Price Negotiable
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Featured Property
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Description</h2>
                  
                  <FormField
                    control={form.control}
                    name="propertyDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your property in detail..."
                            className="min-h-[100px]"
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
                      <p className="text-sm text-foreground mt-2">
                        {uploadedPhotos.length} photo(s) selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pb-8 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/properties")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="lg" className="px-12" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Property"}
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

export default AddProperty;