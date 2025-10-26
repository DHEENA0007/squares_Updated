import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Heart, MapPin, Search, Filter, Calendar, Share, SortAsc } from 'lucide-react';
import { favoriteService, type Favorite, type FavoriteStats } from '@/services/favoriteService';
import { toast } from '@/hooks/use-toast';
import { useRealtime, useRealtimeEvent } from '@/contexts/RealtimeContext';

const MyFavorites: React.FC = () => {
  const { isConnected } = useRealtime();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [stats, setStats] = useState<FavoriteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  // Listen for real-time favorite events
  useRealtimeEvent('favorite_added', (data) => {
    console.log('Favorite added:', data);
    loadFavorites();
    loadStats();
  });

  useRealtimeEvent('favorite_removed', (data) => {
    console.log('Favorite removed:', data);
    loadFavorites();
    loadStats();
  });

  useEffect(() => {
    loadFavorites();
    loadStats();
  }, []);

  const loadFavorites = async () => {
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
  };

  const loadStats = async () => {
    try {
      const response = await favoriteService.getFavoriteStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

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

  // Filter favorites based on search and filter criteria
  const filteredFavorites = favorites.filter(favorite => {
    const property = favorite.property;
    if (!property) return false;

    const matchesSearch = !searchQuery || 
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = !filterType || filterType === 'all' ||
      (filterType === 'available' && property.isAvailable) ||
      (filterType === 'sold' && !property.isAvailable) ||
      (filterType === 'recent' && new Date(favorite.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

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
    <div className="min-h-screen bg-background p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">
              Manage your saved properties and track your preferences
            </p>
          </div>
          {selectedProperties.length > 0 && (
            <Button
              variant="destructive"
              onClick={removeSelectedFavorites}
              className="w-fit"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Selected ({selectedProperties.length})
            </Button>
          )}
        </div>

        {/* Realtime Status */}
        <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time favorite updates active' : 'Offline mode'}
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalFavorites}</p>
                    <p className="text-sm text-muted-foreground">Total Favorites</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <SortAsc className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.avgPrice ? favoriteService.formatPrice(stats.avgPrice) : '₹0'}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Price</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.availableProperties || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Still Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Favorites List */}
        <div className="space-y-4">
          {filteredFavorites.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No favorites found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || (filterType && filterType !== 'all') ? 
                    "No properties match your search criteria" : 
                    "Start adding properties to your favorites to see them here"
                  }
                </p>
                <Link to="/customer/search">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Search Properties
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredFavorites.map((favorite) => {
              const property = favorite.property;
              if (!property) return null;
              
              const statusInfo = favoriteService.getPropertyStatusBadge(property);
              
              return (
                <Card key={favorite._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Property Image */}
                      <div className="md:w-80 h-64 md:h-48 bg-muted flex items-center justify-center relative">
                        {property.images && property.images.length > 0 ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-primary" />
                          </div>
                        )}

                        {/* Status badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <Badge variant={statusInfo.variant as any}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Selection checkbox */}
                        <div className="absolute top-2 right-2">
                          <Checkbox
                            checked={selectedProperties.includes(property._id)}
                            onCheckedChange={() => toggleSelection(property._id)}
                            className="bg-white"
                          />
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
                            <div className="flex items-center text-muted-foreground mb-2">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span className="text-sm">{property.address}, {property.city}, {property.state}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {favoriteService.formatPrice(property.price)}
                            </p>
                            {property.area && (
                              <p className="text-sm text-muted-foreground">
                                ₹{Math.round(property.price / property.area)}/sq ft
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Property Features */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                          {property.area && (
                            <div className="flex items-center gap-1">
                              <span>{property.area} sq ft</span>
                            </div>
                          )}
                          {property.bedrooms && (
                            <div className="flex items-center gap-1">
                              <span>{property.bedrooms} bed</span>
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1">
                              <span>{property.bathrooms} bath</span>
                            </div>
                          )}
                        </div>

                        {/* Amenities */}
                        {property.amenities && property.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {property.amenities.slice(0, 3).map((amenity, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                            {property.amenities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{property.amenities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Added {new Date(favorite.createdAt).toLocaleDateString()}</span>
                          </div>
                          {property.owner && (
                            <div className="flex items-center gap-1">
                              <span>Owner: {property.owner.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Share functionality
                                if (navigator.share) {
                                  navigator.share({
                                    title: property.title,
                                    text: `Check out this property: ${property.title}`,
                                    url: window.location.href
                                  });
                                }
                              }}
                            >
                              <Share className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" disabled={!property.isAvailable}>
                              View Details
                            </Button>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => removeFavorite(property._id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MyFavorites;