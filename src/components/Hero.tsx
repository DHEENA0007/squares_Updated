import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import buyImage from "@/assets/hero-property.jpg";
import sellImage from "@/assets/sell.png";
import commercialImage from "@/assets/commercial.png";
import { useState } from "react";

const Hero = () => {
    const [activeTab, setActiveTab] = useState("buy");
    // Mapping tabs to background images
    const backgroundImages: Record<string, string> = {
      buy: buyImage,
      rent: sellImage,
      lease: sellImage, // Using rent image for lease, or add specific lease image
      commercial: commercialImage,
    };

  return (
    <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
       <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url(${backgroundImages[activeTab]})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
      </div>

      <div className="container relative z-10 px-4">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold mb-4 text-foreground">
            Find Your Dream Home
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover the best properties across India
          </p>
          
          <div className="bg-card rounded-xl p-6 shadow-[var(--shadow-large)]">
            <Tabs defaultValue="buy" className="mb-4" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="rent">Rent</TabsTrigger>
                <TabsTrigger value="lease">Lease</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search by locality, project, or landmark" 
                  className="pl-10 h-12"
                />
              </div>
              <Button size="lg" className="h-12 px-8">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
