/**
 * BaseMessages Component
 * Unified messaging interface for customer, vendor, and admin roles
 * Eliminates code duplication across role-specific message pages
 */

import { useState, useEffect, useRef } from "react";
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
  Archive,
  ArrowLeft,
  Info
} from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMessagingRealtime } from "@/contexts/RealtimeContext";
import { unifiedMessageService } from "@/services/unifiedMessageService";
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, otherUserTyping]);

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

      const attachments: Array<{ type: 'image' | 'document'; url: string; name: string; size?: number }> = [];

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

  const handleArchiveConversation = async (conversation: Conversation, isArchived: boolean) => {
    const conversationId = conversation.id || conversation._id || '';

    // Calculate new status: if unarchiving, check if it has unread messages
    // If archiving, set to 'archived'
    const newStatus = !isArchived
      ? 'archived'
      : (conversation.unreadCount > 0 ? 'unread' : 'read');

    try {
      // Update status on backend
      await unifiedMessageService.updateConversationStatus(conversationId, newStatus);

      // If this was the selected conversation, deselect it
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        if (isMobile) {
          setShowConversationList(true);
        }
      }

      // Remove from current view immediately (Optimistic UI)
      setConversations(prev => prev.filter(conv => (conv.id || conv._id) !== conversationId));

      toast({
        title: !isArchived ? "Conversation archived" : "Conversation unarchived",
        description: !isArchived ? "Moved to archived chats" : "Moved to main chat list",
        action: (
          <ToastAction
            altText="Undo"
            onClick={() => handleArchiveConversation(conversation, !isArchived)}
          >
            Undo
          </ToastAction>
        ),
      });

      // Reload conversations in background to sync with server
      setTimeout(() => loadConversations(), 500);
    } catch (error) {
      console.error('Failed to archive/unarchive conversation:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation status",
        variant: "destructive",
      });
      // Reload conversations to ensure UI is in sync
      loadConversations();
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
    <div className="flex h-[calc(100vh-4rem)] pt-0 bg-background overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className={`${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r bg-muted/10`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              Messages
              {totalUnreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {totalUnreadCount}
                </Badge>
              )}
            </h1>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 bg-muted/50 border-none rounded-full h-9 focus-visible:ring-1 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {/* Archived Chats Button (WhatsApp style) */}
            {statusFilter !== 'archived' && (
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 border-b border-border/40 transition-colors"
                onClick={() => setStatusFilter('archived')}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/80">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">Archived</h3>
                  <p className="text-xs text-muted-foreground">View archived chats</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start by sending a message to a property</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const participantName = otherParticipant.name || 'Unknown User';
                const conversationId = conversation.id || conversation._id || '';
                const isSelected = selectedConversation === conversationId;

                return (
                  <div
                    key={conversationId}
                    className={`group flex items-start gap-3 p-4 cursor-pointer transition-all border-b border-border/40 hover:bg-muted/50 ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                      }`}
                    onClick={() => setSelectedConversation(conversationId)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {participantName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {userStatuses[otherParticipant._id]?.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {participantName}
                        </h3>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {unifiedMessageService.formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>

                      {showPropertyInfo && conversation.property && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground/80">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{conversation.property.title}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate flex-1 ${conversation.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {conversation.lastMessage.isFromMe && <span className="mr-1">You:</span>}
                          {conversation.lastMessage.message}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px] rounded-full">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`${isMobile ? (!showConversationList ? 'flex' : 'hidden') : 'flex'} flex-1 flex-col bg-background relative`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background/95 backdrop-blur z-10 shadow-sm">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConversationList(true)}
                    className="-ml-2 hover:bg-muted/50 rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="relative">
                  <Avatar className="w-10 h-10 border shadow-sm">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getOtherParticipant(activeConversation).name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {userStatuses[getOtherParticipant(activeConversation)._id]?.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-sm md:text-base leading-none mb-1">
                    {getOtherParticipant(activeConversation).name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {userStatuses[getOtherParticipant(activeConversation)._id]?.isOnline ? (
                      <span className="text-green-600 font-medium">Active now</span>
                    ) : userStatuses[getOtherParticipant(activeConversation)._id]?.lastSeen ? (
                      <span>Last seen {unifiedMessageService.formatTime(userStatuses[getOtherParticipant(activeConversation)._id].lastSeen)}</span>
                    ) : (
                      <span>Offline</span>
                    )}
                    {showPropertyInfo && activeConversation.property && (
                      <>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                        <span className="truncate max-w-[150px]">{activeConversation.property.title}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {getOtherParticipant(activeConversation).phone && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                        <Phone className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="end">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Contact Number</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold">{getOtherParticipant(activeConversation).phone}</p>
                          <Button
                            size="sm"
                            variant="secondary"
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

                {enableDeletion && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleArchiveConversation(activeConversation, activeConversation.status === 'archived')}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {activeConversation.status === 'archived' ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteConversation(activeConversation.id || activeConversation._id || '')}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-muted/5" ref={scrollAreaRef}>
              <div className="p-4 space-y-6">
                {messages.map((message, index) => {
                  const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
                  const isOwnMessage = user?.id === senderId;
                  const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].sender !== message.sender);

                  return (
                    <div
                      key={message._id}
                      className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] md:max-w-[70%] gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isOwnMessage && (
                          <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                            {showAvatar ? (
                              <Avatar className="w-8 h-8 border">
                                <AvatarImage src={undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {getOtherParticipant(activeConversation).name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ) : <div className="w-8" />}
                          </div>
                        )}

                        <div className={`group relative px-4 py-3 shadow-sm ${isOwnMessage
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                          : 'bg-card border text-foreground rounded-2xl rounded-tl-sm'
                          }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {unifiedMessageService.getMessageContent(message)}
                          </p>

                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.attachments.map((attachment, idx) => (
                                <div key={idx}>
                                  {attachment.type === 'image' ? (
                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-w-full rounded-lg border border-border/20 cursor-pointer hover:opacity-95 transition-opacity"
                                        style={{ maxHeight: '250px' }}
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-3 p-3 rounded-lg border ${isOwnMessage
                                        ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20'
                                        : 'border-border bg-muted/50 hover:bg-muted'
                                        } transition-colors`}
                                    >
                                      <div className="bg-background p-2 rounded-md">
                                        <Paperclip className={`w-4 h-4 ${isOwnMessage ? 'text-primary' : 'text-muted-foreground'}`} />
                                      </div>
                                      <span className="text-sm truncate font-medium underline decoration-dotted underline-offset-4">
                                        {attachment.name}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={`flex items-center justify-end gap-1 mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            <span className="text-[10px]">
                              {unifiedMessageService.formatTime(message.createdAt || message.timestamp)}
                            </span>
                            {isOwnMessage && (
                              message.read ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <CheckCheck className="w-3 h-3 opacity-50" />
                              )
                            )}
                          </div>

                          {enableDeletion && isOwnMessage && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-black/10 rounded-full"
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
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <Avatar className="w-8 h-8 border mb-1">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getOtherParticipant(activeConversation).name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-card border p-3 rounded-2xl rounded-tl-sm shadow-sm">
                        <div className="flex gap-1.5 items-center h-4">
                          <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg border animate-in fade-in slide-in-from-bottom-2">
                      <div className="p-1.5 bg-background rounded-md border">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <span className="text-sm truncate max-w-[200px] font-medium">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-[24px] border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/20 transition-all shadow-sm">
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

                <div className="flex gap-1 mb-1 ml-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || sending}
                    title="Attach document"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading || sending}
                    title="Attach image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                </div>

                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-2 bg-transparent border-none shadow-none resize-none focus-visible:ring-0 text-base"
                  disabled={sending || isUploading}
                />

                <Button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || isUploading}
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0 mb-0.5"
                >
                  {sending || isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground bg-muted/5">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Your Messages</h3>
            <p className="max-w-xs text-center text-sm">
              Select a conversation from the list to start chatting or send a new message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseMessages;
