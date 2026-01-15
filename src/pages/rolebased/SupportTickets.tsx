import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Paperclip, Download, Lock, MoreVertical, Send, ArrowRightLeft } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      avatar?: string;
    };
  };
  subject?: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const [sheetOpen, setSheetOpen] = useState(false);
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

  useEffect(() => {
    if (sheetOpen && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sheetOpen, selectedTicket?.responses]);

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
    if (data.type === 'support') {
      fetchTickets();
      if (selectedTicket && data.ticketId === selectedTicket._id) {
        subAdminService.getSupportTickets(currentPage, 10, statusFilter).then(res => {
          const updatedTicket = res.tickets.find((t: SupportTicket) => t._id === selectedTicket._id);
          if (updatedTicket) setSelectedTicket(updatedTicket);
        });
      }
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    if (!canViewConversation) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view conversations.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTicket(ticket);
    setSheetOpen(true);
  };

  const handleSendReply = async () => {
    if (!canReply) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to reply to tickets.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedTicket || !replyMessage.trim()) return;

    // Prevent replying to closed tickets
    if (selectedTicket.status === 'closed') {
      toast({
        title: "Cannot Reply",
        description: `This ticket is ${selectedTicket.status}. Only open or in-progress tickets can receive replies.`,
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

      setReplyMessage('');

      // Refresh ticket details
      const data = await subAdminService.getSupportTickets(currentPage, 10, statusFilter);
      setTickets(data.tickets);
      const updatedTicket = data.tickets.find((t: SupportTicket) => t._id === selectedTicket._id);
      if (updatedTicket) setSelectedTicket(updatedTicket);

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
    } catch (error: any) {
      if (error.status === 423 || error.message?.includes('locked')) {
        toast({
          title: "Ticket Locked",
          description: "This ticket is currently being handled by another user",
          variant: "destructive",
        });
        fetchTickets();
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send reply",
          variant: "destructive",
        });
      }
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
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error: any) {
      if (error.status === 423 || error.message?.includes('locked')) {
        toast({
          title: "Ticket Locked",
          description: "This ticket is currently being handled by another user",
          variant: "destructive",
        });
        fetchTickets();
      } else {
        toast({
          title: "Error",
          description: "Failed to update ticket status",
          variant: "destructive",
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferTicket = (ticket: SupportTicket) => {
    if (!canUpdateStatus) return;
    setSelectedTicket(ticket);
    setTransferDialogOpen(true);
    fetchTransferRoles();
    fetchTransferUsers();
  };

  const fetchTransferRoles = async () => {
    try {
      const response = await fetch('/api/support/transfer-roles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setTransferRoles(data.data.roles || []);
    } catch (error) {
      console.error('Failed to fetch transfer roles:', error);
    }
  };

  const fetchTransferUsers = async (role?: string) => {
    try {
      const url = role && role !== 'all'
        ? `/api/support/transfer-users?role=${role}`
        : '/api/support/transfer-users';

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setTransferUsers(data.data.users);
    } catch (error) {
      console.error('Failed to fetch transfer users:', error);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTicket || !selectedUser) return;

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
      if (!response.ok) throw new Error(data.message || 'Failed to transfer ticket');

      toast({
        title: "Success",
        description: "Ticket transferred successfully",
      });

      setTransferDialogOpen(false);
      setSelectedUser('');
      setSelectedRole('all');
      setSheetOpen(false);
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

  if (!canViewTickets) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage and respond to customer support requests
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Tickets</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All Tickets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticket ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket._id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewTicket(ticket)}>
                    <TableCell className="font-medium">#{ticket.ticketNumber}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.subject || 'No Subject'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{ticket.sender.profile.firstName} {ticket.sender.profile.lastName}</span>
                        <span className="text-xs text-muted-foreground">{ticket.sender.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.priority && (
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {ticket.lockedBy ? (
                        <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                          <Lock className="h-3 w-3" />
                          {ticket.lockedBy.profile?.firstName}
                        </div>
                      ) : ticket.assignedTo ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <User className="h-3 w-3" />
                          {ticket.assignedTo.profile?.firstName}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                            View Details
                          </DropdownMenuItem>
                          {(!ticket.lockedBy || ticket.lockedBy._id === user?.id) && (
                            <>
                              {canUpdateStatus && ticket.status === 'open' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(ticket._id, 'in_progress')}>
                                  {ticket.assignedTo ? 'Mark In Progress' : 'Accept'}
                                </DropdownMenuItem>
                              )}
                              {canUpdateStatus && ticket.status === 'in_progress' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(ticket._id, 'closed')}>
                                  Mark Closed
                                </DropdownMenuItem>
                              )}
                              {canUpdateStatus && (
                                <DropdownMenuItem onClick={() => handleTransferTicket(ticket)}>
                                  Transfer Ticket
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="py-2 px-3 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Ticket Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between mb-2">
              <Badge variant={getStatusBadgeVariant(selectedTicket?.status || 'open')}>
                {selectedTicket?.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                #{selectedTicket?.ticketNumber}
              </span>
            </div>
            <SheetTitle className="text-xl text-left">
              {selectedTicket?.subject || 'Support Request'}
            </SheetTitle>
            <SheetDescription className="text-left flex items-center gap-2 mt-1">
              <User className="h-4 w-4" />
              {selectedTicket?.sender.profile.firstName} {selectedTicket?.sender.profile.lastName}
              <span className="text-xs text-muted-foreground ml-2">
                {selectedTicket && new Date(selectedTicket.createdAt).toLocaleString()}
              </span>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Original Message */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <p className="text-sm leading-relaxed">{selectedTicket?.message}</p>
                {selectedTicket?.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {selectedTicket.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs bg-background p-2 rounded border hover:bg-accent transition-colors"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[150px] truncate">{att.filename}</span>
                        <Download className="h-3 w-3 ml-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversation History */}
              {selectedTicket?.responses && selectedTicket.responses.length > 0 && (
                <div className="space-y-4">
                  <div className="relative flex items-center gap-4">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-muted-foreground font-medium uppercase">History</span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  {selectedTicket.responses.map((response, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${response.isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={response.isAdmin ? 'bg-primary text-primary-foreground' : ''}>
                          {response.author[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col max-w-[80%] ${response.isAdmin ? 'items-end' : 'items-start'
                          }`}
                      >
                        <div
                          className={`p-3 rounded-lg text-sm ${response.isAdmin
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted rounded-tl-none'
                            }`}
                        >
                          {response.message}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {new Date(response.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            {(!selectedTicket?.lockedBy || selectedTicket.lockedBy._id === user?.id) ? (
              <div className="space-y-4">
                {canReply && (
                  <>
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {canUpdateStatus && selectedTicket?.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedTicket._id, 'in_progress')}
                          >
                            {selectedTicket.assignedTo ? 'Mark In Progress' : 'Accept'}
                          </Button>
                        )}
                        {canUpdateStatus && selectedTicket?.status === 'in_progress' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedTicket._id, 'closed')}
                          >
                            Mark Closed
                          </Button>
                        )}
                      </div>
                      <Button onClick={handleSendReply} disabled={actionLoading || !replyMessage.trim()}>
                        {actionLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-800 rounded-md text-sm">
                <Lock className="h-4 w-4" />
                This ticket is locked by {selectedTicket?.lockedBy.profile?.firstName}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Ticket</DialogTitle>
            <DialogDescription>
              Assign this ticket to another team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Filter by Role</Label>
              <Select value={selectedRole} onValueChange={(val) => {
                setSelectedRole(val);
                setSelectedUser('');
                fetchTransferUsers(val);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {transferRoles.map((role) => (
                    <SelectItem key={role._id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTransferUsers.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.profile?.firstName} {u.profile?.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmTransfer} disabled={actionLoading || !selectedUser}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
