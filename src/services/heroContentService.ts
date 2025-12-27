import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with auth token
const api = axios.create({
    baseURL: `${API_BASE_URL}/hero-content`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Types
export interface HeroSlide {
    _id: string;
    tabKey: 'buy' | 'rent' | 'lease' | 'commercial';
    title: string;
    description: string;
    imageUrl: string;
    badge: {
        text: string;
        isVisible: boolean;
    };
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface HeroSettings {
    _id: string;
    autoSlide: boolean;
    autoSlideInterval: number;
    showSearchBox: boolean;
    showSellDropdown: boolean;
    showFilters: boolean;
    lastUpdatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SellingOption {
    _id: string;
    optionId: string;
    label: string;
    description: string;
    icon: 'Plus' | 'Calculator' | 'List' | 'Settings' | 'Home' | 'Building' | 'MapPin';
    action: 'post-property' | 'property-valuation' | 'quick-listing' | 'manage-properties' | 'contact';
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface HeroContent {
    slides: HeroSlide[];
    settings: HeroSettings;
    sellingOptions: SellingOption[];
}

export interface CreateHeroSlideDTO {
    tabKey: string;
    title: string;
    description: string;
    imageUrl: string;
    badge?: {
        text: string;
        isVisible: boolean;
    };
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdateHeroSlideDTO {
    title?: string;
    description?: string;
    imageUrl?: string;
    badge?: {
        text: string;
        isVisible: boolean;
    };
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdateHeroSettingsDTO {
    autoSlide?: boolean;
    autoSlideInterval?: number;
    showSearchBox?: boolean;
    showSellDropdown?: boolean;
    showFilters?: boolean;
}

export interface CreateSellingOptionDTO {
    optionId: string;
    label: string;
    description: string;
    icon: string;
    action: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdateSellingOptionDTO {
    label?: string;
    description?: string;
    icon?: string;
    action?: string;
    isActive?: boolean;
    displayOrder?: number;
}

class HeroContentService {
    // ============= Get All Hero Content =============

    async getAllHeroContent(): Promise<HeroContent> {
        const { data } = await api.get<{ success: boolean; data: HeroContent }>('/');
        return data.data;
    }

    // ============= Hero Slides =============

    async getSlides(includeInactive = false): Promise<HeroSlide[]> {
        const { data } = await api.get<{ success: boolean; data: HeroSlide[] }>(
            '/slides',
            { params: { includeInactive } }
        );
        return data.data;
    }

    async getSlideByTabKey(tabKey: string): Promise<HeroSlide | null> {
        try {
            const { data } = await api.get<{ success: boolean; data: HeroSlide }>(
                `/slides/${tabKey}`
            );
            return data.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async createOrUpdateSlide(slideData: CreateHeroSlideDTO): Promise<HeroSlide> {
        const { data } = await api.post<{ success: boolean; data: HeroSlide; message: string }>(
            '/slides',
            slideData
        );
        return data.data;
    }

    async updateSlide(tabKey: string, slideData: UpdateHeroSlideDTO): Promise<HeroSlide> {
        const { data } = await api.put<{ success: boolean; data: HeroSlide; message: string }>(
            `/slides/${tabKey}`,
            slideData
        );
        return data.data;
    }

    async uploadSlideImage(file: File): Promise<{ imageUrl: string; filename: string }> {
        const formData = new FormData();
        formData.append('image', file);

        const { data } = await api.post<{ success: boolean; data: { imageUrl: string; filename: string }; message: string }>(
            '/slides/upload-image',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return data.data;
    }

    async resetSlides(): Promise<HeroSlide[]> {
        const { data } = await api.post<{ success: boolean; data: HeroSlide[]; message: string }>(
            '/slides/reset'
        );
        return data.data;
    }

    // ============= Hero Settings =============

    async getSettings(): Promise<HeroSettings> {
        const { data } = await api.get<{ success: boolean; data: HeroSettings }>(
            '/settings'
        );
        return data.data;
    }

    async updateSettings(settings: UpdateHeroSettingsDTO): Promise<HeroSettings> {
        const { data } = await api.put<{ success: boolean; data: HeroSettings; message: string }>(
            '/settings',
            settings
        );
        return data.data;
    }

    // ============= Selling Options =============

    async getSellingOptions(includeInactive = false): Promise<SellingOption[]> {
        const { data } = await api.get<{ success: boolean; data: SellingOption[] }>(
            '/selling-options',
            { params: { includeInactive } }
        );
        return data.data;
    }

    async createOrUpdateSellingOption(optionData: CreateSellingOptionDTO): Promise<SellingOption> {
        const { data } = await api.post<{ success: boolean; data: SellingOption; message: string }>(
            '/selling-options',
            optionData
        );
        return data.data;
    }

    async updateSellingOption(optionId: string, optionData: UpdateSellingOptionDTO): Promise<SellingOption> {
        const { data } = await api.put<{ success: boolean; data: SellingOption; message: string }>(
            `/selling-options/${optionId}`,
            optionData
        );
        return data.data;
    }

    async deleteSellingOption(optionId: string): Promise<void> {
        await api.delete(`/selling-options/${optionId}`);
    }

    async resetSellingOptions(): Promise<SellingOption[]> {
        const { data } = await api.post<{ success: boolean; data: SellingOption[]; message: string }>(
            '/selling-options/reset'
        );
        return data.data;
    }
}

export const heroContentService = new HeroContentService();
