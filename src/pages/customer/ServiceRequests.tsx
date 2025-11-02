import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Truck,
  FileText,
  Home,
  Star,
  Calendar,
  Phone,
  MapPin,
  IndianRupee,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { Label } from "@/components/ui/label";
import { 
  customerServiceRequestsService, 
  ServiceRequest, 
  ServiceCategory,
  ServiceProvider 
} from "@/services/customerServiceRequestsService";
import { toast } from "@/hooks/use-toast";

const ServiceRequests = () => {
  const { isConnected } = useRealtime();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "cancelled">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load service requests from API
  const loadServiceRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerServiceRequestsService.getServiceRequests({
        page: currentPage,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        serviceType: serviceFilter !== 'all' ? serviceFilter : undefined,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      setServiceRequests(response.requests || []);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error loading service requests:', error);
      toast({
        title: "Error",
        description: "Failed to load service requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, serviceFilter]);

  // Load available service categories
  const loadServiceCategories = useCallback(async () => {
    try {
      const categories = await customerServiceRequestsService.getServiceCategories();
      setServiceCategories(categories || []);
    } catch (error) {
      console.error('Error loading service categories:', error);
    }
  }, []);

  // Handle real-time service request updates
  useRealtimeEvent('service_request_updated', (data) => {
    setServiceRequests(prev => prev.map(request => 
      request.id === data.requestId ? { ...request, ...data.updates } : request
    ));
  });

  useRealtimeEvent('service_request_created', (data) => {
    setServiceRequests(prev => [data.request, ...prev]);
  });

  // Initial load
  useEffect(() => {
    loadServiceRequests();
    loadServiceCategories();
  }, [loadServiceRequests, loadServiceCategories]);

  // Handle request cancellation
  const handleCancelRequest = async (requestId: string) => {
    try {
      const confirmed = window.confirm('Are you sure you want to cancel this service request?');
      if (!confirmed) return;

      await customerServiceRequestsService.cancelServiceRequest(requestId);
      toast({
        title: "Success",
        description: "Service request cancelled successfully",
      });
      loadServiceRequests(); // Reload requests
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  // Service categories for new requests - will be loaded from API
  const defaultServiceCategories = [
    {
      id: "home_loan",
      name: "Home Loans",
      icon: CreditCard,
      description: "Get competitive home loan rates",
      color: "bg-blue-500"
    },
    {
      id: "movers",
      name: "Packers & Movers",
      icon: Truck,
      description: "Professional moving services",
      color: "bg-green-500"
    },
    {
      id: "legal",
      name: "Legal Services",
      icon: FileText,
      description: "Property legal assistance",
      color: "bg-purple-500"
    },
    {
      id: "interior",
      name: "Interior Design",
      icon: Home,
      description: "Transform your space",
      color: "bg-orange-500"
    }
  ];

  // Helper functions
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return customerServiceRequestsService.getStatusText(status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return AlertCircle;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    return customerServiceRequestsService.getStatusColor(status);
  };

  // Filtering logic for service requests
  const filteredRequests = serviceRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesService = serviceFilter === 'all' || request.serviceType === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  });

  // Calculate stats from real data
  const stats = {
    total: serviceRequests.length,
    pending: serviceRequests.filter(r => r.status === 'pending').length,
    inProgress: serviceRequests.filter(r => r.status === 'in_progress').length,
    completed: serviceRequests.filter(r => r.status === 'completed').length,
    totalAmount: serviceRequests.reduce((sum, r) => sum + (r.amount || 0), 0)
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time service updates active' : 'Offline mode'}
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading requests...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary" />
            Service Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Request and manage property-related services
          </p>
        </div>
        
        <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Service Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_loan">Home Loan</SelectItem>
                    <SelectItem value="movers">Packers & Movers</SelectItem>
                    <SelectItem value="legal">Legal Services</SelectItem>
                    <SelectItem value="interior">Interior Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe your requirements..." />
              </div>
              <div>
                <Label>Property (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Luxury 3BHK Apartment - Powai</SelectItem>
                    <SelectItem value="2">Modern Villa - Baner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowNewRequestDialog(false)} className="flex-1">
                  Submit Request
                </Button>
                <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-muted-forequest">Completed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">₹{(stats.totalAmount / 100000).toFixed(1)}L</p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="services">Browse Services</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search requests..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="home_loan">Home Loans</SelectItem>
                    <SelectItem value="movers">Movers</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="interior">Interior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Service Requests List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading service requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No service requests found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' || serviceFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first service request to get started'}
                  </p>
                  <Button onClick={() => setShowNewRequestDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                return (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Request Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xl font-semibold">{request.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {customerServiceRequestsService.getServiceTypeLabel(request.serviceType)}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mb-3">{request.description}</p>
                              
                              {/* Property Info (if linked) */}
                              {request.property && (
                                <div className="bg-muted/50 p-3 rounded-lg mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{request.property.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                    <span>{request.property.city}, {request.property.state}</span>
                                  </div>
                                </div>
                              )}

                              {/* Provider Info (if assigned) */}
                              {request.provider && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-3">
                                  <Avatar>
                                    <AvatarImage src={request.provider.avatar} />
                                    <AvatarFallback>{request.provider.name.substring(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-medium">{request.provider.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="w-3 h-3" />
                                      <span>{request.provider.phone}</span>
                                      {request.provider.rating && (
                                        <>
                                          <span>•</span>
                                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                          <span>{request.provider.rating.toFixed(1)}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <Badge className={`${getStatusColor(request.status)} mb-2`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {getStatusText(request.status)}
                              </Badge>
                              {request.amount && (
                                <>
                                  <p className="text-2xl font-bold text-primary">
                                    {customerServiceRequestsService.formatCurrency(request.amount)}
                                  </p>
                                </>
                              )}
                              {request.priority && (
                                <Badge variant="outline" className={`mt-2 ${customerServiceRequestsService.getPriorityColor(request.priority)}`}>
                                  {request.priority.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Progress bar for in-progress requests */}
                          {request.status === 'in_progress' && request.progress !== undefined && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Progress</span>
                                <span className="text-sm text-muted-foreground">{request.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all" 
                                  style={{ width: `${request.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Dates */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                            <div>
                              <span className="block">Created</span>
                              <span className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="block">Updated</span>
                              <span className="font-medium">{new Date(request.updatedAt).toLocaleDateString()}</span>
                            </div>
                            {request.estimatedCompletion && (
                              <div>
                                <span className="block">Est. Completion</span>
                                <span className="font-medium">{new Date(request.estimatedCompletion).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Documents */}
                          {request.documents && request.documents.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium mb-2">Documents</h5>
                              <div className="flex flex-wrap gap-2">
                                {request.documents.map((doc) => (
                                  <Badge key={doc.id} variant="outline" className="text-xs">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {doc.document_type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {request.provider && (
                              <Button size="sm" variant="outline">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Contact Provider
                              </Button>
                            )}
                            {request.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleCancelRequest(request.id)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Request
                              </Button>
                            )}
                            {request.status === 'completed' && (
                              <Button size="sm">
                                <Star className="w-4 h-4 mr-2" />
                                Rate Service
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Details
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
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {/* Service Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(serviceCategories.length > 0 ? serviceCategories : defaultServiceCategories).map((category) => {
              const IconComponent = defaultServiceCategories.find(c => c.id === category.id)?.icon || Briefcase;
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className={`${category.color || 'bg-primary'} w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{category.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Providers:</span>
                          <span className="font-semibold">{(category as any).providerCount || 0}</span>
                        </div>
                      </div>
                      <Button className="w-full mt-4" onClick={() => setShowNewRequestDialog(true)}>
                        Request Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServiceRequests;