import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  MoreVertical,
  Paperclip,
  Image,
  Clock,
  Check,
  CheckCheck,
  Star,
  Archive,
  Trash,
  Circle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { messageService, type Message, type Conversation, type UserStatus } from "@/services/messageService";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const VendorMessages = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [searchQuery]);

  // Load user statuses when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      loadUserStatuses();
      
      // Refresh statuses every 10 seconds
      const statusInterval = setInterval(loadUserStatuses, 10000);
      return () => clearInterval(statusInterval);
    }
  }, [conversations]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
      if (isMobile) {
        setShowConversations(false);
      }
    }
  }, [selectedChat]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const filters = {
        page: 1,
        limit: 50,
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await messageService.getConversations(filters);
      setConversations(response.conversations);
      
      // Auto-select first conversation if none selected
      if (!selectedChat && response.conversations.length > 0) {
        setSelectedChat(response.conversations[0].id || response.conversations[0]._id || '');
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      // Auto-mark messages as read when opening conversation
      const response = await messageService.getConversationMessages(conversationId, 1, 50, true);
      
      if (response) {
        setMessages(response.messages);
        
        // Update active status to online when opening conversation
        await messageService.updateActiveStatus(conversationId, 'online');
        
        // Refresh conversations to update unread count
        loadConversations();
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load user statuses for all conversations
  const loadUserStatuses = async () => {
    const statuses: Record<string, UserStatus> = {};
    
    for (const conv of conversations) {
      try {
        const status = await messageService.getUserStatus(conv.otherUser._id);
        statuses[conv.otherUser._id] = status;
      } catch (error) {
        console.error(`Failed to load status for user ${conv.otherUser._id}:`, error);
      }
    }
    
    setUserStatuses(statuses);
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedChat) return;

    const activeConversation = conversations.find(c => (c.id || c._id) === selectedChat);
    if (!activeConversation) return;

    try {
      setIsUploading(true);
      
      // Clear typing status before sending
      await messageService.updateActiveStatus(selectedChat, 'online');
      
      // Upload attachments first
      const uploadedAttachments = [];
      for (const file of selectedFiles) {
        const uploaded = await messageService.uploadAttachment(file);
        uploadedAttachments.push(uploaded);
      }

      const sentMessage = await messageService.sendMessage(
        selectedChat, 
        newMessage.trim() || "(Attachment)",
        activeConversation.otherUser._id,
        uploadedAttachments
      );
      
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
      setSelectedFiles([]);
      
      // Update last message in conversations list
      setConversations(prev =>
        prev.map(conv =>
          (conv.id || conv._id) === selectedChat
            ? { ...conv, lastMessage: { _id: sentMessage._id, message: sentMessage.message, createdAt: sentMessage.createdAt, isFromMe: true }, updatedAt: sentMessage.createdAt }
            : conv
        )
      );

      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive"
        });
        continue;
      }

      // Validate file type
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
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle typing status
  const handleTypingStart = async () => {
    if (selectedChat) {
      await messageService.updateActiveStatus(selectedChat, 'typing');
    }
  };

  const handleTypingStop = async () => {
    if (selectedChat) {
      await messageService.updateActiveStatus(selectedChat, 'online');
    }
  };

  // Debounced typing indicators
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;

    if (newMessage.trim()) {
      // User is typing
      handleTypingStart();
      
      // Clear previous timer
      if (typingTimer) clearTimeout(typingTimer);
      
      // Set timer to stop typing status after 2 seconds of inactivity
      typingTimer = setTimeout(() => {
        handleTypingStop();
      }, 2000);
    } else {
      // User cleared message, stop typing immediately
      handleTypingStop();
    }

    return () => {
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, [newMessage]);

  // Set offline status when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      if (selectedChat) {
        messageService.updateActiveStatus(selectedChat, 'offline');
      }
    };
  }, [selectedChat]);

  const handleDeleteConversation = async (conversationId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await messageService.deleteConversation(conversationId);
        setConversations(prev => prev.filter(conv => (conv.id || conv._id) !== conversationId));
        
        if (selectedChat === conversationId) {
          setSelectedChat(null);
          setMessages([]);
        }

        toast({
          title: "Success",
          description: "Conversation deleted successfully!",
        });
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        toast({
          title: "Error",
          description: "Failed to delete conversation. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      try {
        await messageService.deleteMessage(messageId);
        
        // Remove from local state
        setMessages(prev => prev.filter(msg => msg._id !== messageId));

        toast({
          title: "Success",
          description: "Message deleted successfully!",
        });
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast({
          title: "Error",
          description: "Failed to delete message. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    // Return the otherUser from the conversation
    return conversation.otherUser;
  };

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered": return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read": return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const selectedConversation = conversations.find(conv => (conv.id || conv._id) === selectedChat);
  const otherParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const otherParticipant = getOtherParticipant(conv);
    if (!otherParticipant) return false;
    
    const participantName = otherParticipant.name || 'Unknown User';
    return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.lastMessage?.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.property?.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-0 relative top-[60px]">
      {/* Mobile Back Button */}
      {isMobile && !showConversations && (
        <div className="md:hidden p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConversations(true)}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Messages
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${isMobile && !showConversations ? 'hidden' : ''}`}>
        <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h2 className={`font-semibold mb-3 text-foreground ${isMobile ? 'text-xl' : 'text-lg'}`}>Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${isMobile ? 'h-11 text-base' : 'h-9'}`}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const participantName = otherParticipant?.name || 'Unknown User';
              const conversationId = conversation.id || conversation._id || '';
              
              return (
              <div
                key={conversationId}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                  selectedChat === conversationId ? 'bg-accent border-l-4 border-primary' : ''
                }`}
                onClick={() => setSelectedChat(conversationId)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {participantName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status indicator */}
                    {userStatuses[otherParticipant._id]?.isOnline ? (
                      <div title="Online" className="absolute -bottom-0.5 -right-0.5">
                        <Circle className="w-3.5 h-3.5 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                      </div>
                    ) : (
                      <div title={`Last seen ${userStatuses[otherParticipant._id]?.lastSeen ? messageService.formatTime(userStatuses[otherParticipant._id].lastSeen) : 'recently'}`} className="absolute -bottom-0.5 -right-0.5">
                        <Circle className="w-3.5 h-3.5 fill-gray-400 text-gray-400 border-2 border-background rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h4 className={`font-semibold truncate ${isMobile ? 'text-base' : 'text-sm'}`}>{participantName}</h4>
                        {/* Online status text */}
                        {userStatuses[otherParticipant._id]?.isOnline && (
                          <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">● Online</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.lastMessage?.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-[20px] flex items-center justify-center px-1.5">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Show last seen if offline */}
                    {userStatuses[otherParticipant._id] && !userStatuses[otherParticipant._id]?.isOnline && (
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        Last seen {userStatuses[otherParticipant._id]?.lastSeen 
                          ? messageService.formatTime(userStatuses[otherParticipant._id].lastSeen)
                          : 'recently'}
                      </p>
                    )}
                    
                    {conversation.property && (
                      <p className="text-xs text-muted-foreground mb-1.5 truncate font-medium">
                        📍 {conversation.property?.title || 'General inquiry'}
                      </p>
                    )}
                    
                    <p className={`text-muted-foreground truncate line-clamp-1 ${isMobile ? 'text-base' : 'text-sm'}`}>
                      {conversation.lastMessage?.isFromMe && (
                        <span className="text-primary font-medium mr-1">You:</span>
                      )}
                      {conversation.lastMessage?.message}
                    </p>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${isMobile && showConversations ? 'hidden' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isMobile ? 'sticky top-0 z-10' : 'sticky top-0 z-10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {otherParticipant?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status indicator */}
                    {userStatuses[otherParticipant?._id]?.isOnline ? (
                      <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                    ) : (
                      <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-gray-400 text-gray-400 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold truncate ${isMobile ? 'text-lg' : 'text-base'}`}>{otherParticipant?.name || 'Unknown User'}</h3>
                    {/* Online status text */}
                    {userStatuses[otherParticipant?._id] && (
                      <p className="text-xs text-muted-foreground">
                        {userStatuses[otherParticipant._id]?.isOnline ? (
                          <span className="text-green-600 font-medium">● Active now</span>
                        ) : (
                          <span>
                            Last seen {userStatuses[otherParticipant._id]?.lastSeen 
                              ? messageService.formatTime(userStatuses[otherParticipant._id].lastSeen)
                              : 'recently'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {otherParticipant?.phone ? (
                    isMobile ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isMobile ? 'h-11 w-11' : 'h-9 w-9'} p-0`}
                    title="Call"
                    onClick={() => window.location.href = `tel:${otherParticipant.phone}`}
                  >
                    <Phone className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  </Button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isMobile ? 'h-11 w-11' : 'h-9 w-9'} p-0`}
                    title="View phone number"
                  >
                    <Phone className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Phone Number</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-semibold">{otherParticipant.phone}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(otherParticipant.phone || '');
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
                    )
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-9 w-9 p-0" 
                      title="No phone number available"
                      disabled
                    >
                      <Phone className="w-4 h-4 opacity-50" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className={`${isMobile ? 'h-11 w-11' : 'h-9 w-9'} p-0`}>
                    <MoreVertical className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
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
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteConversation(selectedConversation.id || selectedConversation._id || '')}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Property Info */}
              {selectedConversation.property && (
                <div className="mt-3 p-3 bg-accent/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-8 bg-primary rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedConversation.property.title}</p>
                      <p className="text-xs text-muted-foreground">₹{selectedConversation.property.price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-muted/20">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    // Check if current user is the sender
                    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
                    const isOwnMessage = user?.id === senderId;
                    
                    return (
                      <div
                        key={message._id}
                        className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
                      >
                        <div
                          className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-background border border-border rounded-bl-sm'
                          }`}
                        >
                        <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isMobile ? 'text-base' : ''}`}>{message.message}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2.5 space-y-2">
                            {message.attachments.map((attachment, idx) => (
                              <div key={idx}>
                                {attachment.type === 'image' ? (
                                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.name}
                                      className="max-w-full rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                      style={{ maxHeight: '250px' }}
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                                      isOwnMessage
                                        ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                                        : 'border-border bg-muted/50 hover:bg-muted'
                                    }`}
                                  >
                                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm truncate">{attachment.name}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-between mt-1.5 gap-2 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px]">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isOwnMessage && getStatusIcon(message.status)}
                            {isOwnMessage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                                    title="Message options"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteMessage(message._id)}
                                  >
                                    <Trash className="w-4 h-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-background border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {otherParticipant?.name} is typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className={`p-4 border-t border-border bg-background ${isMobile ? 'pb-safe' : ''}`}>
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-accent px-3 py-2 rounded-lg border border-border">
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} p-0 hover:bg-destructive/10`}
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isMobile ? 'h-12 w-12' : 'h-10 w-10'} p-0`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="Attach document"
                  >
                    <Paperclip className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isMobile ? 'h-12 w-12' : 'h-10 w-10'} p-0`}
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    title="Attach image"
                  >
                    <Image className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`min-h-[56px] max-h-[120px] resize-none rounded-xl ${isMobile ? 'text-base' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isUploading}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
                  className={`${isMobile ? 'h-12 w-12' : 'h-10 w-10'} p-0 rounded-full`}
                  title="Send message"
                >
                  {isUploading ? <Clock className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} animate-spin`} /> : <Send className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center px-4">
              <div className="mb-4 inline-flex p-4 bg-primary/10 rounded-full">
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground max-w-sm">
                Choose a conversation from the list to start messaging with your clients
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMessages;