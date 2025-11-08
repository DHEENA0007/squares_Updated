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

      const response = await fetch(`/api/admin/vendor-approvals?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch applications:', errorText);
        throw new Error('Failed to fetch applications');
      }
      
      const data = await response.json();
      setApplications(data.data.vendors);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vendor applications",
        variant: "destructive"
      });
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/vendor-approval-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch stats:', errorText);
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Applications</h1>
          <p className="mt-2 text-gray-600">Review and manage vendor applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overview.pendingApplications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overview.approvedApplications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Under Review</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overview.underReviewApplications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overview.approvalRate}%</p>
              </div>
            </div>
          </div>
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
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {applications.length === 0 ? (
            <li className="p-6 text-center text-gray-500">
              No applications found matching your criteria
            </li>
          ) : (
            applications.map((application) => (
              <li key={application._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {application.businessInfo.companyName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {application.user.profile.firstName} {application.user.profile.lastName}
                          </p>
                        </div>
                        <StatusBadge status={application.approval.status} />
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm text-gray-500">
                          <p>Submitted: {formatDate(application.approval.submittedAt)}</p>
                          <p>Documents: {application.approval.submittedDocuments.length}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowDetails(true);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
      </div>

      {/* Detail Modal */}
      {showDetails && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Vendor Application Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Company Name:</span> {selectedApplication.businessInfo.companyName}
                  </div>
                  <div>
                    <span className="font-medium">Business Type:</span> {selectedApplication.businessInfo.businessType}
                  </div>
                  <div>
                    <span className="font-medium">Contact Person:</span> {selectedApplication.user.profile.firstName} {selectedApplication.user.profile.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedApplication.user.email}
                  </div>
                  {selectedApplication.businessInfo.licenseNumber && (
                    <div>
                      <span className="font-medium">License Number:</span> {selectedApplication.businessInfo.licenseNumber}
                    </div>
                  )}
                  {selectedApplication.businessInfo.gstNumber && (
                    <div>
                      <span className="font-medium">GST Number:</span> {selectedApplication.businessInfo.gstNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Submitted Documents</h4>
                <div className="space-y-2">
                  {selectedApplication.approval.submittedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{doc.documentName}</p>
                          <p className="text-xs text-gray-500">{doc.documentType.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.verified ? (
                          <span className="text-green-600 text-sm">Verified</span>
                        ) : (
                          <span className="text-yellow-600 text-sm">Pending</span>
                        )}
                        <a
                          href={doc.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApplication.approval.status === 'pending' && (
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => handleReject(selectedApplication._id)}
                    disabled={actionLoading === 'reject'}
                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApplication._id)}
                    disabled={actionLoading === 'approve'}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorApprovals;