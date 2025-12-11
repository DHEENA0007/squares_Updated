import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  Loader2, 
  RefreshCw, 
  Camera, 
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Shield
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { uploadService } from "@/services/uploadService";

const profileSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^[0-9]{10}$/, "Must be exactly 10 digits")
    .min(10, "Must be exactly 10 digits")
    .max(10, "Must be exactly 10 digits"),
  birthday: z.date().optional(),
  bio: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  street: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{6}$/.test(val),
      "Pincode must be exactly 6 digits"
    ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const RoleBasedProfile = () => {
  const { toast } = useToast();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      bio: "",
      department: "",
      designation: "",
      street: "",
      state: "",
      district: "",
      city: "",
      zipCode: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setProfileData(user);
      setFormData(user);
      setAvatarUrl(user?.profile?.avatar || "");

      form.reset({
        first_name: user?.profile?.firstName || "",
        last_name: user?.profile?.lastName || "",
        email: user?.email || "",
        phone: user?.profile?.phone || "",
        birthday: user?.profile?.birthday ? new Date(user.profile.birthday) : undefined,
        bio: user?.profile?.bio || "",
        department: user?.profile?.department || "",
        designation: user?.profile?.designation || "",
        street: user?.profile?.address?.street || "",
        state: user?.profile?.address?.state || "",
        district: user?.profile?.address?.district || "",
        city: user?.profile?.address?.city || "",
        zipCode: user?.profile?.address?.zipCode || user?.profile?.address?.pincode || "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  }, [user, form, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Profile refreshed successfully",
    });
  };

  // Update form field helper for nested paths
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

  const handleCancel = () => {
    setFormData(profileData);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please upload an image file",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Image size must be less than 5MB",
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      const uploadedUrl = await uploadService.uploadAvatar(file);

      // Update via API using userService
      await userService.updateCurrentUser({
        profile: {
          ...user?.profile,
          avatar: uploadedUrl,
          // Preserve existing preferences to avoid cast errors
          preferences: user?.profile?.preferences || {
            notifications: { email: true, sms: false, push: true },
            privacy: { showEmail: false, showPhone: false },
            security: { twoFactorEnabled: false, loginAlerts: true, sessionTimeout: '30' }
          }
        }
      });

      setAvatarUrl(uploadedUrl);
      await checkAuth();
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload avatar",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      const updateData = {
        profile: {
          firstName: formData.profile?.firstName,
          lastName: formData.profile?.lastName,
          phone: formData.profile?.phone,
          birthday: formData.profile?.birthday,
          bio: formData.profile?.bio,
          department: formData.profile?.department,
          designation: formData.profile?.designation,
          address: {
            street: formData.profile?.address?.street,
            state: formData.profile?.address?.state,
            district: formData.profile?.address?.district,
            city: formData.profile?.address?.city,
            zipCode: formData.profile?.address?.zipCode,
          },
          // Preserve existing preferences to avoid MongoDB cast errors
          preferences: formData.profile?.preferences || {
            notifications: {
              email: true,
              sms: false,
              push: true
            },
            privacy: {
              showEmail: false,
              showPhone: false
            },
            security: {
              twoFactorEnabled: false,
              loginAlerts: true,
              sessionTimeout: '30'
            }
          }
        }
      };

      // Update via API using userService
      await userService.updateCurrentUser(updateData);

      await checkAuth();
      await fetchProfile();

      setIsEditing(false);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    // Update formData with form values before saving
    if (formData) {
      const updatedFormData = {
        ...formData,
        email: data.email,
        profile: {
          ...formData.profile,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
          birthday: data.birthday?.toISOString(),
          bio: data.bio,
          department: data.department,
          designation: data.designation,
          address: {
            street: data.street,
            state: data.state,
            district: data.district,
            city: data.city,
            zipCode: data.zipCode,
          }
        }
      };
      setFormData(updatedFormData);
    }
    await handleSave();
  };

  const formatRoleName = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Update your avatar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarUrl} alt={profileData?.profile?.firstName} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profileData?.profile?.firstName, profileData?.profile?.lastName)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">
                {profileData?.profile?.firstName} {profileData?.profile?.lastName}
              </h3>
              <Badge variant="secondary">{formatRoleName(profileData?.role)}</Badge>
              <p className="text-sm text-muted-foreground">{profileData?.email}</p>
            </div>

            <Separator />

            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium">{formatRoleName(profileData?.role)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{profileData?.emailVerified ? 'Verified' : 'Not Verified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={profileData?.status === 'active' ? 'default' : 'destructive'}>
                  {profileData?.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.firstName || ""}
                          onChange={(e) => updateFormField("profile.firstName", e.target.value)}
                          placeholder="Enter first name"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.firstName || "Not set"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.lastName || ""}
                          onChange={(e) => updateFormField("profile.lastName", e.target.value)}
                          placeholder="Enter last name"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.lastName || "Not set"}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={formData?.email || ""}
                          onChange={(e) => setFormData(prev => prev ? {...prev, email: e.target.value} : null)}
                          placeholder="Enter email"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.email || "Not set"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Phone</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.phone || ""}
                          onChange={(e) => updateFormField("profile.phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.phone || "Not set"}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.department || ""}
                          onChange={(e) => updateFormField("profile.department", e.target.value)}
                          placeholder="e.g., Sales, Marketing"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.department || "Not set"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Designation</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.designation || ""}
                          onChange={(e) => updateFormField("profile.designation", e.target.value)}
                          placeholder="e.g., Manager, Executive"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.designation || "Not set"}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    {isEditing ? (
                      <Textarea
                        value={formData?.profile?.bio || ""}
                        onChange={(e) => updateFormField("profile.bio", e.target.value)}
                        rows={3}
                        placeholder="Tell us about yourself"
                      />
                    ) : (
                      <p className="text-sm py-2">{profileData?.profile?.bio || "Not set"}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address Information
                    </h3>

                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      {isEditing ? (
                        <Input
                          value={formData?.profile?.address?.street || ""}
                          onChange={(e) => updateFormField("profile.address.street", e.target.value)}
                          placeholder="Enter street address"
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.address?.street || "Not set"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      {isEditing ? (
                        <PincodeAutocomplete
                          value={formData?.profile?.address?.zipCode || ""}
                          onChange={(pincode, locationData) => {
                            updateFormField("profile.address.zipCode", pincode);
                            if (locationData) {
                              updateFormField("profile.address.state", locationData.state);
                              updateFormField("profile.address.district", locationData.district);
                              updateFormField("profile.address.city", locationData.city);
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm py-2">{profileData?.profile?.address?.zipCode || "Not set"}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>State</Label>
                        {isEditing ? (
                          <Input
                            value={formData?.profile?.address?.state || ""}
                            onChange={(e) => updateFormField("profile.address.state", e.target.value)}
                            placeholder="Enter state"
                          />
                        ) : (
                          <p className="text-sm py-2">{profileData?.profile?.address?.state || "Not set"}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>District</Label>
                        {isEditing ? (
                          <Input
                            value={formData?.profile?.address?.district || ""}
                            onChange={(e) => updateFormField("profile.address.district", e.target.value)}
                            placeholder="Enter district"
                          />
                        ) : (
                          <p className="text-sm py-2">{profileData?.profile?.address?.district || "Not set"}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>City</Label>
                        {isEditing ? (
                          <Input
                            value={formData?.profile?.address?.city || ""}
                            onChange={(e) => updateFormField("profile.address.city", e.target.value)}
                            placeholder="Enter city"
                          />
                        ) : (
                          <p className="text-sm py-2">{profileData?.profile?.address?.city || "Not set"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your account password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setPasswordDialogOpen(true)}>
                      Change Password
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </div>
  );
};

export default RoleBasedProfile;
