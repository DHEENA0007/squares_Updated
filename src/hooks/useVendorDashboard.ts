import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { socketService } from "@/services/socketService";
import { vendorDashboardService, VendorStats, Property, Lead, PerformanceData, VendorFilters } from "@/services/vendorDashboardService";
import { toast } from "@/hooks/use-toast";

interface UseVendorDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enableRealtime?: boolean;
}

interface VendorDashboardState {
  stats: VendorStats | null;
  recentProperties: Property[];
  recentLeads: Lead[];
  recentActivities: Array<{
    _id: string;
    type: string;
    message: string;
    property?: string;
    time: string;
    icon: string;
    propertyId?: string;
    metadata?: any;
  }>;
  performanceData: PerformanceData[];
  notifications: Array<{
    id: string;
    type: 'lead' | 'message' | 'property' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface VendorDashboardActions {
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshProperties: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshPerformance: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateFilters: (filters: VendorFilters) => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  updateLeadStatus: (leadId: string, status: Lead['status']) => Promise<void>;
}

export const useVendorDashboard = (
  options: UseVendorDashboardOptions = {}
): [VendorDashboardState, VendorDashboardActions] => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealtime = true,
  } = options;

  const { isConnected } = useRealtime();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const filtersRef = useRef<VendorFilters>({});

  const [state, setState] = useState<VendorDashboardState>({
    stats: null,
    recentProperties: [],
    recentLeads: [],
    recentActivities: [],
    performanceData: [],
    notifications: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const updateState = useCallback((updates: Partial<VendorDashboardState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      lastUpdated: new Date(),
    }));
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await vendorDashboardService.getVendorStats(
        filtersRef.current.dateRange || '7d'
      );
      updateState({ stats });
    } catch (error) {
      console.error("Failed to refresh vendor stats:", error);
      updateState({ 
        error: error instanceof Error ? error.message : "Failed to load stats" 
      });
    }
  }, [updateState]);

  const refreshProperties = useCallback(async () => {
    try {
      const recentProperties = await vendorDashboardService.getRecentProperties(6);
      updateState({ recentProperties });
    } catch (error) {
      console.error("Failed to refresh properties:", error);
    }
  }, [updateState]);

  const refreshLeads = useCallback(async () => {
    try {
      const recentLeads = await vendorDashboardService.getRecentLeads(10);
      updateState({ recentLeads });
    } catch (error) {
      console.error("Failed to refresh leads:", error);
    }
  }, [updateState]);

  const refreshPerformance = useCallback(async () => {
    try {
      const performanceData = await vendorDashboardService.getPerformanceData(
        filtersRef.current.dateRange || '7d'
      );
      updateState({ performanceData });
    } catch (error) {
      console.error("Failed to refresh performance data:", error);
    }
  }, [updateState]);

  const refreshNotifications = useCallback(async () => {
    try {
      const notifications = await vendorDashboardService.getNotifications();
      updateState({ notifications });
    } catch (error) {
      console.error("Failed to refresh notifications:", error);
    }
  }, [updateState]);

  const refreshActivities = useCallback(async () => {
    try {
      const recentActivities = await vendorDashboardService.getRecentActivities(20);
      updateState({ recentActivities });
    } catch (error) {
      console.error("Failed to refresh activities:", error);
    }
  }, [updateState]);

  const refreshData = useCallback(async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const dashboardData = await vendorDashboardService.getDashboardData(filtersRef.current);
      
      updateState({
        stats: dashboardData.stats,
        recentProperties: dashboardData.recentProperties,
        recentLeads: dashboardData.recentLeads,
        recentActivities: dashboardData.recentActivities || [],
        performanceData: dashboardData.performanceData,
        notifications: dashboardData.notifications,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : "Failed to load dashboard data" 
      });
    }
  }, [updateState]);

  const updateFilters = useCallback((filters: VendorFilters) => {
    filtersRef.current = { ...filtersRef.current, ...filters };
    // Refresh entire dashboard with new filters
    refreshData();
  }, [refreshData]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await vendorDashboardService.markNotificationAsRead(notificationId);
      
      if (success) {
        updateState({
          notifications: state.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        });
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  }, [state.notifications, updateState]);

  const updateLeadStatus = useCallback(async (leadId: string, status: Lead['status']) => {
    try {
      const success = await vendorDashboardService.updateLeadStatus(leadId, status);
      
      if (success) {
        updateState({
          recentLeads: state.recentLeads.map(lead =>
            lead._id === leadId
              ? { ...lead, status, updatedAt: new Date().toISOString() }
              : lead
          )
        });
        
        // Refresh stats after lead status change
        refreshStats();
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
    }
  }, [state.recentLeads, updateState, refreshStats]);

  // Real-time event handlers
  useEffect(() => {
    if (!enableRealtime || !isConnected) return;

    // Subscribe to vendor-specific real-time events
    const unsubscribeActivities = socketService.on('vendor:activities_updated', (data: any) => {
      console.log('Real-time activities update received:', data);
      if (data.activities) {
        updateState({ 
          recentActivities: data.activities,
          lastUpdated: new Date()
        });
      }
    });

    const unsubscribeLeads = socketService.on('vendor:leads_updated', (data: any) => {
      console.log('Real-time leads update received:', data);
      if (data.leads) {
        updateState({ 
          recentLeads: data.leads,
          lastUpdated: new Date()
        });
      }
    });

    const unsubscribePropertyUpdate = socketService.on('vendor:property_updated', (data: any) => {
      console.log('Real-time property update received:', data);
      refreshProperties();
      refreshStats();
    });

    const unsubscribeNewInquiry = socketService.on('vendor:new_inquiry', (data: any) => {
      console.log('Real-time new inquiry received:', data);
      refreshLeads();
      refreshActivities();
      
      toast({
        title: "New Inquiry",
        description: `New inquiry from ${data.customerName || 'a customer'}`,
      });
    });

    return () => {
      unsubscribeActivities();
      unsubscribeLeads();
      unsubscribePropertyUpdate();
      unsubscribeNewInquiry();
    };
  }, [
    enableRealtime,
    isConnected,
    updateState,
    refreshProperties,
    refreshStats,
    refreshLeads,
    refreshActivities,
  ]);

  // Auto refresh setup - Fixed memory leak by removing state.isLoading from dependencies
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        // Check loading state inside the callback instead of dependency array
        setState((prevState) => {
          if (!prevState.isLoading) {
            refreshData();
          }
          return prevState;
        });
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  // Initial data load - Fixed by adding refreshData to dependency array
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const actions: VendorDashboardActions = {
    refreshData,
    refreshStats,
    refreshProperties,
    refreshLeads,
    refreshActivities,
    refreshPerformance,
    refreshNotifications,
    updateFilters,
    markNotificationAsRead,
    updateLeadStatus,
  };

  return [state, actions];
};

export default useVendorDashboard;