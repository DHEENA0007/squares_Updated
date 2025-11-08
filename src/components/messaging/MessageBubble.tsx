import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, FileText, Image as ImageIcon } from "lucide-react";
import { unifiedMessageService, type ChatMessage, type MessageUser } from "@/services/unifiedMessageService";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export function MessageBubble({
  message,
  currentUserId,
  showAvatar = true,
  showTimestamp = true
}: MessageBubbleProps) {
  const isOwnMessage = message.sender._id === currentUserId;
  const [imageError, setImageError] = useState(false);

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="space-y-2 mt-2">
        {message.attachments.map((attachment, index) => (
          <div key={index}>
            {attachment.type === 'image' && !imageError ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onError={() => setImageError(true)}
                onClick={() => window.open(attachment.url, '_blank')}
              />
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded bg-accent/50 hover:bg-accent transition-colors"
              >
                {attachment.type === 'image' ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{attachment.name}</p>
                  {attachment.size && (
                    <p className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderProperty = () => {
    if (!message.property) return null;

    return (
      <div className="mt-2 p-3 rounded-lg bg-accent/30 border border-accent">
        <div className="flex gap-3">
          {message.property.images && message.property.images[0] && (
            <img
              src={message.property.images[0]}
              alt={message.property.title}
              className="w-16 h-16 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{message.property.title}</p>
            <p className="text-xs text-muted-foreground">
              {message.property.address.city}, {message.property.address.state}
            </p>
            <p className="text-sm font-semibold mt-1">
              {unifiedMessageService.formatPrice(message.property.price, message.property.listingType)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex gap-2 mb-4", isOwnMessage && "flex-row-reverse")}>
      {showAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender.profile.avatar} />
          <AvatarFallback className="text-xs">
            {unifiedMessageService.getUserInitials(message.sender)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex-1 max-w-[70%]", isOwnMessage && "flex flex-col items-end")}>
        {message.type === 'system' ? (
          <div className="text-center w-full">
            <Badge variant="secondary" className="text-xs">
              {message.content}
            </Badge>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "rounded-2xl px-4 py-2 break-words",
                isOwnMessage
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-accent text-accent-foreground rounded-tl-sm",
                message.type === 'auto_response' && "border-2 border-dashed border-muted-foreground/30"
              )}
            >
              {message.type === 'auto_response' && (
                <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                  <span>🤖</span>
                  <span>Auto-response</span>
                </div>
              )}

              {message.content && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}

              {renderProperty()}
              {renderAttachments()}
            </div>

            {showTimestamp && (
              <div className={cn(
                "flex items-center gap-1 mt-1 text-xs text-muted-foreground",
                isOwnMessage && "justify-end"
              )}>
                <span>{unifiedMessageService.formatTime(message.createdAt)}</span>
                {isOwnMessage && (
                  <>
                    {message.status === 'sent' && <Check className="h-3 w-3" />}
                    {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                    {message.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-500" />}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
