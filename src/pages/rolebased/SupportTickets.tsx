import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeadphonesIcon, Clock, User, Mail, MessageSquare, Eye, Paperclip, Download, Lock, LockOpen, ArrowRightLeft } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { useNavigate } from "react-router-dom";

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
  assignedTo?: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  lockedBy?: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  lockedAt?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  responses?: Array<{
    message: string;
    author: string;
    authorId?: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

const SupportTickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = user?.rolePermissions || [];
  const { toast } = useToast();

  // Check if user has admin role (including subadmin)
  const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'subadmin';

  // Permission checks
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canViewTickets = hasAdminRole || hasPermission(PERMISSIONS.SUPPORT_TICKETS_READ);
  const canViewConversation = hasAdminRole || hasPermission(PERMISSIONS.SUPPORT_TICKETS_VIEW);
  const canReply = hasAdminRole || hasPermission(PERMISSIONS.SUPPORT_TICKETS_REPLY);
  // Allow users with reply permission to accept tickets (show Accept button)
  const canUpdateStatus = hasAdminRole || hasPermission(PERMISSIONS.SUPPORT_TICKETS_STATUS) || hasPermission(PERMISSIONS.SUPPORT_TICKETS_REPLY);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [transferUsers, setTransferUsers] = useState<any[]>([]);
  const [transferRoles, setTransferRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    if (!canViewTickets) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view support tickets.",
        variant: "destructive",
      });
      navigate('/rolebased');
      return;
    }
    fetchTickets();
  }, [currentPage, statusFilter]);

  const fetchTickets = async () => {
    if (!canViewTickets) return;

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

  // Real-time updates
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
    if (!canViewConversation) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view conversations.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleReply = (ticket: SupportTicket) => {
    if (!canReply) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to reply to tickets.",
        variant: "destructive",
      });
      return;
    }
    
    // Prevent replying to closed or resolved tickets
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      toast({
        title: "Cannot Reply",
        description: `This ticket is ${ticket.status}. Only open or in-progress tickets can receive replies.`,
        variant: "destructive",
      });
      return;
    }
    
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
    if (!canUpdateStatus) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update ticket status.",
        variant: "destructive",
      });
      return;
    }

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

  const handleTransferTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTransferDialogOpen(true);
    fetchTransferRoles();
    fetchTransferUsers();
  };

  const fetchTransferRoles = async () => {
    try {
      const response = await fetch('/api/support/transfer-roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('Transfer roles response:', data);
      if (data.success) {
        setTransferRoles(data.data.roles || []);
      } else {
        console.error('Failed to fetch roles:', data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to fetch available roles",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch transfer roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available roles",
        variant: "destructive",
      });
    }
  };

  const fetchTransferUsers = async (role?: string) => {
    try {
      const url = role && role !== 'all' 
        ? `/api/support/transfer-users?role=${role}` 
        : '/api/support/transfer-users';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTransferUsers(data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch transfer users:', error);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTicket || !selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user to transfer to",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/support/tickets/${selectedTicket.ticketNumber}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetUserId: selectedUser })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to transfer ticket');
      }

      toast({
        title: "Success",
        description: "Ticket transferred successfully",
      });

      setTransferDialogOpen(false);
      setSelectedUser('');
      setSelectedRole('all');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer ticket",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTransferUsers = transferUsers.filter(u => 
    selectedRole === 'all' ? true : u.role === selectedRole
  );

  // Update users when role changes
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setSelectedUser(''); // Reset user selection when role changes
    fetchTransferUsers(role); // Fetch users for the selected role
  };

  if (!canViewTickets) {
    return null;
  }

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
                      {ticket.lockedBy && (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Lock className="h-3 w-3" />
                          <span className="text-xs">
                            Being handled by {ticket.lockedBy.profile?.firstName} {ticket.lockedBy.profile?.lastName || ticket.lockedBy.email}
                          </span>
                        </Badge>
                      )}
                      {ticket.assignedTo && !ticket.lockedBy && (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <User className="h-3 w-3" />
                          <span className="text-xs">
                            Assigned to {ticket.assignedTo.profile?.firstName} {ticket.assignedTo.profile?.lastName || ticket.assignedTo.email}
                          </span>
                        </Badge>
                      )}
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
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{ticket.attachments.length} attachment{ticket.attachments.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {canViewConversation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewConversation(ticket)}
                      className="flex-1 touch-manipulation min-h-[40px]"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Conversation
                    </Button>
                  )}
                  
                  {/* Only show reply/action buttons if ticket is not locked by another user */}
                  {(!ticket.lockedBy || ticket.lockedBy._id === user?.id) && (
                    <>
                      {canReply && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <Button
                          size="sm"
                          onClick={() => handleReply(ticket)}
                          className="flex-1 touch-manipulation min-h-[40px]"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      )}
                      {canUpdateStatus && ticket.status === 'open' && (
                        ticket.assignedTo ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateStatus(ticket._id, 'in_progress')}
                            disabled={actionLoading}
                            className="flex-1 touch-manipulation min-h-[40px]"
                          >
                            Mark In Progress
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateStatus(ticket._id, 'in_progress')}
                            disabled={actionLoading}
                            className="flex-1 touch-manipulation min-h-[40px]"
                          >
                            Accept
                          </Button>
                        )
                      )}
                      {canUpdateStatus && ticket.status === 'in_progress' && (
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
                    </>
                  )}
                  
                  {/* Transfer button - only show if current user is handling the ticket */}
                  {canUpdateStatus && ticket.lockedBy && ticket.lockedBy._id === user?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransferTicket(ticket)}
                      className="flex-1 touch-manipulation min-h-[40px]"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>{selectedTicket.attachments.length} attachment{selectedTicket.attachments.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.attachments.map((attachment, idx) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.filename);
                        return (
                          <div key={idx} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                            {isImage ? (
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.filename}
                                  className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition"
                                />
                              </a>
                            ) : (
                              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800">
                                <Paperclip className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="p-2 flex items-center justify-between">
                              <span className="text-xs truncate flex-1 mr-2" title={attachment.filename}>
                                {attachment.filename}
                              </span>
                              <a 
                                href={attachment.url} 
                                download={attachment.filename}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedTicket.responses && selectedTicket.responses.length > 1 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Responses</h4>
                  {selectedTicket.responses.slice(1).map((response, index) => (
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
            {canReply && selectedTicket && selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (selectedTicket) {
                  handleReply(selectedTicket);
                }
              }}>
                Reply to Ticket
              </Button>
            )}
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

      {/* Transfer Ticket Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Transfer Support Ticket</DialogTitle>
            <DialogDescription className="text-sm">
              Transfer #{selectedTicket?.ticketNumber} to another support team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select 
                value={selectedRole} 
                onValueChange={handleRoleChange}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Available Staff</SelectItem>
                  {transferRoles.length > 0 ? (
                    transferRoles.map((role) => (
                      <SelectItem key={role._id} value={role.name}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="subadmin">Sub Admin</SelectItem>
                      <SelectItem value="agent">Support Agent</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transfer-to">Select User</Label>
              <Select 
                value={selectedUser} 
                onValueChange={setSelectedUser}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a user to transfer to" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTransferUsers.length === 0 ? (
                    <SelectItem value="none" disabled>No users available</SelectItem>
                  ) : (
                    filteredTransferUsers.map((usr) => (
                      <SelectItem key={usr._id} value={usr._id}>
                        <div className="flex flex-col">
                          <span>{usr.profile?.firstName} {usr.profile?.lastName}</span>
                          <span className="text-xs text-muted-foreground">{usr.email} - {usr.role}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {filteredTransferUsers.length === 0 && selectedRole !== 'all' && (
              <p className="text-sm text-muted-foreground">
                No {selectedRole} users found. Try selecting a different role.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedUser('');
                setSelectedRole('all');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmTransfer}
              disabled={actionLoading || !selectedUser}
            >
              {actionLoading ? 'Transferring...' : 'Transfer Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
