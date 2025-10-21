import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Calendar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock conversations data
  const conversations = [
    {
      id: 1,
      propertyId: 1,
      propertyTitle: "Luxury 3BHK Apartment in Powai",
      propertyPrice: "₹1.2 Cr",
      agentName: "Rahul Sharma",
      agentPhone: "+91 98765 43210",
      agentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
      agentVerified: true,
      lastMessage: "The property is still available. Would you like to schedule a visit?",
      lastMessageTime: "2 min ago",
      unreadCount: 2,
      status: "online",
      inquiryType: "buying",
      messages: [
        {
          id: 1,
          senderId: "customer",
          message: "Hi, I'm interested in this 3BHK apartment. Is it still available?",
          timestamp: "2024-10-21T10:30:00Z",
          status: "read"
        },
        {
          id: 2,
          senderId: "agent",
          message: "Hello! Yes, the property is still available. It's a beautiful 3BHK with all modern amenities.",
          timestamp: "2024-10-21T10:35:00Z",
          status: "read"
        },
        {
          id: 3,
          senderId: "customer",
          message: "That sounds great! Can you tell me more about the location and nearby facilities?",
          timestamp: "2024-10-21T10:40:00Z",
          status: "read"
        },
        {
          id: 4,
          senderId: "agent",
          message: "It's located in Powai with excellent connectivity. Metro station is just 0.5km away. Good schools and hospitals nearby.",
          timestamp: "2024-10-21T10:45:00Z",
          status: "read"
        },
        {
          id: 5,
          senderId: "agent",
          message: "The property is still available. Would you like to schedule a visit?",
          timestamp: "2024-10-21T11:30:00Z",
          status: "delivered"
        }
      ]
    },
    {
      id: 2,
      propertyId: 2,
      propertyTitle: "Modern Villa with Private Garden",
      propertyPrice: "₹2.5 Cr",
      agentName: "Priya Patel",
      agentPhone: "+91 87654 32109",
      agentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
      agentVerified: true,
      lastMessage: "Thank you for your interest. Let me check the availability.",
      lastMessageTime: "1 hour ago",
      unreadCount: 0,
      status: "away",
      inquiryType: "buying",
      messages: [
        {
          id: 1,
          senderId: "customer",
          message: "I saw your villa listing. Can we discuss the price?",
          timestamp: "2024-10-21T09:00:00Z",
          status: "read"
        },
        {
          id: 2,
          senderId: "agent",
          message: "Thank you for your interest. Let me check the availability.",
          timestamp: "2024-10-21T09:30:00Z",
          status: "read"
        }
      ]
    },
    {
      id: 3,
      propertyId: 3,
      propertyTitle: "Premium Penthouse with Terrace",
      propertyPrice: "₹1.8 Cr",
      agentName: "Amit Kumar",
      agentPhone: "+91 76543 21098",
      agentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amit",
      agentVerified: false,
      lastMessage: "I'll send you the floor plans shortly.",
      lastMessageTime: "3 hours ago",
      unreadCount: 1,
      status: "offline",
      inquiryType: "renting",
      messages: [
        {
          id: 1,
          senderId: "customer",
          message: "Is this penthouse available for rent?",
          timestamp: "2024-10-21T07:00:00Z",
          status: "read"
        },
        {
          id: 2,
          senderId: "agent",
          message: "I'll send you the floor plans shortly.",
          timestamp: "2024-10-21T08:00:00Z",
          status: "delivered"
        }
      ]
    }
  ];

  const activeConversation = conversations.find(c => c.id === selectedConversation);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    // In real app, this would send message via API
    console.log("Sending message:", newMessage);
    setNewMessage("");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-16">
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
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Visit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Conversations</CardTitle>
              <Badge variant="secondary">
                {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} unread
              </Badge>
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
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-muted border border-primary/20' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={conversation.agentAvatar} />
                          <AvatarFallback>
                            {conversation.agentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(conversation.status)}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate">
                              {conversation.agentName}
                            </h4>
                            {conversation.agentVerified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {conversation.lastMessageTime}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {conversation.propertyTitle}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge className="ml-2 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-8">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={activeConversation.agentAvatar} />
                        <AvatarFallback>
                          {activeConversation.agentName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(activeConversation.status)}`} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {activeConversation.agentName}
                        {activeConversation.agentVerified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{activeConversation.propertyTitle}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {activeConversation.inquiryType}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Property Info Banner */}
              <div className="p-4 bg-muted/50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{activeConversation.propertyTitle}</h4>
                      <p className="text-sm text-primary font-semibold">{activeConversation.propertyPrice}</p>
                    </div>
                  </div>
                  <Button size="sm">View Property</Button>
                </div>
              </div>

              {/* Messages */}
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] p-4">
                  <div className="space-y-4">
                    {activeConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.senderId === 'customer'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.senderId === 'customer' && (
                              <CheckCheck className={`w-3 h-3 ${
                                message.status === 'read' ? 'text-blue-400' : 'opacity-70'
                              }`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[40px] max-h-[120px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span>Agent typically responds within 10 minutes</span>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the left to start messaging
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">Total Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.status === 'online').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Badge className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Phone className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {conversations.filter(c => c.agentVerified).length}
                </p>
                <p className="text-sm text-muted-foreground">Verified Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Messages;