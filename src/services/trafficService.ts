const API_BASE_URL = import.meta.env.VITE_API_URL || "https://app.buildhomemartsquares.com/api";

interface TrackingData {
    page: string;
    pageTitle?: string;
    pageType?: 'home' | 'property' | 'search' | 'profile' | 'auth' | 'dashboard' | 'admin' | 'other';
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    screenResolution?: string;
    language?: string;
    isEntryPage?: boolean;
}

interface TrafficAnalyticsData {
    overview: {
        totalVisits: number;
        uniqueVisitors: number;
        totalSessions: number;
        pagesPerSession: string;
        avgDuration: number;
        avgScrollDepth: number;
        bounceRate: string;
    };
    trafficBySource: Array<{ _id: string; count: number; uniqueVisitors: number }>;
    trafficByDevice: Array<{ _id: string; count: number }>;
    trafficByCountry: Array<{ _id: string; count: number }>;
    trafficByBrowser: Array<{ _id: string; count: number }>;
    visitsByDate: Array<{ _id: string; visits: number; uniqueVisitors: number }>;
    peakHours: Array<{ _id: number; count: number }>;
    topPages: Array<{ _id: string; pageTitle: string; views: number; avgDuration: number; bounceRate: number }>;
    entryPages: Array<{ _id: string; count: number }>;
    exitPages: Array<{ _id: string; count: number }>;
}

class TrafficService {
    private sessionId: string;
    private visitorId: string;
    private currentVisitId: string | null = null;
    private visitStartTime: number = 0;
    private isFirstVisit: boolean = true;

    constructor() {
        // Generate or retrieve session ID (persists for browser session)
        this.sessionId = sessionStorage.getItem('traffic_session_id') || this.generateId();
        sessionStorage.setItem('traffic_session_id', this.sessionId);

        // Generate or retrieve visitor ID (persists across sessions)
        this.visitorId = localStorage.getItem('traffic_visitor_id') || this.generateId();
        localStorage.setItem('traffic_visitor_id', this.visitorId);

        // Check if this is entry page
        const visitCount = sessionStorage.getItem('traffic_visit_count');
        this.isFirstVisit = !visitCount;
        sessionStorage.setItem('traffic_visit_count', String((parseInt(visitCount || '0') + 1)));

        // Setup page unload tracking
        this.setupUnloadTracking();
    }

    private generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private getUTMParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmTerm?: string; utmContent?: string } {
        const params = new URLSearchParams(window.location.search);
        return {
            utmSource: params.get('utm_source') || undefined,
            utmMedium: params.get('utm_medium') || undefined,
            utmCampaign: params.get('utm_campaign') || undefined,
            utmTerm: params.get('utm_term') || undefined,
            utmContent: params.get('utm_content') || undefined,
        };
    }

    private determinePageType(path: string): TrackingData['pageType'] {
        if (path === '/' || path === '/home') return 'home';
        if (path.includes('/property') || path.includes('/listing')) return 'property';
        if (path.includes('/search') || path.includes('/browse')) return 'search';
        if (path.includes('/profile') || path.includes('/account')) return 'profile';
        if (path.includes('/login') || path.includes('/register') || path.includes('/auth')) return 'auth';
        if (path.includes('/dashboard') || path.includes('/vendor')) return 'dashboard';
        if (path.includes('/admin') || path.includes('/rolebased')) return 'admin';
        return 'other';
    }

    private setupUnloadTracking(): void {
        // Track when user leaves the page
        window.addEventListener('beforeunload', () => {
            if (this.currentVisitId) {
                this.updateVisit({
                    duration: Math.floor((Date.now() - this.visitStartTime) / 1000),
                    isExitPage: true,
                    bounced: sessionStorage.getItem('traffic_visit_count') === '1'
                });
            }
        });

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.currentVisitId) {
                this.updateVisit({
                    duration: Math.floor((Date.now() - this.visitStartTime) / 1000)
                });
            }
        });
    }

    async trackPageVisit(customData?: Partial<TrackingData>): Promise<void> {
        const utmParams = this.getUTMParams();
        const path = window.location.pathname;

        const trackingData: any = {
            page: path,
            pageTitle: document.title,
            pageType: this.determinePageType(path),
            sessionId: this.sessionId,
            visitorId: this.visitorId,
            referrer: document.referrer,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            isEntryPage: this.isFirstVisit,
            ...utmParams,
            ...customData
        };

        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/traffic/track`, {
                method: 'POST',
                headers,
                body: JSON.stringify(trackingData)
            });

            const data = await response.json();
            if (data.success && data.visitId) {
                this.currentVisitId = data.visitId;
                this.visitStartTime = Date.now();
                this.isFirstVisit = false;
            }
        } catch (error) {
            console.error('Failed to track page visit:', error);
        }
    }

    async updateVisit(updates: {
        duration?: number;
        scrollDepth?: number;
        interactions?: { clicks?: number; formSubmissions?: number; downloads?: number };
        isExitPage?: boolean;
        bounced?: boolean;
    }): Promise<void> {
        if (!this.currentVisitId) return;

        try {
            await fetch(`${API_BASE_URL}/traffic/track/${this.currentVisitId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Failed to update visit:', error);
        }
    }

    async getRealtimeStats(): Promise<{ activeVisitors: number; visitsLastHour: number; topPages: any[]; devices: any[] }> {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/traffic/realtime`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                return data.data;
            }
            throw new Error(data.message);
        } catch (error) {
            console.error('Failed to fetch realtime stats:', error);
            return { activeVisitors: 0, visitsLastHour: 0, topPages: [], devices: [] };
        }
    }

    async getTrafficAnalytics(dateRange: string = '30'): Promise<TrafficAnalyticsData | null> {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/traffic/analytics?dateRange=${dateRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                return data.data;
            }
            throw new Error(data.message);
        } catch (error) {
            console.error('Failed to fetch traffic analytics:', error);
            return null;
        }
    }

    // Track scroll depth
    trackScrollDepth(): void {
        let maxScroll = 0;

        const updateScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const currentScroll = window.scrollY;
            const scrollPercentage = scrollHeight > 0 ? Math.round((currentScroll / scrollHeight) * 100) : 0;

            if (scrollPercentage > maxScroll) {
                maxScroll = scrollPercentage;
            }
        };

        window.addEventListener('scroll', updateScroll, { passive: true });

        // Update on page leave
        window.addEventListener('beforeunload', () => {
            if (this.currentVisitId && maxScroll > 0) {
                this.updateVisit({ scrollDepth: maxScroll });
            }
        });
    }
}

export const trafficService = new TrafficService();
export default trafficService;
