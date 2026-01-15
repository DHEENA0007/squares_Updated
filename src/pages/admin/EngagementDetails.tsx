import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Heart, TrendingUp } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";

interface PropertyEngagement {
  _id: string;
  title: string;
  favoriteCount: number;
  uniqueUsers: number;
  propertyType: string;
  listingType: string;
  status: string;
  address: {
    city?: string;
    locality?: string;
    state?: string;
    pincode?: string;
    street?: string;
  };
}

const EngagementDetails = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFavorites: 0,
    totalProperties: 0,
    engagementRate: 0,
    avgFavoritesPerProperty: 0
  });

  const handleExportReport = () => {
    try {
      if (properties.length === 0) {
        toast({
          title: "No Data",
          description: "No engagement data available to export",
          variant: "destructive"
        });
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Comprehensive Summary data
      const propertiesWithFavorites = properties.filter(p => p.favoriteCount > 0);
      const propertiesWithoutFavorites = properties.filter(p => p.favoriteCount === 0);
      const maxFavorites = Math.max(...properties.map(p => p.favoriteCount));
      const minFavorites = Math.min(...propertiesWithFavorites.map(p => p.favoriteCount));

      const summaryData = [
        { 'Metric': 'Total Properties Analyzed', 'Value': stats.totalProperties, 'Details': 'All properties in the system' },
        { 'Metric': 'Total Favorites (All Time)', 'Value': stats.totalFavorites, 'Details': 'Sum of all favorites across properties' },
        { 'Metric': 'Engagement Rate', 'Value': `${stats.engagementRate}%`, 'Details': 'Favorites per property ratio' },
        { 'Metric': 'Avg. Favorites per Property', 'Value': stats.avgFavoritesPerProperty, 'Details': 'Average across all properties' },
        { 'Metric': 'Properties with Favorites', 'Value': propertiesWithFavorites.length, 'Details': 'Properties with at least 1 favorite' },
        { 'Metric': 'Properties without Favorites', 'Value': propertiesWithoutFavorites.length, 'Details': 'No user engagement yet' },
        { 'Metric': 'Maximum Favorites (Single Property)', 'Value': maxFavorites, 'Details': 'Highest engagement' },
        { 'Metric': 'Minimum Favorites (Engaged)', 'Value': minFavorites || 0, 'Details': 'Lowest among engaged properties' },
        { 'Metric': 'Engagement Penetration', 'Value': `${stats.totalProperties > 0 ? ((propertiesWithFavorites.length / stats.totalProperties) * 100).toFixed(1) : 0}%`, 'Details': 'Percentage of properties with engagement' }
      ];

      // Property Type Analysis
      const typeAnalysis: Record<string, { count: number; favorites: number; uniqueUsers: number }> = {};
      properties.forEach(p => {
        const type = p.propertyType || 'Unknown';
        if (!typeAnalysis[type]) {
          typeAnalysis[type] = { count: 0, favorites: 0, uniqueUsers: 0 };
        }
        typeAnalysis[type].count += 1;
        typeAnalysis[type].favorites += p.favoriteCount;
        typeAnalysis[type].uniqueUsers += p.uniqueUsers || 0;
      });

      const typeBreakdown = Object.entries(typeAnalysis)
        .sort((a, b) => b[1].favorites - a[1].favorites)
        .map(([type, data]) => ({
          'Property Type': type,
          'Total Properties': data.count,
          'Total Favorites': data.favorites,
          'Unique Users Engaged': data.uniqueUsers,
          'Avg. Favorites/Property': data.count > 0 ? (data.favorites / data.count).toFixed(2) : '0',
          'Engagement %': `${stats.totalFavorites > 0 ? ((data.favorites / stats.totalFavorites) * 100).toFixed(1) : 0}%`
        }));

      // Listing Type Analysis
      const listingAnalysis: Record<string, { count: number; favorites: number }> = {};
      properties.forEach(p => {
        const listing = p.listingType || 'Unknown';
        if (!listingAnalysis[listing]) {
          listingAnalysis[listing] = { count: 0, favorites: 0 };
        }
        listingAnalysis[listing].count += 1;
        listingAnalysis[listing].favorites += p.favoriteCount;
      });

      const listingBreakdown = Object.entries(listingAnalysis)
        .sort((a, b) => b[1].favorites - a[1].favorites)
        .map(([listing, data]) => ({
          'Listing Type': listing,
          'Properties': data.count,
          'Total Favorites': data.favorites,
          'Avg. Favorites': data.count > 0 ? (data.favorites / data.count).toFixed(2) : '0'
        }));

      // Status Analysis
      const statusAnalysis: Record<string, { count: number; favorites: number }> = {};
      properties.forEach(p => {
        const status = p.status || 'Unknown';
        if (!statusAnalysis[status]) {
          statusAnalysis[status] = { count: 0, favorites: 0 };
        }
        statusAnalysis[status].count += 1;
        statusAnalysis[status].favorites += p.favoriteCount;
      });

      const statusBreakdown = Object.entries(statusAnalysis)
        .map(([status, data]) => ({
          'Status': status.charAt(0).toUpperCase() + status.slice(1),
          'Properties': data.count,
          'Total Favorites': data.favorites,
          'Avg. Favorites': data.count > 0 ? (data.favorites / data.count).toFixed(2) : '0'
        }));

      // City/Location Analysis
      const cityAnalysis: Record<string, { count: number; favorites: number }> = {};
      properties.forEach(p => {
        const city = p.address?.city || 'Unknown';
        if (!cityAnalysis[city]) {
          cityAnalysis[city] = { count: 0, favorites: 0 };
        }
        cityAnalysis[city].count += 1;
        cityAnalysis[city].favorites += p.favoriteCount;
      });

      const cityBreakdown = Object.entries(cityAnalysis)
        .sort((a, b) => b[1].favorites - a[1].favorites)
        .slice(0, 25)
        .map(([city, data]) => ({
          'City': city,
          'Properties': data.count,
          'Total Favorites': data.favorites,
          'Avg. Favorites': data.count > 0 ? (data.favorites / data.count).toFixed(2) : '0',
          'Popularity %': `${stats.totalFavorites > 0 ? ((data.favorites / stats.totalFavorites) * 100).toFixed(1) : 0}%`
        }));

      // Top Engaged Properties (Top 50)
      const topEngaged = [...properties]
        .sort((a, b) => b.favoriteCount - a.favoriteCount)
        .slice(0, 50)
        .map((property, index) => ({
          'Rank': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Property Type': property.propertyType || 'N/A',
          'Listing Type': property.listingType || 'N/A',
          'Status': property.status || 'N/A',
          'City': property.address?.city || 'N/A',
          'Locality': property.address?.locality || 'N/A',
          'State': property.address?.state || 'N/A',
          'Pincode': property.address?.pincode || 'N/A',
          'Total Favorites': property.favoriteCount,
          'Unique Users': property.uniqueUsers || 'N/A',
          'Engagement Score': property.favoriteCount > 10 ? 'High' : property.favoriteCount > 5 ? 'Medium' : 'Low'
        }));

      // All Properties Detailed
      const allPropertyDetails = properties
        .sort((a, b) => b.favoriteCount - a.favoriteCount)
        .map((property, index) => ({
          '#': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Property Type': property.propertyType || 'N/A',
          'Listing Type': property.listingType || 'N/A',
          'Status': (property.status || 'N/A').charAt(0).toUpperCase() + (property.status || '').slice(1),
          'Street': property.address?.street || 'N/A',
          'Locality': property.address?.locality || 'N/A',
          'City': property.address?.city || 'N/A',
          'State': property.address?.state || 'N/A',
          'Pincode': property.address?.pincode || 'N/A',
          'Total Favorites': property.favoriteCount,
          'Unique Users Interested': property.uniqueUsers || 'N/A',
          'Has Engagement': property.favoriteCount > 0 ? 'Yes' : 'No'
        }));

      // Zero Engagement Properties (for marketing focus)
      const zeroEngagement = properties
        .filter(p => p.favoriteCount === 0)
        .map((property, index) => ({
          '#': index + 1,
          'Property ID': property._id,
          'Title': property.title || 'N/A',
          'Property Type': property.propertyType || 'N/A',
          'Listing Type': property.listingType || 'N/A',
          'Status': property.status || 'N/A',
          'City': property.address?.city || 'N/A',
          'Locality': property.address?.locality || 'N/A',
          'Needs Marketing': 'Yes'
        }));

      const config = {
        filename: 'engagement_detailed_report',
        title: 'Property Engagement Analysis Report',
        metadata: {
          'Generated on': currentDate,
          'Report Type': 'Comprehensive Engagement Analysis',
          'Total Properties Analyzed': stats.totalProperties.toString(),
          'Total Favorites Recorded': stats.totalFavorites.toString(),
          'Overall Engagement Rate': `${stats.engagementRate}%`,
          'Report Generated By': 'Admin Dashboard'
        }
      };

      const sheets = [
        {
          name: 'Executive Summary',
          data: summaryData,
          columns: [{ wch: 35 }, { wch: 20 }, { wch: 40 }]
        },
        {
          name: 'By Property Type',
          data: typeBreakdown,
          columns: [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }]
        },
        {
          name: 'By Listing Type',
          data: listingBreakdown,
          columns: [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'By Status',
          data: statusBreakdown,
          columns: [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'By City',
          data: cityBreakdown,
          columns: [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'Top 50 Engaged',
          data: topEngaged,
          columns: [{ wch: 6 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
        },
        {
          name: 'All Properties',
          data: allPropertyDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 15 }]
        },
        {
          name: 'Zero Engagement',
          data: zeroEngagement,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }]
        }
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: "Export Successful",
        description: `Comprehensive engagement report with ${sheets.length} sheets has been downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export engagement report. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchEngagementData();
  }, []);

  const fetchEngagementData = async () => {
    try {
      const token = authService.getToken();
      const favoritesRes = await fetch(`${import.meta.env.VITE_API_URL}/favorites/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!favoritesRes.ok) throw new Error('Failed to fetch favorites data');

      const favoritesData = await favoritesRes.json();

      if (favoritesData.success && favoritesData.data) {
        const { properties: propertiesWithFavorites, totalFavorites, totalProperties } = favoritesData.data;

        setProperties(propertiesWithFavorites);

        const totalProps = propertiesWithFavorites.length;
        const engagementRate = totalProps > 0 ? (totalFavorites / totalProps) * 100 : 0;

        setStats({
          totalFavorites,
          totalProperties: totalProps,
          engagementRate: Math.round(engagementRate * 10) / 10,
          avgFavoritesPerProperty: totalProps > 0 ? Math.round((totalFavorites / totalProps) * 10) / 10 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      toast({
        title: "Error",
        description: "Failed to load engagement data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold">Engagement Details</h1>
          <p className="text-muted-foreground">Property engagement metrics and favorite statistics</p>
        </div>
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Favorites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.totalFavorites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.engagementRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Favorites/Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.avgFavoritesPerProperty}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Engaged Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Properties by Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {properties.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No properties found</p>
            ) : (
              properties.slice(0, 50).map((property, index) => (
                <div key={property._id} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {index + 1}
                      </div>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-600 fill-pink-600" />
                      <div>
                        <p className="text-2xl font-bold text-pink-600">{property.favoriteCount}</p>
                        <p className="text-xs text-muted-foreground">favorites</p>
                      </div>
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

export default EngagementDetails;
