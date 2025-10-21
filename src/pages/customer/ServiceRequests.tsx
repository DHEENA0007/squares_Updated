import { useState } from "react";
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
  ExternalLink
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ServiceRequests = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  // Mock service requests data
  const serviceRequests = [
    {
      id: 1,
      type: "home_loan",
      title: "Home Loan Application",
      description: "Need home loan for 3BHK apartment purchase in Powai",
      amount: "₹80 Lakhs",
      property: {
        title: "Luxury 3BHK Apartment",
        location: "Powai, Mumbai",
        price: "₹1.2 Cr"
      },
      provider: {
        name: "HDFC Bank",
        logo: "https://api.dicebear.com/7.x/initials/svg?seed=HDFC",
        rating: 4.5,
        phone: "+91 1800 266 4332"
      },
      status: "in_progress",
      createdAt: "2024-10-15",
      updatedAt: "2024-10-20",
      estimatedCompletion: "2024-11-15",
      documents: ["Income Certificate", "Property Papers", "ID Proof"],
      progress: 65,
      nextStep: "Property valuation scheduled for Oct 25"
    },
    {
      id: 2,
      type: "movers",
      title: "House Shifting Service",
      description: "Moving from 2BHK to 3BHK apartment within Mumbai",
      amount: "₹25,000",
      property: {
        from: "Andheri East, Mumbai",
        to: "Powai, Mumbai",
        distance: "18 km"
      },
      provider: {
        name: "Agarwal Packers & Movers",
        logo: "https://api.dicebear.com/7.x/initials/svg?seed=APM",
        rating: 4.2,
        phone: "+91 98765 43210"
      },
      status: "completed",
      createdAt: "2024-09-20",
      updatedAt: "2024-09-28",
      completedAt: "2024-09-28",
      services: ["Packing", "Loading", "Transportation", "Unloading"],
      rating: 5,
      review: "Excellent service! Very careful with fragile items."
    },
    {
      id: 3,
      type: "legal",
      title: "Property Registration",
      description: "Legal assistance for property purchase agreement",
      amount: "₹15,000",
      property: {
        title: "Modern Villa with Garden",
        location: "Baner, Pune",
        price: "₹2.5 Cr"
      },
      provider: {
        name: "Legal Associates",
        logo: "https://api.dicebear.com/7.x/initials/svg?seed=LA",
        rating: 4.7,
        phone: "+91 87654 32109"
      },
      status: "pending",
      createdAt: "2024-10-18",
      updatedAt: "2024-10-18",
      estimatedCompletion: "2024-11-10",
      documents: ["Property Title", "NOC", "Tax Receipts"],
      services: ["Document Verification", "Registration", "Agreement Drafting"]
    },
    {
      id: 4,
      type: "interior",
      title: "Interior Design Consultation",
      description: "Complete interior design for new 3BHK apartment",
      amount: "₹1.2 Lakhs",
      property: {
        title: "Luxury 3BHK Apartment",
        location: "Powai, Mumbai",
        area: "1450 sq ft"
      },
      provider: {
        name: "Design Studio",
        logo: "https://api.dicebear.com/7.x/initials/svg?seed=DS",
        rating: 4.3,
        phone: "+91 76543 21098"
      },
      status: "cancelled",
      createdAt: "2024-10-10",
      updatedAt: "2024-10-12",
      cancelledAt: "2024-10-12",
      cancellationReason: "Found another service provider",
      refundAmount: "₹5,000"
    }
  ];

  // Service categories
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
      description: "Trusted moving services",
      providers: 25,
      avgRating: 4.2,
      color: "bg-green-500"
    },
    {
      id: "legal",
      name: "Legal Services",
      icon: FileText,
      description: "Property legal assistance",
      providers: 18,
      avgRating: 4.6,
      color: "bg-purple-500"
    },
    {
      id: "interior",
      name: "Interior Design",
      icon: Home,
      description: "Professional interior designers",
      providers: 35,
      avgRating: 4.3,
      color: "bg-orange-500"
    }
  ];

  const getStatusColor = (status: string) => {
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
      default: return Clock;
    }
  };

  const filteredRequests = serviceRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesService = serviceFilter === 'all' || request.type === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  });

  const stats = {
    total: serviceRequests.length,
    pending: serviceRequests.filter(r => r.status === 'pending').length,
    inProgress: serviceRequests.filter(r => r.status === 'in_progress').length,
    completed: serviceRequests.filter(r => r.status === 'completed').length,
    totalAmount: serviceRequests.reduce((sum, r) => {
      const amount = parseFloat(r.amount.replace(/[₹,\s]/g, ''));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0)
  };

  return (
    <div className="space-y-6 pt-16">
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
          <DialogContent className="max-w-md">
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
            {filteredRequests.map((request) => {
              const StatusIcon = getStatusIcon(request.status);
              return (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Provider Info */}
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={request.provider.logo} />
                          <AvatarFallback>
                            {request.provider.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{request.provider.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{request.provider.rating}</span>
                            <span>•</span>
                            <span>{request.provider.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-semibold mb-2">{request.title}</h4>
                            <p className="text-muted-foreground mb-3">{request.description}</p>
                            
                            {/* Property Info */}
                            {request.property && (
                              <div className="bg-muted/50 p-3 rounded-lg mb-3">
                                {request.property.title && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{request.property.title}</span>
                                  </div>
                                )}
                                {request.property.location && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                    <span>{request.property.location}</span>
                                    {request.property.price && (
                                      <>
                                        <span>•</span>
                                        <span>{request.property.price}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                                {request.property.from && request.property.to && (
                                  <div className="text-sm text-muted-foreground">
                                    <span>{request.property.from} → {request.property.to}</span>
                                    <span className="ml-2">({request.property.distance})</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <Badge className={`${getStatusColor(request.status)} text-white mb-2`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusText(request.status)}
                            </Badge>
                            <p className="text-2xl font-bold text-primary">{request.amount}</p>
                          </div>
                        </div>

                        {/* Progress Bar (for in-progress requests) */}
                        {request.status === 'in_progress' && request.progress && (
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progress</span>
                              <span>{request.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${request.progress}%` }}
                              />
                            </div>
                            {request.nextStep && (
                              <p className="text-sm text-blue-600 mt-2">
                                Next: {request.nextStep}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Services/Documents */}
                        {(request.services || request.documents) && (
                          <div className="mb-4">
                            <h5 className="font-semibold mb-2">
                              {request.services ? 'Services Included:' : 'Documents Required:'}
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {(request.services || request.documents)?.map((item, index) => (
                                <Badge key={index} variant="secondary">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
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
                              <span className="block">Expected</span>
                              <span className="font-medium">{new Date(request.estimatedCompletion).toLocaleDateString()}</span>
                            </div>
                          )}
                          {request.completedAt && (
                            <div>
                              <span className="block">Completed</span>
                              <span className="font-medium text-green-600">{new Date(request.completedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Review (for completed requests) */}
                        {request.status === 'completed' && request.rating && (
                          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-green-800 dark:text-green-200">Your Review:</span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < request.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                            {request.review && (
                              <p className="text-sm text-green-700 dark:text-green-300">{request.review}</p>
                            )}
                          </div>
                        )}

                        {/* Cancellation Info */}
                        {request.status === 'cancelled' && (
                          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg mb-4">
                            <h5 className="font-semibold text-red-800 dark:text-red-200 mb-1">Cancelled</h5>
                            {request.cancellationReason && (
                              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                Reason: {request.cancellationReason}
                              </p>
                            )}
                            {request.refundAmount && (
                              <p className="text-sm text-red-700 dark:text-red-300">
                                Refund: {request.refundAmount}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-2" />
                            Call
                          </Button>
                          {request.status === 'in_progress' && (
                            <Button size="sm" variant="outline">
                              <Calendar className="w-4 h-4 mr-2" />
                              Track Progress
                            </Button>
                          )}
                          {request.status === 'completed' && !request.rating && (
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

          {filteredRequests.length === 0 && (
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