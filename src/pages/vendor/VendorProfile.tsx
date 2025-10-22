import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Star,
  Award,
  Camera,
  Edit,
  Save,
  X,
  Upload,
  Calendar,
  Users,
  Home,
  Shield,
  CheckCircle,
  Loader2,
  TrendingUp
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { vendorService, type VendorProfile } from "@/services/vendorService";

const VendorProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vendorData, setVendorData] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadVendorProfile();
  }, []);

  const loadVendorProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await vendorService.getVendorProfile();
      setVendorData(profile);
      setFormData(profile);
    } catch (error) {
      console.error("Failed to load vendor profile:", error);
      toast({
        title: "Error",
        description: "Failed to load vendor profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setIsSaving(true);
      const updateData = {
        profile: {
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          phone: formData.profile.phone,
          bio: formData.profile.bio,
          address: formData.profile.address,
          vendorInfo: formData.profile.vendorInfo,
        },
      };

      const updatedProfile = await vendorService.updateVendorProfile(updateData);
      setVendorData(updatedProfile);
      setFormData(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(vendorData);
    setIsEditing(false);
  };

  const updateFormField = (path: string, value: any) => {
    if (!formData) return;

    const pathArray = path.split(".");
    const newFormData = { ...formData };
    let current: any = newFormData;

    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    current[pathArray[pathArray.length - 1]] = value;

    setFormData(newFormData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading vendor profile...</span>
        </div>
      </div>
    );
  }

  if (!vendorData || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load vendor profile</p>
          <Button onClick={loadVendorProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  const fullName = `${formData.profile.firstName} ${formData.profile.lastName}`;
  const memberSince = new Date(formData.profile.vendorInfo.memberSince).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Profile</h1>
          <p className="text-muted-foreground">
            Manage your profile and company information
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.profile.avatar || ""} />
                <AvatarFallback className="text-lg">
                  {formData.profile.firstName.charAt(0)}
                  {formData.profile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={formData.profile.firstName}
                      onChange={(e) =>
                        updateFormField("profile.firstName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {formData.profile.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData.profile.lastName}
                      onChange={(e) =>
                        updateFormField("profile.lastName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {formData.profile.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {formData.email}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {isEditing ? (
                    <Input
                      value={formData.profile.phone}
                      onChange={(e) =>
                        updateFormField("profile.phone", e.target.value)
                      }
                      className="h-6 text-sm w-32"
                    />
                  ) : (
                    formData.profile.phone
                  )}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Member since {memberSince}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="font-medium">
                    {formData.profile.vendorInfo.rating.average.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({formData.profile.vendorInfo.rating.count} reviews)
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">
                    {formData.profile.vendorInfo.responseTime} avg response
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.profile.bio || ""}
                    onChange={(e) =>
                      updateFormField("profile.bio", e.target.value)
                    }
                    placeholder="Tell us about yourself and your experience..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.profile.bio || "No bio provided"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="street"
                      value={formData.profile.address?.street || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.street", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.street || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  {isEditing ? (
                    <Input
                      id="city"
                      value={formData.profile.address?.city || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.city", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.city || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  {isEditing ? (
                    <Input
                      id="state"
                      value={formData.profile.address?.state || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.state", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.state || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  {isEditing ? (
                    <Input
                      id="zipCode"
                      value={formData.profile.address?.zipCode || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.zipCode", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.zipCode || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  {isEditing ? (
                    <Input
                      id="companyName"
                      value={formData.profile.vendorInfo.companyName || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.companyName",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo.companyName || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="experience">Experience (Years)</Label>
                  {isEditing ? (
                    <Input
                      id="experience"
                      type="number"
                      value={formData.profile.vendorInfo.experience}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.experience",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo.experience} years
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  {isEditing ? (
                    <Input
                      id="website"
                      value={formData.profile.vendorInfo.website || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.website",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      <a
                        href={formData.profile.vendorInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {formData.profile.vendorInfo.website || "Not provided"}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="licenseNumber">License Number</Label>
                  {isEditing ? (
                    <Input
                      id="licenseNumber"
                      value={formData.profile.vendorInfo.licenseNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.licenseNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo.licenseNumber ||
                        "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  {isEditing ? (
                    <Input
                      id="gstNumber"
                      value={formData.profile.vendorInfo.gstNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.gstNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo.gstNumber || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  {isEditing ? (
                    <Input
                      id="panNumber"
                      value={formData.profile.vendorInfo.panNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.panNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo.panNumber || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specializations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2" />
                Specializations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.profile.vendorInfo.specializations.map(
                    (spec, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center"
                      >
                        {spec}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Service Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.profile.vendorInfo.serviceAreas.map(
                    (area, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center"
                      >
                        {area}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.profile.vendorInfo.certifications.map(
                  (cert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Award className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Issued by {cert.issuedBy} ??? {cert.date}
                          </p>
                        </div>
                      </div>
                      {cert.verified && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={
                    formData.profile.vendorInfo.vendorPreferences
                      .emailNotifications
                  }
                  onCheckedChange={(checked) =>
                    updateFormField(
                      "profile.vendorInfo.vendorPreferences.emailNotifications",
                      checked
                    )
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={
                    formData.profile.vendorInfo.vendorPreferences
                      .smsNotifications
                  }
                  onCheckedChange={(checked) =>
                    updateFormField(
                      "profile.vendorInfo.vendorPreferences.smsNotifications",
                      checked
                    )
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="leadAlerts">Lead Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new leads
                  </p>
                </div>
                <Switch
                  id="leadAlerts"
                  checked={
                    formData.profile.vendorInfo.vendorPreferences.leadAlerts
                  }
                  onCheckedChange={(checked) =>
                    updateFormField(
                      "profile.vendorInfo.vendorPreferences.leadAlerts",
                      checked
                    )
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyReports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly performance reports
                  </p>
                </div>
                <Switch
                  id="weeklyReports"
                  checked={
                    formData.profile.vendorInfo.vendorPreferences.weeklyReports
                  }
                  onCheckedChange={(checked) =>
                    updateFormField(
                      "profile.vendorInfo.vendorPreferences.weeklyReports",
                      checked
                    )
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketingEmails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional emails
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={
                    formData.profile.vendorInfo.vendorPreferences
                      .marketingEmails
                  }
                  onCheckedChange={(checked) =>
                    updateFormField(
                      "profile.vendorInfo.vendorPreferences.marketingEmails",
                      checked
                    )
                  }
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics Overview */}
      {vendorData.statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {vendorData.statistics.totalProperties}
                </div>
                <div className="text-sm text-muted-foreground">
                  Properties Listed
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {vendorData.statistics.totalValue || "???0"}
                </div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formData.profile.vendorInfo.rating.average.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Rating
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {vendorData.statistics.totalMessages}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Messages
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorProfilePage;
