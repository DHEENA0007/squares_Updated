import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Download, Search, User, Phone, Mail, MessageCircle,
    Clock, MapPin, ExternalLink, Shield, UserX, Share2
} from 'lucide-react';
import analyticsService from '@/services/analyticsService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DetailedPropertyReportProps {
    dateRange: string;
    propertyId?: string;
}

const DetailedPropertyReport = ({ dateRange, propertyId }: DetailedPropertyReportProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredViewers, setFilteredViewers] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, [dateRange, propertyId]);

    useEffect(() => {
        if (data?.viewers) {
            const lowerSearch = searchTerm.toLowerCase();
            const filtered = data.viewers.filter((v: any) =>
                v.property?.title?.toLowerCase().includes(lowerSearch) ||
                v.viewer?.firstName?.toLowerCase().includes(lowerSearch) ||
                v.viewer?.lastName?.toLowerCase().includes(lowerSearch) ||
                v.viewer?.email?.toLowerCase().includes(lowerSearch) ||
                v.viewer?.phone?.toLowerCase().includes(lowerSearch) ||
                (!v.viewer && 'guest'.includes(lowerSearch))
            );
            setFilteredViewers(filtered);
        }
    }, [searchTerm, data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await analyticsService.getAllPropertyViewers(dateRange, propertyId);
            setData(response.data);
            setFilteredViewers(response.data.viewers);
        } catch (error) {
            console.error('Failed to fetch detailed report:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch detailed report data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!data?.viewers) return;

        const headers = ['Date', 'Property', 'Location', 'Viewer Name', 'Email', 'Phone', 'Duration (s)', 'Visit Count', 'Interactions'];
        const csvContent = [
            headers.join(','),
            ...data.viewers.map((v: any) => {
                const isRegistered = v.viewer && (v.viewer.firstName || v.viewer.email);
                const viewerName = isRegistered ? `${v.viewer.firstName || ''} ${v.viewer.lastName || ''}`.trim() || v.viewer.email : 'Guest';
                const location = v.property?.location || 'No location';
                const interactions = [];
                if (v.interactions?.clickedPhone) interactions.push('Phone');
                if (v.interactions?.clickedMessage) interactions.push('Message');
                if (v.interactions?.sharedProperty) interactions.push('Share');

                return [
                    format(new Date(v.viewedAt), 'yyyy-MM-dd HH:mm:ss'),
                    `"${v.property?.title || 'Unknown'}"`,
                    `"${location}"`,
                    `"${viewerName}"`,
                    v.viewer?.email || 'N/A',
                    v.viewer?.phone || 'N/A',
                    v.viewDuration || 0,
                    v.viewCount || 1,
                    `"${interactions.join('; ')}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `property_views_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading detailed report...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary?.totalViews || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.summary?.uniqueViewers || 0} unique viewers
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Registered vs Guest</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-2xl font-bold text-green-600">{data?.summary?.registeredViewers || 0}</div>
                            <span className="text-sm text-muted-foreground mb-1">/</span>
                            <div className="text-2xl font-bold text-orange-600">{data?.summary?.guestViewers || 0}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Registered / Guest</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Interactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary?.totalInteractions || 0}</div>
                        <p className="text-xs text-muted-foreground">Clicks & Shares</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.summary?.avgDuration || 0}s</div>
                        <p className="text-xs text-muted-foreground">Per view</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Detailed View Report</CardTitle>
                            <CardDescription>
                                Detailed list of all property views including guest and registered users
                            </CardDescription>
                        </div>
                        <Button onClick={handleDownload} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                    <div className="mt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by property, viewer name, email..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Viewer</TableHead>
                                    <TableHead>Contact Info</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Interactions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredViewers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No views found for this period
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredViewers.map((view: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {format(new Date(view.viewedAt), 'MMM dd, yyyy')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(view.viewedAt), 'hh:mm a')}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="font-medium truncate" title={view.property?.title}>
                                                        {view.property?.title || 'Unknown Property'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {view.property?.location || 'No location'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {view.viewer && (view.viewer.firstName || view.viewer.email) ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {view.viewer.firstName?.[0] || '?'}{view.viewer.lastName?.[0] || ''}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">
                                                                {view.viewer.firstName || ''} {view.viewer.lastName || ''}
                                                            </span>
                                                            <span className="text-xs text-green-600">Registered</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                            <UserX className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-muted-foreground">Guest User</span>
                                                            <span className="text-xs text-muted-foreground">Unregistered</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {view.viewer && (view.viewer.email || view.viewer.phone) ? (
                                                    <div className="flex flex-col gap-1 text-sm">
                                                        {view.viewer.email && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                                <span className="truncate max-w-[150px]" title={view.viewer.email}>
                                                                    {view.viewer.email}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {view.viewer.phone && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                                <span>{view.viewer.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        N/A
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                                        {(view.viewDuration || 0) < 60
                                                            ? `${view.viewDuration || 0}s`
                                                            : `${Math.floor((view.viewDuration || 0) / 60)}m ${(view.viewDuration || 0) % 60}s`
                                                        }
                                                    </div>
                                                    {view.viewCount > 1 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({view.viewCount} visits)
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {view.interactions?.clickedPhone && (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" title="Called Owner">
                                                            <Phone className="h-3 w-3" />
                                                        </Badge>
                                                    )}
                                                    {view.interactions?.clickedMessage && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" title="Sent Message">
                                                            <MessageCircle className="h-3 w-3" />
                                                        </Badge>
                                                    )}
                                                    {view.interactions?.sharedProperty && (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200" title="Shared Property">
                                                            <Share2 className="h-3 w-3" />
                                                        </Badge>
                                                    )}
                                                    {!view.interactions?.clickedPhone && !view.interactions?.clickedMessage && !view.interactions?.sharedProperty && (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DetailedPropertyReport;
