import { useState, useEffect } from "react";
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
  Calendar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtime, useMessagingRealtime } from "@/contexts/RealtimeContext";

const Messages = () => {
  const { isConnected } = useRealtime();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Realtime messaging events
  useMessagingRealtime({
    refreshConversations: () => {
      console.log("Conversations updated via realtime");
      loadConversations();
    },
    onNewMessage: (message) => {
      console.log("New message received:", message);
    }
  });

  // Load conversations from API (simulated)
  const loadConversations = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setConversations([
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
            }
          ]
        },
        {
          id: 2,
          propertyId: 2,
          propertyTitle: "Modern Villa with Garden",
          propertyPrice: "₹2.8 Cr",
          agentName: "Priya Patel",
          agentPhone: "+91 87654 32109",
          agentAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
          agentVerified: true,
          lastMessage: "Sure, I can arrange a virtual tour tomorrow.",
          lastMessageTime: "1 hour ago",
          unreadCount: 0,
          status: "away",
          inquiryType: "renting",
          messages: [
            {
              id: 1,
              senderId: "customer",
              message: "Hi Priya, I saw your villa listing. Can we arrange a virtual tour?",
              timestamp: "2024-10-21T08:30:00Z",
              status: "read"
            }
          ]
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    loadConversations();
  }, []);

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
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
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
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conversation.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
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
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{conversation.agentName}</p>
                            {conversation.agentVerified && (
                              <CheckCheck className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{conversation.lastMessageTime}</span>
                        </div>
                        
                        <p className="text-xs text-primary font-medium mb-1">{conversation.propertyTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={conversation.inquiryType === 'buying' ? 'default' : 'secondary'} className="text-xs">
                            {conversation.inquiryType}
                          </Badge>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-primary text-white text-xs px-2 py-1">
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
        <Card className="lg:col-span-2">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={activeConversation.agentAvatar} />
                        <AvatarFallback>
                          {activeConversation.agentName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(activeConversation.status)}`} />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{activeConversation.agentName}</h3>
                        {activeConversation.agentVerified && (
                          <CheckCheck className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{activeConversation.propertyTitle}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Property Info */}
              <div className="px-6 py-3 bg-muted/30 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{activeConversation.propertyTitle}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{activeConversation.propertyPrice}</span>
                </div>
              </div>

              {/* Messages */}
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-28rem)] p-4">
                  <div className="space-y-4">
                    {activeConversation.messages?.map((message) => (
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
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.senderId === 'customer' && (
                              <CheckCheck className={`w-3 h-3 ${message.status === 'read' ? 'text-blue-300' : 'opacity-50'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 relative">
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
                      />
                    </div>
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
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
