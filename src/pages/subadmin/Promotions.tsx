import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Plus, Edit, Trash2, Search, Eye, Calendar, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

interface Promotion {
  _id: string;
  type: 'featured' | 'sponsored' | 'premium';
  property: {
    _id: string;
    title: string;
    price: number;
    address: {
      city: string;
      state: string;
    };
  };
  vendor: {
    _id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired';
  price: number;
  impressions: number;
  clicks: number;
  createdAt: string;
}

const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPromotions();
  }, [activeTab, searchTerm]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/promotions?status=${activeTab}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { promotions: Promotion[] } }>(response);
      setPromotions(data.data.promotions || []);
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching promotions",
        variant: "destructive",
      });
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndPromotion = async (promotionId: string) => {
    try {
      setActionLoading({ ...actionLoading, [promotionId]: true });
      const response = await fetchWithAuth(`/subadmin/promotions/${promotionId}/end`, {
        method: 'POST'
      });
      
      await handleApiResponse(response);
      toast({
        title: "Success",
        description: "Promotion ended successfully",
      });
      fetchPromotions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to end promotion",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [promotionId]: false });
    }
  };

  const getPromotionTypeBadge = (type: string) => {
    switch (type) {
      case 'featured':
        return { label: 'Featured', class: 'bg-blue-600' };
      case 'sponsored':
        return { label: 'Sponsored', class: 'bg-purple-600' };
      case 'premium':
        return { label: 'Premium', class: 'bg-amber-600' };
      default:
        return { label: type, class: 'bg-gray-600' };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return 0;
    return ((clicks / impressions) * 100).toFixed(2);
  };

  if (loading && promotions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Manage property promotions and featured listings
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Manage property promotions and featured listings
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.filter(p => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + p.impressions, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + p.clicks, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.length > 0
                ? calculateCTR(
                    promotions.reduce((sum, p) => sum + p.clicks, 0),
                    promotions.reduce((sum, p) => sum + p.impressions, 0)
                  )
                : '0.00'
              }%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search promotions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {promotions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Promotions Found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'active' 
                    ? 'No active promotions at the moment'
                    : `No ${activeTab} promotions to display`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            promotions.map((promotion) => {
              const typeBadge = getPromotionTypeBadge(promotion.type);
              return (
                <Card key={promotion._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{promotion.property.title}</CardTitle>
                          <Badge className={typeBadge.class}>
                            {typeBadge.label}
                          </Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-4 text-sm">
                            <span>{promotion.property.address.city}, {promotion.property.address.state}</span>
                            <span>• Vendor: {promotion.vendor.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xl font-bold text-primary">
                          {formatPrice(promotion.price)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{promotion.impressions.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Impressions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{promotion.clicks.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{calculateCTR(promotion.clicks, promotion.impressions)}%</p>
                        <p className="text-xs text-muted-foreground">CTR</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPromotion(promotion);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {activeTab === 'active' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEndPromotion(promotion._id)}
                          disabled={actionLoading[promotion._id]}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          End Promotion
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* View Promotion Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Promotion Details</DialogTitle>
            <DialogDescription>
              Detailed information about the promotion
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Property</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{selectedPromotion.property.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPromotion.property.address.city}, {selectedPromotion.property.address.state}
                  </p>
                  <p className="text-lg font-bold mt-2">{formatPrice(selectedPromotion.property.price)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Promotion Details</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Type:</strong> {selectedPromotion.type}</li>
                    <li><strong>Status:</strong> {selectedPromotion.status}</li>
                    <li><strong>Price:</strong> {formatPrice(selectedPromotion.price)}</li>
                    <li><strong>Start Date:</strong> {new Date(selectedPromotion.startDate).toLocaleDateString()}</li>
                    <li><strong>End Date:</strong> {new Date(selectedPromotion.endDate).toLocaleDateString()}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Vendor Information</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Name:</strong> {selectedPromotion.vendor.name}</li>
                    <li><strong>Email:</strong> {selectedPromotion.vendor.email}</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedPromotion.impressions.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedPromotion.clicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {calculateCTR(selectedPromotion.clicks, selectedPromotion.impressions)}%
                    </p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Promotion Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Create a new property promotion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Promotion creation form will be implemented here</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Promotions;
