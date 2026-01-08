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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [overallStats, setOverallStats] = useState<{
    totalVendors: number;
    topPerformers: number;
    averageRating: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorMetrics();
  }, [searchTerm, sortBy]);

  const fetchVendorMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/vendors/performance?search=${searchTerm}&sortBy=${sortBy}`);
      const data = await handleApiResponse<{ data: { vendors: VendorMetrics[] } }>(response);
      const fetchedVendors = data.data.vendors || [];
      setVendors(fetchedVendors);

      // Only update overall stats when not searching to keep them static during search
      if (!searchTerm) {
        setOverallStats({
          totalVendors: fetchedVendors.length,
          topPerformers: fetchedVendors.filter(v => v.performanceScore >= 80).length,
          averageRating: fetchedVendors.length > 0
            ? fetchedVendors.reduce((sum, v) => sum + v.averageRating, 0) / fetchedVendors.length
            : 0
        });
      }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalVendors || 0}</div>
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
              {overallStats?.topPerformers || 0}
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
              {overallStats?.averageRating.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall vendor ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          className="px-4 py-2 border rounded-md bg-background w-full sm:w-auto"
        >
          <option value="performanceScore">Sort by Performance</option>
          <option value="totalProperties">Sort by Properties</option>
          <option value="averageRating">Sort by Rating</option>
        </select>
      </div>

      {/* Vendors List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Response</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Building className="h-8 w-8 text-muted-foreground mb-2" />
                    <p>No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor, index) => {
                const perfBadge = getPerformanceBadge(vendor.performanceScore);
                return (
                  <TableRow key={vendor._id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{vendor.name}</span>
                        <span className="text-xs text-muted-foreground">{vendor.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-bold ${getPerformanceColor(vendor.performanceScore)}`}>
                          {vendor.performanceScore}%
                        </div>
                        <Badge className={`${perfBadge.class} text-white hover:${perfBadge.class}`}>
                          {perfBadge.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {vendor.activeProperties} / {vendor.totalProperties} Active
                        </div>
                        <Progress
                          value={vendor.totalProperties > 0 ? (vendor.activeProperties / vendor.totalProperties) * 100 : 0}
                          className="h-1.5 w-[100px]"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span>{vendor.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({vendor.totalReviews})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{vendor.responseRate}% Rate</div>
                        <div className="text-xs text-muted-foreground">{formatResponseTime(vendor.averageResponseTime)} Avg</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Vendor Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl mx-4 sm:mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{selectedVendor?.name} - Performance Details</DialogTitle>
            <DialogDescription className="text-sm">
              Comprehensive performance metrics and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Email:</strong> <span className="break-words">{selectedVendor.email}</span></li>
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
                    <div className={`text-3xl sm:text-5xl font-bold ${getPerformanceColor(selectedVendor.performanceScore)}`}>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-xl sm:text-2xl font-bold">{selectedVendor.totalProperties}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{selectedVendor.activeProperties}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{selectedVendor.rejectedProperties}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Customer Engagement</h4>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm">Average Rating</span>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                      <span className="font-semibold">{selectedVendor.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm">Total Reviews</span>
                    <span className="font-semibold">{selectedVendor.totalReviews}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm">Total Messages</span>
                    <span className="font-semibold">{selectedVendor.totalMessages}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm">Response Rate</span>
                    <span className="font-semibold">{selectedVendor.responseRate}%</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
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
