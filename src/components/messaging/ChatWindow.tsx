import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Video,
  Info,
  Archive,
  Trash2,
  Pin,
  PinOff,
  Circle,
  Loader2,
  X
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { unifiedMessageService, type ChatMessage, type Conversation, type UserPresence } from "@/services/unifiedMessageService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, attachments: any[]) => Promise<void>;
  onLoadMore?: () => void;
  loading?: boolean;
  sending?: boolean;
  hasMore?: boolean;
  userPresence?: UserPresence;
  onArchive?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onLoadMore,
  loading = false,
  sending = false,
  hasMore = false,
  userPresence,
  onArchive,
  onDelete,
  onPin,
  onUnpin
}: ChatWindowProps) {
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const otherUser = conversation ? unifiedMessageService.getOtherUser(conversation, currentUserId) : null;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = () => {
    if (!conversation) return;

    if (typingTimeout) clearTimeout(typingTimeout);

    unifiedMessageService.setTypingStatus(conversation._id || conversation.id, true);

    const timeout = setTimeout(() => {
      unifiedMessageService.setTypingStatus(conversation._id || conversation.id, false);
    }, 3000);

    setTypingTimeout(timeout);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!messageText.trim() && selectedFiles.length === 0) return;
    if (!conversation) return;

    try {
      const attachments = [];

      if (selectedFiles.length > 0) {
        setUploading(true);
        for (const file of selectedFiles) {
          try {
            const uploaded = await unifiedMessageService.uploadAttachment(file);
            attachments.push(uploaded);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
          }
        }
        setUploading(false);
      }

      await onSendMessage(messageText, attachments);

      setMessageText("");
      setSelectedFiles([]);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        unifiedMessageService.setTypingStatus(conversation._id || conversation.id, false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm">Choose a conversation from the list to start messaging</p>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Unable to load conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser.profile.avatar} />
                <AvatarFallback className={cn(
                  "text-sm",
                  unifiedMessageService.getRoleBadgeColor(otherUser.role)
                )}>
                  {unifiedMessageService.getUserInitials(otherUser)}
                </AvatarFallback>
              </Avatar>
              {userPresence?.isOnline && (
                <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div>
              <h3 className="font-semibold">{unifiedMessageService.formatUserName(otherUser)}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {userPresence?.isTyping ? (
                  <span className="text-blue-600">typing...</span>
                ) : userPresence?.isOnline ? (
                  <span className="text-green-600">Online</span>
                ) : userPresence?.lastSeen ? (
                  <span>Last seen {unifiedMessageService.formatTime(userPresence.lastSeen)}</span>
                ) : null}
                
                <Badge variant="outline" className="text-xs capitalize">
                  {otherUser.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {otherUser.profile.phone && (
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation.isPinned ? (
                  <DropdownMenuItem onClick={onUnpin}>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin Conversation
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin Conversation
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {conversation.property && (
          <div className="mt-3 p-2 rounded-lg bg-accent/30 border border-accent">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Property:</span>
              <span className="text-sm">{conversation.property.title}</span>
              <Badge variant="outline" className="text-xs">
                {unifiedMessageService.formatPrice(conversation.property.price, conversation.property.listingType)}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}>
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-20 w-64 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {hasMore && onLoadMore && (
              <div className="text-center mb-4">
                <Button variant="ghost" size="sm" onClick={onLoadMore}>
                  Load More Messages
                </Button>
              </div>
            )}

            {messages.map((message, index) => (
              <MessageBubble
                key={message._id}
                message={message}
                currentUserId={currentUserId}
                showAvatar={true}
                showTimestamp={true}
              />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span className="text-sm">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            disabled={uploading || sending}
            className="flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={(!messageText.trim() && selectedFiles.length === 0) || uploading || sending}
          >
            {uploading || sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
}
