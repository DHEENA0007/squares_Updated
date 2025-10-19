import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Property, sampleProperties } from "@/components/data/sampleData";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const propertyFormSchema = z.object({
  userType: z.enum(["owner", "agent", "builder"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  lookingTo: z.enum(["sell", "rent"]),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.string().optional(),
  builtUpArea: z.string().optional(),
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  street: z.string().optional(),
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
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      userType: "owner",
      lookingTo: "sell",
      priceNegotiable: false,
    },
  });

  useEffect(() => {
    const foundProperty = sampleProperties.find((p) => p.id === id);
    if (foundProperty) {
      setProperty(foundProperty);
    }
  }, [id]);

  // Deprecated manual submit retained only for reference; using react-hook-form's onSubmit

  if (!property) {
    return (
      <div className="space-y-6 relative top-[60px]">
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
      <div className="space-y-6 relative top-[60px]">
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
                <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Property Location</h2>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
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
                          <FormLabel>Locality *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter locality" {...field} />
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
                          <FormLabel>Street / Society (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter street or society name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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


          </CardContent>
        </Card>
      </div>
  );
};

export default EditProperty;
