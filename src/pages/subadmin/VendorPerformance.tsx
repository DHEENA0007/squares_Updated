import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Star, Building, MessageSquare, Search, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

interface VendorMetrics {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  totalProperties: number;
  activeProperties: number;
  rejectedProperties: number;
  averageRating: number;
  totalReviews: number;
  totalMessages: number;
  responseRate: number;
  averageResponseTime: number;
  joinedDate: string;
  lastActive?: string;
  performanceScore: number;
}

const VendorPerformance = () => {
  const [vendors, setVendors] = useState<VendorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorMetrics | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'performanceScore' | 'totalProperties' | 'averageRating'>('performanceScore');
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorMetrics();
  }, [searchTerm, sortBy]);

  const fetchVendorMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/subadmin/vendors/performance?search=${searchTerm}&sortBy=${sortBy}`);
      const data = await handleApiResponse<{ data: { vendors: VendorMetrics[] } }>(response);
      setVendors(data.data.vendors || []);
    } catch (error: any) {
      console.error('Error fetching vendor metrics:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching vendor metrics",
        variant: "destructive",
      });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const, class: 'bg-green-600' };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const, class: 'bg-yellow-600' };
    return { label: 'Needs Improvement', variant: 'destructive' as const, class: 'bg-red-600' };
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} mins`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hrs`;
    return `${Math.round(minutes / 1440)} days`;
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Performance</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze vendor performance metrics
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Performance</h1>
        <p className="text-muted-foreground mt-1">
          Track and analyze vendor performance metrics
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">
              Active property vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.filter(v => v.performanceScore >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Excellent performance (80%+)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.length > 0 
                ? (vendors.reduce((sum, v) => sum + v.averageRating, 0) / vendors.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Overall vendor ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border rounded-md bg-background"
        >
          <option value="performanceScore">Sort by Performance</option>
          <option value="totalProperties">Sort by Properties</option>
          <option value="averageRating">Sort by Rating</option>
        </select>
      </div>

      {/* Vendors List */}
      <div className="space-y-4">
        {vendors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Vendors Found</h3>
              <p className="text-muted-foreground text-center">
                No vendor data available at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          vendors.map((vendor) => {
            const perfBadge = getPerformanceBadge(vendor.performanceScore);
            return (
              <Card key={vendor._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{vendor.name}</CardTitle>
                        <Badge className={perfBadge.class}>
                          {perfBadge.label}
                        </Badge>
                      </div>
                      <CardDescription>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{vendor.email}</span>
                          {vendor.phone && <span>• {vendor.phone}</span>}
                          <span>• Joined {new Date(vendor.joinedDate).toLocaleDateString()}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-3xl font-bold ${getPerformanceColor(vendor.performanceScore)}`}>
                        {vendor.performanceScore}%
                      </div>
                      <p className="text-xs text-muted-foreground">Performance Score</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{vendor.totalProperties}</p>
                          <p className="text-xs text-muted-foreground">Total Properties</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p className="text-2xl font-bold">{vendor.averageRating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">{vendor.totalReviews} Reviews</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{vendor.responseRate}%</p>
                          <p className="text-xs text-muted-foreground">Response Rate</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {vendor.performanceScore >= 80 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-2xl font-bold">{formatResponseTime(vendor.averageResponseTime)}</p>
                          <p className="text-xs text-muted-foreground">Avg Response</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Active Properties</span>
                      <span>{vendor.activeProperties} / {vendor.totalProperties}</span>
                    </div>
                    <Progress 
                      value={(vendor.activeProperties / vendor.totalProperties) * 100} 
                      className="h-2"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* View Vendor Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedVendor?.name} - Performance Details</DialogTitle>
            <DialogDescription>
              Comprehensive performance metrics and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Email:</strong> {selectedVendor.email}</li>
                    {selectedVendor.phone && <li><strong>Phone:</strong> {selectedVendor.phone}</li>}
                    <li><strong>Joined:</strong> {new Date(selectedVendor.joinedDate).toLocaleDateString()}</li>
                    {selectedVendor.lastActive && (
                      <li><strong>Last Active:</strong> {new Date(selectedVendor.lastActive).toLocaleDateString()}</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Performance Score</h4>
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getPerformanceColor(selectedVendor.performanceScore)}`}>
                      {selectedVendor.performanceScore}%
                    </div>
                    <Badge className={`mt-2 ${getPerformanceBadge(selectedVendor.performanceScore).class}`}>
                      {getPerformanceBadge(selectedVendor.performanceScore).label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Property Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold">{selectedVendor.totalProperties}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedVendor.activeProperties}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{selectedVendor.rejectedProperties}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Customer Engagement</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">{selectedVendor.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Reviews</span>
                    <span className="font-semibold">{selectedVendor.totalReviews}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Messages</span>
                    <span className="font-semibold">{selectedVendor.totalMessages}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Rate</span>
                    <span className="font-semibold">{selectedVendor.responseRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Response Time</span>
                    <span className="font-semibold">{formatResponseTime(selectedVendor.averageResponseTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPerformance;
