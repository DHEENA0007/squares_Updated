import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  customerPropertiesService, 
  CustomerProperty, 
  CustomerPropertyStats, 
  PropertyFilters 
} from '@/services/customerPropertiesService';
import { useRealtime, useRealtimeEvent } from '@/contexts/RealtimeContext';
import { toast } from '@/hooks/use-toast';

interface UseCustomerPropertiesReturn {
  properties: CustomerProperty[];
  stats: CustomerPropertyStats;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProperties: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  refreshProperties: () => Promise<void>;
  refreshStats: () => Promise<void>;
  createProperty: (propertyData: Partial<CustomerProperty>) => Promise<void>;
  updateProperty: (id: string, propertyData: Partial<CustomerProperty>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  togglePropertyStatus: (id: string, status: CustomerProperty['status']) => Promise<void>;
  togglePropertyFeatured: (id: string, featured: boolean) => Promise<void>;
  isConnected: boolean;
  lastUpdated: Date | null;
}

export const useCustomerProperties = (
  initialFilters: PropertyFilters = {},
  autoRefresh: boolean = true
): UseCustomerPropertiesReturn => {
  const [properties, setProperties] = useState<CustomerProperty[]>([]);
  const [stats, setStats] = useState<CustomerPropertyStats>({
    totalProperties: 0,
    activeProperties: 0,
    rentedProperties: 0,
    soldProperties: 0,
    draftProperties: 0,
    pendingProperties: 0,
    totalViews: 0,
    totalInquiries: 0,
    totalFavorites: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageViews: 0,
    averageInquiries: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProperties: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isConnected } = useRealtime();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProperties = useCallback(async (showLoading = true) => {
    try {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await customerPropertiesService.getCustomerProperties(filters);
      
      if (response.success) {
        setProperties(response.data.properties);
        setStats(response.data.stats);
        setPagination(response.data.pagination);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch properties');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Failed to fetch properties';
        setError(errorMessage);
        console.error('Error fetching customer properties:', err);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await customerPropertiesService.getCustomerPropertyStats();
      if (response.success) {
        setStats(response.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching property stats:', err);
    }
  }, []);

  const refreshProperties = useCallback(async () => {
    await fetchProperties(false);
  }, [fetchProperties]);

  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Create property
  const createProperty = useCallback(async (propertyData: Partial<CustomerProperty>) => {
    try {
      setLoading(true);
      const response = await customerPropertiesService.createProperty(propertyData);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Property created successfully!',
        });
        
        // Refresh the list
        await fetchProperties(false);
        await fetchStats();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create property';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProperties, fetchStats]);

  // Update property
  const updateProperty = useCallback(async (id: string, propertyData: Partial<CustomerProperty>) => {
    try {
      const response = await customerPropertiesService.updateProperty(id, propertyData);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Property updated successfully!',
        });
        
        // Update the property in the local state
        setProperties(prev => 
          prev.map(p => p._id === id ? { ...p, ...response.data.property } : p)
        );
        
        // Refresh stats
        await fetchStats();
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchStats]);

  // Delete property
  const deleteProperty = useCallback(async (id: string) => {
    try {
      await customerPropertiesService.deleteProperty(id);
      
      toast({
        title: 'Success',
        description: 'Property deleted successfully!',
      });
      
      // Remove from local state
      setProperties(prev => prev.filter(p => p._id !== id));
      
      // Refresh stats
      await fetchStats();
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete property';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchStats]);

  // Toggle property status
  const togglePropertyStatus = useCallback(async (id: string, status: CustomerProperty['status']) => {
    try {
      const response = await customerPropertiesService.togglePropertyStatus(id, status);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: `Property status updated to ${status}!`,
        });
        
        // Update the property in the local state
        setProperties(prev => 
          prev.map(p => p._id === id ? { ...p, status } : p)
        );
        
        // Refresh stats
        await fetchStats();
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [fetchStats]);

  // Toggle property featured status
  const togglePropertyFeatured = useCallback(async (id: string, featured: boolean) => {
    try {
      const response = await customerPropertiesService.togglePropertyFeatured(id, featured);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: `Property ${featured ? 'featured' : 'unfeatured'} successfully!`,
        });
        
        // Update the property in the local state
        setProperties(prev => 
          prev.map(p => p._id === id ? { ...p, featured } : p)
        );
        
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property featured status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  // Auto-refresh properties
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshProperties();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, refreshProperties]);

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshStats();
    }, 30000); // Refresh stats every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshStats]);

  // Initial fetch
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Real-time event handlers
  useRealtimeEvent('property_updated', useCallback((data: any) => {
    if (data.propertyId) {
      // Refresh the specific property or the entire list
      refreshProperties();
    }
  }, [refreshProperties]));

  useRealtimeEvent('property_inquiry', useCallback((data: any) => {
    if (data.propertyId) {
      // Update inquiry count for the specific property
      setProperties(prev => 
        prev.map(p => 
          p._id === data.propertyId 
            ? { ...p, inquiries: p.inquiries + 1, analytics: { ...p.analytics, weeklyInquiries: p.analytics.weeklyInquiries + 1 } }
            : p
        )
      );
      
      // Refresh stats to get updated totals
      refreshStats();
    }
  }, [refreshStats]));

  useRealtimeEvent('property_viewed', useCallback((data: any) => {
    if (data.propertyId) {
      // Update view count for the specific property
      setProperties(prev => 
        prev.map(p => 
          p._id === data.propertyId 
            ? { ...p, views: p.views + 1, analytics: { ...p.analytics, weeklyViews: p.analytics.weeklyViews + 1 } }
            : p
        )
      );
    }
  }, []));

  useRealtimeEvent('property_favorited', useCallback((data: any) => {
    if (data.propertyId) {
      // Update favorite count for the specific property
      setProperties(prev => 
        prev.map(p => 
          p._id === data.propertyId 
            ? { ...p, favorites: data.action === 'add' ? p.favorites + 1 : p.favorites - 1 }
            : p
        )
      );
    }
  }, []));

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    properties,
    stats,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    refreshProperties,
    refreshStats,
    createProperty,
    updateProperty,
    deleteProperty,
    togglePropertyStatus,
    togglePropertyFeatured,
    isConnected,
    lastUpdated,
  };
};

// Hook for property analytics
export const usePropertyAnalytics = (propertyId: string, period: 'week' | 'month' | 'year' = 'month') => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await customerPropertiesService.getPropertyAnalytics(propertyId, period);
      
      if (response.success) {
        setAnalytics(response.data);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      console.error('Error fetching property analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, period]);

  useEffect(() => {
    if (propertyId) {
      fetchAnalytics();
    }
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: fetchAnalytics,
  };
};

export default useCustomerProperties;