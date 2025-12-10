import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  User,
  MapPin,
  Shield,
  ArrowLeft,
  Loader2,
  UserCheck,
  ArrowRightLeft,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface VendorApplication {
  _id: string;
  businessInfo: {
    companyName: string;
    businessType: string;
    businessDescription?: string;
    experience?: number;
    licenseNumber?: string;
    gstNumber?: string;
    panNumber?: string;
    website?: string;
  };
  user: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
    createdAt: string;
  };
  professionalInfo?: {
    description?: string;
    officeAddress?: {
      area?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    serviceAreas?: Array<{
      city?: string;
      state?: string;
      pincode?: string;
    }>;
  };
  approval: {
    status: 'pending' | 'approved' | 'rejected' | 'under_review';
    submittedAt: string;
    reviewedAt?: string;
    phoneVerifiedAt?: string;
    reviewedBy?: {
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    };
    phoneVerifiedBy?: {
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    };
    assignedTo?: {
      _id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    };
    assignedAt?: string;
    lockedBy?: {
      _id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    };
    lockedAt?: string;
    approvalNotes?: string;
    rejectionReason?: string;
    approverName?: string;
    verificationChecklist?: {
      phoneVerified: boolean;
      emailVerified: boolean;
      identityProofVerified: boolean;
      businessNameVerified: boolean;
      businessTypeVerified: boolean;
      businessDescriptionVerified: boolean;
      experienceVerified: boolean;
      addressVerified: boolean;
      panNumberVerified: boolean;
      gstNumberVerified: boolean;
      licenseNumberVerified: boolean;
      businessRegistrationVerified: boolean;
    };
    submittedDocuments?: Array<{
      documentName: string;
      documentType: string;
      documentUrl: string;
    }>;
    activityLog?: Array<{
      action: 'phone_verified' | 'accepted' | 'transferred' | 'approved' | 'rejected' | 'marked_under_review';
      performedBy: {
        _id: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
        email: string;
      };
      performedAt: string;
      details: string;
      transferredTo?: {
        _id: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
        email: string;
      };
      notes?: string;
    }>;
  };
}

const VendorDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendorId');
  const permissions = user?.rolePermissions || [];
  
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorApplication | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'under_review'>('approve');
  const [actionLoading, setActionLoading] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const [approverName, setApproverName] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferUsers, setTransferUsers] = useState<any[]>([]);
  const [selectedTransferUser, setSelectedTransferUser] = useState('');
  const [verificationChecklist, setVerificationChecklist] = useState({
    phoneVerified: false,
    emailVerified: false,
    identityProofVerified: false,
    businessNameVerified: false,
    businessTypeVerified: false,
    businessDescriptionVerified: false,
    experienceVerified: false,
    addressVerified: false,
    panNumberVerified: false,
    gstNumberVerified: false,
    licenseNumberVerified: false,
    businessRegistrationVerified: false,
  });

  const hasPermission = (permission: string) => permissions.includes(permission);

  const getApproverName = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user?.email?.split('@')[0] || '';
  };

  useEffect(() => {
    if (!hasPermission(PERMISSIONS.VENDORS_VIEW)) {
      navigate('/rolebased');
      return;
    }
    
    if (!vendorId) {
      navigate('/rolebased/vendors');
      return;
    }

    fetchVendorDetails();
  }, [vendorId]);

  // Timer for phone verification freeze
  useEffect(() => {
    if (vendor?.approval.phoneVerifiedAt && verificationChecklist.phoneVerified) {
      const updateTimer = () => {
        const phoneVerifiedTime = new Date(vendor.approval.phoneVerifiedAt!).getTime();
        const now = new Date().getTime();
        const elapsed = now - phoneVerifiedTime;
        const tenMinutes = 10 * 60 * 1000;
        const remaining = tenMinutes - elapsed;

        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [vendor, verificationChecklist.phoneVerified]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendor(data.data.vendor);
        
        // Load existing verification checklist if available
        if (data.data.vendor.approval.verificationChecklist) {
          setVerificationChecklist(data.data.vendor.approval.verificationChecklist);
        }
        
        // Set approver name
        setApproverName(data.data.vendor.approval.approverName || getApproverName());
      } else {
        toast({
          title: "Error",
          description: "Failed to load vendor details",
          variant: "destructive",
        });
        navigate('/rolebased/vendors');
      }
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerification = async () => {
    if (!vendor || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setPhoneVerifying(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/verify-phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approverName: approverName.trim() })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Phone verification completed. 10-minute freeze period started.",
        });
        setVerificationChecklist({ ...verificationChecklist, phoneVerified: true });
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to verify phone",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify phone",
        variant: "destructive",
      });
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleApprove = async () => {
    if (!vendor) return;

    const allChecked = Object.values(verificationChecklist).every(val => val === true);
    if (!allChecked) {
      toast({
        title: "Error",
        description: "Please complete all verification checklist items",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalNotes: approvalComments || 'Application approved',
          verificationLevel: 'basic',
          approverName: approverName.trim(),
          verificationChecklist
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor application approved successfully",
        });
        setApprovalDialogOpen(false);
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to approve vendor",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve vendor application",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!vendor || !rejectionComments.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectionReason: rejectionComments,
          approverName: approverName.trim()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor application rejected",
        });
        setApprovalDialogOpen(false);
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to reject vendor",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject vendor application",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkUnderReview = async () => {
    if (!vendor) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/under-review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: approvalComments || 'Application under review',
          approverName: approverName.trim()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor application marked as under review",
        });
        setApprovalDialogOpen(false);
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update vendor status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptVendor = async () => {
    if (!vendor) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor approval accepted. You are now responsible for completing the verification process.",
        });
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to accept vendor approval",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept vendor approval",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTransferUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/transfer-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Transfer users response:', data);
        setTransferUsers(data.data.users || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch transfer users:', response.status, errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch transfer users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch transfer users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transfer users",
        variant: "destructive",
      });
    }
  };

  const handleTransferVendor = async () => {
    if (!vendor || !selectedTransferUser) return;

    try {
      setTransferring(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/admin/vendor-approvals/${vendor._id}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: selectedTransferUser
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vendor approval transferred successfully",
        });
        setTransferDialogOpen(false);
        setSelectedTransferUser('');
        fetchVendorDetails();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to transfer vendor approval",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transfer vendor approval",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const openTransferDialog = () => {
    fetchTransferUsers();
    setTransferDialogOpen(true);
  };

  const openApprovalDialog = (type: 'approve' | 'reject' | 'under_review') => {
    setActionType(type);
    setApprovalComments('');
    setRejectionComments('');
    if (!vendor?.approval.verificationChecklist) {
      setVerificationChecklist({
        phoneVerified: false,
        emailVerified: false,
        identityProofVerified: false,
        businessNameVerified: false,
        businessTypeVerified: false,
        businessDescriptionVerified: false,
        experienceVerified: false,
        addressVerified: false,
        panNumberVerified: false,
        gstNumberVerified: false,
        licenseNumberVerified: false,
        businessRegistrationVerified: false,
      });
    }
    setApproverName(vendor?.approval.approverName || getApproverName());
    setApprovalDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      pending: { variant: "outline", icon: Clock, label: "Pending" },
      under_review: { variant: "secondary", icon: Shield, label: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCheckboxEnabled = () => {
    if (!vendor) return false;
    if (!verificationChecklist.phoneVerified) return false;
    if (!vendor.approval.phoneVerifiedAt) return false;

    const phoneVerifiedTime = new Date(vendor.approval.phoneVerifiedAt).getTime();
    const now = new Date().getTime();
    const elapsed = now - phoneVerifiedTime;
    const tenMinutes = 10 * 60 * 1000;

    return elapsed >= tenMinutes;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-start md:space-y-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/rolebased/vendors')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{vendor.businessInfo.companyName}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Vendor Application Details
            </p>
          </div>
        </div>
        {getStatusBadge(vendor.approval.status)}
      </div>

      {/* Lock Status Alert */}
      {vendor.approval.lockedBy && vendor.approval.lockedBy._id !== user?.id && user?.role !== 'superadmin' && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Lock className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Application Locked</AlertTitle>
          <AlertDescription>
            This vendor application is currently being handled by{' '}
            {vendor.approval.lockedBy.profile?.firstName
              ? `${vendor.approval.lockedBy.profile.firstName} ${vendor.approval.lockedBy.profile.lastName || ''}`
              : vendor.approval.lockedBy.email}
            . You cannot make changes to this application.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {hasPermission(PERMISSIONS.VENDORS_APPROVE) &&
       vendor.approval.status !== 'approved' &&
       vendor.approval.status !== 'rejected' && (
        <div className="flex flex-wrap gap-2">
          {/* Accept button - only show if phone verified and not locked by current user */}
          {vendor.approval.verificationChecklist?.phoneVerified &&
           (!vendor.approval.lockedBy || vendor.approval.lockedBy._id !== user?.id) &&
           user?.role !== 'superadmin' && (
            <Button
              variant="outline"
              onClick={handleAcceptVendor}
              disabled={actionLoading || (vendor.approval.lockedBy && vendor.approval.lockedBy._id !== user?.id)}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Accept Responsibility
            </Button>
          )}

          {/* Transfer button - only show if locked by current user or superadmin */}
          {((vendor.approval.lockedBy && vendor.approval.lockedBy._id === user?.id) || user?.role === 'superadmin') && (
            <Button
              variant="outline"
              onClick={openTransferDialog}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          )}

          {vendor.approval.status === 'pending' && (
            <Button
              variant="secondary"
              onClick={() => openApprovalDialog('under_review')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Mark Under Review
            </Button>
          )}
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => openApprovalDialog('approve')}
            disabled={vendor.approval.lockedBy && vendor.approval.lockedBy._id !== user?.id && user?.role !== 'superadmin'}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Application
          </Button>
          <Button
            variant="destructive"
            onClick={() => openApprovalDialog('reject')}
            disabled={vendor.approval.lockedBy && vendor.approval.lockedBy._id !== user?.id && user?.role !== 'superadmin'}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject Application
          </Button>
        </div>
      )}

      {/* Application Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Name:
              </span>
              <span>{vendor.user?.profile?.firstName} {vendor.user?.profile?.lastName}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email:
              </span>
              <span className="break-words">{vendor.user?.email || 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone:
              </span>
              <span>{vendor.user?.profile?.phone || 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Registered:
              </span>
              <span>{new Date(vendor.user.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                Company Name:
              </span>
              <span>{vendor.businessInfo.companyName}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">Business Type:</span>
              <span>{vendor.businessInfo.businessType}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">Experience:</span>
              <span>{vendor.businessInfo.experience ? `${vendor.businessInfo.experience} years` : 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Applied On:
              </span>
              <span>{new Date(vendor.approval.submittedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Business Description */}
        {(vendor.businessInfo.businessDescription || vendor.professionalInfo?.description) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Business Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <span className="break-words">
                {vendor.businessInfo.businessDescription || vendor.professionalInfo?.description || 'N/A'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Address Information */}
        {vendor.professionalInfo?.officeAddress && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">Address:</span>
                <span className="break-words">{vendor.professionalInfo.officeAddress.area || 'N/A'}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">City:</span>
                <span>{vendor.professionalInfo.officeAddress.city || 'N/A'}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">State:</span>
                <span>{vendor.professionalInfo.officeAddress.state || 'N/A'}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">Pincode:</span>
                <span>{vendor.professionalInfo.officeAddress.pincode || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal Documents */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Legal Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">PAN Number:</span>
              <span>{vendor.businessInfo.panNumber || 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">GST Number:</span>
              <span>{vendor.businessInfo.gstNumber || 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">License Number:</span>
              <span>{vendor.businessInfo.licenseNumber || 'N/A'}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-muted-foreground">Website:</span>
              <span>{vendor.businessInfo.website || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Submitted Documents */}
        {vendor.approval.submittedDocuments && vendor.approval.submittedDocuments.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Submitted Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vendor.approval.submittedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.documentName}</p>
                        <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.documentUrl, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review History */}
        {vendor.approval.reviewedAt && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Review History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">Reviewed By:</span>
                <span>
                  {vendor.approval.reviewedBy
                    ? `${vendor.approval.reviewedBy.profile.firstName} ${vendor.approval.reviewedBy.profile.lastName}`
                    : vendor.approval.approverName || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-muted-foreground">Reviewed At:</span>
                <span>{new Date(vendor.approval.reviewedAt).toLocaleString()}</span>
              </div>
              {vendor.approval.approvalNotes && (
                <div className="flex flex-col space-y-1">
                  <span className="font-medium text-muted-foreground">Approval Notes:</span>
                  <span className="text-green-600">{vendor.approval.approvalNotes}</span>
                </div>
              )}
              {vendor.approval.rejectionReason && (
                <div className="flex flex-col space-y-1">
                  <span className="font-medium text-muted-foreground">Rejection Reason:</span>
                  <span className="text-red-600">{vendor.approval.rejectionReason}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Log */}
        {vendor.approval.activityLog && vendor.approval.activityLog.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...vendor.approval.activityLog].reverse().map((activity, index) => {
                  const performedByName = activity.performedBy.profile?.firstName
                    ? `${activity.performedBy.profile.firstName} ${activity.performedBy.profile.lastName || ''}`
                    : activity.performedBy.email;

                  const getActionIcon = () => {
                    switch (activity.action) {
                      case 'phone_verified':
                        return <Phone className="w-4 h-4 text-blue-600" />;
                      case 'accepted':
                        return <UserCheck className="w-4 h-4 text-green-600" />;
                      case 'transferred':
                        return <ArrowRightLeft className="w-4 h-4 text-orange-600" />;
                      case 'approved':
                        return <CheckCircle className="w-4 h-4 text-green-600" />;
                      case 'rejected':
                        return <XCircle className="w-4 h-4 text-red-600" />;
                      case 'marked_under_review':
                        return <Shield className="w-4 h-4 text-yellow-600" />;
                      default:
                        return <Clock className="w-4 h-4 text-gray-600" />;
                    }
                  };

                  const getActionColor = () => {
                    switch (activity.action) {
                      case 'phone_verified':
                        return 'bg-blue-50 border-blue-200';
                      case 'accepted':
                        return 'bg-green-50 border-green-200';
                      case 'transferred':
                        return 'bg-orange-50 border-orange-200';
                      case 'approved':
                        return 'bg-green-50 border-green-200';
                      case 'rejected':
                        return 'bg-red-50 border-red-200';
                      case 'marked_under_review':
                        return 'bg-yellow-50 border-yellow-200';
                      default:
                        return 'bg-gray-50 border-gray-200';
                    }
                  };

                  return (
                    <div key={index} className={`p-3 border rounded-lg ${getActionColor()}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getActionIcon()}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{activity.details}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.performedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By: {performedByName}
                          </p>
                          {activity.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              Note: {activity.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? 'Approve Application'
                : actionType === 'reject'
                ? 'Reject Application'
                : 'Mark Under Review'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Complete the verification checklist and provide approval details'
                : actionType === 'reject'
                ? 'Provide a reason for rejecting this application'
                : 'Mark this application as under review'}
            </DialogDescription>
          </DialogHeader>

          {vendor && (
            <div className="space-y-6">
              {/* Application Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">{vendor.businessInfo.companyName}</h3>
                <p className="text-sm text-muted-foreground">
                  {vendor.user.profile.firstName} {vendor.user.profile.lastName} • {vendor.user.email}
                </p>
                {/* Show who is currently handling this */}
                {vendor.approval.lockedBy && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-primary">Currently Handling:</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.approval.lockedBy.profile?.firstName
                        ? `${vendor.approval.lockedBy.profile.firstName} ${vendor.approval.lockedBy.profile.lastName || ''}`
                        : vendor.approval.lockedBy.email}
                      {vendor.approval.lockedBy._id === user?.id && ' (You)'}
                    </p>
                    {vendor.approval.lockedAt && (
                      <p className="text-xs text-muted-foreground">
                        Since: {new Date(vendor.approval.lockedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {/* Show phone verifier if different from current handler */}
                {vendor.approval.phoneVerifiedBy && vendor.approval.phoneVerifiedBy._id !== vendor.approval.lockedBy?._id && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-blue-600">Phone Verified By:</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.approval.phoneVerifiedBy.profile?.firstName
                        ? `${vendor.approval.phoneVerifiedBy.profile.firstName} ${vendor.approval.phoneVerifiedBy.profile.lastName || ''}`
                        : vendor.approval.phoneVerifiedBy.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Approver Name */}
              <div className="space-y-2">
                <Label htmlFor="approverName">
                  Approver Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="approverName"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={verificationChecklist.phoneVerified}
                />
                {vendor.approval.lockedBy && vendor.approval.lockedBy._id === user?.id && (
                  <p className="text-xs text-muted-foreground">
                    You are currently handling this application. Your name is pre-filled from the initial action.
                  </p>
                )}
              </div>

              {actionType === 'approve' && (
                <>
                  {/* Phone Verification Section */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Step 1: Phone Verification (Required)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Phone: {vendor.user.profile.phone || 'N/A'}
                          </span>
                        </div>

                        {!verificationChecklist.phoneVerified ? (
                          <Button
                            onClick={handlePhoneVerification}
                            disabled={phoneVerifying || !approverName.trim()}
                            size="sm"
                          >
                            {phoneVerifying ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Phone
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>

                      {vendor.approval.phoneVerifiedAt && timeRemaining !== null && (
                        <Alert>
                          <Clock className="h-4 w-4" />
                          <AlertTitle>Verification Freeze Period</AlertTitle>
                          <AlertDescription>
                            {timeRemaining > 0 ? (
                              <>
                                Time remaining: <strong>{formatTimeRemaining(timeRemaining)}</strong>
                              </>
                            ) : (
                              <span className="text-green-600 font-semibold">
                                Freeze period completed! You can now proceed.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Verification Checklist */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Step 2: Verification Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries({
                          emailVerified: 'Email Verified',
                          identityProofVerified: 'Identity Proof Verified',
                          businessNameVerified: 'Business Name Verified',
                          businessTypeVerified: 'Business Type Verified',
                          businessDescriptionVerified: 'Business Description Verified',
                          experienceVerified: 'Experience Verified',
                          addressVerified: 'Address Verified',
                          panNumberVerified: 'PAN Number Verified',
                          gstNumberVerified: 'GST Number Verified',
                          licenseNumberVerified: 'License Number Verified',
                          businessRegistrationVerified: 'Business Registration Verified',
                        }).map(([key, label]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={key}
                              checked={verificationChecklist[key as keyof typeof verificationChecklist]}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({
                                  ...verificationChecklist,
                                  [key]: checked as boolean
                                })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <Label htmlFor={key} className="text-sm">{label}</Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Approval Comments */}
                  <div className="space-y-2">
                    <Label htmlFor="approvalComments">Approval Notes (Optional)</Label>
                    <Textarea
                      id="approvalComments"
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      placeholder="Add any notes about this approval..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionComments">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionComments"
                    value={rejectionComments}
                    onChange={(e) => setRejectionComments(e.target.value)}
                    placeholder="Provide a detailed reason for rejection..."
                    rows={4}
                    required
                  />
                </div>
              )}

              {actionType === 'under_review' && (
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                  <Textarea
                    id="reviewNotes"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add any notes about this review..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            {actionType === 'approve' && (
              <Button
                onClick={handleApprove}
                disabled={actionLoading || !approverName.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </>
                )}
              </Button>
            )}
            {actionType === 'reject' && (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectionComments.trim() || !approverName.trim()}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </>
                )}
              </Button>
            )}
            {actionType === 'under_review' && (
              <Button
                variant="secondary"
                onClick={handleMarkUnderReview}
                disabled={actionLoading || !approverName.trim()}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Mark Under Review
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Vendor Approval</DialogTitle>
            <DialogDescription>
              Transfer this vendor approval to another user. They will take over the verification process.
            </DialogDescription>
          </DialogHeader>

          {vendor && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-1">{vendor.businessInfo.companyName}</h3>
                <p className="text-sm text-muted-foreground">
                  {vendor.user.profile.firstName} {vendor.user.profile.lastName}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferUser">
                  Select User <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedTransferUser}
                  onValueChange={setSelectedTransferUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to transfer to" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferUsers.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.profile?.firstName
                          ? `${u.profile.firstName} ${u.profile.lastName || ''} (${u.role})`
                          : `${u.email} (${u.role})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedTransferUser('');
              }}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferVendor}
              disabled={transferring || !selectedTransferUser}
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDetails;
