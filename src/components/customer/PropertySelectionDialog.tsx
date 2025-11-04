import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Heart, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Plus,
  Check,
  Home,
  Loader2
} from "lucide-react";
import { propertyService, Property } from "@/services/propertyService";
import { favoriteService, Favorite } from "@/services/favoriteService";
import { toast } from "@/hooks/use-toast";

interface PropertySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertySelect: (propertyId: string) => Promise<void>;
  selectedPropertyIds: string[];
  maxSelections?: number;
}

const PropertySelectionDialog = ({
  open,
  onOpenChange,
  onPropertySelect,
  selectedPropertyIds,
  maxSelections = 10
}: PropertySelectionDialogProps) => {
  const [activeTab, setActiveTab] = useState("favorites");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [addingProperty, setAddingProperty] = useState<string | null>(null);

  // Load favorites when dialog opens
  useEffect(() => {
    if (open && activeTab === "favorites" && favorites.length === 0) {
      loadFavorites();
    }
  }, [open, activeTab, favorites.length]);

  // Reset adding state when dialog closes
  useEffect(() => {
    if (!open) {
      setAddingProperty(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Search properties when query changes with debouncing
  useEffect(() => {
    if (activeTab === "search" && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchProperties();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (activeTab === "search" && !searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const loadFavorites = async () => {
    try {
      setFavoritesLoading(true);
      const response = await favoriteService.getFavorites();
      setFavorites(response.data.favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorite properties",
        variant: "destructive"
      });
    } finally {
      setFavoritesLoading(false);
    }
  };

  const searchProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getProperties({
        search: searchQuery,
        page: 1,
        limit: 20
      });
      
      if (response.success) {
        setSearchResults(response.data.properties);
      }
    } catch (error) {
      console.error('Error searching properties:', error);
      toast({
        title: "Error",
        description: "Failed to search properties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = async (propertyId: string) => {
    // Prevent multiple clicks
    if (addingProperty) {
      return;
    }

    if (selectedPropertyIds.includes(propertyId)) {
      toast({
        title: "Already Selected",
        description: "This property is already in your comparison list",
        variant: "destructive"
      });
      return;
    }

    if (selectedPropertyIds.length >= maxSelections) {
      toast({
        title: "Selection Limit Reached",
        description: `You can compare up to ${maxSelections} properties at once`,
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('PropertySelectionDialog: Adding property', propertyId);
      setAddingProperty(propertyId);
      
      // Call the parent's property select handler and wait for completion
      await onPropertySelect(propertyId);
      console.log('PropertySelectionDialog: Property added successfully', propertyId);
      
      // Show success toast
      toast({
        title: "Property Added",
        description: "Property has been added to comparison",
        variant: "default"
      });
      
      // Close dialog after successful addition
      onOpenChange(false);
    } catch (error) {
      console.error('PropertySelectionDialog: Error adding property:', error);
      toast({
        title: "Error",
        description: "Failed to add property to comparison",
        variant: "destructive"
      });
    } finally {
      setAddingProperty(null);
    }
  };

  const formatPrice = (price: number, listingType: Property['listingType']) => {
    if (listingType === 'rent') {
      return `₹${price.toLocaleString('en-IN')}/month`;
    } else if (listingType === 'lease') {
      return `₹${price.toLocaleString('en-IN')}/year`;
    } else {
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(1)} Lac`;
      } else {
        return `₹${price.toLocaleString('en-IN')}`;
      }
    }
  };

  const formatArea = (area: Property['area']) => {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'N/A';
  };

  const getPrimaryImage = (property: Property): string => {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || '/placeholder-property.jpg';
  };

  // Helper function to convert favorite property to Property interface
  const convertToProperty = (favProperty: any): Property => {
    return {
      ...favProperty,
      type: favProperty.propertyType || 'apartment',
      views: 0,
      featured: false,
      verified: false,
      status: favProperty.status || 'available',
      listingType: favProperty.listingType || 'sale'
    } as Property;
  };

  // Filter out already selected properties
  const availableFavorites = useMemo(() => 
    favorites.filter(fav => 
      fav.property && !selectedPropertyIds.includes(fav.property._id)
    ), 
    [favorites, selectedPropertyIds]
  );

  const availableSearchResults = useMemo(() => 
    searchResults.filter(property => 
      !selectedPropertyIds.includes(property._id)
    ), 
    [searchResults, selectedPropertyIds]
  );

  const PropertyCard = ({ property }: { property: Property }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={getPrimaryImage(property)}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Home className="w-8 h-8 text-muted-foreground hidden m-auto mt-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 line-clamp-2">{property.title}</h3>
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {property.address.city}, {property.address.state}
              </span>
            </div>
            
            <div className="text-primary font-semibold text-sm mb-2">
              {formatPrice(property.price, property.listingType)}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                <span>{property.bedrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath className="w-3 h-3" />
                <span>{property.bathrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <Square className="w-3 h-3" />
                <span>{formatArea(property.area)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {property.type}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {property.listingType}
              </Badge>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={() => handlePropertySelect(property._id)}
            disabled={!!addingProperty || selectedPropertyIds.includes(property._id)}
            className="flex-shrink-0"
            variant={selectedPropertyIds.includes(property._id) ? "secondary" : "default"}
          >
            {addingProperty === property._id ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Adding...
              </>
            ) : selectedPropertyIds.includes(property._id) ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Property to Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                From Favorites ({availableFavorites.length})
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Properties
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="favorites" className="h-full overflow-hidden">
                <div className="space-y-4 h-full overflow-y-auto max-h-[500px]">
                  {favoritesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading favorites...</span>
                    </div>
                  ) : availableFavorites.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Available Favorites</h3>
                      <p className="text-muted-foreground">
                        {favorites.length === 0 
                          ? "You haven't favorited any properties yet" 
                          : "All your favorite properties are already in the comparison"}
                      </p>
                    </div>
                  ) : (
                    availableFavorites.map((favorite) => (
                      favorite.property && (
                        <PropertyCard 
                          key={favorite.property._id} 
                          property={convertToProperty(favorite.property)} 
                        />
                      )
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="search" className="h-full overflow-hidden">
                <div className="space-y-4 h-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by property name, location, or area..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="h-full overflow-y-auto max-h-[450px] space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="ml-2">Searching properties...</span>
                      </div>
                    ) : !searchQuery.trim() ? (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Search Properties</h3>
                        <p className="text-muted-foreground">
                          Enter a property name, location, or area to search
                        </p>
                      </div>
                    ) : availableSearchResults.length === 0 ? (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                        <p className="text-muted-foreground">
                          No available properties match your search criteria
                        </p>
                      </div>
                    ) : (
                      availableSearchResults.map((property) => (
                        <PropertyCard key={property._id} property={property} />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedPropertyIds.length}/{maxSelections} properties selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertySelectionDialog;
