import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Image as ImageIcon,
    Settings,
    Plus,
    Trash2,
    Save,
    RefreshCw,
    Eye,
    EyeOff,
    Upload,
    Sparkles,
    Home,
    Building,
    Calculator,
    List,
    MapPin,
    GripVertical,
    Loader2,
    Filter,
    ArrowUp,
    ArrowDown,
    Search,
} from "lucide-react";
import {
    heroContentService,
    type HeroSlide,
    type HeroSettings,
    type SellingOption,
} from "@/services/heroContentService";
import { configurationService } from "@/services/configurationService";
import type { FilterConfiguration } from "@/types/configuration";

import buyImage from "@/assets/Buy.jpg";
import rentImage from "@/assets/Rent.jpg";
import leaseImage from "@/assets/Lease.jpg";
import commercialImage from "@/assets/commercial.jpg";
import heroPropertyImage from "@/assets/hero-property.jpg";

const iconOptions = [
    { value: 'Plus', label: 'Plus', icon: Plus },
    { value: 'Calculator', label: 'Calculator', icon: Calculator },
    { value: 'List', label: 'List', icon: List },
    { value: 'Settings', label: 'Settings', icon: Settings },
    { value: 'Home', label: 'Home', icon: Home },
    { value: 'Building', label: 'Building', icon: Building },
    { value: 'MapPin', label: 'Map Pin', icon: MapPin },
    { value: 'Filter', label: 'Filter', icon: Filter },
    { value: 'Search', label: 'Search', icon: Search },
];

const actionOptions = [
    { value: 'post-property', label: 'Post Property' },
    { value: 'property-valuation', label: 'Property Valuation' },
    { value: 'quick-listing', label: 'Quick Listing' },
    { value: 'manage-properties', label: 'Manage Properties' },
    { value: 'contact', label: 'Contact Page' },
];

interface QuickFilterConfig {
    id: string;
    label: string;
    isVisible: boolean;
    displayOrder: number;
}

const HeroManagement = () => {
    const [activeTab, setActiveTab] = useState("slides");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Slides state
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
    const [slideDialogOpen, setSlideDialogOpen] = useState(false);

    // Settings state
    const [settings, setSettings] = useState<HeroSettings | null>(null);

    // Selling options state
    const [sellingOptions, setSellingOptions] = useState<SellingOption[]>([]);
    const [editingOption, setEditingOption] = useState<SellingOption | null>(null);
    const [optionDialogOpen, setOptionDialogOpen] = useState(false);

    // Listing types state
    const [listingTypes, setListingTypes] = useState<FilterConfiguration[]>([]);

    // Quick Filters state
    const [quickFilters, setQuickFilters] = useState<QuickFilterConfig[]>([]);
    const [availableFilterTypes, setAvailableFilterTypes] = useState<string[]>([]);
    const [selectedNewFilter, setSelectedNewFilter] = useState<string>("");

    // Helper to format filter type label
    const formatFilterType = (type: string) => {
        if (!type) return '';
        // Handle camelCase: insert space before caps
        const withSpaces = type.replace(/([A-Z])/g, ' $1');
        // Replace underscores/dashes with spaces
        const cleanString = withSpaces.replace(/[_-]/g, ' ');
        // Split into words and title case
        return cleanString
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Helper to get image URL
    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads')) {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const baseUrl = apiBase.replace(/\/api\/?$/, '');
            return `${baseUrl}${url}`;
        }

        // Handle local assets
        if (url.includes('Buy.jpg')) return buyImage;
        if (url.includes('Rent.jpg')) return rentImage;
        if (url.includes('Lease.jpg')) return leaseImage;
        if (url.includes('commercial.jpg')) return commercialImage;
        if (url.includes('hero-property.jpg')) return heroPropertyImage;

        return url;
    };

    // Load all data
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [slidesData, settingsData, optionsData, listingTypesData, quickFiltersData, allFiltersData] = await Promise.all([
                heroContentService.getSlides(true),
                heroContentService.getSettings(),
                heroContentService.getSellingOptions(true),
                configurationService.getFilterConfigurationsByType('listing_type', false),
                configurationService.getConfigurationMetadata('home_quick_filters'),
                configurationService.getAllFilterConfigurations(false),
            ]);
            setSlides(slidesData);
            setSettings(settingsData);
            setSellingOptions(optionsData);
            setListingTypes(listingTypesData);

            // Extract unique filter types
            const types = Array.from(new Set(allFiltersData.map(f => f.filterType))).sort();
            setAvailableFilterTypes(types);

            // Initialize quick filters
            const savedFilters = quickFiltersData?.configValue as QuickFilterConfig[] || [];

            // If no saved filters, default to common ones if available
            if (savedFilters.length === 0) {
                const defaults = ['propertyType', 'bedrooms', 'budget'];
                const initialFilters = defaults
                    .filter(d => types.includes(d) || d === 'budget') // budget might be special
                    .filter(d => types.includes(d) || d === 'budget') // budget might be special
                    .map((id, index) => ({
                        id,
                        label: formatFilterType(id),
                        isVisible: true,
                        displayOrder: index
                    }));
                setQuickFilters(initialFilters);
            } else {
                setQuickFilters(savedFilters.sort((a, b) => a.displayOrder - b.displayOrder));
            }
        } catch (error) {
            console.error('Error loading hero content:', error);
            toast.error('Failed to load hero content');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle slide save
    const handleSaveSlide = async () => {
        if (!editingSlide) return;

        // Validation
        if (!editingSlide.title?.trim()) {
            toast.error('Title is required');
            return;
        }
        if (!editingSlide.imageUrl?.trim()) {
            toast.error('Image is required');
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                tabKey: editingSlide.tabKey,
                title: editingSlide.title,
                description: editingSlide.description || '',
                imageUrl: editingSlide.imageUrl,
                isActive: editingSlide.isActive,
                displayOrder: editingSlide.displayOrder || 0,
            };

            // Only include badge if it has text or we want to show/hide it explicitly
            if (editingSlide.badge) {
                payload.badge = {
                    text: editingSlide.badge.text || '',
                    isVisible: editingSlide.badge.isVisible
                };
            }

            console.log('Saving slide payload:', payload);

            await heroContentService.createOrUpdateSlide(payload);
            toast.success('Slide saved successfully');
            setSlideDialogOpen(false);
            loadData();
        } catch (error: any) {
            console.error('Error saving slide:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save slide';
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await heroContentService.uploadSlideImage(file);
            if (editingSlide) {
                setEditingSlide({
                    ...editingSlide,
                    imageUrl: result.imageUrl,
                });
            }
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        }
    };

    // Handle settings save
    const handleSaveSettings = async () => {
        if (!settings) return;

        setIsSaving(true);
        try {
            await heroContentService.updateSettings({
                autoSlide: settings.autoSlide,
                autoSlideInterval: settings.autoSlideInterval,
                showSearchBox: settings.showSearchBox,
                showSellDropdown: settings.showSellDropdown,
                showFilters: settings.showFilters,
            });
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle selling option save
    const handleSaveOption = async () => {
        if (!editingOption) return;

        setIsSaving(true);
        try {
            await heroContentService.createOrUpdateSellingOption({
                optionId: editingOption.optionId,
                label: editingOption.label,
                description: editingOption.description,
                icon: editingOption.icon,
                action: editingOption.action,
                isActive: editingOption.isActive,
                displayOrder: editingOption.displayOrder,
            });
            toast.success('Option saved successfully');
            setOptionDialogOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving option:', error);
            toast.error('Failed to save option');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle option delete
    const handleDeleteOption = async (optionId: string) => {
        if (!confirm('Are you sure you want to delete this option?')) return;

        try {
            await heroContentService.deleteSellingOption(optionId);
            toast.success('Option deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting option:', error);
            toast.error('Failed to delete option');
        }
    };

    // Handle quick filters save
    const handleSaveQuickFilters = async () => {
        setIsSaving(true);
        try {
            await configurationService.setConfigurationMetadata('home_quick_filters', quickFilters, 'Home Page Quick Filters Configuration');
            toast.success('Quick filters saved successfully');
        } catch (error) {
            console.error('Error saving quick filters:', error);
            toast.error('Failed to save quick filters');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle filter toggle
    const handleToggleFilter = (id: string, checked: boolean) => {
        setQuickFilters(prev => prev.map(f =>
            f.id === id ? { ...f, isVisible: checked } : f
        ));
    };

    // Handle filter reorder
    const handleMoveFilter = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === quickFilters.length - 1)
        ) return;

        const newFilters = [...quickFilters];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        [newFilters[index], newFilters[targetIndex]] = [newFilters[targetIndex], newFilters[index]];

        // Update display orders
        const updatedFilters = newFilters.map((f, i) => ({ ...f, displayOrder: i }));
        setQuickFilters(updatedFilters);
    };

    // Handle add filter
    const handleAddFilter = () => {
        if (!selectedNewFilter) return;

        if (quickFilters.some(f => f.id === selectedNewFilter)) {
            toast.error('Filter already added');
            return;
        }

        const newFilter: QuickFilterConfig = {
            id: selectedNewFilter,
            label: formatFilterType(selectedNewFilter),
            isVisible: true,
            displayOrder: quickFilters.length
        };

        setQuickFilters([...quickFilters, newFilter]);
        setSelectedNewFilter("");
    };

    // Handle remove filter
    const handleRemoveFilter = (id: string) => {
        setQuickFilters(prev => prev.filter(f => f.id !== id));
    };

    // Reset slides to defaults
    const handleResetSlides = async () => {
        if (!confirm('Are you sure you want to reset all slides to defaults?')) return;

        try {
            await heroContentService.resetSlides();
            toast.success('Slides reset to defaults');
            loadData();
        } catch (error) {
            console.error('Error resetting slides:', error);
            toast.error('Failed to reset slides');
        }
    };

    // Reset selling options to defaults
    const handleResetOptions = async () => {
        if (!confirm('Are you sure you want to reset all selling options to defaults?')) return;

        try {
            await heroContentService.resetSellingOptions();
            toast.success('Selling options reset to defaults');
            loadData();
        } catch (error) {
            console.error('Error resetting options:', error);
            toast.error('Failed to reset options');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Hero Section Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage the hero section content displayed on the homepage
                    </p>
                </div>
                <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="slides" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Slides
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                    <TabsTrigger value="selling" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Selling Options
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Quick Filters
                    </TabsTrigger>
                </TabsList>

                {/* Slides Tab */}
                <TabsContent value="slides" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Hero Slides</h2>
                        <Button variant="destructive" size="sm" onClick={handleResetSlides}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset to Defaults
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {(() => {
                            // Combine listing types and commercial to get all expected tabs
                            const expectedTabs = [
                                ...listingTypes.map(lt => ({ key: lt.value, label: lt.displayLabel || lt.name })),
                                { key: 'commercial', label: 'Commercial' }
                            ];

                            // Filter out duplicates if commercial is in listing types
                            const uniqueTabs = expectedTabs.filter((tab, index, self) =>
                                index === self.findIndex((t) => t.key === tab.key)
                            );

                            return uniqueTabs.map((tab) => {
                                const slide = slides.find(s => s.tabKey === tab.key) || {
                                    _id: `temp-${tab.key}`,
                                    tabKey: tab.key,
                                    title: '',
                                    description: '',
                                    imageUrl: '',
                                    badge: { text: '', isVisible: true },
                                    isActive: false,
                                    displayOrder: 0,
                                    createdAt: '',
                                    updatedAt: ''
                                } as HeroSlide;

                                const isTemp = slide._id.startsWith('temp-');

                                return (
                                    <Card key={slide.tabKey} className={!slide.isActive && !isTemp ? 'opacity-60' : ''}>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg capitalize flex items-center gap-2">
                                                    {tab.label}
                                                    {!slide.isActive && !isTemp && (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    )}
                                                    {isTemp && (
                                                        <Badge variant="outline" className="border-dashed">Not Configured</Badge>
                                                    )}
                                                </CardTitle>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingSlide(slide);
                                                        setSlideDialogOpen(true);
                                                    }}
                                                >
                                                    {isTemp ? 'Create' : 'Edit'}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="aspect-video relative rounded-lg overflow-hidden mb-3 bg-muted">
                                                {slide.imageUrl ? (
                                                    <img
                                                        src={getImageUrl(slide.imageUrl)}
                                                        alt={slide.tabKey}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            // Prevent infinite loop if fallback also fails
                                                            if (!target.src.includes('hero-property.jpg')) {
                                                                target.src = '/src/assets/hero-property.jpg';
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                        <ImageIcon className="w-8 h-8 opacity-50" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-white p-4">
                                                    {slide.badge?.isVisible && slide.badge.text && (
                                                        <span className="bg-primary/20 text-primary-foreground px-3 py-1 rounded-full text-xs mb-2">
                                                            <Sparkles className="inline w-3 h-3 mr-1" />
                                                            {slide.badge.text}
                                                        </span>
                                                    )}
                                                    <h3 className="text-lg font-bold text-center">{slide.title || 'No Title'}</h3>
                                                    <p className="text-sm text-center mt-1 line-clamp-2">{slide.description || 'No Description'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            });
                        })()}
                    </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hero Section Settings</CardTitle>
                            <CardDescription>
                                Configure the behavior and visibility of hero section elements
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {settings && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base">Auto Slide</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically switch between tabs
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.autoSlide}
                                            onCheckedChange={(checked) =>
                                                setSettings({ ...settings, autoSlide: checked })
                                            }
                                        />
                                    </div>

                                    {settings.autoSlide && (
                                        <div className="space-y-2">
                                            <Label>Auto Slide Interval (ms)</Label>
                                            <Input
                                                type="number"
                                                min={1000}
                                                max={30000}
                                                step={500}
                                                value={settings.autoSlideInterval}
                                                onChange={(e) =>
                                                    setSettings({
                                                        ...settings,
                                                        autoSlideInterval: parseInt(e.target.value) || 5000,
                                                    })
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base">Show Search Box</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display the property search box
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.showSearchBox}
                                            onCheckedChange={(checked) =>
                                                setSettings({ ...settings, showSearchBox: checked })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base">Show Sell Dropdown</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display the sell dropdown menu
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.showSellDropdown}
                                            onCheckedChange={(checked) =>
                                                setSettings({ ...settings, showSellDropdown: checked })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base">Show Filters</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display the filter button in search
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.showFilters}
                                            onCheckedChange={(checked) =>
                                                setSettings({ ...settings, showFilters: checked })
                                            }
                                        />
                                    </div>

                                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Settings
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Selling Options Tab */}
                <TabsContent value="selling" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Selling Options</h2>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditingOption({
                                        _id: '',
                                        optionId: `option-${Date.now()}`,
                                        label: 'New Option',
                                        description: 'Description',
                                        icon: 'Plus',
                                        action: 'post-property',
                                        isActive: true,
                                        displayOrder: sellingOptions.length,
                                        createdAt: '',
                                        updatedAt: '',
                                    });
                                    setOptionDialogOpen(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Option
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleResetOptions}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {sellingOptions.map((option) => {
                            const IconComponent = iconOptions.find(i => i.value === option.icon)?.icon || Plus;
                            return (
                                <Card key={option._id} className={!option.isActive ? 'opacity-60' : ''}>
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <IconComponent className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {option.label}
                                                    {!option.isActive && (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{option.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingOption(option);
                                                    setOptionDialogOpen(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => handleDeleteOption(option.optionId)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Quick Filters Tab */}
                <TabsContent value="filters" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Filters Configuration</CardTitle>
                            <CardDescription>
                                Configure which filters appear in the quick search popup on the home page
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Add Filter</Label>
                                    <Select value={selectedNewFilter} onValueChange={setSelectedNewFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a filter to add" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableFilterTypes
                                                .filter(type => !quickFilters.some(qf => qf.id === type))
                                                .map(type => (
                                                    <SelectItem key={type} value={type}>
                                                        {formatFilterType(type)}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddFilter} disabled={!selectedNewFilter}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {quickFilters.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                        No quick filters configured. Add filters to display them on the home page.
                                    </div>
                                ) : (
                                    quickFilters.map((filter, index) => (
                                        <div key={filter.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === 0}
                                                        onClick={() => handleMoveFilter(index, 'up')}
                                                    >
                                                        <ArrowUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        disabled={index === quickFilters.length - 1}
                                                        onClick={() => handleMoveFilter(index, 'down')}
                                                    >
                                                        <ArrowDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{filter.label}</span>
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {filter.id}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {filter.isVisible ? 'Visible' : 'Hidden'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Switch
                                                    checked={filter.isVisible}
                                                    onCheckedChange={(checked) => handleToggleFilter(filter.id, checked)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleRemoveFilter(filter.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button onClick={handleSaveQuickFilters} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Configuration
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Slide Dialog */}
            <Dialog open={slideDialogOpen} onOpenChange={setSlideDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Slide - {editingSlide?.tabKey}</DialogTitle>
                        <DialogDescription>
                            Update the content for this hero slide
                        </DialogDescription>
                    </DialogHeader>

                    {editingSlide && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={editingSlide.title}
                                    onChange={(e) =>
                                        setEditingSlide({ ...editingSlide, title: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editingSlide.description}
                                    onChange={(e) =>
                                        setEditingSlide({ ...editingSlide, description: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editingSlide.imageUrl}
                                        onChange={(e) =>
                                            setEditingSlide({ ...editingSlide, imageUrl: e.target.value })
                                        }
                                        placeholder="/assets/Buy.jpg or upload"
                                    />
                                    <Label className="cursor-pointer">
                                        <div className="flex items-center justify-center px-4 py-2 border rounded-md hover:bg-muted">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                        />
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Badge Text</Label>
                                <Input
                                    value={editingSlide.badge?.text || ''}
                                    onChange={(e) =>
                                        setEditingSlide({
                                            ...editingSlide,
                                            badge: { ...editingSlide.badge, text: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>Show Badge</Label>
                                <Switch
                                    checked={editingSlide.badge?.isVisible ?? true}
                                    onCheckedChange={(checked) =>
                                        setEditingSlide({
                                            ...editingSlide,
                                            badge: { ...editingSlide.badge, isVisible: checked },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>Active</Label>
                                <Switch
                                    checked={editingSlide.isActive}
                                    onCheckedChange={(checked) =>
                                        setEditingSlide({ ...editingSlide, isActive: checked })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSlideDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSlide} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Option Dialog */}
            <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingOption?._id ? 'Edit' : 'Add'} Selling Option
                        </DialogTitle>
                    </DialogHeader>

                    {editingOption && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                    value={editingOption.label}
                                    onChange={(e) =>
                                        setEditingOption({ ...editingOption, label: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editingOption.description}
                                    onChange={(e) =>
                                        setEditingOption({ ...editingOption, description: e.target.value })
                                    }
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Select
                                    value={editingOption.icon}
                                    onValueChange={(value) =>
                                        setEditingOption({ ...editingOption, icon: value as any })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {iconOptions.map((opt) => {
                                            const Icon = opt.icon;
                                            return (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-4 h-4" />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Action</Label>
                                <Select
                                    value={editingOption.action}
                                    onValueChange={(value) =>
                                        setEditingOption({ ...editingOption, action: value as any })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actionOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>Active</Label>
                                <Switch
                                    checked={editingOption.isActive}
                                    onCheckedChange={(checked) =>
                                        setEditingOption({ ...editingOption, isActive: checked })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveOption} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HeroManagement;
