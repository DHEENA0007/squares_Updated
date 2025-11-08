import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Send, 
  Search,
  Filter,
  MoreVertical,
  Clock,
  CheckCheck,
  Eye,
  Trash2,
  Reply,
  Forward,
  Ban,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  UserCheck,
  UserX,
  Archive,
  Star,
  StarOff,
  Loader2,
  RefreshCw,
  Circle,
  Check
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  adminMessageService, 
  type AdminMessage, 
  type MessageStats, 
  type MessageFilters 
} from "@/services/adminMessageService";
import { useRealtime, useMessagingRealtime } from "@/contexts/RealtimeContext";
import { messageService, type UserStatus } from "@/services/messageService";

const AdminMessages = () => {
  const { isConnected } = useRealtime();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<AdminMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    hasNext: false,
    hasPrev: false,
    limit: 20
  });

  // Realtime messaging events
  useMessagingRealtime({
    refreshConversations: () => {
      loadMessages();
    },
    onNewMessage: (newMsg) => {
      loadMessages();
      loadStats();
    },
    onMessageRead: () => {
      loadMessages();
      loadStats();
    }
  });

  // Load messages and stats
  useEffect(() => {
    loadMessages();
    loadStats();
  }, []);

  // Load user statuses
  useEffect(() => {
    if (messages.length > 0) {
      loadUserStatuses();
      const interval = setInterval(loadUserStatuses, 10000);
      return () => clearInterval(interval);
    }
  }, [messages]);

  // Load user statuses for all message senders
  const loadUserStatuses = async () => {
    const statuses: Record<string, UserStatus> = {};
    const uniqueUserIds = new Set(messages.map(msg => msg.sender._id));
    
    for (const userId of uniqueUserIds) {
      try {
        const status = await messageService.getUserStatus(userId);
        statuses[userId] = status;
      } catch (error) {
        console.error(`Failed to load status for user ${userId}:`, error);
      }
    }
    
    setUserStatuses(statuses);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing with debounce
  const handleTypingChange = (value: string) => {
    setReplyText(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim() && selectedMessage) {
      if (!isTyping) {
        setIsTyping(true);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    } else {
      setIsTyping(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Load messages with current filters
  const loadMessages = async (filters: MessageFilters = {}) => {
    try {
      setLoading(true);
      
      const mergedFilters = {
        page: pagination.currentPage,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: searchTerm || undefined,
        ...filters
      };

      const response = await adminMessageService.getMessages(mergedFilters);
      
      if (response.success) {
        setMessages(response.data.messages);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminMessageService.getMessageStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load message stats:", error);
    }
  };

  // Reload messages when filters change
  useEffect(() => {
    loadMessages();
  }, [activeTab, statusFilter, typeFilter, priorityFilter, searchTerm, pagination.currentPage]);

  // Filter messages based on active tab
  useEffect(() => {
    let filtered = messages;

    // Filter by tab
    switch (activeTab) {
      case "unread":
        filtered = filtered.filter(msg => msg.status === 'unread');
        break;
      case "flagged":
        filtered = filtered.filter(msg => msg.status === 'flagged');
        break;
      case "inquiries":
        filtered = filtered.filter(msg => ['inquiry', 'lead', 'property_inquiry'].includes(msg.type));
        break;
      case "support":
        filtered = filtered.filter(msg => ['support', 'complaint'].includes(msg.type));
        break;
    }

    setFilteredMessages(filtered);
  }, [messages, activeTab]);

  const getSenderName = (message: AdminMessage) => {
    return adminMessageService.getSenderName(message);
  };

  const getRecipientName = (message: AdminMessage) => {
    return adminMessageService.getRecipientName(message);
  };

  const formatDate = (dateString: string) => {
    return adminMessageService.formatDate(dateString);
  };

  const getStatusColor = (status: string) => {
    return adminMessageService.getStatusColor(status);
  };

  const getPriorityColor = (priority: string) => {
    return adminMessageService.getPriorityColor(priority);
  };

  const markAsRead = async (messageId: string) => {
    try {
      await adminMessageService.updateMessageStatus(messageId, 'read');
      loadMessages(); // Refresh messages
      loadStats(); // Refresh stats
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const flagMessage = async (messageId: string) => {
    try {
      await adminMessageService.updateMessageStatus(messageId, 'flagged');
      loadMessages();
      loadStats();
    } catch (error) {
      console.error("Failed to flag message:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await adminMessageService.deleteMessage(messageId);
      if (selectedMessage?._id === messageId) {
        setSelectedMessage(null);
      }
      loadMessages();
      loadStats();
      setMessageToDelete(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
      }
      
      await adminMessageService.sendReply(selectedMessage._id, replyText.trim());
      setReplyText("");
      loadMessages();
      loadStats();
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time messaging active' : 'Offline mode'}
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading messages...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Manage and respond to user messages and inquiries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadMessages()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalMessages}
              </div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.unreadMessages}
              </div>
              <div className="text-sm text-muted-foreground">Unread</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.repliedMessages}
              </div>
              <div className="text-sm text-muted-foreground">Replied</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.flaggedMessages}
              </div>
              <div className="text-sm text-muted-foreground">Flagged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.todayMessages}
              </div>
              <div className="text-sm text-muted-foreground">Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">
                {stats.responseRate}%
              </div>
              <div className="text-sm text-muted-foreground">Response Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {stats.avgResponseTime}
              </div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Interface */}
      <div className="h-[calc(100vh-16rem)] flex gap-6">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-border">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All {stats && stats.totalMessages > 0 && (
                  <Badge className="ml-1 text-xs" variant="secondary">{stats.totalMessages}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread {stats && stats.unreadMessages > 0 && (
                  <Badge className="ml-1 text-xs bg-red-500 text-white">{stats.unreadMessages}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="flagged" className="text-xs">
                Flagged {stats && stats.flaggedMessages > 0 && (
                  <Badge className="ml-1 text-xs bg-orange-500 text-white">{stats.flaggedMessages}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="property_inquiry">Property</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Messages List */}
          <ScrollArea className="h-[calc(100%-12rem)]">
            <div className="p-2 space-y-1">
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedMessage?._id === message._id ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (message.status === 'unread') {
                      markAsRead(message._id);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={message.sender.profile?.avatar} />
                        <AvatarFallback>
                          {getSenderName(message).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {userStatuses[message.sender._id]?.isOnline ? (
                        <div title="Online">
                          <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                        </div>
                      ) : (
                        <div title={`Last seen ${userStatuses[message.sender._id]?.lastSeen ? messageService.formatTime(userStatuses[message.sender._id].lastSeen) : 'recently'}`}>
                          <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-gray-400 text-gray-400 border-2 border-background rounded-full" />
                        </div>
                      )}
                      {message.status === 'unread' && (
                        <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-red-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">
                          {getSenderName(message)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      
                      {message.subject && (
                        <p className="text-xs font-medium text-primary mb-1 truncate">
                          {message.subject}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground truncate">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-1">
                          <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(message.status)}`}>
                            {message.status}
                          </Badge>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => flagMessage(message._id)}>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Flag
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onSelect={(e) => {
                                e.preventDefault();
                                setMessageToDelete(message._id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedMessage.sender.profile?.avatar} />
                        <AvatarFallback>
                          {getSenderName(selectedMessage).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {userStatuses[selectedMessage.sender._id]?.isOnline ? (
                        <div title="Online">
                          <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                        </div>
                      ) : (
                        <div title={`Last seen ${userStatuses[selectedMessage.sender._id]?.lastSeen ? messageService.formatTime(userStatuses[selectedMessage.sender._id].lastSeen) : 'recently'}`}>
                          <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-gray-400 text-gray-400 border-2 border-background rounded-full" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {getSenderName(selectedMessage)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {userStatuses[selectedMessage.sender._id]?.isOnline 
                          ? 'Online' 
                          : `Last seen ${userStatuses[selectedMessage.sender._id]?.lastSeen ? messageService.formatTime(userStatuses[selectedMessage.sender._id].lastSeen) : 'recently'}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(selectedMessage.priority)}>
                      {selectedMessage.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedMessage.status)}>
                      {selectedMessage.status}
                    </Badge>
                  </div>
                </div>
                
                {/* Property Info */}
                {selectedMessage.property && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Related Property:</p>
                    <p className="text-xs text-muted-foreground">{selectedMessage.property.title}</p>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Original Message */}
                  <div className="flex justify-start">
                    <div className="max-w-[70%] bg-muted p-3 rounded-lg">
                      {selectedMessage.subject && (
                        <p className="font-medium text-sm mb-2">{selectedMessage.subject}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(selectedMessage.createdAt)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {selectedMessage.type?.replace('_', ' ') || 'general'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin replies would go here */}
                  {/* TODO: Load and display conversation replies */}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex justify-start animate-fadeIn">
                      <div className="bg-muted/80 px-4 py-2 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground italic">
                            {getSenderName(selectedMessage)} is typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-4 border-t border-border">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={sendReply} 
                      disabled={!replyText.trim()}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </Button>
                    <Button variant="outline" onClick={() => setReplyText("")}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
                  Choose a message from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!messageToDelete} 
        onOpenChange={(open) => {
          if (!open) {
            setMessageToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setMessageToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (messageToDelete) {
                  deleteMessage(messageToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMessages;