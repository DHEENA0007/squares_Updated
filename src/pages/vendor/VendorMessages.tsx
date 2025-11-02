import React, { useState, useEffect } from "react";
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
  Video,
  MoreVertical,
  Paperclip,
  Image,
  Clock,
  Check,
  CheckCheck,
  Star,
  Archive,
  Trash
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { messageService, type Message, type Conversation } from "@/services/messageService";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const VendorMessages = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadConversations();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
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
        
        toast({
          title: "Messages loaded",
          description: `${response.messages.length} messages loaded and marked as read`,
        });
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
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
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-8rem)]">
          <div className="p-2">
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const participantName = otherParticipant?.name || 'Unknown User';
              const conversationId = conversation.id || conversation._id || '';
              
              return (
              <div
                key={conversationId}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                  selectedChat === conversationId ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedChat(conversationId)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} />
                      <AvatarFallback>{participantName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold truncate">{participantName}</h4>
                      <div className="flex items-center space-x-1">
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-2">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {conversation.property?.title || 'General inquiry'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage?.message}
                      </p>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(conversation.lastMessage?.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} />
                      <AvatarFallback>{otherParticipant?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="font-semibold">{otherParticipant?.name || 'Unknown User'}</h3>
                    <p className="text-sm text-muted-foreground">
                      Interested in property
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Video className="w-4 h-4" />
                  </Button>
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
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteConversation(selectedConversation.id || selectedConversation._id || '')}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Property Info */}
              {selectedConversation.property && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedConversation.property.title}</p>
                  <p className="text-xs text-muted-foreground">₹{selectedConversation.property.price.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
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
                        className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} hover:bg-muted/30 rounded-lg p-1 transition-colors`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        
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
                        
                        <div className={`flex items-center justify-between mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOwnMessage && (
                              <Badge variant="outline" className="text-xs px-1 py-0">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isOwnMessage && getStatusIcon(message.status)}
                            {isOwnMessage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 w-5 p-0 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
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
                    <div className="flex justify-start mt-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {otherParticipant?.name} is typing...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg">
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-end space-x-2">
                <div className="flex space-x-1">
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
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
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
                >
                  {isUploading ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMessages;