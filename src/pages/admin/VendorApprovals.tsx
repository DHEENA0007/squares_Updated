import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Download,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  User,
  MapPin,
  Shield,
  Key
} from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWithAuth, handleApiResponse } from '@/utils/apiUtils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

interface VendorApplication {
  _id: string;
  businessInfo: {
    companyName: string;
    businessType: string;
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
    submittedDocuments: Array<{
      documentType: string;
      documentName: string;
      documentUrl: string;
      verified: boolean;
      rejectionReason?: string;
    }>;
  };
  professionalInfo?: {
    experience: number;
    description?: string;
    officeAddress?: {
      area?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    serviceAreas: Array<{
      city: string;
      state: string;
    }>;
  };
  contactInfo?: {
    officeAddress?: {
      city: string;
      state: string;
    };
  };
}

interface VendorApprovalStats {
  overview: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    underReviewApplications: number;
    approvalRate: number;
  };
  trends: {
    thisMonthApplications: number;
    lastMonthApplications: number;
    growth: number;
  };
  recentApplications: Array<{
    id: string;
    companyName: string;
    applicantName: string;
    submittedAt: string;
    status: string;
  }>;
}

const VendorApprovals: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [stats, setStats] = useState<VendorApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    businessType: '',
    experienceMin: '',
    experienceMax: '',
    page: 1,
    limit: 10
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auto-populate approver name from logged-in user
  const getApproverName = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    } else if (user?.profile?.firstName) {
      return user.profile.firstName;
    } else if (user?.email) {
      return user.email;
    }
    return '';
  };

  // Approval/Rejection form state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [approverName, setApproverName] = useState(getApproverName());
  const [verificationChecklist, setVerificationChecklist] = useState({
    // Step 1: Phone Verification (Must be done first)
    phoneVerified: false,
    // Step 2-11: Other verifications (Enabled only after phone verification)
    // Personal Information
    emailVerified: false,
    identityProofVerified: false,
    // Business Information
    businessNameVerified: false,
    businessTypeVerified: false,
    businessDescriptionVerified: false,
    experienceVerified: false,
    // Address Information
    addressVerified: false,
    // Legal Documents
    panNumberVerified: false,
    gstNumberVerified: false,
    licenseNumberVerified: false,
    // Documents
    businessRegistrationVerified: false,
  });
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionComments, setRejectionComments] = useState("");

  // Phone verification state
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch applications
  const fetchApplications = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        status: filters.status,
        search: filters.search,
        businessType: filters.businessType,
        experienceMin: filters.experienceMin,
        experienceMax: filters.experienceMax,
        sortBy: 'submittedAt',
        sortOrder: 'desc'
      });

      const response = await fetchWithAuth(`/admin/vendor-approvals?${queryParams}`);
      const data = await handleApiResponse<{ data: { vendors: VendorApplication[] } }>(response);
      setApplications(data.data.vendors || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch vendor applications",
        variant: "destructive"
      });
      setApplications([]);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/admin/vendor-approval-stats');
      const data = await handleApiResponse<{ data: VendorApprovalStats }>(response);
      setStats(data.data || null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch statistics",
        variant: "destructive"
      });
      setStats(null);
    }
  };

  // Update approver name when user data loads
  useEffect(() => {
    const name = getApproverName();
    if (name) {
      setApproverName(name);
    }
  }, [user]);

  // Handle vendorId from URL query parameter
  useEffect(() => {
    const vendorId = searchParams.get('vendorId');
    if (vendorId && applications.length > 0) {
      const vendor = applications.find(app => app._id === vendorId);
      if (vendor) {
        setSelectedApplication(vendor);
        setShowDetails(true);
      }
    }
  }, [searchParams, applications]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchApplications(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [filters.status, filters.page, filters.search, filters.businessType, filters.experienceMin, filters.experienceMax]);

  // Calculate time remaining for verification freeze
  useEffect(() => {
    if (selectedApplication?.approval.phoneVerifiedAt) {
      const updateTimer = () => {
        const phoneVerifiedTime = new Date(selectedApplication.approval.phoneVerifiedAt!).getTime();
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
  }, [selectedApplication]);

  const resetApprovalForm = () => {
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
    setApprovalComments("");
    setRejectionComments("");
    setApproverName(getApproverName());
  };

  const openApprovalDialog = (application: VendorApplication, type: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setActionType(type);
    resetApprovalForm();

    // Load existing verification checklist if available
    if (application.approval.verificationChecklist) {
      setVerificationChecklist(application.approval.verificationChecklist);
    }
    // Always use logged-in user's name, or fallback to saved approver name
    setApproverName(application.approval.approverName || getApproverName());

    setApprovalDialogOpen(true);
  };

  // Export approval report to CSV
  const exportApprovalReport = async () => {
    try {
      const response = await fetchWithAuth('/admin/vendor-approvals/export');
      const data = await handleApiResponse<{ data: any[] }>(response);

      // Create CSV content
      const headers = [
        'Application ID',
        'Company Name',
        'Applicant Name',
        'Email',
        'Phone',
        'Business Type',
        'Submitted Date',
        'Status',
        'Reviewed Date',
        'Reviewed By',
        'Approver Name',
        'Phone Verified',
        'Email Verified',
        'Identity Proof Verified',
        'Business Name Verified',
        'Business Type Verified',
        'Business Description Verified',
        'Experience Verified',
        'Address Verified',
        'PAN Number Verified',
        'GST Number Verified',
        'License Number Verified',
        'Business Registration Verified',
        'Approval/Rejection Comments'
      ];

      const csvRows = [
        headers.join(','),
        ...data.data.map((app: any) => {
          // Safely extract values with null checks
          const checklist = app.approval?.verificationChecklist || {};
          const submittedDate = app.approval?.submittedAt ? new Date(app.approval.submittedAt).toLocaleDateString() : 'N/A';
          const reviewedDate = app.approval?.reviewedAt ? new Date(app.approval.reviewedAt).toLocaleDateString() : 'N/A';
          const reviewedBy = app.approval?.reviewedBy ?
            `${app.approval.reviewedBy.profile?.firstName || ''} ${app.approval.reviewedBy.profile?.lastName || ''}`.trim() : 'N/A';

          return [
            app._id || 'N/A',
            `"${app.businessInfo?.companyName || 'N/A'}"`,
            `"${app.user?.profile?.firstName || ''} ${app.user?.profile?.lastName || ''}"`.trim() || 'N/A',
            app.user?.email || 'N/A',
            app.user?.profile?.phone || 'N/A',
            app.businessInfo?.businessType || 'N/A',
            submittedDate,
            app.approval?.status || 'N/A',
            reviewedDate,
            reviewedBy,
            app.approval?.approverName || 'N/A',
            checklist.phoneVerified ? 'Yes' : 'No',
            checklist.emailVerified ? 'Yes' : 'No',
            checklist.identityProofVerified ? 'Yes' : 'No',
            checklist.businessNameVerified ? 'Yes' : 'No',
            checklist.businessTypeVerified ? 'Yes' : 'No',
            checklist.businessDescriptionVerified ? 'Yes' : 'No',
            checklist.experienceVerified ? 'Yes' : 'No',
            checklist.addressVerified ? 'Yes' : 'No',
            checklist.panNumberVerified ? 'Yes' : 'No',
            checklist.gstNumberVerified ? 'Yes' : 'No',
            checklist.licenseNumberVerified ? 'Yes' : 'No',
            checklist.businessRegistrationVerified ? 'Yes' : 'No',
            `"${app.approval?.approvalNotes || app.approval?.rejectionReason || 'N/A'}"`
          ].join(',');
        })
      ];

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendor_approval_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Approval report exported successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export approval report",
        variant: "destructive"
      });
    }
  };

  // Handle phone verification
  const handlePhoneVerification = async () => {
    if (!selectedApplication || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Please enter approver name first",
        variant: "destructive"
      });
      return;
    }

    setPhoneVerifying(true);

    try {
      const response = await fetchWithAuth(`/admin/vendor-approvals/${selectedApplication._id}/verify-phone`, {
        method: 'POST',
        body: JSON.stringify({
          approverName: approverName
        })
      });

      const data = await handleApiResponse<{ data: any }>(response);

      setVerificationChecklist(prev => ({ ...prev, phoneVerified: true }));

      // Update selected application
      setSelectedApplication(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          approval: {
            ...prev.approval,
            status: 'under_review',
            phoneVerifiedAt: new Date().toISOString(),
            verificationChecklist: {
              ...prev.approval.verificationChecklist,
              phoneVerified: true
            }
          }
        };
      });

      // Refresh applications list
      await fetchApplications();

      toast({
        title: "Phone Verified",
        description: "Phone verification successful. Status changed to under review.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error verifying phone:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify phone",
        variant: "destructive"
      });
    } finally {
      setPhoneVerifying(false);
    }
  };

  // Handle approval
  const handleApprove = async () => {
    if (!selectedApplication) return;

    console.log('handleApprove called, status:', selectedApplication.approval.status);
    console.log('timeRemaining:', timeRemaining);

    // If status is under_review, check freeze period
    if (selectedApplication.approval.status === 'under_review') {
      console.log('Status is under_review, checking freeze period...');
      // Check if freeze period has ended
      if (timeRemaining !== null && timeRemaining > 0) {
        console.log('Freeze period still active');
        toast({
          title: "Freeze Period Active",
          description: `Please wait ${formatTimeRemaining(timeRemaining)} before completing the verification.`,
          variant: "destructive"
        });
        return;
      }
    }

    console.log('Proceeding with approval');
    await performApproval();
  };

  const performApproval = async () => {
    // Validation
    if (!selectedApplication || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name is required",
        variant: "destructive"
      });
      return;
    }

    if (!verificationChecklist.phoneVerified) {
      toast({
        title: "Error",
        description: "Phone verification must be completed first",
        variant: "destructive"
      });
      return;
    }

    if (!approvalComments.trim()) {
      toast({
        title: "Error",
        description: "Approval comments are required",
        variant: "destructive"
      });
      return;
    }

    // Check if all verifications are completed
    const allVerified = Object.values(verificationChecklist).every(v => v === true);
    if (!allVerified) {
      toast({
        title: "Warning",
        description: "Not all verification steps are completed. Are you sure you want to proceed?",
        variant: "destructive"
      });
      // Allow proceeding but warn
    }

    setActionLoading('approve');

    try {
      const requestBody: any = {
        approvalNotes: approvalComments,
        approverName: approverName,
        verificationChecklist: verificationChecklist,
        verificationLevel: 'complete'
      };

      const response = await fetchWithAuth(`/admin/vendor-approvals/${selectedApplication._id}/approve`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      await handleApiResponse(response);

      toast({
        title: "Success",
        description: "Vendor application approved successfully",
        variant: "default"
      });

      setApprovalDialogOpen(false);
      await fetchApplications();
      await fetchStats();
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve vendor application",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    // Validation
    if (!selectedApplication) {
      return;
    }

    if (!rejectionComments.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive"
      });
      return;
    }

    setActionLoading('reject');

    try {
      const response = await fetchWithAuth(`/admin/vendor-approvals/${selectedApplication._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          rejectionReason: rejectionComments
        })
      });

      await handleApiResponse(response);

      toast({
        title: "Success",
        description: "Vendor application rejected",
        variant: "default"
      });

      setApprovalDialogOpen(false);
      await fetchApplications();
      await fetchStats();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject vendor application",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      under_review: { variant: 'default' as const, icon: Eye, label: 'Under Review' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' }
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const isCheckboxEnabled = () => {
    if (!selectedApplication) return false;
    if (!verificationChecklist.phoneVerified) return false;
    if (!selectedApplication.approval.phoneVerifiedAt) return false;

    // Check if 10 minutes have passed
    const phoneVerifiedTime = new Date(selectedApplication.approval.phoneVerifiedAt).getTime();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-start md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendor Applications</h1>
          <p className="text-sm md:text-base text-muted-foreground">Review and manage vendor registration applications</p>
        </div>
        <Button onClick={exportApprovalReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.pendingApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.approvedApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.approvalRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.businessType || "all"}
              onValueChange={(value) => setFilters({ ...filters, businessType: value === "all" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                <SelectItem value="property_management">Property Management</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min experience"
                value={filters.experienceMin}
                onChange={(e) => setFilters({ ...filters, experienceMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Max experience"
                value={filters.experienceMax}
                onChange={(e) => setFilters({ ...filters, experienceMax: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applications found
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app._id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{app.businessInfo.companyName}</h3>
                      {getStatusBadge(app.approval.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {app.user?.profile?.firstName} {app.user?.profile?.lastName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {app.user?.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {app.user?.profile?.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {app.businessInfo.businessType}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTimestamp(app.approval.submittedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(app);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>

                    {app.approval.status === 'pending' || app.approval.status === 'under_review' ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openApprovalDialog(app, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {app.approval.status === 'under_review' ? 'Update' : 'Approve'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openApprovalDialog(app, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
            <DialogDescription>
              Detailed information about the vendor application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Status</h3>
                  <div className="mt-2">
                    {getStatusBadge(selectedApplication.approval.status)}
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Person</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Name:</span>
                    <span>{selectedApplication.user.profile.firstName} {selectedApplication.user.profile.lastName}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Email:</span>
                    <span className="break-all">{selectedApplication.user.email}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Phone:</span>
                    <span>{selectedApplication.user.profile.phone || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Registered On:</span>
                    <span>{formatTimestamp(selectedApplication.user.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Company Name:</span>
                    <span>{selectedApplication.businessInfo.companyName}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Business Type:</span>
                    <span>{selectedApplication.businessInfo.businessType}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Experience:</span>
                    <span>{(selectedApplication as any).professionalInfo?.experience ? `${(selectedApplication as any).professionalInfo.experience} years` : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1 md:col-span-2">
                    <span className="font-medium text-muted-foreground">Business Description:</span>
                    <span className="break-words">{(selectedApplication as any).professionalInfo?.description || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Address Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Address:</span>
                    <span className="break-words">{(selectedApplication as any).professionalInfo?.officeAddress?.area || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">City:</span>
                    <span>{(selectedApplication as any).professionalInfo?.officeAddress?.city || (selectedApplication as any).professionalInfo?.serviceAreas?.[0]?.city || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">State:</span>
                    <span>{(selectedApplication as any).professionalInfo?.officeAddress?.state || (selectedApplication as any).professionalInfo?.serviceAreas?.[0]?.state || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Pincode:</span>
                    <span>{(selectedApplication as any).professionalInfo?.officeAddress?.pincode || (selectedApplication as any).professionalInfo?.serviceAreas?.[0]?.pincode || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Legal Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Legal Documents</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">PAN Number:</span>
                    <span>{selectedApplication.businessInfo.panNumber || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">GST Number:</span>
                    <span>{selectedApplication.businessInfo.gstNumber || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">License Number:</span>
                    <span>{selectedApplication.businessInfo.licenseNumber || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-muted-foreground">Website:</span>
                    <span>{selectedApplication.businessInfo.website || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Submitted Documents */}
              {selectedApplication.approval.submittedDocuments && selectedApplication.approval.submittedDocuments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Submitted Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedApplication.approval.submittedDocuments.map((doc, index) => (
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? (selectedApplication?.approval.status === 'under_review' ? 'Complete Verification' : 'Approve Application')
                : 'Reject Application'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Complete the verification checklist and provide approval details'
                : 'Provide a reason for rejecting this application'}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">{selectedApplication.businessInfo.companyName}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.user.profile.firstName} {selectedApplication.user.profile.lastName} • {selectedApplication.user.email}
                </p>
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
                            Phone: {selectedApplication.user.profile.phone || 'N/A'}
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
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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

                      {selectedApplication.approval.phoneVerifiedAt && timeRemaining !== null && (
                        <Alert>
                          <Clock className="h-4 w-4" />
                          <AlertTitle>Verification Freeze Period</AlertTitle>
                          <AlertDescription>
                            {timeRemaining > 0 ? (
                              <>
                                Time remaining until other verifications unlock: {' '}
                                <strong className="text-primary">{formatTimeRemaining(timeRemaining)}</strong>
                              </>
                            ) : (
                              <span className="text-green-600 font-semibold">
                                Freeze period completed! You can now proceed with other verifications.
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
                      <CardTitle className="text-base">
                        Step 2: Verification Checklist {!isCheckboxEnabled() && '(Locked - Complete phone verification first)'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Personal Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Personal Information</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="emailVerified"
                              checked={verificationChecklist.emailVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, emailVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="emailVerified" className="text-sm cursor-pointer">
                              Email verified
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="identityProofVerified"
                              checked={verificationChecklist.identityProofVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, identityProofVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="identityProofVerified" className="text-sm cursor-pointer">
                              Identity documents verified (Aadhar/Passport/DL)
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Business Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Business Information</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="businessNameVerified"
                              checked={verificationChecklist.businessNameVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, businessNameVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="businessNameVerified" className="text-sm cursor-pointer">
                              Business name verified
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="businessTypeVerified"
                              checked={verificationChecklist.businessTypeVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, businessTypeVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="businessTypeVerified" className="text-sm cursor-pointer">
                              Business type verified
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="businessDescriptionVerified"
                              checked={verificationChecklist.businessDescriptionVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, businessDescriptionVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="businessDescriptionVerified" className="text-sm cursor-pointer">
                              Business description verified
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="experienceVerified"
                              checked={verificationChecklist.experienceVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, experienceVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="experienceVerified" className="text-sm cursor-pointer">
                              Professional experience verified
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Address Information</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="addressVerified"
                              checked={verificationChecklist.addressVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, addressVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="addressVerified" className="text-sm cursor-pointer">
                              Address verified and matches records
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Legal Documents */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Legal Documents</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="panNumberVerified"
                              checked={verificationChecklist.panNumberVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, panNumberVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="panNumberVerified" className="text-sm cursor-pointer">
                              PAN card verified
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="gstNumberVerified"
                              checked={verificationChecklist.gstNumberVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, gstNumberVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="gstNumberVerified" className="text-sm cursor-pointer">
                              GST number verified (if applicable)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="licenseNumberVerified"
                              checked={verificationChecklist.licenseNumberVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, licenseNumberVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="licenseNumberVerified" className="text-sm cursor-pointer">
                              License/registration verified
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Documents</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="businessRegistrationVerified"
                              checked={verificationChecklist.businessRegistrationVerified}
                              onCheckedChange={(checked) =>
                                setVerificationChecklist({ ...verificationChecklist, businessRegistrationVerified: checked as boolean })
                              }
                              disabled={!isCheckboxEnabled()}
                            />
                            <label htmlFor="businessRegistrationVerified" className="text-sm cursor-pointer">
                              All required documents submitted and verified
                            </label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Approval Comments */}
                  <div className="space-y-2">
                    <Label htmlFor="approvalComments">
                      Approval Comments <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="approvalComments"
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      placeholder="Add any additional notes about this approval..."
                      rows={4}
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
                    rows={6}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialogOpen(false);
                resetApprovalForm();
              }}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            {actionType === 'approve' ? (
              <Button
                onClick={handleApprove}
                disabled={
                  actionLoading === 'approve' ||
                  !verificationChecklist.phoneVerified ||
                  (timeRemaining !== null && timeRemaining > 0)
                }
              >
                {actionLoading === 'approve' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : timeRemaining !== null && timeRemaining > 0 ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Wait {formatTimeRemaining(timeRemaining)}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {selectedApplication?.approval.status === 'under_review' ? 'Complete & Approve' : 'Approve'}
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorApprovals;
