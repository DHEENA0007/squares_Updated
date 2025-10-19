import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
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
              <a href="#" className="hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund-policy" className="hover:text-primary transition-colors">Refund & Cancellation Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Buy Property</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Rent Property</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sell Property</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Property Valuation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Popular Locations</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Mumbai</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Delhi NCR</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Bangalore</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pune</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 BuildHomeMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
