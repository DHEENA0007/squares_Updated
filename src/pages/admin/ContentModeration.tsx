import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Eye, CheckCircle, XCircle, Image as ImageIcon, MessageSquare, User, Calendar } from "lucide-react";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

interface ContentReport {
  _id: string;
  type: 'image' | 'review' | 'property_description' | 'user_profile';
  contentId: string;
  reportedBy: {
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  content: {
    text?: string;
    images?: string[];
    title?: string;
    url?: string;
  };
  createdAt: string;
}

const ContentModeration = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [moderationNotes, setModerationNotes] = useState("");
  const [filter, setFilter] = useState<string>("pending");

  const fetchContentReports = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/admin/content/reports?status=${filter}`);
      const data = await handleApiResponse<{ reports: ContentReport[] }>(response);
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to fetch content reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentReports();
  }, [filter]);

  const handleModerationAction = async (reportId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetchWithAuth(`/api/admin/content/reports/${reportId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ 
          notes: moderationNotes 
        })
      });

      const data = await handleApiResponse(response);
      setModerationNotes("");
      fetchContentReports();
    } catch (error) {
      console.error(`Failed to ${action} content:`, error);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return ImageIcon;
      case 'review':
        return MessageSquare;
      case 'property_description':
        return MessageSquare;
      case 'user_profile':
        return User;
      default:
        return AlertTriangle;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'Inappropriate Image';
      case 'review':
        return 'Inappropriate Review';
      case 'property_description':
        return 'Property Description';
      case 'user_profile':
        return 'User Profile';
      default:
        return 'Other';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    };
    
    return variants[status as keyof typeof variants] || variants.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate user-generated content reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending ({reports.filter(r => r.status === 'pending').length})
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            size="sm"
          >
            All Reports
          </Button>
        </div>
      </div>

      {/* Content Reports */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                {filter === 'pending' 
                  ? 'No content reports are currently pending review.'
                  : 'No content reports match your criteria.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const IconComponent = getReportTypeIcon(report.type);
            const statusInfo = getStatusBadge(report.status);
            
            return (
              <Card key={report._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Report Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <IconComponent className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {getReportTypeLabel(report.type)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Reported by {report.reportedBy.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={statusInfo.color}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Report Reason:</h4>
                          <p className="text-sm">{report.reason}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Description:</h4>
                          <p className="text-sm">{report.description}</p>
                        </div>

                        {/* Reported Content Preview */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Reported Content:</h4>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            {report.content.images && report.content.images.length > 0 && (
                              <div className="flex gap-2 mb-2">
                                {report.content.images.map((image, index) => (
                                  <img 
                                    key={index}
                                    src={image} 
                                    alt={`Content ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                            {report.content.title && (
                              <p className="font-medium text-sm mb-1">{report.content.title}</p>
                            )}
                            {report.content.text && (
                              <p className="text-sm text-muted-foreground">
                                {report.content.text.length > 200 
                                  ? `${report.content.text.substring(0, 200)}...`
                                  : report.content.text
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View Full Content
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Full Content Review</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {report.content.images && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {report.content.images.map((image, index) => (
                                    <img 
                                      key={index}
                                      src={image} 
                                      alt={`Content ${index + 1}`}
                                      className="w-full h-64 object-cover rounded-lg"
                                    />
                                  ))}
                                </div>
                              )}
                              {report.content.text && (
                                <div>
                                  <h4 className="font-semibold mb-2">Full Text:</h4>
                                  <p className="text-sm whitespace-pre-wrap">{report.content.text}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {report.status === 'pending' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Content
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Content</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>Mark this content as appropriate and dismiss the report?</p>
                                  <Textarea
                                    placeholder="Add moderation notes (optional)..."
                                    value={moderationNotes}
                                    onChange={(e) => setModerationNotes(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleModerationAction(report._id, 'approve')}
                                    >
                                      Approve Content
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Remove Content
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove Content</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>Remove this content and take action against the user?</p>
                                  <Textarea
                                    placeholder="Moderation notes (required for content removal)..."
                                    value={moderationNotes}
                                    onChange={(e) => setModerationNotes(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleModerationAction(report._id, 'reject')}
                                    >
                                      Remove Content
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContentModeration;
