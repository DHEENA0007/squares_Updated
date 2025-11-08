import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Flag, Eye, User, MessageSquare, Image as ImageIcon, CheckCircle, XCircle, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

interface ContentReport {
  _id: string;
  type: 'property' | 'review' | 'message' | 'user';
  contentId: string;
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  content?: {
    title?: string;
    description?: string;
    text?: string;
    images?: string[];
  };
}

const ContentModeration = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'dismiss'>('approve');
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [activeTab, searchTerm]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/content/reports?status=${activeTab}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { reports: ContentReport[] } }>(response);
      setReports(data.data.reports || []);
    } catch (error: any) {
      console.error('Error fetching content reports:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching content reports",
        variant: "destructive",
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  useRealtimeEvent('content_reported', (data) => {
    toast({
      title: "New Report",
      description: "New content has been reported for moderation",
    });
    if (activeTab === 'pending') {
      fetchReports();
    }
  });

  const handleAction = async () => {
    if (!selectedReport) return;

    try {
      setActionLoading({ ...actionLoading, [selectedReport._id]: true });
      const endpoint = actionType === 'approve' ? 'resolve' : 'dismiss';
      const response = await fetchWithAuth(`/subadmin/content/reports/${selectedReport._id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ note: actionNote })
      });
      
      await handleApiResponse(response);
      toast({
        title: "Success",
        description: `Report ${actionType === 'approve' ? 'resolved' : 'dismissed'} successfully`,
      });
      setActionDialogOpen(false);
      setActionNote("");
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process report",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [selectedReport._id]: false });
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'property':
        return <ImageIcon className="h-4 w-4" />;
      case 'review':
        return <Star className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getReportTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'property':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'message':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'user':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate reported content
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Review and moderate reported content
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Flag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Reports Found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'pending' 
                    ? 'All reports have been reviewed. Great job!'
                    : `No ${activeTab} reports to display`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report._id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Content Report</CardTitle>
                        <Badge className={getReportTypeBadgeColor(report.type)}>
                          <span className="flex items-center gap-1">
                            {getReportTypeIcon(report.type)}
                            {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Reported by: {report.reportedBy.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Flag className="h-3 w-3" />
                            Reason: {report.reason}
                          </span>
                        </div>
                        <p className="text-sm mt-2">{report.description}</p>
                      </CardDescription>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {activeTab === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionType('approve');
                            setActionDialogOpen(true);
                          }}
                          disabled={actionLoading[report._id]}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionType('dismiss');
                            setActionDialogOpen(true);
                          }}
                          disabled={actionLoading[report._id]}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Content Report Details</DialogTitle>
            <DialogDescription>
              Detailed information about the reported content
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Report Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <Badge className={getReportTypeBadgeColor(selectedReport.type)}>
                      {selectedReport.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge>{selectedReport.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reported By</p>
                    <p>{selectedReport.reportedBy.name}</p>
                    <p className="text-xs">{selectedReport.reportedBy.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p>{new Date(selectedReport.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Reason</h4>
                <p className="text-sm">{selectedReport.reason}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm">{selectedReport.description}</p>
              </div>
              {selectedReport.content && (
                <div>
                  <h4 className="font-semibold mb-2">Reported Content</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    {selectedReport.content.title && (
                      <p className="font-medium">{selectedReport.content.title}</p>
                    )}
                    {selectedReport.content.description && (
                      <p className="text-sm mt-2">{selectedReport.content.description}</p>
                    )}
                    {selectedReport.content.text && (
                      <p className="text-sm mt-2">{selectedReport.content.text}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Resolve Report' : 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Add a note about the resolution (optional)'
                : 'Add a note about why this report is being dismissed (optional)'
              }
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add a note..."
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setActionNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading[selectedReport?._id || ""]}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {actionType === 'approve' ? 'Resolve' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentModeration;
