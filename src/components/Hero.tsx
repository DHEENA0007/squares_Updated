import { Search, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import buyImage from "@/assets/Buy.jpg";
import rentImage from "@/assets/Rent.jpg";
import leaseImage from "@/assets/Lease.jpg";
import commercialImage from "@/assets/commercial.jpg";
import { useState } from "react";

const Hero = () => {
    const [activeTab, setActiveTab] = useState("buy");
    // Mapping tabs to background images
    const backgroundImages: Record<string, string> = {
      buy: buyImage,
      rent: rentImage,
      lease: leaseImage,
      commercial: commercialImage,
    };

  return (
    <>
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform"
          style={{
            backgroundImage: `url(${backgroundImages[activeTab]})`,
          }}
        >
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-background/60 dark:via-background/40 dark:to-background/20" />
          <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-background/50 dark:via-transparent dark:to-transparent" />
        </div>

        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-block mb-4">
                <span className="bg-primary/20 dark:bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-primary/30 dark:border-primary/20 shadow-xl animate-pulse">
                  <Sparkles className="inline w-3 h-3 mr-1.5" />
                  India's Leading Property Platform
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-gray-500 dark:text-foreground leading-tight">
                Find Your Dream Home
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-muted-foreground mb-6 max-w-2xl mx-auto font-medium">
                Discover the best properties across India with our comprehensive platform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Search Box */}
      <div className="relative -mt-20 z-30 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/60 dark:bg-card/80 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-white/20 dark:border-border/30 transform hover:scale-[1.02] transition-all duration-300">
              <Tabs defaultValue="buy" className="mb-4" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-12 p-1">
                  <TabsTrigger 
                    value="buy" 
                    className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    Buy
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rent" 
                    className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    Rent
                  </TabsTrigger>
                  <TabsTrigger 
                    value="lease" 
                    className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    Lease
                  </TabsTrigger>
                  <TabsTrigger 
                    value="commercial" 
                    className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    Commercial
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                  <Input 
                    placeholder="Search by locality, project, or landmark" 
                    className="pl-10 h-12 border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
                  />
                </div>
                <Button 
                  size="lg" 
                  className="h-12 px-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search Properties
                </Button>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>10,000+ Properties</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>50,000+ Happy Customers</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Trusted Platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Hero;