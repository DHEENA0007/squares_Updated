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
import { vendorServicesService, ServiceBooking, VendorService } from "@/services/vendorServicesService";
import { toast } from "@/hooks/use-toast";

const ServiceRequests = () => {
  const { isConnected } = useRealtime();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  // Load service bookings from API
  const loadServiceBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Note: We would need a customer bookings endpoint, for now using service bookings
      // In a real app, this would be something like customerService.getBookings()
      const bookings = await vendorServicesService.getServiceBookings(""); // Empty for all bookings
      setServiceBookings(Array.isArray(bookings) ? bookings : []);
    } catch (error) {
      console.error('Error loading service bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load service requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available services
  const loadServices = useCallback(async () => {
    try {
      const response = await vendorServicesService.getServices({ status: 'active' });
      setServices(response.services || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  }, []);

  // Handle real-time service booking updates
  useRealtimeEvent('service_booking_updated', (data) => {
    setServiceBookings(prev => prev.map(booking => 
      booking._id === data.bookingId ? { ...booking, ...data.updates } : booking
    ));
  });

  useRealtimeEvent('service_booking_created', (data) => {
    setServiceBookings(prev => [data.booking, ...prev]);
  });

  // Initial load
  useEffect(() => {
    loadServiceBookings();
    loadServices();
  }, [loadServiceBookings, loadServices]);

  // Handle booking status updates
  const handleStatusUpdate = async (bookingId: string, newStatus: ServiceBooking['status']) => {
    try {
      await vendorServicesService.updateBookingStatus(bookingId, newStatus);
      toast({
        title: "Success",
        description: "Service request status updated",
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Service categories for new requests
  const serviceCategories = [
    {
      id: "home_loan",
      name: "Home Loans",
      icon: CreditCard,
      description: "Get competitive home loan rates",
      providers: 12,
      avgRating: 4.4,
      color: "bg-blue-500"
    },
    {
      id: "movers",
      name: "Packers & Movers",
      icon: Truck,
      description: "Professional moving services",
      providers: 8,
      avgRating: 4.2,
      color: "bg-green-500"
    },
    {
      id: "legal",
      name: "Legal Services",
      icon: FileText,
      description: "Property legal assistance",
      providers: 15,
      avgRating: 4.6,
      color: "bg-purple-500"
    },
    {
      id: "interior",
      name: "Interior Design",
      icon: Home,
      description: "Transform your space",
      providers: 10,
      avgRating: 4.3,
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
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return AlertCircle;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      case 'confirmed': return CheckCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtering logic for service bookings
  const filteredBookings = serviceBookings.filter(booking => {
    const matchesSearch = booking.clientDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.clientDetails.requirements?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats from real data
  const stats = {
    total: serviceBookings.length,
    pending: serviceBookings.filter(b => b.status === 'pending').length,
    inProgress: serviceBookings.filter(b => b.status === 'in_progress').length,
    completed: serviceBookings.filter(b => b.status === 'completed').length,
    totalAmount: serviceBookings.reduce((sum, b) => sum + b.totalAmount, 0)
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
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            {filteredBookings.map((booking) => {
              const StatusIcon = getStatusIcon(booking.status);
              return (
                <Card key={booking._id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Client Info */}
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarFallback>
                            {booking.clientDetails.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{booking.clientDetails.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{booking.clientDetails.phone}</span>
                            <span>•</span>
                            <span>{booking.clientDetails.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-semibold mb-2">Service Booking #{booking._id.slice(-8)}</h4>
                            <p className="text-muted-foreground mb-3">{booking.notes || booking.clientDetails.requirements || 'No additional notes'}</p>
                            
                            {/* Booking Info */}
                            <div className="bg-muted/50 p-3 rounded-lg mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">Scheduled: {new Date(booking.scheduledDate).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">at {booking.scheduledTime}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>Duration: {booking.duration} minutes</span>
                              </div>
                              {booking.clientDetails.requirements && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  <strong>Requirements:</strong> {booking.clientDetails.requirements}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge className={`${getStatusColor(booking.status)} mb-2`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusText(booking.status)}
                            </Badge>
                            <p className="text-2xl font-bold text-primary">₹{booking.totalAmount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Payment: {booking.paymentStatus}</p>
                          </div>
                        </div>

                        {/* Rating Section (for completed bookings) */}
                        {booking.status === 'completed' && booking.rating && (
                          <div className="mb-4 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">Service Rating:</span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < booking.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                                <span className="text-sm text-muted-foreground ml-1">({booking.rating}/5)</span>
                              </div>
                            </div>
                            {booking.review && (
                              <p className="text-sm text-muted-foreground">
                                "{booking.review}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                          <div>
                            <span className="block">Created</span>
                            <span className="font-medium">{new Date(booking.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="block">Updated</span>
                            <span className="font-medium">{new Date(booking.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="block">Scheduled</span>
                            <span className="font-medium">{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Review (for completed requests) */}
                        {booking.status === 'completed' && (booking as any).rating && (
                          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-green-800 dark:text-green-200">Your Review:</span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < (booking as any).rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                            {(booking as any).review && (
                              <p className="text-sm text-green-700 dark:text-green-300">{(booking as any).review}</p>
                            )}
                          </div>
                        )}
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message Vendor
                          </Button>
                          {booking.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Booking
                            </Button>
                          )}
                          {booking.status === 'completed' && !booking.rating && (
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
            })}
          </div>

          {filteredBookings.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No service requests found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or request a new service.
                </p>
                <Button onClick={() => setShowNewRequestDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Request New Service
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {/* Service Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serviceCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className={`${category.color} w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{category.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{category.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Providers:</span>
                          <span className="font-semibold">{category.providers}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Avg Rating:</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{category.avgRating}</span>
                          </div>
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