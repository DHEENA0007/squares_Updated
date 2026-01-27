import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Bed, Bath, Maximize, Search, Loader2, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import favoriteService, { Favorite } from "@/services/favoriteService";
import propertyService, { Property } from "@/services/propertyService";

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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingPropertyId, setAddingPropertyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("favorites");
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Load favorites only when dialog opens and favorites tab is active
  useEffect(() => {
    if (open && activeTab === "favorites" && favorites.length === 0) {
      loadFavorites();
    }
  }, [open, activeTab]);

  // Search only when needed with debounce
  useEffect(() => {
    if (!open || activeTab !== "search") return;

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchProperties(searchQuery);
    }, 500);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, activeTab, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setAddingPropertyId(null);
      setSearchResults([]);
    }
  }, [open]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await favoriteService.getFavorites({ limit: 100 });
      if (response.success) {
        setFavorites(response.data.favorites);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchProperties = async (query: string) => {
    try {
      setSearching(true);
      const response = await propertyService.getProperties({
        search: query,
        page: 1,
        limit: 50
      });
      if (response.success) {
        setSearchResults(response.data.properties);
      }
    } catch (error) {
      console.error("Error searching properties:", error);
      toast({
        title: "Error",
        description: "Failed to search properties",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handlePropertyClick = useCallback(async (propertyId: string) => {
    if (addingPropertyId) return;

    if (selectedPropertyIds.includes(propertyId)) {
      toast({
        title: "Already Selected",
        description: "This property is already in your comparison",
        variant: "destructive"
      });
      return;
    }

    if (selectedPropertyIds.length >= maxSelections) {
      toast({
        title: "Maximum Selections Reached",
        description: `You can only compare up to ${maxSelections} properties`,
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingPropertyId(propertyId);
      await onPropertySelect(propertyId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error selecting property:", error);
    } finally {
      setAddingPropertyId(null);
    }
  }, [addingPropertyId, selectedPropertyIds, maxSelections, onPropertySelect, onOpenChange]);

  // Memoized available favorites
  const availableFavorites = useMemo(() => {
    return favorites.filter(fav =>
      fav.property && !selectedPropertyIds.includes(fav.property._id)
    );
  }, [favorites, selectedPropertyIds]);

  // Memoized available search results
  const availableSearchResults = useMemo(() => {
    return searchResults.filter(prop =>
      !selectedPropertyIds.includes(prop._id)
    );
  }, [searchResults, selectedPropertyIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Property to Compare</DialogTitle>
          <DialogDescription>
            Click on a property to add it to your comparison. You can select up to {maxSelections} properties.
            ({selectedPropertyIds.length}/{maxSelections} selected)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favorites ({availableFavorites.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Properties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : availableFavorites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Available Favorites</h3>
                  <p className="text-sm">
                    {favorites.length === 0
                      ? "You haven't favorited any properties yet"
                      : "All your favorite properties are already in the comparison"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableFavorites.map((favorite) => (
                    <PropertyCard
                      key={favorite._id}
                      property={favorite.property}
                      isAdding={addingPropertyId === favorite.property._id}
                      onClick={() => handlePropertyClick(favorite.property._id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by property name, location, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[450px] pr-4">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Searching properties...</span>
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Search Properties</h3>
                  <p className="text-muted-foreground text-sm">
                    Enter at least 2 characters to search
                  </p>
                </div>
              ) : availableSearchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                  <p className="text-sm">
                    No available properties match your search criteria
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableSearchResults.map((property) => (
                    <PropertyCard
                      key={property._id}
                      property={property}
                      isAdding={addingPropertyId === property._id}
                      onClick={() => handlePropertyClick(property._id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Memoized PropertyCard component
const PropertyCard = memo(({
  property,
  isAdding,
  onClick
}: {
  property: any;
  isAdding: boolean;
  onClick: () => void;
}) => {
  const formatPrice = (price: number, listingType: string) => {
    if (listingType === 'rent') return `₹${price.toLocaleString("en-IN")}/month`;
    if (listingType === 'lease') return `₹${price.toLocaleString("en-IN")}/year`;
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const formatArea = (area: any) => {
    if (area.builtUp) return `${area.builtUp} ${area.unit}`;
    if (area.plot) return `${area.plot} ${area.unit}`;
    if (area.carpet) return `${area.carpet} ${area.unit}`;
    return "";
  };

  const getPrimaryImage = (images: any[]) => {
    const primary = images.find(img => img.isPrimary);
    return primary?.url || images[0]?.url || "/placeholder-property.jpg";
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isAdding ? 'opacity-50' : ''}`}
      onClick={isAdding ? undefined : onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={getPrimaryImage(property.images)}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-property.jpg";
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 line-clamp-2">{property.title}</h3>

            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}
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
              {formatArea(property.area) && (
                <div className="flex items-center gap-1">
                  <Maximize className="w-3 h-3" />
                  <span>{formatArea(property.area)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {property.type}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {property.listingType}
              </Badge>
              {isAdding && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Adding...
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PropertyCard.displayName = 'PropertyCard';

export default PropertySelectionDialog;
