import { useState } from "react";
import { Building2, CheckCircle2, Upload, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import EnhancedAddressInput from "@/components/form/EnhancedAddressInput";

const propertyFormSchema = z.object({
  // Personal Details
  userType: z.enum(["owner", "agent", "builder"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  
  // Property Details
  lookingTo: z.enum(["sell", "rent"]),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.string().optional(),
  builtUpArea: z.string().optional(),
  
  // Property Location
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  street: z.string().optional(),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  
  // Property Features
  bathrooms: z.string().optional(),
  balconies: z.string().optional(),
  floorNo: z.string().optional(),
  totalFloors: z.string().optional(),
  furnishing: z.string().optional(),
  parking: z.string().optional(),
  
  // Area
  carpetArea: z.string().optional(),
  carpetAreaUnit: z.string().optional(),
  superArea: z.string().optional(),
  superAreaUnit: z.string().optional(),
  
  // Transaction & Availability
  possession: z.string().optional(),
  availability: z.string().optional(),
  ageOfProperty: z.string().optional(),
  
  // Price
  expectedPrice: z.string().min(1, "Price is required"),
  priceNegotiable: z.boolean().optional(),
  
  // Description
  propertyDescription: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const PostProperty = () => {
  const { toast } = useToast();
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);

  
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      userType: "owner",
      lookingTo: "sell",
      priceNegotiable: false,
    },
  });

  const onSubmit = (data: PropertyFormValues) => {
    console.log(data);
    toast({
      title: "Property Submitted!",
      description: "We'll contact you soon to verify your property details.",
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedPhotos(Array.from(e.target.files));
    }
  };



  return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Sell or Rent your Property
          </h1>
          <p className="text-muted-foreground">
            Post your property for FREE and connect with genuine buyers
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Form - Scrollable */}
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
                              <SelectItem value="independent-house">Independent House</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="plot">Residential Plot</SelectItem>
                              <SelectItem value="commercial">Commercial Property</SelectItem>
                              <SelectItem value="agricultural">Agricultural Land</SelectItem>
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
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-input"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 font-normal cursor-pointer">
                            Price Negotiable
                          </FormLabel>
                        </FormItem>
                      )}
                    />
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
                <div className="flex justify-center pb-8">
                  <Button type="submit" size="lg" className="px-12">
                    Post Property
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Right Sidebar - Sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Help Section */}
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Need help to find the right Buyer?
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Get 5X more responses by our relationship managers through our assisted service
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Connect with Matching Buyers
                  </Button>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4">Why Post with us?</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Get access to 2 Lakh+ buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Sell faster with Premium listing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Get expert advice on pricing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Professional photography support</span>
                  </li>
                </ul>
              </div>

              {/* Download App */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2">Download the App</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your properties on the go
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    App Store
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Play Store
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default PostProperty;