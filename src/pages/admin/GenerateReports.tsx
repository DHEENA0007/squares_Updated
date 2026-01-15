import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, BarChart3, TrendingUp, Users, Building2, Calendar, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportConfig {
  type: string;
  title: string;
  description: string;
  icon: any;
  dataPoints: string[];
  formats: string[];
}

interface DateRange {
  from?: Date;
  to?: Date;
}

const GenerateReports = () => {
  const [selectedReport, setSelectedReport] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [customName, setCustomName] = useState('');
  const [reportResult, setReportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleDownloadReport = (format: 'json' | 'csv' | 'pdf' | 'excel') => {
    if (!reportResult) return;

    const fileName = `buildhomemartsquares_${reportResult.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(reportResult.reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "JSON report downloaded successfully",
      });
    } else if (format === 'csv') {
      const csvContent = convertToCSV(reportResult.reportData);
      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "CSV report downloaded successfully",
      });
    } else {
      toast({
        title: "Coming Soon",
        description: `${format.toUpperCase()} export will be available soon`,
      });
    }
  };

  const convertToCSV = (data: any): string => {
    let csv = '';

    if (Array.isArray(data)) {
      if (data.length === 0) return 'No data available';

      const headers = Object.keys(data[0]);
      csv = headers.join(',') + '\n';

      data.forEach(row => {
        const values = headers.map(header => {
          const val = row[header];
          return typeof val === 'string' ? `"${val}"` : val;
        });
        csv += values.join(',') + '\n';
      });
    } else if (typeof data === 'object') {
      csv = 'Key,Value\n';
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          csv += `${key},"${JSON.stringify(value)}"\n`;
        } else if (typeof value === 'object') {
          csv += `${key},"${JSON.stringify(value)}"\n`;
        } else {
          csv += `${key},${value}\n`;
        }
      });
    }

    return csv;
  };

  const reportTypes: ReportConfig[] = [
    {
      type: 'property_performance',
      title: 'Property Performance Report',
      description: 'Property listings, views, leads, and conversion rates',
      icon: Building2,
      dataPoints: [
        'Total Properties Listed',
        'Properties by Type',
        'Average Property Views',
        'Lead Generation Rate',
        'Property Approval Rate',
        'Price Trends by Location'
      ],
      formats: ['pdf', 'excel', 'csv']
    },
    {
      type: 'vendor_analytics',
      title: 'Vendor Analytics Report',
      description: 'Vendor performance, activity, and revenue metrics',
      icon: Users,
      dataPoints: [
        'Active Vendors Count',
        'Vendor Performance Scores',
        'Revenue by Vendor',
        'Vendor Response Times',
        'Property Listings by Vendor',
        'Vendor Subscription Status'
      ],
      formats: ['pdf', 'excel']
    },
    {
      type: 'user_engagement',
      title: 'User Engagement Report',
      description: 'User activity, searches, and platform engagement',
      icon: TrendingUp,
      dataPoints: [
        'Active User Count',
        'User Registration Trends',
        'Search Patterns',
        'Page Views & Sessions',
        'Feature Usage Statistics',
        'User Retention Rates'
      ],
      formats: ['pdf', 'excel', 'csv']
    },
    {
      type: 'financial_summary',
      title: 'Financial Summary Report',
      description: 'Revenue, subscriptions, and financial metrics',
      icon: IndianRupee,
      dataPoints: [
        'Total Revenue',
        'Subscription Revenue',
        'Promotion Revenue',
        'Monthly Recurring Revenue',
        'Payment Success Rate',
        'Revenue by City/Region'
      ],
      formats: ['pdf', 'excel']
    },
    {
      type: 'city_regional',
      title: 'City/Regional Analysis',
      description: 'Location-specific property and user metrics',
      icon: BarChart3,
      dataPoints: [
        'Properties by City',
        'User Distribution',
        'Popular Localities',
        'Price Ranges by Area',
        'Market Demand Analysis',
        'Growth Trends by Region'
      ],
      formats: ['pdf', 'excel', 'csv']
    }
  ];

  const cities = [
    'all', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
  ];

  const formats = [
    { id: 'pdf', label: 'PDF Report', description: 'Formatted report with charts' },
    { id: 'excel', label: 'Excel Spreadsheet', description: 'Data tables and calculations' },
    { id: 'csv', label: 'CSV Data', description: 'Raw data export' }
  ];

  const handleReportTypeChange = (reportType: string) => {
    setSelectedReport(reportType);
    const report = reportTypes.find(r => r.type === reportType);
    if (report) {
      setSelectedMetrics(report.dataPoints.slice(0, 3)); // Select first 3 by default
      setSelectedFormats(report.formats.slice(0, 1)); // Select first format
    }
  };

  const handleFormatChange = (formatId: string, checked: boolean) => {
    if (checked) {
      setSelectedFormats([...selectedFormats, formatId]);
    } else {
      setSelectedFormats(selectedFormats.filter(id => id !== formatId));
    }
  };

  const handleMetricChange = (metric: string, checked: boolean) => {
    if (checked) {
      setSelectedMetrics([...selectedMetrics, metric]);
    } else {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedReport || selectedMetrics.length === 0 || selectedFormats.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select report type, metrics, and format",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setReportResult(null);

    try {
      const payload = {
        reportType: selectedReport,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : null,
        city: selectedCity,
        metrics: selectedMetrics,
        formats: selectedFormats,
        customName: customName || `${reportTypes.find(r => r.type === selectedReport)?.title} - ${new Date().toLocaleDateString()}`
      };

      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReportResult(data.data);

        toast({
          title: "Success",
          description: "Report generated successfully! Click download button to save.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate report",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedReportConfig = reportTypes.find(r => r.type === selectedReport);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generate Reports</h1>
          <p className="text-muted-foreground mt-1">
            Create comprehensive city/region-level reports and analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Report Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  return (
                    <div
                      key={report.type}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedReport === report.type
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => handleReportTypeChange(report.type)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md ${selectedReport === report.type ? 'bg-primary text-white' : 'bg-gray-100'
                          }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Data Metrics Selection */}
          {selectedReportConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Select Data Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedReportConfig.dataPoints.map((dataPoint) => (
                    <div key={dataPoint} className="flex items-center space-x-2">
                      <Checkbox
                        id={dataPoint}
                        checked={selectedMetrics.includes(dataPoint)}
                        onCheckedChange={(checked) => handleMetricChange(dataPoint, checked as boolean)}
                      />
                      <label htmlFor={dataPoint} className="text-sm font-medium cursor-pointer">
                        {dataPoint}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected {selectedMetrics.length} of {selectedReportConfig.dataPoints.length} metrics
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Formats */}
          {selectedReportConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Export Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formats.map((format) => {
                    const isAvailable = selectedReportConfig.formats.includes(format.id);
                    return (
                      <div
                        key={format.id}
                        className={`flex items-center space-x-3 ${!isAvailable ? 'opacity-50' : ''}`}
                      >
                        <Checkbox
                          id={format.id}
                          checked={selectedFormats.includes(format.id)}
                          onCheckedChange={(checked) => handleFormatChange(format.id, checked as boolean)}
                          disabled={!isAvailable}
                        />
                        <div>
                          <label htmlFor={format.id} className="text-sm font-medium cursor-pointer">
                            {format.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{format.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Configuration Sidebar */}
        <div className="space-y-6">
          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle>Date Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">From</label>
                  <Input
                    type="date"
                    value={dateRange?.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      from: e.target.value ? new Date(e.target.value) : undefined
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To</label>
                  <Input
                    type="date"
                    value={dateRange?.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({
                      ...prev,
                      to: e.target.value ? new Date(e.target.value) : undefined
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange({
                    from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange({
                    from: new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000),
                    to: new Date()
                  })}
                >
                  Last 90 Days
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* City/Region Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Location Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city === 'all' ? 'All Cities' : city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Custom Report Name */}
          <Card>
            <CardHeader>
              <CardTitle>Report Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Custom report name (optional)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Generation Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Report Type:</span>
                <span className="font-medium">
                  {selectedReportConfig ? selectedReportConfig.title : 'None'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Metrics:</span>
                <span className="font-medium">{selectedMetrics.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Formats:</span>
                <span className="font-medium">{selectedFormats.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{selectedCity === 'all' ? 'All Cities' : selectedCity}</span>
              </div>
              {dateRange?.from && dateRange?.to && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-medium">
                    {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerateReport}
                disabled={generating || !selectedReport || selectedMetrics.length === 0 || selectedFormats.length === 0}
                className="w-full"
              >
                {generating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Generate Report
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Result Display */}
      {reportResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Generated Report: {reportResult.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Report Type</p>
                  <p className="font-semibold capitalize">{reportResult.type.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant="default">{reportResult.status}</Badge>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Generated At</p>
                  <p className="font-semibold text-sm">
                    {new Date(reportResult.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Report Data Display */}
              {reportResult.reportData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Report Data</h3>
                  <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded border">
                    {JSON.stringify(reportResult.reportData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Download Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reportResult.formats?.includes('json') !== false && (
                  <Button
                    onClick={() => handleDownloadReport('json')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                )}
                {reportResult.formats?.includes('csv') && (
                  <Button
                    onClick={() => handleDownloadReport('csv')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                )}
                {reportResult.formats?.includes('pdf') && (
                  <Button
                    onClick={() => handleDownloadReport('pdf')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                )}
                {reportResult.formats?.includes('excel') && (
                  <Button
                    onClick={() => handleDownloadReport('excel')}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Property Performance - Mumbai', date: '2024-11-03', format: 'PDF', size: '2.4 MB' },
              { name: 'User Engagement Report', date: '2024-11-02', format: 'Excel', size: '1.8 MB' },
              { name: 'Financial Summary Q4', date: '2024-11-01', format: 'PDF', size: '3.1 MB' }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.date} • {report.format} • {report.size}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateReports;
