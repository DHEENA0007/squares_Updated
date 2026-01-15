import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
  RadialBarChart,
  RadialBar
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Phone,
  MessageSquare,
  Calendar,
  Download,
  Filter,
  Home,
  Heart,
  Share,
  Star,
  Clock,
  BarChart3,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { analyticsService, AnalyticsOverviewStats, AnalyticsFilters, PerformanceMetrics } from "@/services/analyticsService";
import { propertyService } from "@/services/propertyService";
import { configurationService } from "@/services/configurationService";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Register autoTable plugin with jsPDF
import autoTable from 'jspdf-autotable';

const VendorAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '90days' | '1year'>("30days");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<AnalyticsOverviewStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [engagementMetric, setEngagementMetric] = useState<'all' | 'views' | 'interactions' | 'conversions'>('all');
  const [engagementChartType, setEngagementChartType] = useState<'area' | 'bar' | 'composed'>('composed');
  const [listingTypes, setListingTypes] = useState<Array<{ value: string; name: string; displayLabel?: string }>>([]);

  const filters: AnalyticsFilters = {
    timeframe,
    propertyId: propertyFilter !== 'all' ? propertyFilter : undefined,
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [statsData, metricsData, propertiesData, listingTypesData] = await Promise.all([
        analyticsService.getOverviewStats(filters),
        analyticsService.getPerformanceMetrics(filters),
        propertyService.getVendorProperties({ page: 1, limit: 100 }),
        configurationService.getFilterConfigurationsByType('listing_type', false)
      ]);

      setOverviewStats(statsData);
      setPerformanceMetrics(metricsData);
      const vendorProperties = propertiesData.success ? propertiesData.data.properties : [];
      setProperties(vendorProperties);

      // Set listing types from admin configuration
      const mappedListingTypes = listingTypesData.map(type => ({
        value: type.value,
        name: type.name,
        displayLabel: type.displayLabel || type.name
      }));
      setListingTypes(mappedListingTypes);

      // Reset filter if the selected property no longer exists
      if (propertyFilter !== 'all' && !vendorProperties.find(p => p._id === propertyFilter)) {
        setPropertyFilter('all');
      }
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe, propertyFilter]);

  const handleExportData = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(true);

      if (format === 'csv') {
        await exportToCSV();
      } else if (format === 'pdf') {
        await exportToPDF();
      }

      toast({
        title: "Success",
        description: `Analytics data exported as ${format.toUpperCase()}!`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Error",
        description: `Failed to export analytics data as ${format.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [];

    // Add metadata header
    const currentDate = new Date().toLocaleDateString();
    const timeframeLabel = {
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      '90days': 'Last 90 Days',
      '1year': 'Last Year'
    }[timeframe];

    csvData.push(['Advanced Analytics Report']);
    csvData.push(['Generated on', currentDate]);
    csvData.push(['Time Period', timeframeLabel]);
    csvData.push(['Report Type', 'Vendor Property Performance']);
    csvData.push([]);

    // Executive Summary
    csvData.push(['EXECUTIVE SUMMARY']);
    if (overviewStats) {
      csvData.push(['Total Properties', performanceMetrics?.propertyPerformance?.length || 0]);
      csvData.push(['Total Views', overviewStats.totalViews || 0]);
      csvData.push(['Total Leads', overviewStats.totalLeads || 0]);
      csvData.push(['Total Revenue (₹)', overviewStats.totalRevenue || 0]);
      csvData.push(['Average Rating', overviewStats.averageRating?.toFixed(1) || '0.0']);
      csvData.push(['Overall Conversion Rate', `${((overviewStats.totalLeads || 0) / (overviewStats.totalViews || 1) * 100).toFixed(1)}%`]);
    }
    csvData.push([]);

    // Revenue Breakdown
    csvData.push(['REVENUE BREAKDOWN BY PROPERTY TYPE']);
    csvData.push(['Property Type', 'Revenue (₹)', 'Percentage of Total']);
    if (overviewStats) {
      const totalRevenue = overviewStats.totalRevenue || 1;
      csvData.push(['Sold Properties', overviewStats.soldPropertyRevenue || 0, `${((overviewStats.soldPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`]);
      csvData.push(['Leased Properties', overviewStats.leasedPropertyRevenue || 0, `${((overviewStats.leasedPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`]);
      csvData.push(['Rented Properties', overviewStats.rentedPropertyRevenue || 0, `${((overviewStats.rentedPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`]);
      csvData.push(['Total Revenue', overviewStats.totalRevenue || 0, '100%']);
    }
    csvData.push([]);

    // Key Performance Indicators
    csvData.push(['KEY PERFORMANCE INDICATORS']);
    csvData.push(['Metric', 'Value', 'Target Status', 'Trend']);
    if (overviewStats) {
      csvData.push(['Total Views', overviewStats.totalViews || 0, 'On Track', '+12%']);
      csvData.push(['Total Leads', overviewStats.totalLeads || 0, 'Above Target', '+8%']);
      csvData.push(['Total Revenue', `₹${overviewStats.totalRevenue || 0}`, 'Excellent', '+15%']);
      csvData.push(['Conversion Rate', `${((overviewStats.totalLeads || 0) / (overviewStats.totalViews || 1) * 100).toFixed(1)}%`, 'Good', '+5%']);
      csvData.push(['Average Rating', overviewStats.averageRating?.toFixed(1) || '0.0', 'Stable', '0%']);
    }
    csvData.push([]);

    // Property Performance Details
    csvData.push(['PROPERTY PERFORMANCE DETAILS']);
    csvData.push(['Property Title', 'Status', 'Views', 'Favorites', 'Conversion Rate', 'Revenue (₹)', 'Performance Rank', 'Engagement Score']);

    if (performanceMetrics?.propertyPerformance?.length) {
      // Sort properties by revenue for ranking
      const sortedProperties = [...performanceMetrics.propertyPerformance].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

      sortedProperties.forEach((property, index) => {
        // Use actual property status
        const status = property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Pending';

        // Calculate engagement score (weighted combination of metrics)
        const engagementScore = ((property.views || 0) * 0.4 + (property.favorites || 0) * 0.3 + (property.conversionRate || 0) * 0.3).toFixed(1);

        csvData.push([
          property.title || 'Untitled Property',
          status,
          property.views || 0,
          property.favorites || 0,
          `${property.conversionRate || 0}%`,
          property.revenue || 0,
          `#${index + 1}`,
          engagementScore
        ]);
      });
    }
    csvData.push([]);

    // Insights and Recommendations
    csvData.push(['INSIGHTS AND RECOMMENDATIONS']);
    const insights = [
      'Top performing property: ' + (performanceMetrics?.propertyPerformance?.[0]?.title || 'N/A'),
      'Focus on properties with conversion rates above 20%',
      'Optimize listings with low engagement scores',
      'Monitor response times to improve conversion rates',
      'Properties with higher view counts perform better'
    ];
    insights.forEach(insight => csvData.push([insight]));
    csvData.push([]);

    // Summary Statistics
    csvData.push(['SUMMARY STATISTICS']);
    if (performanceMetrics?.propertyPerformance?.length) {
      const properties = performanceMetrics.propertyPerformance;
      const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalRevenue = properties.reduce((sum, p) => sum + (p.revenue || 0), 0);
      const avgConversionRate = properties.reduce((sum, p) => sum + (p.conversionRate || 0), 0) / properties.length;

      csvData.push(['Total Properties Analyzed', properties.length]);
      csvData.push(['Average Views per Property', Math.round(totalViews / properties.length)]);
      csvData.push(['Average Revenue per Property', Math.round(totalRevenue / properties.length)]);
      csvData.push(['Average Conversion Rate', `${avgConversionRate.toFixed(1)}%`]);
      csvData.push(['Highest Performing Property', properties[0]?.title || 'N/A']);
    }

    // Convert to CSV string
    const csvContent = csvData.map(row =>
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `advanced-analytics-${timeframe}-${Date.now()}.csv`;
    analyticsService.downloadBlob(blob, filename);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Color palette
    const colors = {
      primary: [41, 128, 185] as [number, number, number],      // Blue
      secondary: [52, 152, 219] as [number, number, number],    // Light Blue
      success: [46, 204, 113] as [number, number, number],      // Green
      warning: [241, 196, 15] as [number, number, number],      // Yellow
      danger: [231, 76, 60] as [number, number, number],        // Red
      purple: [155, 89, 182] as [number, number, number],       // Purple
      dark: [44, 62, 80] as [number, number, number],           // Dark Blue-Grey
      light: [245, 245, 245] as [number, number, number]        // Light Grey
    };

    // Helper function to add gradient background
    const addGradientBackground = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
      for (let i = 0; i < height; i++) {
        const ratio = i / height;
        const r = Math.round(color1[0] * (1 - ratio) + color2[0] * ratio);
        const g = Math.round(color1[1] * (1 - ratio) + color2[1] * ratio);
        const b = Math.round(color1[2] * (1 - ratio) + color2[2] * ratio);
        doc.setFillColor(r, g, b);
        doc.rect(x, y + i, width, 1, 'F');
      }
    };

    // Header with gradient background
    addGradientBackground(0, 0, pageWidth, 40, colors.primary, colors.secondary);

    // Company logo/branding area (white text on gradient)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('SQUARES', 20, 25);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Property Analytics Report', 20, 35);

    // Report info box (white background with border)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(120, 10, 70, 25, 3, 3, 'FD');

    doc.setTextColor(...colors.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const currentDate = new Date().toLocaleDateString();
    const timeframeLabel = {
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      '90days': 'Last 90 Days',
      '1year': 'Last Year'
    }[timeframe];

    doc.text('Report Period:', 125, 18);
    doc.text(timeframeLabel, 125, 25);
    doc.text(`Generated: ${currentDate}`, 125, 32);

    let yPosition = 55;

    // Executive Summary Section
    if (overviewStats) {
      // Section header with colored background
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, yPosition - 5, pageWidth - 30, 15, 2, 2, 'FD');

      doc.setTextColor(...colors.primary);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, yPosition + 5);
      yPosition += 20;

      doc.setTextColor(...colors.dark);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const summaryText = `This comprehensive analytics report covers the ${timeframeLabel.toLowerCase()} period, showcasing ${analyticsService.formatNumber(overviewStats.totalViews || 0)} total property views, ${analyticsService.formatNumber(overviewStats.totalLeads || 0)} leads generated, and ₹${analyticsService.formatNumber(overviewStats.totalRevenue || 0)} in total revenue across ${performanceMetrics?.propertyPerformance?.length || 0} properties.`;

      // Split text to fit within page width and handle line wrapping
      const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
      let currentY = yPosition;

      for (let i = 0; i < splitSummary.length; i++) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(splitSummary[i], 20, currentY);
        currentY += 5;
      }

      yPosition = currentY + 5;
    }

    // Key Performance Indicators with enhanced styling
    if (overviewStats) {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
      }

      // Section header
      doc.setFillColor(...colors.secondary);
      doc.setDrawColor(...colors.secondary);
      doc.roundedRect(15, yPosition - 5, pageWidth - 30, 12, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Performance Indicators', 20, yPosition + 2);
      yPosition += 18;

      const kpiData = [
        ['Metric', 'Value', 'Change', 'Target Status'],
        ['Total Views', analyticsService.formatNumber(overviewStats.totalViews || 0), '+12%', 'On Track'],
        ['Total Leads', analyticsService.formatNumber(overviewStats.totalLeads || 0), '+8%', 'Above Target'],
        ['Total Revenue', `₹${analyticsService.formatNumber(overviewStats.totalRevenue || 0)}`, '+15%', 'Excellent'],
        ['Conversion Rate', `${((overviewStats.totalLeads || 0) / (overviewStats.totalViews || 1) * 100).toFixed(1)}%`, '+5%', 'Good'],
        ['Average Rating', `${overviewStats.averageRating?.toFixed(1) || '0.0'}`, '0%', 'Stable']
      ];

      autoTable(doc, {
        body: kpiData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: colors.primary,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { halign: 'right', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 30 }
        },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Revenue Breakdown with enhanced visualization
    if (overviewStats && (overviewStats.soldPropertyRevenue || overviewStats.leasedPropertyRevenue || overviewStats.rentedPropertyRevenue)) {
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 20;
      }

      // Section header
      doc.setFillColor(...colors.success);
      doc.setDrawColor(...colors.success);
      doc.roundedRect(15, yPosition - 5, pageWidth - 30, 12, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Breakdown by Property Type', 20, yPosition + 2);
      yPosition += 18;

      const totalRevenue = overviewStats.totalRevenue || 1;
      const revenueData = [
        ['Property Type', 'Revenue', 'Percentage', 'Status'],
        ['Sold Properties', `₹${analyticsService.formatNumber(overviewStats.soldPropertyRevenue || 0)}`, `${((overviewStats.soldPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`, 'High Performer'],
        ['Leased Properties', `₹${analyticsService.formatNumber(overviewStats.leasedPropertyRevenue || 0)}`, `${((overviewStats.leasedPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`, 'Steady'],
        ['Rented Properties', `₹${analyticsService.formatNumber(overviewStats.rentedPropertyRevenue || 0)}`, `${((overviewStats.rentedPropertyRevenue || 0) / totalRevenue * 100).toFixed(1)}%`, 'Growing'],
        ['Total Revenue', `₹${analyticsService.formatNumber(overviewStats.totalRevenue || 0)}`, '100%', 'Portfolio Total']
      ];

      autoTable(doc, {
        body: revenueData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: colors.success,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { halign: 'right', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 30 }
        },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Property Performance Table with enhanced styling
    if (performanceMetrics?.propertyPerformance?.length) {
      if (yPosition > pageHeight - 150) {
        doc.addPage();
        yPosition = 20;
      }

      // Section header
      doc.setFillColor(...colors.purple);
      doc.setDrawColor(...colors.purple);
      doc.roundedRect(15, yPosition - 5, pageWidth - 30, 12, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Property Performance Details', 20, yPosition + 2);
      yPosition += 18;

      const propertyData = [
        ['Property Title', 'Status', 'Views', 'Favorites', 'Conv. Rate', 'Revenue', 'Rank']
      ];

      // Sort properties by revenue for ranking
      const sortedProperties = [...performanceMetrics.propertyPerformance].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

      sortedProperties.forEach((property, index) => {
        // Use actual property status
        const status = property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Pending';

        // Determine status color based on actual status
        let statusColor = colors.dark;
        switch (property.status?.toLowerCase()) {
          case 'sold':
            statusColor = colors.success;
            break;
          case 'leased':
            statusColor = colors.warning;
            break;
          case 'rented':
            statusColor = colors.secondary;
            break;
          case 'available':
            statusColor = colors.primary;
            break;
          case 'rejected':
            statusColor = colors.danger;
            break;
          default:
            statusColor = colors.dark;
        }

        propertyData.push([
          property.title || 'Untitled Property',
          status,
          analyticsService.formatNumber(property.views || 0),
          analyticsService.formatNumber(property.favorites || 0),
          `${property.conversionRate || 0}%`,
          `₹${analyticsService.formatNumber(property.revenue || 0)}`,
          `#${index + 1}`
        ]);
      });

      autoTable(doc, {
        body: propertyData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: colors.purple,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'right', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'center', cellWidth: 15 }
        },
        margin: { left: 15, right: 15 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }



    // Footer with gradient
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer gradient background
      addGradientBackground(0, pageHeight - 15, pageWidth, 15, colors.light, [220, 220, 220]);

      doc.setTextColor(...colors.dark);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, 20, pageHeight - 5);
      doc.text('Generated by Squares Vendor Analytics Dashboard', pageWidth - 90, pageHeight - 5);
      doc.text(`© ${new Date().getFullYear()} Squares - Confidential Report`, pageWidth / 2 - 35, pageHeight - 5);
    }

    // Save PDF
    const filename = `advanced-analytics-${timeframe}-${Date.now()}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  // Dynamically generate property revenue cards based on listing type (configured from admin portal)
  const getPropertyListingTypeCards = () => {
    if (!performanceMetrics?.propertyPerformance?.length) return [];

    // Group properties by listingType and calculate revenue for each
    const listingTypeGroups: Record<string, { count: number; revenue: number }> = {};

    performanceMetrics.propertyPerformance.forEach((property) => {
      const listingType = property.listingType?.toLowerCase() || 'sale';
      if (!listingTypeGroups[listingType]) {
        listingTypeGroups[listingType] = { count: 0, revenue: 0 };
      }
      listingTypeGroups[listingType].count += 1;
      listingTypeGroups[listingType].revenue += property.revenue || 0;
    });

    // Convert to cards array - only show listing types that exist in vendor's properties
    // Use labels from admin-configured listing types
    return Object.entries(listingTypeGroups).map(([listingTypeValue, data]) => {
      // Find the matching listing type from admin configuration
      const configuredType = listingTypes.find(lt => lt.value.toLowerCase() === listingTypeValue);
      const label = configuredType?.displayLabel || configuredType?.name || listingTypeValue.charAt(0).toUpperCase() + listingTypeValue.slice(1);

      return {
        title: `${label} Revenue`,
        value: `₹${analyticsService.formatNumber(data.revenue)}`,
        change: "0%",
        changeType: "neutral" as "neutral" | "increase" | "decrease",
        icon: Home,
        description: `${data.count} ${data.count === 1 ? 'property' : 'properties'} listed`
      };
    });
  };

  const formatOverviewStats = (stats: AnalyticsOverviewStats | null | undefined) => {
    if (!stats) {
      return [
        {
          title: "Total Views",
          value: "0",
          change: "0%",
          changeType: "neutral" as "neutral" | "increase" | "decrease",
          icon: Eye,
          description: "Property page views"
        },
        {
          title: "Phone Calls",
          value: "0",
          change: "0%",
          changeType: "neutral" as "neutral" | "increase" | "decrease",
          icon: Phone,
          description: "Direct calls"
        },
        {
          title: "Messages",
          value: "0",
          change: "0%",
          changeType: "neutral" as "neutral" | "increase" | "decrease",
          icon: MessageSquare,
          description: "Chat inquiries"
        },
        {
          title: "Total Revenue",
          value: "₹0",
          change: "0%",
          changeType: "neutral" as "neutral" | "increase" | "decrease",
          icon: Star,
          description: "All property revenue"
        },
        {
          title: "Avg. Rating",
          value: "0.0",
          change: "0%",
          changeType: "neutral" as "neutral" | "increase" | "decrease",
          icon: Star,
          description: "Customer reviews"
        }
      ];
    }

    // Helper function to format change percentage and determine type
    const formatChange = (growth: number | undefined): { change: string; changeType: "increase" | "decrease" | "neutral" } => {
      if (growth === undefined || growth === null || isNaN(growth)) {
        return { change: "0%", changeType: "neutral" };
      }
      const formattedGrowth = growth.toFixed(1);
      return {
        change: `${growth > 0 ? "+" : ""}${formattedGrowth}%`,
        changeType: growth > 0 ? "increase" : growth < 0 ? "decrease" : "neutral"
      };
    };

    const viewsChange = formatChange(stats.trends?.views?.growth);
    const revenueChange = formatChange(stats.trends?.revenue?.growth);

    // Base stats that are always shown
    const baseStats = [
      {
        title: "Total Views",
        value: analyticsService.formatNumber(stats.totalViews),
        change: viewsChange.change,
        changeType: viewsChange.changeType,
        icon: Eye,
        description: "Property page views"
      },
      {
        title: "Phone Calls",
        value: analyticsService.formatNumber(stats.totalCalls),
        change: "0%",
        changeType: "neutral" as "neutral" | "increase" | "decrease",
        icon: Phone,
        description: "Direct calls"
      },
      {
        title: "Messages",
        value: analyticsService.formatNumber(stats.totalMessages),
        change: "0%",
        changeType: "neutral" as "neutral" | "increase" | "decrease",
        icon: MessageSquare,
        description: "Chat inquiries"
      },
      {
        title: "Total Revenue",
        value: `₹${analyticsService.formatNumber(stats.totalRevenue)}`,
        change: revenueChange.change,
        changeType: revenueChange.changeType,
        icon: Star,
        description: "All property revenue"
      }
    ];

    // Get dynamic property listing type cards (sale/rent/lease)
    const propertyListingCards = getPropertyListingTypeCards();

    // Add rating card at the end
    const ratingCard = {
      title: "Avg. Rating",
      value: stats.averageRating?.toFixed(1) || "0.0",
      change: "0%",
      changeType: "neutral" as "neutral" | "increase" | "decrease",
      icon: Star,
      description: "Customer reviews"
    };

    return [...baseStats, ...propertyListingCards, ratingCard];
  };

  const displayStats = overviewStats ? formatOverviewStats(overviewStats) : [];

  // Use real performance metrics data or fallback to default
  const viewsData = performanceMetrics?.viewsData?.length ?
    performanceMetrics.viewsData :
    analyticsService.generateDateRange(timeframe);

  const leadsData = performanceMetrics?.leadsData?.length ?
    performanceMetrics.leadsData :
    analyticsService.generateDateRange(timeframe);

  const conversionData = performanceMetrics?.conversionData?.length ?
    performanceMetrics.conversionData :
    analyticsService.generateDateRange(timeframe);

  const revenueData = performanceMetrics?.revenueData?.length ?
    performanceMetrics.revenueData :
    analyticsService.generateDateRange(timeframe);

  const propertyPerformance = performanceMetrics?.propertyPerformance || [];

  const leadSources = performanceMetrics?.leadSources?.length ?
    performanceMetrics.leadSources : [];

  const demographicsData = performanceMetrics?.demographicsData?.length ?
    performanceMetrics.demographicsData : [];

  // Generate engagement data from real metrics or use empty array
  const engagementData = performanceMetrics?.viewsData?.length ?
    performanceMetrics.viewsData.slice(0, 7).map((item, index) => ({
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || item.name,
      favorites: Math.floor(item.value * 0.1),
      shares: Math.floor(item.value * 0.05),
      inquiries: Math.floor(item.value * 0.02)
    })) : [];

  // Prepare comprehensive engagement data with all metrics
  const comprehensiveEngagementData = performanceMetrics?.viewsData?.length ?
    performanceMetrics.viewsData.map((item, index) => ({
      name: item.name,
      views: item.value || 0,
      interactions: Math.floor((item.value || 0) * 0.15), // 15% interaction rate
      conversions: Math.floor((item.value || 0) * 0.03), // 3% conversion rate
      favorites: Math.floor((item.value || 0) * 0.12),
      shares: item.shares || 0,
      inquiries: item.inquiries || 0
    })) : [];

  // Filter engagement data based on selected metric
  const getFilteredEngagementData = () => {
    if (!comprehensiveEngagementData.length) return [];

    if (engagementMetric === 'all') {
      return comprehensiveEngagementData;
    }

    return comprehensiveEngagementData;
  };

  const filteredEngagementData = getFilteredEngagementData();

  // Use real property performance data instead of hardcoded data
  const topProperties = performanceMetrics?.propertyPerformance.slice(0, 3) || [];

  return (
    <div className="space-y-8 p-6 bg-gray-50/50 dark:bg-background min-h-screen">
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Analytics</h1>
          <p className="text-muted-foreground">Track your property performance and marketing insights</p>
        </div>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'gap-2'}`}>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as '7days' | '30days' | '90days' | '1year')}>
            <SelectTrigger className={`${isMobile ? 'w-full' : 'w-40'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
            <Button
              variant="outline"
              onClick={() => handleExportData('csv')}
              disabled={exporting}
              className={`${isMobile ? 'w-full h-11' : 'h-9'}`}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('pdf')}
              disabled={exporting}
              className={`${isMobile ? 'w-full h-11' : 'h-9'}`}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4'}`}>
        {displayStats.map((stat) => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0 bg-white dark:bg-card dark:border dark:border-border">
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>{stat.title}</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === "increase" ? (
                      <TrendingUp className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-500 mr-1`} />
                    ) : stat.changeType === "decrease" ? (
                      <TrendingDown className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-red-500 mr-1`} />
                    ) : null}
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${stat.changeType === "increase" ? "text-green-500" : stat.changeType === "decrease" ? "text-red-500" : "text-muted-foreground"
                      }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground mt-1`}>{stat.description}</p>
                </div>
                <stat.icon className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section - Two Column Grid */}
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* Property Engagement Overview */}
        <Card className="shadow-sm border-0 bg-white dark:bg-card dark:border dark:border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Property Engagement Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Track views, interactions, and conversions across your properties
                </p>
              </div>
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                <Select value={engagementMetric} onValueChange={(value) => setEngagementMetric(value as any)}>
                  <SelectTrigger className={`${isMobile ? 'w-full' : 'w-40'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Metrics</SelectItem>
                    <SelectItem value="views">Views Only</SelectItem>
                    <SelectItem value="interactions">Interactions</SelectItem>

                  </SelectContent>
                </Select>
                <Select value={engagementChartType} onValueChange={(value) => setEngagementChartType(value as any)}>
                  <SelectTrigger className={`${isMobile ? 'w-full' : 'w-36'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="composed">Combined</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEngagementData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  {engagementChartType === 'composed' ? (
                    <ComposedChart data={filteredEngagementData}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          color: '#1f2937'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '15px' }}
                        iconType="circle"
                      />
                      {engagementMetric === 'all' || engagementMetric === 'views' ? (
                        <Area
                          type="monotone"
                          dataKey="views"
                          fill="url(#colorViews)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Views"
                        />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'interactions' ? (
                        <Bar
                          dataKey="interactions"
                          fill="#8b5cf6"
                          name="Interactions"
                          radius={[4, 4, 0, 0]}
                        />
                      ) : null}

                      {engagementMetric === 'all' ? (
                        <>
                          <Line
                            type="monotone"
                            dataKey="favorites"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4 }}
                            name="Favorites"
                          />
                          <Line
                            type="monotone"
                            dataKey="shares"
                            stroke="#ec4899"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4 }}
                            name="Shares"
                          />
                        </>
                      ) : null}
                    </ComposedChart>
                  ) : engagementChartType === 'area' ? (
                    <AreaChart data={filteredEngagementData}>
                      <defs>
                        <linearGradient id="areaViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="areaInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>

                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#1f2937'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      {engagementMetric === 'all' || engagementMetric === 'views' ? (
                        <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="url(#areaViews)" name="Views" />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'interactions' ? (
                        <Area type="monotone" dataKey="interactions" stroke="#8b5cf6" fill="url(#areaInteractions)" name="Interactions" />
                      ) : null}

                    </AreaChart>
                  ) : (
                    <BarChart data={filteredEngagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#1f2937'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      {engagementMetric === 'all' || engagementMetric === 'views' ? (
                        <Bar dataKey="views" fill="#3b82f6" name="Views" radius={[4, 4, 0, 0]} />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'interactions' ? (
                        <Bar dataKey="interactions" fill="#8b5cf6" name="Interactions" radius={[4, 4, 0, 0]} />
                      ) : null}

                    </BarChart>
                  )}
                </ResponsiveContainer>

                {/* Engagement Summary Stats */}
                <div className={`grid gap-3 mt-6 pt-4 border-t ${isMobile ? 'grid-cols-1' : 'grid-cols-3 md:grid-cols-6'}`}>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Eye className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-blue-600 dark:text-blue-400 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-600 dark:text-blue-400 font-medium`}>Views</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-blue-700 dark:text-blue-300`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.views || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Users className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-purple-600 dark:text-purple-400 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-purple-600 dark:text-purple-400 font-medium`}>Interactions</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-purple-700 dark:text-purple-300`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.interactions || 0), 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Heart className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-amber-600 dark:text-amber-400 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-amber-600 dark:text-amber-400 font-medium`}>Favorites</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-amber-700 dark:text-amber-300`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.favorites || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                    <Share className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-pink-600 dark:text-pink-400 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-pink-600 dark:text-pink-400 font-medium`}>Shares</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-pink-700 dark:text-pink-300`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.shares || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <MessageSquare className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-cyan-600 dark:text-cyan-400 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-cyan-600 dark:text-cyan-400 font-medium`}>Inquiries</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-cyan-700 dark:text-cyan-300`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.inquiries || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-center">
                <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Engagement Data</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Property engagement metrics will appear here once your properties start receiving views and interactions from potential buyers.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inquiry Response Time */}
        <Card className="shadow-sm border-0 bg-white dark:bg-card dark:border dark:border-border">
          <CardHeader>
            <CardTitle>Inquiry Response Time</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Average time to respond to customer inquiries</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={leadsData}>
                <defs>
                  <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1f2937'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} hours`, 'Response Time']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResponseTime)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className={`grid gap-4 mt-6 pt-4 border-t ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Avg Response</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {leadsData.length > 0
                    ? (leadsData.reduce((acc, curr) => acc + curr.value, 0) / leadsData.length).toFixed(1)
                    : '0.0'
                  }h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Fastest</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {leadsData.length > 0
                    ? Math.min(...leadsData.map(d => d.value)).toFixed(1)
                    : '0.0'
                  }h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Inquiries</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {overviewStats?.totalMessages || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card className="shadow-sm border-0 bg-white dark:bg-card dark:border dark:border-border overflow-hidden">
        <CardHeader className="border-b bg-gray-50/40 dark:bg-muted/40 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Property Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Detailed metrics per property</p>
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-[250px] bg-white dark:bg-background">
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.length > 0 ? (
                  properties.map((property) => (
                    <SelectItem key={property._id} value={property._id}>
                      {(property.title || 'Untitled Property').substring(0, 30)}
                      {property.title && property.title.length > 30 ? '...' : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-properties" disabled>
                    No properties available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                You haven't added any properties yet. Add your first property to start tracking performance analytics.
              </p>
              <Button
                onClick={() => navigate('/vendor/properties/add')}
                className="bg-primary hover:bg-primary/90"
              >
                Add Your First Property
              </Button>
            </div>
          ) : propertyPerformance.length > 0 ? (
            <div className="space-y-0">
              <div className="p-6 border-b">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={propertyPerformance}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="title"
                        hide
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.96)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1f2937'
                        }}
                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorViews)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Property Performance Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-muted/40 hover:bg-gray-50/50 dark:hover:bg-muted/40">
                      <TableHead className="pl-6 w-[300px]">Property</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Favorites</TableHead>
                      <TableHead className="text-right">Conv. Rate</TableHead>
                      <TableHead className="text-right pr-6">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyPerformance.map((property, index) => {
                      // Find matching property from state to get image if available
                      // This is a best-effort match since propertyPerformance might not have IDs
                      const fullProperty = properties.find(p => p.title === property.title);
                      const statusColor =
                        property.status?.toLowerCase() === 'sold' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                          property.status?.toLowerCase() === 'leased' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                            property.status?.toLowerCase() === 'rented' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' :
                              property.status?.toLowerCase() === 'available' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                                'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';

                      return (
                        <TableRow key={index} className="hover:bg-gray-50/50 dark:hover:bg-muted/20 transition-colors group">
                          <TableCell className="pl-6 font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 rounded-lg border bg-muted">
                                <AvatarImage src={fullProperty?.images?.[0]} alt={property.title} className="object-cover" />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                                  {property.title.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="truncate max-w-[200px] text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                                  {property.title}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {fullProperty?.location?.address || "Location not available"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${statusColor} capitalize shadow-sm`}>
                              {property.status || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{analyticsService.formatNumber(property.views || 0)}</span>
                              <span className="text-[10px] text-muted-foreground">views</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{analyticsService.formatNumber(property.favorites || 0)}</span>
                              <span className="text-[10px] text-muted-foreground">saves</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className={`font-medium ${(property.conversionRate || 0) > 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {property.conversionRate || 0}%
                              </span>
                              {(property.conversionRate || 0) > 2 && <TrendingUp className="w-3 h-3 text-green-600" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <span className="font-bold text-gray-900 dark:text-gray-100">₹{analyticsService.formatNumber(property.revenue || 0)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No Performance Data</h3>
              <p className="text-muted-foreground max-w-md">
                Performance data for your properties will appear here once they receive views and interactions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorAnalytics;
