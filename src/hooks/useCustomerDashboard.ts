import { useState, useEffect, useCallback } from 'react';
import { customerDashboardService, CustomerDashboardData, CustomerStats, CustomerActivity, RecommendedProperty } from '@/services/customerDashboardService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseDashboardDataResult {
  data: CustomerDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
}

export const useCustomerDashboard = (autoRefresh: boolean = true, refreshInterval: number = 60000): UseDashboardDataResult => {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await customerDashboardService.getCustomerDashboardData();
      
      if (response.success) {
        setData(response.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshStats = useCallback(async () => {
    if (!data) return;
    
    try {
      const stats = await customerDashboardService.getCustomerStats();
      setData(prev => prev ? { ...prev, stats } : null);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }, [data]);

  const refreshActivities = useCallback(async () => {
    if (!data) return;
    
    try {
      const activities = await customerDashboardService.getRecentActivities();
      setData(prev => prev ? { ...prev, recentActivities: activities } : null);
    } catch (err) {
      console.error('Failed to refresh activities:', err);
    }
  }, [data]);

  const refreshRecommendations = useCallback(async () => {
    if (!data) return;
    
    try {
      const properties = await customerDashboardService.getRecommendedProperties();
      setData(prev => prev ? { ...prev, recommendedProperties: properties } : null);
    } catch (err) {
      console.error('Failed to refresh recommendations:', err);
    }
  }, [data]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isAuthenticated, fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refreshData,
    refreshStats,
    refreshActivities,
    refreshRecommendations,
  };
};

export interface UseQuickStatsResult {
  stats: {
    favoritesCount: number;
    messagesCount: number;
    propertiesCount: number;
    unreadMessages: number;
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useQuickStats = (autoRefresh: boolean = true, refreshInterval: number = 30000): UseQuickStatsResult => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UseQuickStatsResult['stats']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const quickStats = await customerDashboardService.getQuickStats();
      setStats(quickStats);
    } catch (err) {
      console.error('Quick stats fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quick stats');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isAuthenticated, fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
};

export interface UseRecommendedPropertiesResult {
  properties: RecommendedProperty[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export const useRecommendedProperties = (initialLimit: number = 6): UseRecommendedPropertiesResult => {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<RecommendedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(true);

  const fetchProperties = useCallback(async (currentLimit: number = limit) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const recommendedProperties = await customerDashboardService.getRecommendedProperties(currentLimit);
      setProperties(recommendedProperties);
      setHasMore(recommendedProperties.length === currentLimit);
    } catch (err) {
      console.error('Recommended properties fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommended properties');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, limit]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchProperties();
  }, [fetchProperties]);

  const loadMore = useCallback(async () => {
    const newLimit = limit + initialLimit;
    setLimit(newLimit);
    await fetchProperties(newLimit);
  }, [limit, initialLimit, fetchProperties]);

  // Initial fetch
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return {
    properties,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
  };
};

// Hook for tracking user activities
export const useActivityTracking = () => {
  const trackPropertyView = useCallback(async (propertyId: string) => {
    try {
      await customerDashboardService.trackPropertyView(propertyId);
    } catch (error) {
      console.error('Failed to track property view:', error);
    }
  }, []);

  const trackSearchActivity = useCallback(async (searchQuery: string, filters?: any) => {
    try {
      await customerDashboardService.trackSearchActivity(searchQuery, filters);
    } catch (error) {
      console.error('Failed to track search activity:', error);
    }
  }, []);

  return {
    trackPropertyView,
    trackSearchActivity,
  };
};