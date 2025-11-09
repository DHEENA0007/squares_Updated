import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PropertyStatusDialogProps {
  property: {
    _id: string;
    title: string;
    status: string;
    listingType?: 'sale' | 'rent' | 'lease';
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (propertyId: string, newStatus: string, customerId?: string, reason?: string) => Promise<void>;
}

const PropertyStatusDialog: React.FC<PropertyStatusDialogProps> = ({
  property,
  open,
  onOpenChange,
  onUpdateStatus
}) => {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Check if property is approved (active status means admin approved)
  const isPropertyApproved = property?.status === 'available';
  
  // Get the target status based on listing type
  const getTargetStatus = () => {
    if (!property) return null;
    
    const listingType = property.listingType || 'sale';
    
    if (listingType === 'sale') {
      return { value: 'sold', label: 'Mark as Sold', color: 'bg-blue-500' };
    } else if (listingType === 'rent') {
      return { value: 'rented', label: 'Mark as Rented', color: 'bg-purple-500' };
    } else if (listingType === 'lease') {
      return { value: 'leased', label: 'Mark as Leased', color: 'bg-indigo-500' };
    }
    
    return null;
  };

  const targetStatus = getTargetStatus();

  // Load customers when dialog opens
  useEffect(() => {
    if (open && isPropertyApproved && targetStatus) {
      loadCustomers();
    }
  }, [open]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      console.log('[PropertyStatusDialog] Loading customers with role: customer');
      
      const response = await userService.getUsers({ 
        role: 'customer',
        limit: 100,
        status: 'available' // Only available properties
      });
      
      console.log('[PropertyStatusDialog] Customer response:', response);
      
      if (response.success && response.data?.users) {
        console.log(`[PropertyStatusDialog] Loaded ${response.data.users.length} customers`);
        setCustomers(response.data.users);
      } else {
        console.error('[PropertyStatusDialog] Invalid response structure:', response);
        toast({
          title: "Warning",
          description: "Failed to load customers properly.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('[PropertyStatusDialog] Failed to load customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers.",
        variant: "destructive",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearch.toLowerCase();
    const fullName = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.toLowerCase();
    const email = customer.email?.toLowerCase() || '';
    const phone = customer.profile?.phone || '';
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower);
  });

  React.useEffect(() => {
    if (property && open) {
      setSelectedStatus('');
      setReason('');
      setSelectedCustomer('');
      setCustomerSearch('');
    }
  }, [property, open]);

  const handleMarkAsStatus = () => {
    if (!targetStatus) return;
    setSelectedStatus(targetStatus.value);
  };

  const handleSubmit = async () => {
    if (!property || !selectedStatus) return;
    
    // Validate customer selection
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: `Please select a customer to assign this ${selectedStatus} property to.`,
        variant: "destructive",
      });
      return;
    }
    
    setUpdating(true);
    try {
      await onUpdateStatus(
        property._id, 
        selectedStatus, 
        selectedCustomer,
        reason.trim() || undefined
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'sold': return 'bg-blue-500';
      case 'rented': return 'bg-purple-500';
      case 'leased': return 'bg-indigo-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending Approval';
      case 'sold': return 'Sold';
      case 'rented': return 'Rented';
      case 'leased': return 'Leased';
      case 'rejected': return 'Rejected';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Update Property Status</DialogTitle>
        <DialogDescription>
          {property?.title}
        </DialogDescription>
        {property?.listingType && (
          <div className="text-xs text-muted-foreground">
            Listing Type: <Badge variant="outline" className="ml-1">{property.listingType}</Badge>
          </div>
        )}
      </DialogHeader>        <div className="grid gap-4 py-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusBadgeColor(property?.status || '')} text-white`}>
                {getStatusLabel(property?.status || '')}
              </Badge>
            </div>
          </div>

          {/* Not Approved Alert */}
          {!isPropertyApproved && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This property is not yet approved by admin. You can only update the status to {targetStatus?.label.toLowerCase()} after admin approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Already Sold/Rented/Leased Alert */}
          {property?.status === 'sold' || property?.status === 'rented' || property?.status === 'leased' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This property has already been marked as {getStatusLabel(property.status).toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : selectedStatus === '' ? (
            <>
              {/* Action Button */}
              <div className="space-y-2">
                <Label>Action</Label>
                <Button
                  onClick={handleMarkAsStatus}
                  disabled={!isPropertyApproved || !targetStatus}
                  className={`w-full ${targetStatus?.color || 'bg-primary'} hover:opacity-90 text-white`}
                  size="lg"
                >
                  {targetStatus?.label || 'Update Status'}
                </Button>
                {!isPropertyApproved && (
                  <p className="text-xs text-muted-foreground">
                    Button will be enabled once admin approves your property
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customer-search">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="customer-search"
                    placeholder="Search by name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-select">Assign To Customer *</Label>
                {loadingCustomers ? (
                  <div className="text-sm text-muted-foreground">Loading customers...</div>
                ) : (
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer who bought/rented this property" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCustomers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {customerSearch ? 'No customers found' : 'No customers available'}
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {customer.profile?.firstName} {customer.profile?.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {customer.email} {customer.profile?.phone && `• ${customer.profile.phone}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  This property will be added to the selected customer's portfolio
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="reason">Additional Notes (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Add any notes about this transaction..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Status Change Preview</Label>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusBadgeColor(property?.status || '')} text-white`}>
                    {getStatusLabel(property?.status || '')}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className={`${targetStatus?.color || 'bg-gray-500'} text-white`}>
                    {getStatusLabel(selectedStatus)}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedStatus && (
            <Button 
              onClick={handleSubmit} 
              disabled={updating || !selectedCustomer}
              className={`${targetStatus?.color || 'bg-primary'} hover:opacity-90 text-white`}
            >
              {updating ? 'Updating...' : `Confirm ${targetStatus?.label}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyStatusDialog;
