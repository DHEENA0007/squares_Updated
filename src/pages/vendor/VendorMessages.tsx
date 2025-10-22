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

const VendorMessages = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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
        setSelectedChat(response.conversations[0]._id);
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
      const response = await messageService.getConversationMessages(conversationId);
      setMessages(response.messages);
      
      // Mark conversation as read
      await messageService.markConversationAsRead(conversationId);
      
      // Update conversation unread count in local state
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const sentMessage = await messageService.sendMessage(selectedChat, newMessage.trim());
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
      
      // Update last message in conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedChat
            ? { ...conv, lastMessage: sentMessage, updatedAt: sentMessage.createdAt }
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
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await messageService.deleteConversation(conversationId);
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        
        if (selectedChat === conversationId) {
          setSelectedChat(null);
          setMessages([]);
        }

        toast({
          title: "Success",
          description: "Conversation deleted successfully.",
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

  const getOtherParticipant = (conversation: Conversation) => {
    const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?.id;
    return conversation.participants.find(p => p._id !== currentUserId);
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

  const selectedConversation = conversations.find(conv => conv._id === selectedChat);
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
    
    const participantName = messageService.formatName(otherParticipant);
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
              const participantName = messageService.formatName(otherParticipant);
              return (
              <div
                key={conversation._id}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                  selectedChat === conversation._id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedChat(conversation._id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={otherParticipant?.profile?.avatar} />
                      <AvatarFallback>{participantName.charAt(0)}</AvatarFallback>
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
                      <AvatarImage src={otherParticipant?.profile?.avatar} />
                      <AvatarFallback>{messageService.formatName(otherParticipant).charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="font-semibold">{messageService.formatName(otherParticipant)}</h3>
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
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteConversation(selectedConversation._id)}>
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
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.sender._id === otherParticipant?._id ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender._id === otherParticipant?._id
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${
                          message.sender._id === otherParticipant?._id ? 'text-muted-foreground' : 'text-primary-foreground/70'
                        }`}>
                          <span className="text-xs">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {message.sender._id !== otherParticipant?._id && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-end space-x-2">
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
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
                  />
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
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