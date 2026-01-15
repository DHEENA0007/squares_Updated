import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import trafficService from '@/services/trafficService';

interface UseTrafficTrackingOptions {
    pageType?: 'home' | 'property' | 'search' | 'profile' | 'auth' | 'dashboard' | 'admin' | 'other';
    customPageTitle?: string;
    trackScrollDepth?: boolean;
}

/**
 * Hook to automatically track page visits for analytics
 * Place this in your main App component or layout components
 */
export const useTrafficTracking = (options: UseTrafficTrackingOptions = {}) => {
    const location = useLocation();
    const hasTracked = useRef<string>('');
    const { trackScrollDepth = true } = options;

    useEffect(() => {
        // Only track if the path has changed
        const currentPath = location.pathname + location.search;
        if (hasTracked.current === currentPath) return;
        hasTracked.current = currentPath;

        // Track the page visit
        trafficService.trackPageVisit({
            pageType: options.pageType,
            pageTitle: options.customPageTitle
        });

        // Setup scroll tracking if enabled
        if (trackScrollDepth) {
            trafficService.trackScrollDepth();
        }
    }, [location.pathname, location.search, options.pageType, options.customPageTitle, trackScrollDepth]);
};

/**
 * Hook to get real-time traffic statistics
 * Useful for admin dashboards
 */
export const useRealtimeTraffic = (refreshInterval: number = 30000) => {
    const [data, setData] = useState<{
        activeVisitors: number;
        visitsLastHour: number;
        topPages: any[];
        devices: any[];
    }>({ activeVisitors: 0, visitsLastHour: 0, topPages: [], devices: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const stats = await trafficService.getRealtimeStats();
            setData(stats);
            setLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, refreshInterval);

        return () => clearInterval(interval);
    }, [refreshInterval]);

    return { data, loading };
};

export default useTrafficTracking;
