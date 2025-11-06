import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Building2, MapPin, DollarSign } from "lucide-react";
import { Property } from "@/services/propertyService";

interface EnterprisePropertyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

const EnterprisePropertyContactDialog: React.FC<EnterprisePropertyContactDialogProps> = ({
  open,
  onOpenChange,
  property,
}) => {
  const whatsappNumber = "+91 90807 20215";
  const whatsappMessage = `Hi, I'm interested in the property: ${property.title} located at ${property.address.city}, ${property.address.state}. Price: ₹${property.price.toLocaleString('en-IN')}. Can you please provide more details?`;
  
  const handleWhatsAppContact = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Enterprise Property Contact
          </DialogTitle>
          <DialogDescription>
            This is an enterprise property. Contact via WhatsApp for inquiries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-gray-900 line-clamp-2">{property.title}</h4>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              {property.address.city}, {property.address.state}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-1" />
              ₹{property.price.toLocaleString('en-IN')}
              {property.listingType === 'rent' && '/month'}
              {property.listingType === 'lease' && '/year'}
            </div>
          </div>

          {/* Enterprise Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-blue-900 mb-1">Enterprise Property</h5>
                <p className="text-sm text-blue-700">
                  This property is managed by our enterprise partner. For inquiries and viewings, 
                  please contact us directly through WhatsApp for faster response.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Contact */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Contact us on WhatsApp</p>
              <p className="font-semibold text-lg text-green-600">{whatsappNumber}</p>
            </div>
            
            <Button 
              onClick={handleWhatsAppContact}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Contact on WhatsApp
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-gray-500 text-center">
            Our team will respond within business hours to assist you with this property.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnterprisePropertyContactDialog;
