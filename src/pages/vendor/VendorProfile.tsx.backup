import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VendorProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const vendorData = {
    personalInfo: {
      name: "Rajesh Kumar",
      email: "rajesh.kumar@realestate.com",
      phone: "+91 98765 43210",
      alternatePhone: "+91 87654 32109",
      profilePicture: "/api/placeholder/120/120",
      bio: "Experienced real estate professional with over 8 years in the Mumbai property market. Specialized in luxury residences and commercial properties."
    },
    companyInfo: {
      companyName: "Kumar Properties",
      reraNumber: "RERA123456789",
      establishedYear: "2016",
      address: "Office 304, Tower A, Business Hub, Mumbai - 400001",
      website: "www.kumarproperties.com",
      licenseNumber: "MP/RE/2024/001234"
    },
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      leadAlerts: true,
      marketingEmails: false,
      weeklyReports: true
    },
    statistics: {
      totalSales: 156,
      totalValue: "₹45.2 Cr",
      rating: 4.7,
      reviewCount: 234,
      memberSince: "January 2020",
      responseTime: "2.3 hours"
    },
    specializations: [
      "Luxury Residential",
      "Commercial Properties",
      "Investment Properties",
      "New Developments"
    ],
    certifications: [
      {
        name: "RERA Certified Agent",
        issuedBy: "Maharashtra RERA",
        date: "2020",
        verified: true
      },
      {
        name: "Real Estate Excellence Award",
        issuedBy: "Mumbai Realty Awards",
        date: "2023",
        verified: true
      }
    ],
    serviceAreas: [
      "Mumbai Central",
      "Powai",
      "Bandra",
      "Andheri",
      "Worli"
    ]
  };

  const [formData, setFormData] = useState(vendorData);

  const handleSave = () => {
    // Handle save logic here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(vendorData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Profile</h1>
          <p className="text-muted-foreground">Manage your profile and company information</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
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
                <AvatarImage src={formData.personalInfo.profilePicture} />
                <AvatarFallback className="text-lg">
                  {formData.personalInfo.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full p-2">
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold">{formData.personalInfo.name}</h2>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
              
              <p className="text-muted-foreground mb-3">{formData.companyInfo.companyName}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formData.statistics.totalSales}</div>
                  <div className="text-sm text-muted-foreground">Properties Sold</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formData.statistics.totalValue}</div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="text-2xl font-bold text-yellow-600">{formData.statistics.rating}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{formData.statistics.reviewCount} Reviews</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formData.statistics.responseTime}</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Member since {formData.statistics.memberSince}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.personalInfo.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, name: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.personalInfo.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, email: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Primary Phone</Label>
                  <Input
                    id="phone"
                    value={formData.personalInfo.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, phone: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="alt-phone">Alternate Phone</Label>
                  <Input
                    id="alt-phone"
                    value={formData.personalInfo.alternatePhone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, alternatePhone: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.personalInfo.bio}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, bio: e.target.value }
                  }))}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={formData.companyInfo.companyName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, companyName: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="rera-number">RERA Number</Label>
                  <Input
                    id="rera-number"
                    value={formData.companyInfo.reraNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, reraNumber: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="established-year">Established Year</Label>
                  <Input
                    id="established-year"
                    value={formData.companyInfo.establishedYear}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, establishedYear: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="license-number">License Number</Label>
                  <Input
                    id="license-number"
                    value={formData.companyInfo.licenseNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, licenseNumber: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.companyInfo.website}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, website: e.target.value }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  value={formData.companyInfo.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    companyInfo: { ...prev.companyInfo, address: e.target.value }
                  }))}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specializations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Specializations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formData.specializations.map((spec, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{spec}</span>
                      {isEditing && (
                        <Button size="sm" variant="ghost">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" className="w-full">
                      Add Specialization
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formData.serviceAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{area}</span>
                      {isEditing && (
                        <Button size="sm" variant="ghost">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" className="w-full">
                      Add Service Area
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Certifications & Awards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Issued by {cert.issuedBy} • {cert.date}
                      </p>
                    </div>
                    {cert.verified && (
                      <Badge className="bg-green-100 text-green-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={formData.preferences.emailNotifications}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, emailNotifications: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive SMS alerts for urgent matters</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={formData.preferences.smsNotifications}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, smsNotifications: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="lead-alerts">Lead Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when you receive new leads</p>
                </div>
                <Switch
                  id="lead-alerts"
                  checked={formData.preferences.leadAlerts}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, leadAlerts: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive promotional emails and market updates</p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={formData.preferences.marketingEmails}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, marketingEmails: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly performance and analytics reports</p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={formData.preferences.weeklyReports}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, weeklyReports: checked }
                  }))}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your business license, RERA certificate, and other important documents
                  </p>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">RERA Certificate</h4>
                        <p className="text-sm text-muted-foreground">Verified • Uploaded on Jan 15, 2024</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Business License</h4>
                        <p className="text-sm text-muted-foreground">Verified • Uploaded on Jan 15, 2024</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorProfile;