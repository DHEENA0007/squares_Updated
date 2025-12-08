import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeadphonesIcon, Clock, User, Mail, MessageSquare, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import subAdminService from "@/services/subAdminService";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SupportTicket {
  _id: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  ticketNumber?: string;
  createdAt: string;
  updatedAt: string;
  responses?: Array<{
    message: string;
    author: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

const SupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, [currentPage, statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await subAdminService.getSupportTickets(currentPage, 10, statusFilter);
      setTickets(data.tickets);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch support tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates for support tickets
  useRealtimeEvent('support_ticket_created', (data) => {
    toast({
      title: "New Support Ticket",
      description: "A new support ticket has been created",
    });
    fetchTickets();
  });

  useRealtimeEvent('support_ticket_updated', (data) => {
    fetchTickets();
  });

  useRealtimeEvent('message_received', (data) => {
    // Refresh if it's related to support
    if (data.type === 'support') {
      fetchTickets();
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleViewConversation = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleReply = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      await subAdminService.updateSupportTicket(
        selectedTicket._id,
        selectedTicket.status,
        replyMessage
      );
      
      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
      
      setReplyDialogOpen(false);
      setReplyMessage('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      setActionLoading(true);
      await subAdminService.updateSupportTicket(ticketId, newStatus, '');
      
      toast({
        title: "Success",
        description: `Ticket marked as ${newStatus.replace('_', ' ')}`,
      });
      
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer support requests and complaints
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
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer support requests and complaints
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Tickets</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All Tickets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HeadphonesIcon className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold">No Support Tickets</h3>
              <p className="text-muted-foreground text-center">
                {statusFilter === 'open' 
                  ? "No open support tickets at the moment."
                  : `No ${statusFilter} tickets found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket._id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <CardTitle className="text-lg">
                        {ticket.ticketNumber && (
                          <span className="text-muted-foreground mr-2">#{ticket.ticketNumber}</span>
                        )}
                        {ticket.subject || 'Support Request'}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        {ticket.priority && (
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        )}
                        {ticket.category && (
                          <Badge variant="outline">
                            {ticket.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{ticket.sender.profile.firstName} {ticket.sender.profile.lastName}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{ticket.sender.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 sm:p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm leading-relaxed break-words">{ticket.message}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewConversation(ticket)}
                    className="flex-1 touch-manipulation min-h-[40px]"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Conversation
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReply(ticket)}
                    className="flex-1 touch-manipulation min-h-[40px]"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  {ticket.status === 'open' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdateStatus(ticket._id, 'in_progress')}
                      disabled={actionLoading}
                      className="flex-1 touch-manipulation min-h-[40px]"
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdateStatus(ticket._id, 'resolved')}
                      disabled={actionLoading}
                      className="flex-1 touch-manipulation min-h-[40px]"
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="w-full sm:w-auto"
          >
            Next
          </Button>
        </div>
      )}

      {/* View Conversation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {selectedTicket?.ticketNumber && `#${selectedTicket.ticketNumber} - `}
              {selectedTicket?.subject || 'Support Ticket'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Conversation history with {selectedTicket?.sender.profile.firstName} {selectedTicket?.sender.profile.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* Original Message */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold text-sm">
                      {selectedTicket.sender.profile.firstName} {selectedTicket.sender.profile.lastName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{selectedTicket.message}</p>
              </div>

              {/* Responses */}
              {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Responses</h4>
                  {selectedTicket.responses.map((response, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg ${response.isAdmin ? 'bg-blue-50 dark:bg-blue-950' : 'bg-muted'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {response.isAdmin ? (
                            <HeadphonesIcon className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span className="font-semibold text-sm">
                            {response.author}
                            {response.isAdmin && (
                              <Badge variant="outline" className="ml-2">Support</Badge>
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(response.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{response.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewDialogOpen(false);
              if (selectedTicket) {
                handleReply(selectedTicket);
              }
            }}>
              Reply to Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Reply to Support Ticket</DialogTitle>
            <DialogDescription className="text-sm">
              Send a response to {selectedTicket?.sender.profile.firstName} {selectedTicket?.sender.profile.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTicket && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-semibold mb-1">Original Message:</p>
                <p className="text-sm">{selectedTicket.message}</p>
              </div>
            )}
            <div>
              <Label htmlFor="reply">Your Response</Label>
              <Textarea
                id="reply"
                placeholder="Type your response here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyMessage('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendReply}
              disabled={actionLoading || !replyMessage.trim()}
            >
              {actionLoading ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;