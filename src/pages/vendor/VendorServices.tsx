import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck,
  Home,
  DollarSign,
  Sparkles,
  Shield,
  Camera,
  Users,
  Calculator,
  FileText,
  Star,
  Phone,
  MessageSquare,
  Plus,
  Edit,
  Trash,
  Search,
  Filter,
  Loader2,
  Eye,
  TrendingUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { vendorServicesService, VendorService, ServiceStats, ServiceFilters } from "@/services/vendorServicesService";
import { useToast } from "@/hooks/use-toast";

const VendorServices = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<VendorService[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filters: ServiceFilters = {
    page: currentPage,
    limit: 10,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined,
    status: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const [servicesData, statsData] = await Promise.all([
        vendorServicesService.getServices(filters),
        vendorServicesService.getServiceStats()
      ]);
      
      setServices(servicesData.services);
      setTotalPages(servicesData.totalPages);
      setServiceStats(statsData);
    } catch (error) {
      console.error("Failed to load services:", error);
      toast({
        title: "Error",
        description: "Failed to load services. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [currentPage, selectedCategory, searchQuery]);

  const handleToggleServiceStatus = async (serviceId: string) => {
    try {
      setActionLoading(serviceId);
      const updatedService = await vendorServicesService.toggleServiceStatus(serviceId);
      if (updatedService) {
        setServices(services.map(service => 
          service._id === serviceId ? updatedService : service
        ));
      }
    } catch (error) {
      console.error("Failed to toggle service status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      setActionLoading(serviceId);
      const success = await vendorServicesService.deleteService(serviceId);
      if (success) {
        setServices(services.filter(service => service._id !== serviceId));
      }
    } catch (error) {
      console.error("Failed to delete service:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Service categories configuration
  const serviceCategories = [
    { id: 'property_management', name: 'Property Management', icon: Home, color: 'text-blue-600' },
    { id: 'consultation', name: 'Real Estate Consultation', icon: Users, color: 'text-green-600' },
    { id: 'legal_services', name: 'Legal Services', icon: FileText, color: 'text-purple-600' },
    { id: 'home_loans', name: 'Home Loans', icon: DollarSign, color: 'text-pink-600' },
    { id: 'interior_design', name: 'Interior Design', icon: Sparkles, color: 'text-orange-600' },
    { id: 'moving_services', name: 'Moving Services', icon: Truck, color: 'text-indigo-600' },
    { id: 'insurance', name: 'Property Insurance', icon: Shield, color: 'text-red-600' },
    { id: 'other', name: 'Other Services', icon: Calculator, color: 'text-teal-600' }
  ];

  const filteredServices = services.filter(service => {
    const categoryMatch = selectedCategory === "all" || service.category === selectedCategory;
    const searchMatch = !searchQuery || 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // Mock data for marketplace services
  const availableServices = [
    {
      id: 'marketplace-1',
      title: 'Professional Moving Service',
      category: 'moving_services',
      description: 'Complete relocation services with packing and unpacking',
      price: '₹15,000 - ₹50,000',
      commission: '12%',
      rating: 4.8,
      reviews: 127,
      features: ['Professional packing', 'Insured transport', '24/7 support'],
      provider: 'MoveEasy Solutions'
    },
    {
      id: 'marketplace-2',
      title: 'Interior Design Consultation',
      category: 'interior_design',
      description: 'Expert interior design planning and execution',
      price: '₹25,000 - ₹2,00,000',
      commission: '15%',
      rating: 4.9,
      reviews: 89,
      features: ['3D visualization', 'Material sourcing', 'Project management'],
      provider: 'Design Studio Pro'
    }
  ];

  const filteredAvailableServices = availableServices.filter(service => {
    const categoryMatch = selectedCategory === "all" || service.category === selectedCategory;
    const searchMatch = !searchQuery || 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading services...</span>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    return category ? category.icon : Calculator;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    return category ? category.color : "text-gray-600";
  };

  const getCategoryName = (categoryId: string) => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Other';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Value-Added Services</h1>
          <p className="text-muted-foreground">Offer additional services to your property clients</p>
        </div>
        <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-title">Service Title</Label>
                  <Input id="service-title" placeholder="Enter service title" />
                </div>
                <div>
                  <Label htmlFor="service-category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="service-description">Description</Label>
                <Textarea id="service-description" placeholder="Describe your service" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-price">Price Range</Label>
                  <Input id="service-price" placeholder="₹0 - ₹0" />
                </div>
                <div>
                  <Label htmlFor="service-commission">Commission (%)</Label>
                  <Input id="service-commission" placeholder="15%" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddServiceOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddServiceOpen(false)}>
                  Add Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{serviceStats?.totalServices || 0}</div>
            <div className="text-sm text-muted-foreground">Total Services</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{serviceStats?.activeServices || 0}</div>
            <div className="text-sm text-muted-foreground">Active Services</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{serviceStats?.totalBookings || 0}</div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {serviceStats ? vendorServicesService.formatCurrency(serviceStats.totalRevenue) : '₹0'}
            </div>
            <div className="text-sm text-muted-foreground">Revenue Earned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{serviceStats?.averageRating.toFixed(1) || '0.0'}</div>
            <div className="text-sm text-muted-foreground">Avg Rating</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-services" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-services">My Services ({filteredServices.length})</TabsTrigger>
          <TabsTrigger value="marketplace">Service Marketplace ({availableServices.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders & Bookings</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {serviceCategories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="my-services" className="space-y-4">
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredServices.map((service) => {
                const CategoryIcon = getCategoryIcon(service.category);
                return (
                  <Card key={service._id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg bg-muted`}>
                            <CategoryIcon className={`w-5 h-5 ${getCategoryColor(service.category)}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{service.title}</h3>
                            <p className="text-sm text-muted-foreground">{getCategoryName(service.category)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={service.isActive ? "default" : "secondary"}
                            className={service.isActive ? "bg-green-100 text-green-800" : ""}
                          >
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingService(service)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleToggleServiceStatus(service._id)}
                            disabled={actionLoading === service._id}
                          >
                            {actionLoading === service._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteService(service._id)}
                            disabled={actionLoading === service._id}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Price Range</p>
                          <p className="font-semibold">{vendorServicesService.getPricingDisplay(service.pricing)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-semibold text-green-600">{service.duration || 'Flexible'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Bookings</p>
                          <p className="font-semibold">{service.statistics.totalBookings}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rating</p>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                            <span className="font-semibold">{service.statistics.averageRating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground ml-1">({service.statistics.totalBookings})</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {service.features.slice(0, 2).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">by {service.vendorId}</p>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Messages
                          </Button>
                          <Button size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
                <p className="text-muted-foreground mb-4">Start offering value-added services to your clients</p>
                <Button onClick={() => setIsAddServiceOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAvailableServices.map((service) => {
              const CategoryIcon = getCategoryIcon(service.category);
              return (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3 mb-4">
                      <div className={`p-2 rounded-lg bg-muted`}>
                        <CategoryIcon className={`w-5 h-5 ${getCategoryColor(service.category)}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{service.title}</h3>
                        <p className="text-sm text-muted-foreground">{getCategoryName(service.category)}</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Price Range</p>
                        <p className="font-semibold">{service.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Commission</p>
                        <p className="font-semibold text-green-600">{service.commission}</p>
                      </div>
                    </div>

                    <div className="flex items-center mb-4">
                      <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                      <span className="font-semibold">{service.rating}</span>
                      <span className="text-xs text-muted-foreground ml-1">({service.reviews} reviews)</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {service.features.slice(0, 2).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">by {service.provider}</p>
                      <Button size="sm">
                        Add to My Services
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground">Service orders and bookings will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorServices;