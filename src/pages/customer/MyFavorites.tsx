import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Heart, MapPin, Search, Filter, Calendar, Share, SortAsc, GitCompare, Check, Plus } from 'lucide-react';
import { favoriteService, type Favorite, type FavoriteStats } from '@/services/favoriteService';
import { propertyService } from '@/services/propertyService';
import { configurationService } from '@/services/configurationService';
import type { FilterConfiguration } from '@/types/configuration';
import { toast } from '@/hooks/use-toast';
import { useRealtime, useRealtimeEvent } from '@/contexts/RealtimeContext';
import { getPropertyListingLabel } from '@/utils/propertyUtils';
import { useIsMobile } from '@/hooks/use-mobile';

const MyFavorites: React.FC = () => {
  const { isConnected } = useRealtime();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [stats, setStats] = useState<FavoriteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfiguration[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await favoriteService.getFavorites();
      setFavorites(response.data.favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await favoriteService.getFavoriteStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const fetchFilterConfigs = useCallback(async () => {
    try {
      const configs = await configurationService.getAllFilterConfigurations();
      setFilterConfigs(configs);
    } catch (error) {
      console.error('Error fetching filter configurations:', error);
    }
  }, []);

  // Listen for favorite events
  useRealtimeEvent('favorite_added', useCallback((data) => {
    loadFavorites();
    loadStats();
  }, [loadFavorites, loadStats]));

  useRealtimeEvent('favorite_removed', useCallback((data) => {
    loadFavorites();
    loadStats();
  }, [loadFavorites, loadStats]));

  useEffect(() => {
    loadFavorites();
    loadStats();
    fetchFilterConfigs();
  }, []); // Only load on mount

  const removeFavorite = async (propertyId: string) => {
    try {
      await favoriteService.removeFromFavorites(propertyId);
      await loadFavorites();
      await loadStats();
      toast({
        title: "Success",
        description: "Property removed from favorites",
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  };

  const toggleSelection = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const removeSelectedFavorites = async () => {
    try {
      await Promise.all(
        selectedProperties.map(propertyId =>
          favoriteService.removeFromFavorites(propertyId)
        )
      );
      setSelectedProperties([]);
      await loadFavorites();
      await loadStats();
      toast({
        title: "Success",
        description: `${selectedProperties.length} properties removed from favorites`,
      });
    } catch (error) {
      console.error('Error removing selected favorites:', error);
      toast({
        title: "Error",
        description: "Failed to remove selected favorites",
        variant: "destructive"
      });
    }
  };

  const compareSelectedProperties = () => {
    if (selectedProperties.length < 1) {
      toast({
        title: "Select Properties",
        description: "Please select at least 1 property to compare",
        variant: "destructive"
      });
      return;
    }

    // Navigate to compare page with selected property IDs (unlimited)
    navigate(`/customer/compare?properties=${selectedProperties.join(',')}`);
  };

  const getListingTypeLabel = (value: string) => {
    const config = filterConfigs.find(c => c.value === value);
    return config ? (config.displayLabel || config.name) : value.charAt(0).toUpperCase() + value.slice(1);
  };

  const listingTypeConfigs = filterConfigs
    .filter(c => c.filterType === 'listing_type' || c.filterType === 'listingType')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Filter favorites based on search and filter criteria
  const filteredFavorites = favorites.filter(favorite => {
    const property = favorite.property;
    if (!property) return false;

    // Handle address being an object or string
    const addressStr = typeof property.address === 'string'
      ? property.address
      : property.address.district
        ? `${property.address.street || ''} ${property.address.city || ''} ${property.address.district || ''} ${property.address.state || ''}`.trim()
        : `${property.address.street || ''} ${property.address.city || ''} ${property.address.state || ''}`.trim();

    const cityStr = typeof property.city === 'string'
      ? property.city
      : (property.address?.city || '');

    const matchesSearch = !searchQuery ||
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addressStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cityStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = !filterType || filterType === 'all' ||
      (filterType === 'available' && property.status === 'available') ||
      (filterType === 'sold' && property.status === 'sold') ||
      (filterType === 'rented' && property.status === 'rented') ||
      (filterType === 'recent' && new Date(favorite.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      property.listingType === filterType;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading favorites...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saved Properties</h1>
            <p className="text-muted-foreground mt-1">
              {filteredFavorites.length} properties saved
            </p>
          </div>

          {selectedProperties.length > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={compareSelectedProperties}
                className="flex-1 md:flex-none"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare ({selectedProperties.length})
              </Button>
              <Button
                variant="destructive"
                onClick={removeSelectedFavorites}
                className="flex-1 md:flex-none"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove ({selectedProperties.length})
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <Heart className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Saved</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalFavorites}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                  <SortAsc className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Average Price</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.avgPrice ? favoriteService.formatPrice(stats.avgPrice) : '₹0'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                  <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Available Now</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.availableProperties || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by location, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-input bg-background"
            />
          </div>
          <div className="flex gap-2">
            {filteredFavorites.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedProperties.length === filteredFavorites.length) {
                    setSelectedProperties([]);
                  } else {
                    setSelectedProperties(filteredFavorites.map(f => f.property!._id));
                  }
                }}
                className="whitespace-nowrap"
              >
                {selectedProperties.length === filteredFavorites.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                {listingTypeConfigs.map(config => (
                  <SelectItem key={config.value} value={config.value}>
                    {config.displayLabel || config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Helper Tip */}
        {filteredFavorites.length > 0 && selectedProperties.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <GitCompare className="w-4 h-4" />
            <span>Select multiple properties to compare them side-by-side.</span>
          </div>
        )}

        {/* Properties Grid */}
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No saved properties</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterType !== 'all'
                ? "No properties match your filters."
                : "Start exploring and save properties you like!"}
            </p>
            <Link to="/customer/search">
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Browse Properties
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((favorite) => {
              const property = favorite.property;
              if (!property) return null;

              const statusInfo = favoriteService.getPropertyStatusBadge(property);
              const firstImage = property.images && property.images.length > 0
                ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url)
                : null;

              return (
                <Card
                  key={favorite._id}
                  className={`group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 ${selectedProperties.includes(property._id) ? 'ring-2 ring-primary' : ''
                    }`}
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={property.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MapPin className="w-8 h-8 opacity-20" />
                      </div>
                    )}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {/* Price Tag */}
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-xl font-bold">
                        {favoriteService.formatPrice(property.price)}
                      </p>
                      <p className="text-xs text-white/80">
                        {property.listingType === 'rent' ? '/ month' : 'onwards'}
                      </p>
                    </div>
                  </div>

                  {/* Content Section */}
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={`${statusInfo.variant === 'default' ? 'bg-green-500' : 'bg-gray-500'} border-0`}>
                          {statusInfo.label}
                        </Badge>
                        <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 capitalize">
                          {getListingTypeLabel(property.listingType).toLowerCase().startsWith('for ')
                            ? getListingTypeLabel(property.listingType)
                            : `For ${getListingTypeLabel(property.listingType)}`}
                        </Badge>
                        <Badge variant="outline" className="border-border text-muted-foreground capitalize">
                          {property.type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">
                        {property.title}
                      </h3>
                      <div className="flex items-center text-muted-foreground text-sm">
                        <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {typeof property.address === 'string' ? property.address : property.address?.city || 'Location N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Key Specs */}
                    <div className="flex items-center justify-between py-3 border-t border-b border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Bed</p>
                        <p className="font-semibold text-foreground">{property.bedrooms || '-'}</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Bath</p>
                        <p className="font-semibold text-foreground">{property.bathrooms || '-'}</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Area</p>
                        <p className="font-semibold text-foreground">
                          {property.area && typeof property.area === 'object'
                            ? ((property.area as any).builtUp || (property.area as any).plot || '-')
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/customer/property/${property._id}`)}
                      >
                        View Details
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={selectedProperties.includes(property._id) ? "secondary" : "outline"}
                          size="sm"
                          className={`w-full ${selectedProperties.includes(property._id) ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : ""}`}
                          onClick={() => toggleSelection(property._id)}
                        >
                          {selectedProperties.includes(property._id) ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Compare
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/50"
                          onClick={() => removeFavorite(property._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-center text-muted-foreground pt-1">
                      Added {new Date(favorite.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFavorites;