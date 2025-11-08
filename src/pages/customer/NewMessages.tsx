import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { unifiedMessageService, type Conversation, type ChatMessage, type UserPresence } from "@/services/unifiedMessageService";
import { useAuth } from "@/contexts/AuthContext";
import { useMessagingRealtime } from "@/contexts/RealtimeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CustomerMessages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [userPresences, setUserPresences] = useState<Record<string, UserPresence>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'archived' | 'pinned'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // Realtime messaging events
  useMessagingRealtime({
    refreshConversations: () => loadConversations(),
    onNewMessage: (newMsg: any) => {
      if (newMsg.conversationId === selectedConversationId) {
        setMessages(prev => [...prev, newMsg]);
      }
      loadConversations();
    },
    onMessageRead: () => {
      loadConversations();
    }
  });

  useEffect(() => {
    loadConversations();
    const presenceInterval = setInterval(() => {
      if (conversations.length > 0) {
        loadUserPresences();
      }
    }, 10000);

    return () => clearInterval(presenceInterval);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversations.length > 0) {
      loadUserPresences();
    }
  }, [conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await unifiedMessageService.getConversations({
        status: statusFilter,
        search: searchQuery,
        limit: 50
      });

      setConversations(response.conversations);

      // Auto-select first conversation if none selected
      if (!selectedConversationId && response.conversations.length > 0 && !isMobile) {
        setSelectedConversationId(response.conversations[0]._id || response.conversations[0].id);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await unifiedMessageService.getMessages(conversationId);
      setMessages(response.messages);

      // Mark as read
      await unifiedMessageService.markAsRead(conversationId);
      
      // Update presence
      await unifiedMessageService.updatePresence('online');
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadUserPresences = async () => {
    const presences: Record<string, UserPresence> = {};
    
    for (const conv of conversations) {
      const otherUser = unifiedMessageService.getOtherUser(conv, user?._id || '');
      if (otherUser) {
        try {
          const presence = await unifiedMessageService.getUserPresence(otherUser._id);
          presences[otherUser._id] = presence;
        } catch (error) {
          console.error(`Failed to load presence for ${otherUser._id}:`, error);
        }
      }
    }
    
    setUserPresences(presences);
  };

  const handleSendMessage = async (content: string, attachments: any[]) => {
    if (!selectedConversationId) return;

    try {
      setSending(true);
      const newMessage = await unifiedMessageService.sendMessage(
        selectedConversationId,
        content,
        attachments
      );

      setMessages(prev => [...prev, newMessage]);
      loadConversations(); // Refresh to update last message
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedConversationId) return;

    try {
      await unifiedMessageService.archiveConversation(selectedConversationId);
      setSelectedConversationId(null);
      loadConversations();
    } catch (error) {
      console.error("Failed to archive conversation:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedConversationId) return;

    try {
      await unifiedMessageService.deleteConversation(selectedConversationId);
      setSelectedConversationId(null);
      loadConversations();
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handlePin = async () => {
    if (!selectedConversationId) return;

    try {
      await unifiedMessageService.pinConversation(selectedConversationId);
      loadConversations();
    } catch (error) {
      console.error("Failed to pin conversation:", error);
    }
  };

  const handleUnpin = async () => {
    if (!selectedConversationId) return;

    try {
      await unifiedMessageService.unpinConversation(selectedConversationId);
      loadConversations();
    } catch (error) {
      console.error("Failed to unpin conversation:", error);
    }
  };

  const selectedConversation = conversations.find(
    c => c._id === selectedConversationId || c.id === selectedConversationId
  ) || null;

  const otherUser = selectedConversation 
    ? unifiedMessageService.getOtherUser(selectedConversation, user?._id || '')
    : null;

  const currentUserPresence = otherUser ? userPresences[otherUser._id] : undefined;

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        {selectedConversationId ? (
          <Card className="h-full flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversationId(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to conversations
              </Button>
            </div>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              currentUserId={user?._id || ''}
              onSendMessage={handleSendMessage}
              loading={loadingMessages}
              sending={sending}
              userPresence={currentUserPresence}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onPin={handlePin}
              onUnpin={handleUnpin}
            />
          </Card>
        ) : (
          <Card className="h-full">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="h-full flex flex-col">
              <div className="border-b p-4 pb-0">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="pinned">Pinned</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={statusFilter} className="flex-1 m-0">
                <ConversationList
                  conversations={conversations}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={setSelectedConversationId}
                  currentUserId={user?._id || ''}
                  loading={loading}
                  onSearch={setSearchQuery}
                  userPresences={userPresences}
                />
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-12 gap-4 h-full">
        <Card className="col-span-4 h-full">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="h-full flex flex-col">
            <div className="border-b p-4 pb-0">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="pinned">Pinned</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={statusFilter} className="flex-1 m-0">
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
                currentUserId={user?._id || ''}
                loading={loading}
                onSearch={setSearchQuery}
                userPresences={userPresences}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="col-span-8 h-full">
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            currentUserId={user?._id || ''}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
            sending={sending}
            userPresence={currentUserPresence}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onPin={handlePin}
            onUnpin={handleUnpin}
          />
        </Card>
      </div>
    </div>
  );
}
