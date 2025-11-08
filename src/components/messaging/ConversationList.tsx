import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Pin, Archive, Circle } from "lucide-react";
import { unifiedMessageService, type Conversation, type UserPresence } from "@/services/unifiedMessageService";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
  loading?: boolean;
  onSearch?: (query: string) => void;
  userPresences?: Record<string, UserPresence>;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
  loading = false,
  onSearch,
  userPresences = {}
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherUser = unifiedMessageService.getOtherUser(conv, currentUserId);
    if (!otherUser) return false;
    
    const userName = unifiedMessageService.formatUserName(otherUser).toLowerCase();
    const lastMessage = conv.lastMessage?.content.toLowerCase() || '';
    const propertyTitle = conv.property?.title.toLowerCase() || '';
    
    return userName.includes(searchQuery.toLowerCase()) ||
           lastMessage.includes(searchQuery.toLowerCase()) ||
           propertyTitle.includes(searchQuery.toLowerCase());
  });

  // Sort: pinned first, then by last message time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center space-x-3 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No conversations yet</p>
            <p className="text-sm">Start messaging to see conversations here</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedConversations.map((conversation) => {
              const otherUser = unifiedMessageService.getOtherUser(conversation, currentUserId);
              if (!otherUser) return null;

              const isSelected = conversation._id === selectedConversationId || conversation.id === selectedConversationId;
              const presence = userPresences[otherUser._id];
              const isOnline = presence?.isOnline || false;
              const isTyping = presence?.isTyping || false;

              return (
                <button
                  key={conversation._id || conversation.id}
                  onClick={() => onSelectConversation(conversation._id || conversation.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors hover:bg-accent",
                    isSelected && "bg-accent",
                    conversation.unreadCount > 0 && "font-semibold"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherUser.profile.avatar} />
                        <AvatarFallback className={cn(
                          "text-sm",
                          unifiedMessageService.getRoleBadgeColor(otherUser.role)
                        )}>
                          {unifiedMessageService.getUserInitials(otherUser)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 text-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={cn(
                            "truncate",
                            conversation.unreadCount > 0 && "font-semibold"
                          )}>
                            {unifiedMessageService.formatUserName(otherUser)}
                          </span>
                          {conversation.isPinned && (
                            <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {unifiedMessageService.formatTime(conversation.updatedAt)}
                        </span>
                      </div>

                      {conversation.property && (
                        <div className="text-xs text-blue-600 mb-1 truncate">
                          📍 {conversation.property.title}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm text-muted-foreground truncate",
                          isTyping && "text-blue-600 italic"
                        )}>
                          {isTyping ? "typing..." : conversation.lastMessage?.content || "No messages yet"}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
