import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeadphonesIcon, Clock, User, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import subAdminService from "@/services/subAdminService";

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
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

const SupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in-progress':
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
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Tickets</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
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
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {ticket.subject || 'Support Request'}
                      </CardTitle>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      {ticket.priority && (
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.sender.profile.firstName} {ticket.sender.profile.lastName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {ticket.sender.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                    <p className="text-sm leading-relaxed">{ticket.message}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Full Conversation
                  </Button>
                  <Button size="sm">
                    Reply
                  </Button>
                  {ticket.status === 'open' && (
                    <Button size="sm" variant="secondary">
                      Mark In Progress
                    </Button>
                  )}
                  {ticket.status === 'in-progress' && (
                    <Button size="sm" variant="secondary">
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
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">
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
    </div>
  );
};

export default SupportTickets;
