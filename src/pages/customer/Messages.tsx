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
  Video,
  MapPin,
  Clock,
  CheckCheck,
  Search,
  Filter,
  MoreVertical,
  Paperclip,
  Calendar,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
  Star,
  Archive
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRealtime, useMessagingRealtime } from "@/contexts/RealtimeContext";
import { messageService, type Conversation, type Message } from "@/services/messageService";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Messages = () => {
  const { isConnected } = useRealtime();
  const { user } = useAuth();
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
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Realtime messaging events
  useMessagingRealtime({
    refreshConversations: () => {
      console.log("Conversations updated via realtime");
      loadConversations();
    },
    onNewMessage: (newMsg) => {
      console.log("New message received:", newMsg);
      // If message is for current conversation, add it to messages
      if (selectedConversation && newMsg.conversationId === selectedConversation) {
        setMessages(prev => [...prev, newMsg]);
      }
      // Refresh conversations to update last message and unread count
      loadConversations();
    },
    onMessageRead: (data) => {
      console.log("Message read:", data);
      // Refresh conversations to update unread count
      loadConversations();
    }
  });

  // Load conversations from API
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversations({
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 50
      });
      
      setConversations(response.conversations);
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
      // Auto-mark messages as read when opening conversation
      const response = await messageService.getConversationMessages(conversationId, 1, 50, true);
      
      if (response) {
        setMessages(response.messages);
        
        // Update active status to online when opening conversation
        await messageService.updateActiveStatus(conversationId, 'online');
        
        // Refresh conversations to update unread counts
        loadConversations();
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };  useEffect(() => {
    loadConversations();
  }, [statusFilter]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  const activeConversation = conversations.find(c => (c.id || c._id) === selectedConversation);

    const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      return;
    }

    if (!selectedConversation) {
      console.error("No conversation selected");
      return;
    }

    try {
      setSending(true);

      let attachments: Array<{type: 'image' | 'document'; url: string; name: string; size?: number}> = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        for (const file of selectedFiles) {
          try {
            const attachment = await messageService.uploadAttachment(file);
            attachments.push(attachment);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            // Continue with other files
          }
        }
        setIsUploading(false);
      }

      if (!selectedConversation || !activeConversation) {
        throw new Error("No conversation selected");
      }

      const conversationId = selectedConversation;
      const recipientId = activeConversation.otherUser._id;

      // Clear typing status before sending
      await messageService.updateActiveStatus(conversationId, 'online');

      const sentMessage = await messageService.sendMessage(
        conversationId,
        newMessage.trim(),
        recipientId,
        attachments
      );

      // Add message to local state
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
      setSelectedFiles([]);

      // Refresh conversations to update last message
      loadConversations();

    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Handle typing status
  const handleTypingStart = async () => {
    if (selectedConversation) {
      await messageService.updateActiveStatus(selectedConversation, 'typing');
    }
  };

  const handleTypingStop = async () => {
    if (selectedConversation) {
      await messageService.updateActiveStatus(selectedConversation, 'online');
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
      if (selectedConversation) {
        messageService.updateActiveStatus(selectedConversation, 'offline');
      }
    };
  }, [selectedConversation]);

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

  // Handle conversation deletion
  const handleDeleteConversation = async (conversationId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await messageService.deleteConversation(conversationId);
        
        // Remove from local state
        setConversations(prev => prev.filter(conv => (conv.id || conv._id) !== conversationId));
        
        // If this was the selected conversation, clear selection
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
        // Error toast is handled by messageService
      }
    }
  };

  // Handle individual message deletion
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
        // Error toast is handled by messageService
      }
    }
  };

  // Get other participant in conversation
  const getOtherParticipant = (conversation: Conversation) => {
    // Return the otherUser from the conversation
    return conversation.otherUser || {
      _id: '',
      name: 'Unknown User',
      email: ''
    };
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    const participantName = otherParticipant.name || '';
    const propertyTitle = conv.property?.title || '';
    
    return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 pt-16">
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
            Loading conversations...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Communicate with property agents and owners
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

      {/* Messages Interface */}
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
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
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-20rem)]">
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
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-green-500" 
                                 title="Online" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{participantName}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {messageService.formatTime(conversation.lastMessage.createdAt)}
                              </span>
                            </div>
                            
                            {conversation.property && (
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
        <Card className="lg:col-span-2">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={undefined} />
                        <AvatarFallback>
                          {getOtherParticipant(activeConversation).name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500" 
                           title="Online" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {getOtherParticipant(activeConversation).name}
                        </h3>
                      </div>
                      {activeConversation.property && (
                        <p className="text-sm text-muted-foreground">{activeConversation.property.title}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {getOtherParticipant(activeConversation).phone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${getOtherParticipant(activeConversation).phone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Star className="w-4 h-4 mr-2" />
                          Mark as Important
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Conversation
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteConversation(selectedConversation)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* Property Info */}
              {activeConversation.property && (
                <div className="px-6 py-3 bg-muted/30 border-b">
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
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-28rem)] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      // Check if current user is the sender
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
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment: any, idx: number) => (
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
                                  {messageService.formatTime(message.createdAt)}
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

                {/* Message Input */}
                <div className="p-4 border-t">
                  {/* Selected Files Preview */}
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
                    {/* Hidden file inputs */}
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
                    
                    {/* Attachment buttons */}
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
                        onKeyPress={(e) => {
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
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
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

export default Messages;
