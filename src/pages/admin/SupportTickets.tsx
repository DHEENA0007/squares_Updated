import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, User, Calendar, Clock, CheckCircle, AlertCircle, Search, Filter, Paperclip, Download } from "lucide-react";

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'closed';
  category: string;
  user: {
    name: string;
    email: string;
  };
  assignedTo?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  responses: Array<{
    message: string;
    author: string;
    createdAt: string;
    isAdmin: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

const SupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const fetchSupportTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        search: searchTerm,
      });

      const response = await fetch(`/api/admin/support/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error('Failed to fetch support tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportTickets();
  }, [statusFilter, priorityFilter, searchTerm]);

  const handleTicketResponse = async (ticketId: string) => {
    if (!responseMessage.trim()) return;

    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: responseMessage
        })
      });

      if (response.ok) {
        setResponseMessage("");
        fetchSupportTickets();
        // Refresh selected ticket
        if (selectedTicket && selectedTicket._id === ticketId) {
          const updatedResponse = await fetch(`/api/admin/support/tickets/${ticketId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json();
            setSelectedTicket(updatedData.ticket);
          }
        }
      }
    } catch (error) {
      console.error('Failed to respond to ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        fetchSupportTickets();
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return AlertCircle;
      case 'in_progress':
        return Clock;
      case 'closed':
        return CheckCircle;
      default:
        return MessageSquare;
    }
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
          <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Handle customer complaints and support requests
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          {tickets.length} Total Tickets
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => {
          const StatusIcon = getStatusIcon(ticket.status);
          return (
            <Card key={ticket._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <StatusIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            Ticket #{ticket.ticketNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {ticket.description}
                    </p>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        <span>{ticket.attachments.length} attachment{ticket.attachments.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{ticket.user.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                        {ticket.responses.length > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{ticket.responses.length} responses</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              View & Respond
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Ticket #{ticket.ticketNumber} - {ticket.subject}</DialogTitle>
                            </DialogHeader>

                            {selectedTicket && (
                              <div className="space-y-4">
                                {/* Ticket Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <h4 className="font-semibold text-sm">Customer</h4>
                                    <p className="text-sm">{selectedTicket.user.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedTicket.user.email}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">Status</h4>
                                    <Select
                                      value={selectedTicket.status}
                                      onValueChange={(value) => handleStatusChange(selectedTicket._id, value)}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Original Message */}
                                <div className="p-4 border rounded-lg">
                                  <h4 className="font-semibold text-sm mb-2">Original Message</h4>
                                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>

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

                                {/* Conversation */}
                                {selectedTicket.responses.length > 1 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">Conversation</h4>
                                    {selectedTicket.responses.slice(1).map((response, index) => (
                                      <div
                                        key={index}
                                        className={`p-3 rounded-lg ${response.isAdmin
                                            ? 'bg-blue-50 border-l-4 border-blue-500 ml-4'
                                            : 'bg-gray-50 border-l-4 border-gray-500 mr-4'
                                          }`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-sm font-semibold">
                                            {response.isAdmin ? 'Support Team' : selectedTicket.user.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(response.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Response Form */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold">Add Response</h4>
                                  <Textarea
                                    placeholder="Type your response here..."
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    rows={4}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Save Draft</Button>
                                    <Button onClick={() => handleTicketResponse(selectedTicket._id)}>
                                      Send Response
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleStatusChange(ticket._id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Support Tickets</h3>
              <p className="text-muted-foreground">
                No support tickets match your current filters.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupportTickets;
