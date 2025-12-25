import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Building2, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";

interface Property {
  _id: string;
  title: string;
  propertyType: string;
  listingType: string;
  status: string;
  price: number;
  currency: string;
  address: {
    city?: string;
    locality?: string;
  };
  owner: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
}

const PropertiesDetails = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalProperties: 0,
    thisMonthProperties: 0,
    activeProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    soldProperties: 0
  });

  const handleExportProperties = () => {
    try {
      if (properties.length === 0) {
        toast({
          title: "No Data",
          description: "No property data available to export",
          variant: "destructive"
        });
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formatCurrencyValue = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
      const formatDateValue = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };
      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Calculate comprehensive statistics
      const totalPropertyValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
      const avgPropertyValue = properties.length > 0 ? totalPropertyValue / properties.length : 0;
      const maxPrice = Math.max(...properties.map(p => p.price || 0));
      const minPrice = Math.min(...properties.filter(p => p.price > 0).map(p => p.price));

      // Properties by status counts
      const availableCount = properties.filter(p => p.status === 'available').length;
      const pendingCount = properties.filter(p => p.status === 'pending').length;
      const soldCount = properties.filter(p => p.status === 'sold').length;
      const rentedCount = properties.filter(p => p.status === 'rented').length;
      const leasedCount = properties.filter(p => p.status === 'leased').length;
      const rejectedCount = properties.filter(p => p.status === 'rejected').length;

      // Properties by listing type
      const saleCount = properties.filter(p => p.listingType === 'sale').length;
      const rentCount = properties.filter(p => p.listingType === 'rent').length;
      const leaseCount = properties.filter(p => p.listingType === 'lease').length;

      // Time-based analysis
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisWeekProperties = properties.filter(p => new Date(p.createdAt) > thisWeek);
      const thisMonthProperties = properties.filter(p => new Date(p.createdAt) > thisMonth);

      // Executive Summary
      const summaryData = [
        { 'Metric': 'Total Properties', 'Value': stats.totalProperties, 'Details': 'All properties in the system' },
        { 'Metric': 'New Properties This Month', 'Value': stats.thisMonthProperties, 'Details': 'Listed in current month' },
        { 'Metric': 'New Properties This Week', 'Value': thisWeekProperties.length, 'Details': 'Listed in last 7 days' },
        { 'Metric': 'Available Properties', 'Value': stats.activeProperties, 'Details': 'Currently available for sale/rent' },
        { 'Metric': 'Pending Approval', 'Value': stats.pendingProperties, 'Details': 'Awaiting admin approval' },
        { 'Metric': 'Rejected Properties', 'Value': stats.rejectedProperties, 'Details': 'Rejected by admin' },
        { 'Metric': 'Sold Properties', 'Value': soldCount, 'Details': 'Successfully sold' },
        { 'Metric': 'Rented Properties', 'Value': rentedCount, 'Details': 'Currently rented out' },
        { 'Metric': 'Leased Properties', 'Value': leasedCount, 'Details': 'On lease' },
        { 'Metric': 'For Sale', 'Value': saleCount, 'Details': 'Listing type: Sale' },
        { 'Metric': 'For Rent', 'Value': rentCount, 'Details': 'Listing type: Rent' },
        { 'Metric': 'For Lease', 'Value': leaseCount, 'Details': 'Listing type: Lease' },
        { 'Metric': 'Total Portfolio Value', 'Value': formatCurrencyValue(totalPropertyValue), 'Details': 'Sum of all property prices' },
        { 'Metric': 'Average Property Value', 'Value': formatCurrencyValue(Math.round(avgPropertyValue)), 'Details': 'Mean price across all' },
        { 'Metric': 'Highest Priced', 'Value': formatCurrencyValue(maxPrice), 'Details': 'Maximum price' },
        { 'Metric': 'Lowest Priced', 'Value': formatCurrencyValue(minPrice || 0), 'Details': 'Minimum price (non-zero)' },
        { 'Metric': 'Approval Rate', 'Value': `${properties.length > 0 ? ((availableCount / properties.length) * 100).toFixed(1) : 0}%`, 'Details': 'Available / Total' },
        { 'Metric': 'Success Rate', 'Value': `${properties.length > 0 ? (((soldCount + rentedCount + leasedCount) / properties.length) * 100).toFixed(1) : 0}%`, 'Details': 'Sold+Rented+Leased / Total' }
      ];

      // Status breakdown with value analysis
      const statusCounts: Record<string, { count: number; value: number; avgValue: number }> = {};
      properties.forEach(p => {
        const status = p.status || 'unknown';
        if (!statusCounts[status]) {
          statusCounts[status] = { count: 0, value: 0, avgValue: 0 };
        }
        statusCounts[status].count += 1;
        statusCounts[status].value += p.price || 0;
      });

      const statusBreakdown = Object.entries(statusCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([status, data]) => ({
          'Status': status.charAt(0).toUpperCase() + status.slice(1),
          'Count': data.count,
          'Total Value': formatCurrencyValue(data.value),
          'Avg. Value': formatCurrencyValue(data.count > 0 ? Math.round(data.value / data.count) : 0),
          'Percentage': `${properties.length > 0 ? ((data.count / properties.length) * 100).toFixed(1) : 0}%`,
          'Value Share': `${totalPropertyValue > 0 ? ((data.value / totalPropertyValue) * 100).toFixed(1) : 0}%`
        }));

      // Property type breakdown with comprehensive stats
      const typeCounts: Record<string, { count: number; value: number; available: number; sold: number }> = {};
      properties.forEach(p => {
        const type = p.propertyType || 'Unknown';
        if (!typeCounts[type]) {
          typeCounts[type] = { count: 0, value: 0, available: 0, sold: 0 };
        }
        typeCounts[type].count += 1;
        typeCounts[type].value += p.price || 0;
        if (p.status === 'available') typeCounts[type].available += 1;
        if (['sold', 'rented', 'leased'].includes(p.status)) typeCounts[type].sold += 1;
      });

      const typeBreakdown = Object.entries(typeCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([type, data]) => ({
          'Property Type': type,
          'Total Count': data.count,
          'Available': data.available,
          'Sold/Rented': data.sold,
          'Total Value': formatCurrencyValue(data.value),
          'Avg. Value': formatCurrencyValue(data.count > 0 ? Math.round(data.value / data.count) : 0),
          'Market Share': `${properties.length > 0 ? ((data.count / properties.length) * 100).toFixed(1) : 0}%`,
          'Success Rate': `${data.count > 0 ? ((data.sold / data.count) * 100).toFixed(1) : 0}%`
        }));

      // Listing type breakdown with value
      const listingCounts: Record<string, { count: number; value: number }> = {};
      properties.forEach(p => {
        const listing = p.listingType || 'Unknown';
        if (!listingCounts[listing]) {
          listingCounts[listing] = { count: 0, value: 0 };
        }
        listingCounts[listing].count += 1;
        listingCounts[listing].value += p.price || 0;
      });

      const listingBreakdown = Object.entries(listingCounts).map(([listing, data]) => ({
        'Listing Type': listing.charAt(0).toUpperCase() + listing.slice(1),
        'Count': data.count,
        'Total Value': formatCurrencyValue(data.value),
        'Avg. Value': formatCurrencyValue(data.count > 0 ? Math.round(data.value / data.count) : 0),
        'Percentage': `${properties.length > 0 ? ((data.count / properties.length) * 100).toFixed(1) : 0}%`
      }));

      // City breakdown with comprehensive stats
      const cityCounts: Record<string, { count: number; value: number; available: number }> = {};
      properties.forEach(p => {
        const city = p.address?.city || 'Unknown';
        if (!cityCounts[city]) {
          cityCounts[city] = { count: 0, value: 0, available: 0 };
        }
        cityCounts[city].count += 1;
        cityCounts[city].value += p.price || 0;
        if (p.status === 'available') cityCounts[city].available += 1;
      });

      const cityBreakdown = Object.entries(cityCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 30)
        .map(([city, data]) => ({
          'City': city,
          'Total Properties': data.count,
          'Available': data.available,
          'Total Value': formatCurrencyValue(data.value),
          'Avg. Value': formatCurrencyValue(data.count > 0 ? Math.round(data.value / data.count) : 0),
          'Market Share': `${properties.length > 0 ? ((data.count / properties.length) * 100).toFixed(1) : 0}%`
        }));

      // Price Range Analysis
      const priceRanges = [
        { min: 0, max: 500000, label: 'Under ₹5 Lakh' },
        { min: 500000, max: 1000000, label: '₹5-10 Lakh' },
        { min: 1000000, max: 2500000, label: '₹10-25 Lakh' },
        { min: 2500000, max: 5000000, label: '₹25-50 Lakh' },
        { min: 5000000, max: 10000000, label: '₹50 Lakh - 1 Cr' },
        { min: 10000000, max: 50000000, label: '₹1-5 Cr' },
        { min: 50000000, max: Infinity, label: 'Above ₹5 Cr' }
      ];

      const priceRangeAnalysis = priceRanges.map(range => {
        const inRange = properties.filter(p => p.price >= range.min && p.price < range.max);
        return {
          'Price Range': range.label,
          'Count': inRange.length,
          'Available': inRange.filter(p => p.status === 'available').length,
          'Sold/Rented': inRange.filter(p => ['sold', 'rented', 'leased'].includes(p.status)).length,
          'Total Value': formatCurrencyValue(inRange.reduce((sum, p) => sum + p.price, 0)),
          'Percentage': `${properties.length > 0 ? ((inRange.length / properties.length) * 100).toFixed(1) : 0}%`
        };
      });

      // Monthly listings analysis (last 24 months)
      const monthlyListings: Record<string, { listed: number; sold: number; value: number }> = {};
      properties.forEach(p => {
        if (p.createdAt) {
          const date = new Date(p.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyListings[monthKey]) {
            monthlyListings[monthKey] = { listed: 0, sold: 0, value: 0 };
          }
          monthlyListings[monthKey].listed += 1;
          if (['sold', 'rented', 'leased'].includes(p.status)) {
            monthlyListings[monthKey].sold += 1;
          }
          monthlyListings[monthKey].value += p.price || 0;
        }
      });

      const monthlyAnalysis = Object.entries(monthlyListings)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 24)
        .map(([month, data]) => ({
          'Month': month,
          'New Listings': data.listed,
          'Sold/Rented': data.sold,
          'Total Value Listed': formatCurrencyValue(data.value),
          'Avg. Listing Value': formatCurrencyValue(data.listed > 0 ? Math.round(data.value / data.listed) : 0)
        }));

      // Available Properties (for quick reference)
      const availableProperties = properties
        .filter(p => p.status === 'available')
        .sort((a, b) => b.price - a.price)
        .map((property, index) => ({
          '#': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Type': property.propertyType || 'N/A',
          'Listing': property.listingType || 'N/A',
          'Price': formatCurrencyValue(property.price || 0),
          'City': property.address?.city || 'N/A',
          'Locality': property.address?.locality || 'N/A',
          'Owner': `${property.owner?.profile?.firstName || ''} ${property.owner?.profile?.lastName || ''}`.trim() || 'N/A',
          'Listed On': formatDateValue(property.createdAt),
          'Days Listed': Math.ceil((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }));

      // Pending Approvals (action required)
      const pendingApprovals = properties
        .filter(p => p.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((property, index) => ({
          '#': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Type': property.propertyType || 'N/A',
          'Listing': property.listingType || 'N/A',
          'Price': formatCurrencyValue(property.price || 0),
          'City': property.address?.city || 'N/A',
          'Owner': `${property.owner?.profile?.firstName || ''} ${property.owner?.profile?.lastName || ''}`.trim() || 'N/A',
          'Submitted On': formatDateTime(property.createdAt),
          'Days Pending': Math.ceil((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          'Priority': Math.ceil((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24)) > 7 ? 'High' : 'Normal'
        }));

      // Sold/Rented/Leased Properties (success stories)
      const completedProperties = properties
        .filter(p => ['sold', 'rented', 'leased'].includes(p.status))
        .sort((a, b) => b.price - a.price)
        .map((property, index) => ({
          '#': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Type': property.propertyType || 'N/A',
          'Final Status': (property.status || '').charAt(0).toUpperCase() + (property.status || '').slice(1),
          'Price': formatCurrencyValue(property.price || 0),
          'City': property.address?.city || 'N/A',
          'Owner': `${property.owner?.profile?.firstName || ''} ${property.owner?.profile?.lastName || ''}`.trim() || 'N/A',
          'Listed On': formatDateValue(property.createdAt)
        }));

      // All Properties - Comprehensive Details
      const allPropertyDetails = properties
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((property, index) => {
          const daysListed = Math.ceil((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));

          return {
            '#': index + 1,
            'Property ID': property._id,
            'Title': property.title || 'N/A',
            'Property Type': property.propertyType || 'N/A',
            'Listing Type': (property.listingType || 'N/A').charAt(0).toUpperCase() + (property.listingType || '').slice(1),
            'Status': (property.status || 'unknown').charAt(0).toUpperCase() + (property.status || 'unknown').slice(1),
            'Price': formatCurrencyValue(property.price || 0),
            'Currency': property.currency || 'INR',
            'Street': property.address?.street || 'N/A',
            'Locality': property.address?.locality || 'N/A',
            'City': property.address?.city || 'N/A',
            'Owner First Name': property.owner?.profile?.firstName || 'N/A',
            'Owner Last Name': property.owner?.profile?.lastName || 'N/A',
            'Listed On': formatDateTime(property.createdAt),
            'Days Listed': daysListed,
            'Listing Age': daysListed > 90 ? 'Old' : daysListed > 30 ? 'Moderate' : 'Fresh'
          };
        });

      const config = {
        filename: 'properties_comprehensive_report',
        title: 'Comprehensive Properties Analysis Report',
        metadata: {
          'Generated on': currentDate,
          'Report Type': 'Full Property Analytics',
          'Total Properties': stats.totalProperties.toString(),
          'Available Properties': stats.activeProperties.toString(),
          'Total Portfolio Value': formatCurrencyValue(totalPropertyValue),
          'Report Generated By': 'Admin Dashboard'
        }
      };

      const sheets = [
        {
          name: 'Executive Summary',
          data: summaryData,
          columns: [{ wch: 30 }, { wch: 25 }, { wch: 40 }]
        },
        {
          name: 'Status Analysis',
          data: statusBreakdown,
          columns: [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }]
        },
        {
          name: 'Property Types',
          data: typeBreakdown,
          columns: [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }]
        },
        {
          name: 'Listing Types',
          data: listingBreakdown,
          columns: [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 12 }]
        },
        {
          name: 'Price Ranges',
          data: priceRangeAnalysis,
          columns: [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 12 }]
        },
        {
          name: 'City Analysis',
          data: cityBreakdown,
          columns: [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 12 }]
        },
        {
          name: 'Monthly Trends',
          data: monthlyAnalysis,
          columns: [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }]
        },
        {
          name: 'Available Properties',
          data: availableProperties,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 12 }]
        },
        {
          name: 'Pending Approvals',
          data: pendingApprovals,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 }]
        },
        {
          name: 'Completed Transactions',
          data: completedProperties,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 15 }]
        },
        {
          name: 'All Properties',
          data: allPropertyDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 }]
        }
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: "Export Successful",
        description: `Comprehensive properties report with ${sheets.length} sheets has been downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export properties report. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = properties.filter(prop =>
        (prop.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.propertyType?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.address?.city?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.status?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
      setFilteredProperties(filtered);
    } else {
      setFilteredProperties(properties);
    }
  }, [searchQuery, properties]);

  const fetchPropertiesData = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/properties?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch properties data');

      const data = await response.json();
      if (data.success) {
        const props = data.data.properties;
        setProperties(props);
        setFilteredProperties(props);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonth = props.filter((p: Property) =>
          new Date(p.createdAt) >= firstDayOfMonth
        ).length;

        setStats({
          totalProperties: props.length,
          thisMonthProperties: thisMonth,
          activeProperties: props.filter((p: Property) => p.status === 'available').length,
          pendingProperties: props.filter((p: Property) => p.status === 'pending').length,
          rejectedProperties: props.filter((p: Property) => p.status === 'rejected').length,
          soldProperties: props.filter((p: Property) => ['sold', 'rented', 'leased'].includes(p.status)).length
        });
      }
    } catch (error) {
      console.error('Error fetching properties data:', error);
      toast({
        title: "Error",
        description: "Failed to load properties data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'sold':
      case 'rented':
      case 'leased':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Properties Details</h1>
          <p className="text-muted-foreground">Complete property listings and statistics</p>
        </div>
        <Button variant="outline" onClick={handleExportProperties}>
          <Download className="w-4 h-4 mr-2" />
          Export Properties
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.thisMonthProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.activeProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold/Rented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.soldProperties}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search properties by title, type, city, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Properties List */}
      <Card>
        <CardHeader>
          <CardTitle>All Properties ({filteredProperties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProperties.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No properties found</p>
            ) : (
              filteredProperties.map((property) => (
                <div key={property._id} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.address.locality}, {property.address.city}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{property.propertyType}</p>
                      <p className="text-xs text-muted-foreground">{property.listingType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(property.price, property.currency)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Listed</p>
                      <p className="text-sm">{formatDate(property.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(property.status)}
                      <span className="text-sm capitalize">{property.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertiesDetails;
