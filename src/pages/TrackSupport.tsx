import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Eye, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import supportService, { SupportTicket } from "@/services/supportService";
import { SupportDialog } from "@/components/support/SupportDialog";
import { authService } from "@/services/authService";
import { Link } from "react-router-dom";

const TrackSupport = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingEmail, setTrackingEmail] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseLoading, setResponseLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    setIsAuthenticated(!!token);
    
    if (token) {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    if (!isAuthenticated) {
      setTickets([]);
      return;
    }

    try {
      setLoading(true);
      const filters: any = {};
      
      if (activeTab !== 'all') {
        filters.status = activeTab;
      }

      const response = await supportService.getMyTickets(filters);
      setTickets(response.data.tickets);
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      // Don't show error toast for authentication errors
      if (!error.message?.includes('token') && !error.message?.includes('401')) {
        toast({
          title: "Error",
          description: "Failed to fetch tickets",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTrackByNumber = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a ticket number",
        variant: "destructive"
      });
      return;
    }

    if (!trackingEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await supportService.getTicketByNumber(trackingNumber, trackingEmail);
      setSelectedTicket(response.data.ticket);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error tracking ticket:", error);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    try {
      setResponseLoading(true);
      await supportService.addResponse(selectedTicket.ticketNumber, responseMessage);
      setResponseMessage("");
      
      toast({
        title: "Success",
        description: "Your reply has been sent. Our support team will respond soon.",
      });
      
      // Refresh ticket details - use appropriate method based on auth status
      if (isAuthenticated) {
        const response = await supportService.getTicketByNumberAuth(selectedTicket.ticketNumber);
        setSelectedTicket(response.data.ticket);
        fetchTickets();
      } else {
        const response = await supportService.getTicketByNumber(selectedTicket.ticketNumber, trackingEmail || selectedTicket.email);
        setSelectedTicket(response.data.ticket);
      }
    } catch (error) {
      console.error("Error adding response:", error);
    } finally {
      setResponseLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; class: string; label: string }> = {
      open: { icon: AlertCircle, class: 'bg-blue-600', label: 'Open' },
      'in_progress': { icon: Clock, class: 'bg-yellow-600', label: 'In Progress' },
      resolved: { icon: CheckCircle, class: 'bg-green-600', label: 'Resolved' },
      closed: { icon: XCircle, class: 'bg-gray-600', label: 'Closed' }
    };
    return variants[status] || variants.open;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.normal;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Low',
      normal: 'Normal',
      medium: 'Normal',
      high: 'High',
      urgent: 'Urgent'
    };
    return labels[priority] || 'Normal';
  };

  const getStatusTooltip = (status: string) => {
    const tooltips: Record<string, string> = {
      open: 'Your ticket has been received and is waiting to be reviewed',
      'in_progress': 'Our support team is currently working on your ticket',
      resolved: 'Your issue has been resolved. You can reopen if needed',
      closed: 'This ticket has been closed and is archived'
    };
    return tooltips[status] || tooltips.open;
  };

  const getPriorityTooltip = (priority: string) => {
    const tooltips: Record<string, string> = {
      low: 'Low priority - Response within 3-5 business days',
      normal: 'Normal priority - Response within 1-2 business days',
      medium: 'Normal priority - Response within 1-2 business days',
      high: 'High priority - Response within 24 hours',
      urgent: 'Urgent - Immediate attention required'
    };
    return tooltips[priority] || tooltips.normal;
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support & Help Desk</h1>
          <p className="text-muted-foreground mt-1">
            Track your support requests and get help
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          Create Support Ticket
        </Button>
      </div>

      {/* Track by Number - Only show for non-authenticated users */}
      {!isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Track Ticket by Number</CardTitle>
            <CardDescription>Enter your ticket number and email to view its status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ticketNumber">Ticket Number</Label>
                  <Input
                    id="ticketNumber"
                    placeholder="TKT-123456"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label htmlFor="trackingEmail">Email Address</Label>
                  <Input
                    id="trackingEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={trackingEmail}
                    onChange={(e) => setTrackingEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleTrackByNumber} className="w-full md:w-auto">
                <Search className="w-4 h-4 mr-2" />
                Track Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>My Support Tickets</CardTitle>
          <CardDescription>
            {isAuthenticated 
              ? 'View and manage your support requests'
              : 'Login to view your support tickets'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <LogIn className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-muted-foreground mb-6">
                Please login to view and manage your support tickets
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                Already have a ticket? Use the "Track by Number" section above to check your ticket status.
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket title or ticket ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                  <TabsTrigger value="closed">Closed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4 mt-4">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Tickets Found</h3>
                      <p className="text-muted-foreground">
                        {activeTab === 'all' 
                          ? 'You haven\'t created any support tickets yet'
                          : `No ${activeTab} tickets to display`
                        }
                      </p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const statusInfo = getStatusBadge(ticket.status);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <Card key={ticket._id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge className={statusInfo.class}>
                                          <StatusIcon className="w-3 h-3 mr-1" />
                                          {statusInfo.label}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{getStatusTooltip(ticket.status)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge className={getPriorityBadge(ticket.priority)}>
                                          {getPriorityLabel(ticket.priority)}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{getPriorityTooltip(ticket.priority)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <CardDescription>
                                  Ticket #{ticket.ticketNumber} • Created: {new Date(ticket.createdAt).toLocaleDateString()} • Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {ticket.description}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Ticket #{selectedTicket?.ticketNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusBadge(selectedTicket.status).class}>
                      {getStatusBadge(selectedTicket.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <Badge className={getPriorityBadge(selectedTicket.priority)}>
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="text-sm mt-1 capitalize">{selectedTicket.category}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="text-sm mt-1">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label>Subject</Label>
                <p className="text-sm mt-1 font-semibold">{selectedTicket.subject}</p>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div>
                  <Label>Conversation</Label>
                  <div className="space-y-3 mt-2">
                    {selectedTicket.responses.map((response, index) => (
                      <div key={index} className={`p-4 rounded-lg ${response.isAdmin ? 'bg-blue-50 dark:bg-blue-950' : 'bg-muted'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{response.author}</p>
                            <p className="text-xs text-muted-foreground">
                              {response.isAdmin ? 'Support Team' : 'You'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(response.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm">{response.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div>
                  <Label>Add Response</Label>
                  <Textarea
                    placeholder="Type your message..."
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleAddResponse} disabled={responseLoading}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {responseLoading ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Our support team will review and respond to your message. Only support staff can resolve tickets.
                  </p>
                </div>
              )}

              {selectedTicket.status === 'resolved' && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Ticket Resolved</p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        This ticket has been marked as resolved by our support team.
                        {selectedTicket.resolvedAt && ` on ${new Date(selectedTicket.resolvedAt).toLocaleDateString()}`}
                      </p>
                      {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                          If you need further assistance, please create a new support ticket.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Ticket Closed</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        This ticket has been closed. For new issues, please create a new support ticket.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <SupportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(ticketNumber) => {
          toast({
            title: "Ticket Created",
            description: `Your ticket number is ${ticketNumber}. You can track it anytime.`,
          });
          fetchTickets();
        }}
      />
    </div>
  );
};

export default TrackSupport;
