import React, { useState, useEffect } from 'react';
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
  MapPin
} from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
    reviewedBy?: {
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    };
    approvalNotes?: string;
    rejectionReason?: string;
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
    specializations: string[];
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
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [stats, setStats] = useState<VendorApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    search: '',
    page: 1,
    limit: 10
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch applications
  const fetchApplications = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        status: filters.status,
        search: filters.search,
        sortBy: 'submittedAt',
        sortOrder: 'desc'
      });

      const response = await fetchWithAuth(`/api/admin/vendor-approvals?${queryParams}`);
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
      const response = await fetchWithAuth('/api/admin/vendor-approval-stats');
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchApplications(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [filters.status, filters.page, filters.search]);

  // Handle approval
  const handleApprove = async (vendorId: string) => {
    const approvalNotes = prompt('Enter approval notes (optional):');
    setActionLoading('approve');
    
    try {
      const response = await fetch(`/api/admin/vendor-approvals/${vendorId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          approvalNotes,
          verificationLevel: 'basic'
        })
      });

      if (!response.ok) throw new Error('Failed to approve vendor');

      toast({
        title: "Success",
        description: "Vendor application approved successfully",
        variant: "default"
      });

      fetchApplications();
      fetchStats();
      setShowDetails(false);
    } catch (error) {
      console.error('Error approving vendor:', error);
      toast({
        title: "Error",
        description: "Failed to approve vendor application",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle rejection
  const handleReject = async (vendorId: string) => {
    const rejectionReason = prompt('Enter rejection reason (required):');
    if (!rejectionReason) return;

    setActionLoading('reject');
    
    try {
      const response = await fetch(`/api/admin/vendor-approvals/${vendorId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rejectionReason,
          allowResubmission: true
        })
      });

      if (!response.ok) throw new Error('Failed to reject vendor');

      toast({
        title: "Success",
        description: "Vendor application rejected and vendor notified",
        variant: "default"
      });

      fetchApplications();
      fetchStats();
      setShowDetails(false);
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      toast({
        title: "Error",
        description: "Failed to reject vendor application",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock },
      approved: { variant: 'default' as const, icon: CheckCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle },
      under_review: { variant: 'default' as const, icon: Eye }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Vendor Applications</h1>
          <p className="mt-2 text-muted-foreground">Review and manage vendor applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.pendingApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.approvedApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.underReviewApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.approvalRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name, email, or license number..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="pl-10"
          />
        </div>
        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {applications.length === 0 ? (
              <li className="p-6 text-center text-muted-foreground">
                No applications found matching your criteria
              </li>
            ) : (
              applications.map((application) => (
                <li key={application._id} className="p-6 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-lg font-medium">
                              {application.businessInfo.companyName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {application.user.profile.firstName} {application.user.profile.lastName}
                            </p>
                          </div>
                          <StatusBadge status={application.approval.status} />
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Submitted: {formatDate(application.approval.submittedAt)}</p>
                            <p>Documents: {application.approval.submittedDocuments.length}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{application.user.email}</span>
                        </div>
                        {application.user.profile.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>{application.user.profile.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>{application.businessInfo.businessType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vendor Application Details</DialogTitle>
            <DialogDescription>Review and take action on the vendor application.</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Company Name:</span> {selectedApplication.businessInfo.companyName}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Business Type:</span> {selectedApplication.businessInfo.businessType}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Contact Person:</span> {selectedApplication.user.profile.firstName} {selectedApplication.user.profile.lastName}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Email:</span> {selectedApplication.user.email}
                    </div>
                    {selectedApplication.businessInfo.licenseNumber && (
                      <div>
                        <span className="font-medium text-muted-foreground">License Number:</span> {selectedApplication.businessInfo.licenseNumber}
                      </div>
                    )}
                    {selectedApplication.businessInfo.gstNumber && (
                      <div>
                        <span className="font-medium text-muted-foreground">GST Number:</span> {selectedApplication.businessInfo.gstNumber}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Submitted Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedApplication.approval.submittedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground">{doc.documentType.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.verified ? (
                            <Badge variant="default">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          <a
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {selectedApplication?.approval.status === 'pending' && (
              <div className="flex justify-end space-x-4">
                <Button
                  onClick={() => handleReject(selectedApplication._id)}
                  disabled={actionLoading === 'reject'}
                  variant="destructive"
                >
                  {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedApplication._id)}
                  disabled={actionLoading === 'approve'}
                  variant="default"
                >
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorApprovals;