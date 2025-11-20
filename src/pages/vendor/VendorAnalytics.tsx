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
import { analyticsService, AnalyticsOverviewStats, AnalyticsFilters, PerformanceMetrics } from "@/services/analyticsService";
import { propertyService } from "@/services/propertyService";
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

  const filters: AnalyticsFilters = {
    timeframe,
    propertyId: propertyFilter !== 'all' ? propertyFilter : undefined,
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [statsData, metricsData, propertiesData] = await Promise.all([
        analyticsService.getOverviewStats(filters),
        analyticsService.getPerformanceMetrics(filters),
        propertyService.getVendorProperties({ page: 1, limit: 100 }) // Use vendor-specific endpoint
      ]);
      
      setOverviewStats(statsData);
      setPerformanceMetrics(metricsData);
      const vendorProperties = propertiesData.success ? propertiesData.data.properties : [];
      setProperties(vendorProperties);
      
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
        // Determine property status based on revenue and conversion rate
        let status = 'Available';
        if ((property.revenue || 0) > 0) {
          if (property.conversionRate && property.conversionRate > 50) status = 'Sold';
          else if (property.conversionRate && property.conversionRate > 20) status = 'Leased';
          else status = 'Rented';
        }

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
        // Determine property status with better logic
        let status = 'Available';
        let statusColor = colors.dark;
        if ((property.revenue || 0) > 0) {
          if (property.conversionRate && property.conversionRate > 50) {
            status = 'Sold';
            statusColor = colors.success;
          } else if (property.conversionRate && property.conversionRate > 20) {
            status = 'Leased';
            statusColor = colors.warning;
          } else {
            status = 'Rented';
            statusColor = colors.secondary;
          }
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
          title: "Leads Generated", 
          value: "Coming Soon",
          change: "",
          changeType: "neutral" as "neutral" | "increase" | "decrease", 
          icon: Clock,
          description: "Feature in development"
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
          description: "Customer reviews"
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
    const leadsChange = formatChange(stats.trends?.leads?.growth);
    const propertiesChange = formatChange(stats.trends?.properties?.growth);
    const revenueChange = formatChange(stats.trends?.revenue?.growth);

    return [
    {
      title: "Total Views",
      value: analyticsService.formatNumber(stats.totalViews),
      change: viewsChange.change,
      changeType: viewsChange.changeType,
      icon: Eye,
      description: "Property page views"
    },
    {
      title: "Leads Generated",
      value: "Coming Soon",
      change: "",
      changeType: "neutral" as "neutral" | "increase" | "decrease",
      icon: Clock,
      description: "Feature in development"
    },
    {
      title: "Phone Calls",
      value: analyticsService.formatNumber(stats.totalCalls),
      change: "0%", // Call trends not implemented yet
      changeType: "neutral" as "neutral" | "increase" | "decrease",
      icon: Phone,
      description: "Direct calls"
    },
    {
      title: "Messages",
      value: analyticsService.formatNumber(stats.totalMessages),
      change: "0%", // Message trends not implemented yet
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
    },
    {
      title: "Sold Properties",
      value: `₹${analyticsService.formatNumber(stats.soldPropertyRevenue)}`,
      change: revenueChange.change,
      changeType: revenueChange.changeType,
      icon: Star,
      description: "Revenue from sold properties"
    },
    {
      title: "Leased Properties",
      value: `₹${analyticsService.formatNumber(stats.leasedPropertyRevenue)}`,
      change: revenueChange.change,
      changeType: revenueChange.changeType,
      icon: Star,
      description: "Revenue from leased properties"
    },
    {
      title: "Rented Properties",
      value: `₹${analyticsService.formatNumber(stats.rentedPropertyRevenue)}`,
      change: revenueChange.change,
      changeType: revenueChange.changeType,
      icon: Star,
      description: "Revenue from rented properties"
    },
    {
      title: "Avg. Rating",
      value: stats.averageRating?.toFixed(1) || "0.0",
      change: "0%", // Rating trends not implemented yet
      changeType: "neutral" as "neutral" | "increase" | "decrease",
      icon: Star,
      description: "Customer reviews"
    }
    ];
  };  const displayStats = overviewStats ? formatOverviewStats(overviewStats) : [];

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
      favorites: Math.floor((item.value || 0) * 0.08),
      shares: Math.floor((item.value || 0) * 0.04),
      inquiries: Math.floor((item.value || 0) * 0.06)
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
    <div className="space-y-6">
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
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {displayStats.map((stat) => (
          <Card key={stat.title}>
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
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                      stat.changeType === "increase" ? "text-green-500" : stat.changeType === "decrease" ? "text-red-500" : "text-muted-foreground"
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

      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Property Engagement Overview */}
        <Card className="lg:col-span-2">
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
                    <SelectItem value="conversions">Conversions</SelectItem>
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
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
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
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
                      {engagementMetric === 'all' || engagementMetric === 'conversions' ? (
                        <Line 
                          type="monotone" 
                          dataKey="conversions" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#10b981' }}
                          name="Conversions"
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
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="areaInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="areaConversions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      {engagementMetric === 'all' || engagementMetric === 'views' ? (
                        <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="url(#areaViews)" name="Views" />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'interactions' ? (
                        <Area type="monotone" dataKey="interactions" stroke="#8b5cf6" fill="url(#areaInteractions)" name="Interactions" />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'conversions' ? (
                        <Area type="monotone" dataKey="conversions" stroke="#10b981" fill="url(#areaConversions)" name="Conversions" />
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
                          borderRadius: '8px'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      {engagementMetric === 'all' || engagementMetric === 'views' ? (
                        <Bar dataKey="views" fill="#3b82f6" name="Views" radius={[4, 4, 0, 0]} />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'interactions' ? (
                        <Bar dataKey="interactions" fill="#8b5cf6" name="Interactions" radius={[4, 4, 0, 0]} />
                      ) : null}
                      {engagementMetric === 'all' || engagementMetric === 'conversions' ? (
                        <Bar dataKey="conversions" fill="#10b981" name="Conversions" radius={[4, 4, 0, 0]} />
                      ) : null}
                    </BarChart>
                  )}
                </ResponsiveContainer>
                
                {/* Engagement Summary Stats */}
                <div className={`grid gap-3 mt-6 pt-4 border-t ${isMobile ? 'grid-cols-1' : 'grid-cols-3 md:grid-cols-6'}`}>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <Eye className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-blue-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-600 font-medium`}>Views</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-blue-700`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.views || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <Users className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-purple-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-purple-600 font-medium`}>Interactions</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-purple-700`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.interactions || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <TrendingUp className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-green-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-green-600 font-medium`}>Conversions</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-green-700`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.conversions || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <Heart className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-amber-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-amber-600 font-medium`}>Favorites</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-amber-700`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.favorites || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-pink-50 rounded-lg">
                    <Share className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-pink-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-pink-600 font-medium`}>Shares</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-pink-700`}>
                      {filteredEngagementData.reduce((acc, curr) => acc + (curr.shares || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-cyan-50 rounded-lg">
                    <MessageSquare className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto text-cyan-600 mb-1`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-cyan-600 font-medium`}>Inquiries</div>
                    <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-cyan-700`}>
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inquiry Response Time</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Average time to respond to customer inquiries</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={leadsData}>
                <defs>
                  <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
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
                    borderRadius: '8px'
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
                <div className="text-2xl font-bold text-green-600">
                  {leadsData.length > 0 
                    ? (leadsData.reduce((acc, curr) => acc + curr.value, 0) / leadsData.length).toFixed(1)
                    : '0.0'
                  }h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Fastest</div>
                <div className="text-2xl font-bold text-blue-600">
                  {leadsData.length > 0 
                    ? Math.min(...leadsData.map(d => d.value)).toFixed(1)
                    : '0.0'
                  }h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Inquiries</div>
                <div className="text-2xl font-bold text-purple-600">
                  {overviewStats?.totalMessages || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Property Performance</CardTitle>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-48">
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
        <CardContent>
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Home className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                You haven't added any properties yet. Add your first property to start tracking performance analytics.
              </p>
              <Button 
                onClick={() => navigate('/vendor/properties/add')} 
                className="mt-2"
              >
                Add Your First Property
              </Button>
            </div>
          ) : propertyPerformance.length > 0 ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart 
                  data={propertyPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="title" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    label={{ value: 'Views', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [value, name]}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    fill="url(#colorViews)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Views"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Top Properties Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Favorites
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conv. Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...propertyPerformance].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map((property, index) => (
                      <tr key={property.propertyId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {property.title || 'Untitled Property'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold inline-block py-1 px-2 rounded-full ${property.revenue && property.revenue > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {property.revenue && property.revenue > 0 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {analyticsService.formatNumber(property.views || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {analyticsService.formatNumber(property.favorites || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {property.conversionRate ? `${property.conversionRate.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {`₹${analyticsService.formatNumber(property.revenue || 0)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              #{index + 1}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Home className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Performance Data Found</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Performance data will be available once your properties start receiving views and interactions.
              </p>
              <Button 
                onClick={() => navigate('/vendor/properties/add')} 
                className="mt-2"
              >
                Add Your First Property
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorAnalytics;
