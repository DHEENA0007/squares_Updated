import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Eye, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, LogIn, Ticket, ArrowRight, HelpCircle } from "lucide-react";
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
      open: { icon: AlertCircle, class: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20', label: 'Open' },
      'in_progress': { icon: Clock, class: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200', label: 'In Progress' },
      resolved: { icon: CheckCircle, class: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200', label: 'Resolved' },
      closed: { icon: XCircle, class: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200', label: 'Closed' }
    };
    return variants[status] || variants.open;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-100 text-slate-700 border-slate-200',
      normal: 'bg-primary/10 text-primary border-primary/20',
      medium: 'bg-primary/10 text-primary border-primary/20',
      high: 'bg-orange-50 text-orange-700 border-orange-200',
      urgent: 'bg-red-50 text-red-700 border-red-200'
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
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/80 backdrop-blur-xl p-8 rounded-3xl border border-border/60 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Support Center
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Need help? Track your existing tickets or create a new one. We're here to assist you.
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
          >
            <Ticket className="w-5 h-5 mr-2" />
            Create New Ticket
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Track Ticket */}
          <div className="lg:col-span-1 space-y-8">
            {!isAuthenticated && (
              <Card className="border-0 shadow-xl bg-card/90 backdrop-blur-sm overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Search className="w-5 h-5 text-primary" />
                    Track Ticket
                  </CardTitle>
                  <CardDescription>
                    Check the status of your ticket without logging in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketNumber">Ticket Number</Label>
                    <Input
                      id="ticketNumber"
                      placeholder="TKT-123456"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                      className="bg-background border-input focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trackingEmail">Email Address</Label>
                    <Input
                      id="trackingEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={trackingEmail}
                      onChange={(e) => setTrackingEmail(e.target.value)}
                      className="bg-background border-input focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                  <Button onClick={handleTrackByNumber} className="w-full bg-foreground hover:bg-foreground/90 text-background transition-all">
                    Track Status <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-primary-foreground">
                  <HelpCircle className="w-5 h-5" />
                  Need Immediate Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                <p className="text-primary-foreground/90">
                  Check our knowledge base for quick answers to common questions before creating a ticket.
                </p>
                <Button variant="secondary" className="w-full bg-background text-foreground hover:bg-background/90 border-0">
                  Visit Knowledge Base
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Ticket List */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-card/90 backdrop-blur-sm h-full">
              <CardHeader className="border-b border-border pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">My Tickets</CardTitle>
                    <CardDescription className="mt-1">
                      {isAuthenticated
                        ? 'Manage and view your support history'
                        : 'Login to access your full ticket history'
                      }
                    </CardDescription>
                  </div>
                  {isAuthenticated && (
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background border-input focus:ring-2 focus:ring-primary transition-all rounded-full"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                      <LogIn className="h-10 w-10 text-primary" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-xl font-semibold text-foreground">Authentication Required</h3>
                      <p className="text-muted-foreground">
                        Please login to view your support tickets and manage your conversations with our team.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <Button asChild size="lg" className="px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to="/login">Login</Link>
                      </Button>
                      <Button variant="outline" size="lg" asChild className="px-8">
                        <Link to="/signup">Create Account</Link>
                      </Button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Loading your tickets...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full justify-start bg-muted p-1 rounded-xl mb-6 overflow-x-auto flex-nowrap">
                        <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">All</TabsTrigger>
                        <TabsTrigger value="open" className="rounded-lg px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Open</TabsTrigger>
                        <TabsTrigger value="in_progress" className="rounded-lg px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">In Progress</TabsTrigger>
                        <TabsTrigger value="resolved" className="rounded-lg px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Resolved</TabsTrigger>
                        <TabsTrigger value="closed" className="rounded-lg px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Closed</TabsTrigger>
                      </TabsList>

                      <TabsContent value={activeTab} className="space-y-4 focus:outline-none">
                        {filteredTickets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/50">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                              <MessageSquare className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No Tickets Found</h3>
                            <p className="text-muted-foreground max-w-sm">
                              {activeTab === 'all'
                                ? "You haven't created any support tickets yet. Need help? Create a new ticket."
                                : `No ${activeTab.replace('_', ' ')} tickets found in your history.`
                              }
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredTickets.map((ticket) => {
                              const statusInfo = getStatusBadge(ticket.status);
                              const StatusIcon = statusInfo.icon;

                              return (
                                <div
                                  key={ticket._id}
                                  className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline" className={`${statusInfo.class} px-2.5 py-0.5 rounded-full font-medium border`}>
                                          <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                          {statusInfo.label}
                                        </Badge>
                                        <Badge variant="outline" className={`${getPriorityBadge(ticket.priority)} px-2.5 py-0.5 rounded-full font-medium border`}>
                                          {getPriorityLabel(ticket.priority)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">#{ticket.ticketNumber}</span>
                                      </div>
                                      <h4 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                        {ticket.subject}
                                      </h4>
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {ticket.description}
                                      </p>
                                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5" />
                                          Created {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                        <span>
                                          Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200">
                                      <Button size="icon" variant="ghost" className="rounded-full">
                                        <ArrowRight className="w-5 h-5 text-primary" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* View Ticket Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">Ticket Details</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Reference #{selectedTicket?.ticketNumber}
                  </DialogDescription>
                </div>
              </div>
              {selectedTicket && (
                <Badge className={`${getStatusBadge(selectedTicket.status).class} px-3 py-1 text-sm`}>
                  {getStatusBadge(selectedTicket.status).label}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6">
            {selectedTicket && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{selectedTicket.subject}</h3>
                      <div className="bg-muted/30 p-4 rounded-xl border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.description}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Conversation History
                        </h4>
                      </div>

                      {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {selectedTicket.responses.map((response, index) => (
                            <div
                              key={index}
                              className={`flex ${response.isAdmin ? 'justify-start' : 'justify-end'}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl p-4 ${response.isAdmin
                                  ? 'bg-muted text-foreground rounded-tl-none'
                                  : 'bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10'
                                }`}>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className={`text-xs font-medium ${response.isAdmin ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                                    {response.isAdmin ? 'Support Agent' : 'You'}
                                  </span>
                                  <span className={`text-xs ${response.isAdmin ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                                    {new Date(response.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">{response.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground italic text-sm bg-muted/30 rounded-xl border border-dashed border-border">
                          No responses yet
                        </div>
                      )}
                    </div>

                    {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                      <div className="pt-4 border-t border-border">
                        <Label className="mb-2 block">Reply to Ticket</Label>
                        <div className="relative">
                          <Textarea
                            placeholder="Type your message here..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={4}
                            className="resize-none bg-background border-input focus:ring-2 focus:ring-primary rounded-xl pr-12"
                          />
                          <Button
                            onClick={handleAddResponse}
                            disabled={responseLoading || !responseMessage.trim()}
                            size="icon"
                            className="absolute bottom-3 right-3 h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Our support team typically responds within 24 hours.
                        </p>
                      </div>
                    )}

                    {selectedTicket.status === 'resolved' && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-emerald-900 dark:text-emerald-100">Ticket Resolved</p>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                            This ticket was marked as resolved on {selectedTicket.resolvedAt && new Date(selectedTicket.resolvedAt).toLocaleDateString()}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-muted/30 rounded-xl p-5 border border-border space-y-4">
                    <h4 className="font-medium text-foreground text-sm uppercase tracking-wider">Ticket Info</h4>

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Priority</span>
                        <Badge className={`${getPriorityBadge(selectedTicket.priority)} px-2.5 py-0.5`}>
                          {getPriorityLabel(selectedTicket.priority)}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Category</span>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground capitalize">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          {selectedTicket.category}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Created Date</span>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(selectedTicket.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Last Updated</span>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(selectedTicket.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                    <h4 className="font-medium text-primary text-sm mb-2">Need more help?</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      If this ticket is resolved but you have a new issue, please create a new ticket.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-background border-primary/20 text-primary hover:bg-primary/5"
                      onClick={() => {
                        setViewDialogOpen(false);
                        setCreateDialogOpen(true);
                      }}
                    >
                      Open New Ticket
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
