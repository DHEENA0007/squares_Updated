/**
 * BaseMessages Component
 * Unified messaging interface for customer, vendor, and admin roles
 * Eliminates code duplication across role-specific message pages
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Phone,
  MapPin,
  CheckCheck,
  Search,
  MoreVertical,
  Paperclip,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
  Star,
  Archive,
  ArrowLeft
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMessagingRealtime } from "@/contexts/RealtimeContext";
import { unifiedMessageService } from "@/services/unifiedMessageService";
import { socketService } from "@/services/socketService";
import { type Conversation, type Message, type UserStatus } from "@/services/messageService";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface BaseMessagesProps {
  role: 'customer' | 'vendor' | 'admin' | 'subadmin';
  pageTitle?: string;
  pageDescription?: string;
  showPropertyInfo?: boolean;
  enableDeletion?: boolean;
}

export const BaseMessages = ({
  role,
  pageTitle,
  pageDescription,
  showPropertyInfo = true,
  enableDeletion = true
}: BaseMessagesProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [showConversationList, setShowConversationList] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize unified message service
  useEffect(() => {
    if (user?.id) {
      unifiedMessageService.initialize({ role, userId: user.id });
    }
  }, [role, user]);

  // Messaging events with real-time updates
  useMessagingRealtime({
    refreshConversations: () => {
      loadConversations();
    },
    onNewMessage: (newMsg) => {
      if (newMsg.conversationId === selectedConversation) {
        loadMessages(selectedConversation);
      }
      loadConversations();
    },
    onMessageRead: (data) => {
      // Update read status in real-time via Socket.IO
      if (data.conversationId === selectedConversation) {
        // Update specific message as read in local state
        setMessages(prev =>
          prev.map(msg =>
            msg._id === data.messageId
              ? { ...msg, read: true, isRead: true }
              : msg
          )
        );
      }
      // Refresh conversation list to update unread counts
      loadConversations();
    },
    onConversationRead: (data) => {
      // Mark all messages in conversation as read
      if (data.conversationId === selectedConversation) {
        setMessages(prev =>
          prev.map(msg => ({ ...msg, read: true, isRead: true }))
        );
      }
      loadConversations();
    },
    onTypingIndicator: (data) => {
      if (data.conversationId === selectedConversation && data.userId !== user?.id) {
        setOtherUserTyping(data.isTyping);
      }
    },
    onUserStatusChange: (data) => {
      setUserStatuses(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen
        }
      }));
    }
  });

  // Load conversations from API
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await unifiedMessageService.getConversations({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50
      });

      setConversations(response.conversations);

      // Calculate total unread count
      const unreadCount = response.conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setTotalUnreadCount(unreadCount);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      setMessages([]);
      const response = await unifiedMessageService.getConversationMessages(conversationId, 1, 50, true);

      if (response) {
        setMessages(response.messages);

        // Mark conversation as read via Socket.IO (real-time)
        unifiedMessageService.markConversationAsReadSocket(conversationId);

        // Refresh conversations to update unread counts
        loadConversations();
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  // Load initial user statuses
  const loadUserStatuses = async () => {
    const statuses: Record<string, UserStatus> = {};

    for (const conv of conversations) {
      try {
        const status = await unifiedMessageService.getUserStatus(conv.otherUser._id);
        statuses[conv.otherUser._id] = status;
      } catch (error) {
        console.error(`Failed to load status for user ${conv.otherUser._id}:`, error);
      }
    }

    setUserStatuses(statuses);
  };

  useEffect(() => {
    loadConversations();
  }, [statusFilter]);

  // Handle conversation selection
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      unifiedMessageService.joinConversation(selectedConversation);

      if (isMobile) {
        setShowConversationList(false);
      }
    } else {
      setMessages([]);
    }

    return () => {
      if (selectedConversation) {
        unifiedMessageService.leaveConversation(selectedConversation);
        unifiedMessageService.stopTyping(selectedConversation);
      }
    };
  }, [selectedConversation, isMobile]);

  // Load initial user statuses
  useEffect(() => {
    if (conversations.length > 0) {
      loadUserStatuses();
    }
  }, [conversations]);

  const activeConversation = conversations.find(c => (c.id || c._id) === selectedConversation);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      return;
    }

    if (!selectedConversation || !activeConversation) {
      return;
    }

    try {
      setSending(true);

      const attachments: Array<{type: 'image' | 'document'; url: string; name: string; size?: number}> = [];

      if (selectedFiles.length > 0) {
        setIsUploading(true);
        for (const file of selectedFiles) {
          try {
            const attachment = await unifiedMessageService.uploadAttachment(file);
            attachments.push(attachment);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
          }
        }
        setIsUploading(false);
      }

      const messageContent = newMessage.trim() || (attachments.length > 0 ? '[Attachment]' : '');

      const sentMessage = await unifiedMessageService.sendMessage(
        selectedConversation,
        messageContent,
        activeConversation.otherUser._id,
        attachments
      );

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
      setSelectedFiles([]);
      loadConversations();

    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Handle typing status with Socket.IO
  useEffect(() => {
    if (!selectedConversation) return;

    if (newMessage.trim()) {
      unifiedMessageService.startTyping(selectedConversation);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        unifiedMessageService.stopTyping(selectedConversation);
      }, 2000);
    } else {
      unifiedMessageService.stopTyping(selectedConversation);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [newMessage, selectedConversation]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive"
        });
        continue;
      }

      if (type === 'image') {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image`,
            variant: "destructive"
          });
          continue;
        }
      } else {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported document type`,
            variant: "destructive"
          });
          continue;
        }
      }

      validFiles.push(file);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!enableDeletion) return;

    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await unifiedMessageService.deleteConversation(conversationId);

        setConversations(prev => prev.filter(conv => (conv.id || conv._id) !== conversationId));

        if (selectedConversation === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }

        toast({
          title: "Success",
          description: "Conversation deleted successfully!",
        });
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!enableDeletion) return;

    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      try {
        await unifiedMessageService.deleteMessage(messageId);
        setMessages(prev => prev.filter(msg => msg._id !== messageId));

        toast({
          title: "Success",
          description: "Message deleted successfully!",
        });
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.otherUser || {
      _id: '',
      name: 'Unknown User',
      email: ''
    };
  };

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        loadConversations();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Backend now handles filtering, so we just use conversations directly
  const filteredConversations = conversations;

  return (
    <div className="flex flex-col h-screen pt-16">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-background">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              {pageTitle || unifiedMessageService.getConversationListTitle()}
              {totalUnreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-sm px-2 py-1 ml-2">
                  {totalUnreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {pageDescription || "Communicate with property agents and owners"}
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <Card className={`flex flex-col ${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'w-1/3 border-r'}`}>
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Badge variant="secondary">{conversations.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start by sending a message to a property</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    const participantName = otherParticipant.name || 'Unknown User';
                    const conversationId = conversation.id || conversation._id || '';

                    return (
                      <div
                        key={conversationId}
                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation === conversationId
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedConversation(conversationId)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={undefined} />
                              <AvatarFallback>
                                {participantName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{participantName}</p>
                                {userStatuses[otherParticipant._id]?.isOnline && (
                                  <span className="text-[10px] text-green-600 font-medium">● Online</span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {unifiedMessageService.formatTime(conversation.lastMessage.createdAt)}
                              </span>
                            </div>

                            {showPropertyInfo && conversation.property && (
                              <p className="text-xs text-primary font-medium mb-1 truncate">
                                {conversation.property.title}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.lastMessage.message}
                            </p>

                            <div className="flex items-center justify-between mt-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-primary text-white text-xs px-2 py-1">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              {enableDeletion && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Star className="w-4 h-4 mr-2" />
                                      Mark as Important
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Archive className="w-4 h-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConversation(conversationId);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Conversation
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={`flex flex-col ${isMobile ? (!showConversationList ? 'flex' : 'hidden') : 'flex-1'}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="flex-shrink-0 pb-3 border-b">
                {isMobile && (
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConversationList(true)}
                      className="p-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium">Back to Conversations</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={undefined} />
                        <AvatarFallback>
                          {getOtherParticipant(activeConversation).name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {getOtherParticipant(activeConversation).name}
                        </h3>
                        {userStatuses[getOtherParticipant(activeConversation)._id]?.isOnline && (
                          <span className="text-xs text-green-600 font-medium">● Active now</span>
                        )}
                      </div>
                      {showPropertyInfo && activeConversation.property && (
                        <p className="text-sm text-muted-foreground">{activeConversation.property.title}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {getOtherParticipant(activeConversation).phone && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" title="View phone number">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Phone Number</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-semibold">{getOtherParticipant(activeConversation).phone}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(getOtherParticipant(activeConversation).phone || '');
                                  toast({
                                    title: "Copied!",
                                    description: "Phone number copied to clipboard",
                                  });
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Property Info */}
              {showPropertyInfo && activeConversation.property && (
                <div className="flex-shrink-0 px-6 py-3 bg-muted/30 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{activeConversation.property.title}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ₹{activeConversation.property.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
                      const isOwnMessage = user?.id === senderId;

                      return (
                        <div
                          key={message._id}
                          className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} hover:bg-muted/30 rounded-lg p-1 transition-colors`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {unifiedMessageService.getMessageContent(message)}
                            </p>

                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment, idx) => (
                                  <div key={idx}>
                                    {attachment.type === 'image' ? (
                                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-w-full rounded border border-border cursor-pointer hover:opacity-90"
                                          style={{ maxHeight: '200px' }}
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded border ${
                                          isOwnMessage
                                            ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                                            : 'border-border bg-background hover:bg-muted'
                                        }`}
                                      >
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-sm truncate">{attachment.name}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs opacity-70">
                                  {unifiedMessageService.formatTime(message.createdAt || message.timestamp)}
                                </span>
                                {isOwnMessage && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">You</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {isOwnMessage && (
                                  <>
                                    {message.read ? (
                                      <CheckCheck className="w-3 h-3 text-blue-500" />
                                    ) : (
                                      <CheckCheck className="w-3 h-3 text-gray-400" />
                                    )}
                                    {enableDeletion && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                                            title="Message options"
                                          >
                                            <MoreVertical className="w-3 h-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => handleDeleteMessage(message._id)}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Message
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing Indicator */}
                    {otherUserTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-1">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-xs text-muted-foreground ml-2">
                              {getOtherParticipant(activeConversation).name} is typing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="flex-shrink-0 p-4 border-t">
                {selectedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileSelect(e, 'document')}
                    multiple
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'image')}
                    multiple
                  />

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || sending}
                      title="Attach document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploading || sending}
                      title="Attach image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="min-h-[40px] resize-none"
                      disabled={sending || isUploading}
                    />
                  </div>

                  <Button
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || isUploading}
                  >
                    {sending || isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the left to start messaging
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BaseMessages;
