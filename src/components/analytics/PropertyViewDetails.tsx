import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  User, Mail, Phone, MapPin, Calendar, Clock, 
  MousePointer, Eye, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import analyticsService from '@/services/analyticsService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PropertyViewDetailsProps {
  propertyId?: string;
  dateRange: string;
}

const PropertyViewDetails = ({ propertyId, dateRange }: PropertyViewDetailsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (propertyId) {
      fetchPropertyViewDetails();
    }
  }, [propertyId, dateRange]);

  const fetchPropertyViewDetails = async () => {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      const response = await analyticsService.getPropertyViewDetails(propertyId, dateRange);
      setViewDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch property view details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch property view details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (viewId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(viewId)) {
      newExpanded.delete(viewId);
    } else {
      newExpanded.add(viewId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredViews = viewDetails?.views?.filter((view: any) => {
    const matchesSearch = searchTerm === '' || 
      view.viewer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.viewer?.profile?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.viewer?.profile?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || 
      (filterType === 'registered' && view.viewer) ||
      (filterType === 'guest' && !view.viewer) ||
      (filterType === 'interacted' && (view.interactions?.clickedPhone || view.interactions?.clickedEmail || view.interactions?.clickedWhatsApp));

    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!propertyId || !viewDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property View Details</CardTitle>
          <CardDescription>Select a property to view detailed visitor information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No property selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{viewDetails.aggregateData?.totalViews?.[0]?.count || 0}</p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{viewDetails.aggregateData?.uniqueViewers?.[0]?.count || 0}</p>
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{Math.round(viewDetails.aggregateData?.avgDuration?.[0]?.avg || 0)}s</p>
              <p className="text-sm text-muted-foreground">Avg. Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MousePointer className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">
                {(viewDetails.aggregateData?.interactions?.[0]?.phoneClicks || 0) +
                 (viewDetails.aggregateData?.interactions?.[0]?.emailClicks || 0) +
                 (viewDetails.aggregateData?.interactions?.[0]?.whatsappClicks || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Interactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed View List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visitor Details</CardTitle>
              <CardDescription>Complete list of customers who viewed this property</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visitors</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="guest">Guests</SelectItem>
                  <SelectItem value="interacted">Interacted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>View Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Interactions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredViews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No visitors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViews.map((view: any) => (
                    <>
                      <TableRow key={view._id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(view._id)}
                          >
                            {expandedRows.has(view._id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {view.viewer ? (
                              <>
                                <User className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="font-medium">
                                    {view.viewer.profile?.firstName} {view.viewer.profile?.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{view.viewer.email}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-muted-foreground">Guest Visitor</p>
                                  <p className="text-xs text-muted-foreground">
                                    {view.ipAddress || 'Unknown IP'}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {view.viewer ? (
                            <div className="space-y-1">
                              {view.viewer.profile?.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {view.viewer.profile.phone}
                                </div>
                              )}
                              {view.viewer.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {view.viewer.email}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(view.viewedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {view.viewDuration > 0 ? `${view.viewDuration}s` : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {view.interactions?.clickedPhone && (
                              <Badge variant="outline" className="text-xs">
                                <Phone className="h-3 w-3 mr-1" /> Phone
                              </Badge>
                            )}
                            {view.interactions?.clickedEmail && (
                              <Badge variant="outline" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" /> Email
                              </Badge>
                            )}
                            {view.interactions?.clickedWhatsApp && (
                              <Badge variant="outline" className="text-xs">
                                WhatsApp
                              </Badge>
                            )}
                            {view.interactions?.viewedGallery && (
                              <Badge variant="outline" className="text-xs">
                                Gallery
                              </Badge>
                            )}
                            {view.interactions?.sharedProperty && (
                              <Badge variant="outline" className="text-xs">
                                Shared
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {view.viewer ? (
                            <Badge variant="default" className="bg-green-600">
                              Registered
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Guest</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(view._id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* User Details */}
                                {view.viewer && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">User Details</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><strong>Role:</strong> {view.viewer.role}</p>
                                      <p><strong>Status:</strong> {view.viewer.status}</p>
                                      {view.viewer.profile?.location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          <span>{view.viewer.profile.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Session Details */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Session Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>IP Address:</strong> {view.ipAddress || 'N/A'}</p>
                                    <p><strong>User Agent:</strong> {view.userAgent?.substring(0, 50) || 'N/A'}...</p>
                                    <p><strong>Referrer:</strong> {view.referrer || 'Direct'}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Interaction Timeline */}
                              {Object.values(view.interactions || {}).some((v) => v) && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Actions Taken</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {view.interactions?.clickedPhone && (
                                      <Badge variant="default">Clicked Phone Number</Badge>
                                    )}
                                    {view.interactions?.clickedEmail && (
                                      <Badge variant="default">Clicked Email</Badge>
                                    )}
                                    {view.interactions?.clickedWhatsApp && (
                                      <Badge variant="default">Contacted via WhatsApp</Badge>
                                    )}
                                    {view.interactions?.viewedGallery && (
                                      <Badge variant="default">Viewed Image Gallery</Badge>
                                    )}
                                    {view.interactions?.sharedProperty && (
                                      <Badge variant="default">Shared Property</Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredViews.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {filteredViews.length} of {viewDetails.views?.length || 0} visitors
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyViewDetails;
