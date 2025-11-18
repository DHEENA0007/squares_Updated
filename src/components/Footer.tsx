import { useState } from "react";
import { Facebook, Twitter, Instagram, Linkedin, Headphones } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "@/components/support/SupportDialog";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePropertySearch = (listingType: string, propertyType?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('listingType', listingType);
    if (propertyType) {
      searchParams.set('propertyType', propertyType);
    }
    navigate(`/customer/search?${searchParams.toString()}`);
  };

  return (
    <footer className="bg-muted mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-xl mb-4 text-primary">BuildHomeMart</h3>
            <p className="text-sm text-muted-foreground">
              Your trusted partner in finding the perfect property across India.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://www.facebook.com/people/Buildhomemart/61573164864973/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/buildhomemart_squares/?e=b4491b1a-3d54-44c7-bb78-a6b9312d01e1&g=5" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/buildhomemart-techno-solutions-pvt-ltd/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-6 space-y-2">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Address:</p>
                <p>No : 8B/16, Arumugam North Street,<br />Thirumangalam, Madurai, Tamil Nadu - 625706, India.</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Phone:</p>
                <p>+91 90807 20215</p>
              </div>
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSupportDialogOpen(true)}
              >
                <Headphones className="h-4 w-4 mr-2" />
                Get Support
              </Button>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Buy Property</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button 
                  onClick={() => handlePropertySearch('sale')}
                  className="hover:text-primary transition-colors text-left"
                >
                  All Properties for Sale
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('sale', 'apartment')}
                  className="hover:text-primary transition-colors text-left"
                >
                  Residential Properties
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('sale', 'commercial,office')}
                  className="hover:text-primary transition-colors text-left"
                >
                  Commercial Properties
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('sale', 'land')}
                  className="hover:text-primary transition-colors text-left"
                >
                  Agricultural Land
                </button>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Rent Property</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button 
                  onClick={() => handlePropertySearch('rent')}
                  className="hover:text-primary transition-colors text-left"
                >
                  All Properties for Rent
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('rent', 'apartment')}
                  className="hover:text-primary transition-colors text-left"
                >
                  Residential for Rent
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('rent', 'commercial,office')}
                  className="hover:text-primary transition-colors text-left"
                >
                  Commercial for Rent
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handlePropertySearch('rent', 'pg')}
                  className="hover:text-primary transition-colors text-left"
                >
                  PG / Hostels
                </button>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/vendor/login" className="hover:text-primary transition-colors">Post Property</Link></li>
              <li><Link to="/contact?service=valuation" className="hover:text-primary transition-colors">Property Valuation</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
              <li><Link to="/track-support" className="hover:text-primary transition-colors">Track Support</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 BuildHomeMart. All rights reserved.</p>
        </div>
      </div>

      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
        onSuccess={(ticketNumber) => {
          toast({
            title: "Support Ticket Created",
            description: `Your ticket number is ${ticketNumber}. Check your email for updates.`,
          });
        }}
      />
    </footer>
  );
};

export default Footer;
