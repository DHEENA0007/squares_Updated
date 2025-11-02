import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MessageService } from "@/services/messageService";
import { Property } from "@/services/propertyService";
import { isAdminUser, getOwnerDisplayName } from "@/utils/propertyUtils";

interface PropertyMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onMessageSent?: () => void;
}

const PropertyMessageDialog: React.FC<PropertyMessageDialogProps> = ({
  open,
  onOpenChange,
  property,
  onMessageSent,
}) => {
  const [subject, setSubject] = useState(`Inquiry about ${property.title}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      await MessageService.sendPropertyInquiry(
        property._id,
        subject.trim(),
        message.trim()
      );

      toast({
        title: "Success",
        description: "Your message has been sent successfully!",
      });

      // Reset form
      setMessage("");
      setSubject(`Inquiry about ${property.title}`);
      
      // Call callback
      if (onMessageSent) {
        onMessageSent();
      }
      
      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Toast already shown by messageService
    } finally {
      setSending(false);
    }
  };

  // Get owner/vendor name for display
  const getOwnerName = () => {
    if (property.vendor?.name) {
      // For vendor properties, always show vendor name (not Squares)
      return property.vendor.name;
    }
    return getOwnerDisplayName(property.owner);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Message
          </DialogTitle>
          <DialogDescription>
            Send a message to {getOwnerName()} about this property
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Property Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium text-sm">{property.title}</p>
            <p className="text-xs text-muted-foreground">
              {property.address.city}, {property.address.state}
            </p>
            <p className="text-sm font-semibold text-primary mt-1">
              ₹{property.price.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Introduce yourself and let the owner know what you're looking for
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyMessageDialog;
