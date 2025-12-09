import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, User, Building2, Copy, Check } from "lucide-react";
import { Property } from "@/services/propertyService";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { getPropertyContactInfo } from "@/utils/propertyUtils";
import { propertyService } from "@/services/propertyService";

interface PropertyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

const PropertyContactDialog: React.FC<PropertyContactDialogProps> = ({
  open,
  onOpenChange,
  property,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  const contactInfo = getPropertyContactInfo(property);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const copyToClipboard = (text: string, type: "phone" | "email") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "phone") {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
      toast({
        title: "Copied!",
        description: `${type === "phone" ? "Phone number" : "Email"} copied to clipboard`,
      });
    });
  };

  const handleCall = async () => {
    if (contactInfo.phone && contactInfo.phone !== "Not available") {
      // Track phone click interaction
      try {
        await propertyService.trackInteraction(property._id, 'clickedPhone');
      } catch (error) {
        console.error('Failed to track phone click:', error);
        // Don't block the call if tracking fails
      }

      if (isMobile()) {
        window.location.href = `tel:${contactInfo.phone}`;
      } else {
        setShowPhoneNumber(true);
        toast({
          title: "Phone Number",
          description: contactInfo.phone,
        });
      }
    }
  };

  const handleEmail = () => {
    if (contactInfo.email && contactInfo.email !== "Not available") {
      window.location.href = `mailto:${contactInfo.email}?subject=Inquiry about ${property.title}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact Information
          </DialogTitle>
          <DialogDescription>
            Get in touch with the property owner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Property Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium text-sm">{property.title}</p>
            <p className="text-xs text-muted-foreground">
              {property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}
            </p>
            <p className="text-sm font-semibold text-primary mt-1">
              {propertyService.formatPrice(property.price, property.listingType)}
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            {/* Owner Name */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                {contactInfo.type === "Vendor" ? (
                  <Building2 className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{contactInfo.name}</p>
                <p className="text-xs text-muted-foreground">{contactInfo.type}</p>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium truncate">
                  {contactInfo.phone}
                </p>
              </div>
              {contactInfo.phone !== "Not available" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(contactInfo.phone, "phone")}
                >
                  {copiedPhone ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">
                  {contactInfo.email}
                </p>
              </div>
              {contactInfo.email !== "Not available" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(contactInfo.email, "email")}
                >
                  {copiedEmail ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCall}
              disabled={contactInfo.phone === "Not available"}
              className="w-full"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              disabled={contactInfo.email === "Not available"}
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>

          {/* Show Phone Number on Desktop */}
          {showPhoneNumber && contactInfo.phone !== "Not available" && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-primary">Contact Number:</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-primary">{contactInfo.phone}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(contactInfo.phone, "phone")}
                >
                  {copiedPhone ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the number to copy or use the copy button
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Contact during business hours for the best response
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyContactDialog;
