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

  // Check if property is approved (available status means admin approved)
  const isPropertyApproved = property?.status === 'available';

  // Check if property can be made available again (for rent/lease only)
  const canMakeAvailable = property?.status && ['rented', 'leased'].includes(property.status);

  // Get the target status based on listing type and current status
  const getTargetStatus = () => {
    if (!property) return null;

    const listingType = property.listingType || 'sale';
    const currentStatus = property.status;

    // If rented/leased, allow making it available again
    if (currentStatus === 'rented' && listingType === 'rent') {
      return { value: 'available', label: 'Mark as Available', color: 'bg-green-500', isRevert: true, requiresCustomer: false };
    } else if (currentStatus === 'leased' && listingType === 'lease') {
      return { value: 'available', label: 'Mark as Available', color: 'bg-green-500', isRevert: true, requiresCustomer: false };
    }

    // Normal flow - mark as sold/rented/leased
    if (listingType === 'sale') {
      return { value: 'sold', label: 'Mark as Sold', color: 'bg-blue-500', isRevert: false, requiresCustomer: true };
    } else if (listingType === 'rent') {
      return { value: 'rented', label: 'Mark as Rented', color: 'bg-purple-500', isRevert: false, requiresCustomer: true };
    } else if (listingType === 'lease') {
      return { value: 'leased', label: 'Mark as Leased', color: 'bg-indigo-500', isRevert: false, requiresCustomer: true };
    } else {
      // Fallback for custom or unknown listing types
      return { value: 'sold', label: 'Mark as Sold/Unavailable', color: 'bg-gray-600', isRevert: false, requiresCustomer: false };
    }
  };

  const targetStatus = getTargetStatus();

  // Load customers only when needed
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      console.log('[PropertyStatusDialog] Loading customers with role: customer');

      const response = await userService.getUsers({
        role: 'customer',
        limit: 100,
        status: 'active'
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

    return fullName.includes(searchLower) ||
      email.includes(searchLower);
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

    // Load customers if this status might need one
    if (!targetStatus.isRevert) {
      loadCustomers();
    }
  };

  const handleSubmit = async () => {
    if (!property || !selectedStatus) return;

    // Validate customer selection only if strictly required
    if (targetStatus?.requiresCustomer && !selectedCustomer) {
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
        targetStatus?.isRevert ? undefined : selectedCustomer,
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
    switch (status) {
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
    switch (status) {
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
          {!isPropertyApproved && !canMakeAvailable && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This property is not yet approved by admin. You can only update the status to {targetStatus?.label.toLowerCase()} after admin approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Already Sold Alert (Sold properties cannot be reverted) */}
          {property?.status === 'sold' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This property has been sold and cannot be made available again.
              </AlertDescription>
            </Alert>
          ) : (property?.status === 'rented' || property?.status === 'leased') && !canMakeAvailable ? (
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
                  disabled={(!isPropertyApproved && !canMakeAvailable) || !targetStatus}
                  className={`w-full ${targetStatus?.color || 'bg-primary'} hover:opacity-90 text-white`}
                  size="lg"
                >
                  {targetStatus?.label || 'Update Status'}
                </Button>
                {!isPropertyApproved && !canMakeAvailable && (
                  <p className="text-xs text-muted-foreground">
                    Button will be enabled once admin approves your property
                  </p>
                )}
                {targetStatus?.isRevert && (
                  <p className="text-xs text-muted-foreground">
                    This will make the property available for {property?.listingType} again
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Customer Selection - Only show for non-revert actions */}
              {!targetStatus?.isRevert && (
                <div className="space-y-3">
                  <Label>
                    Assign To Customer
                    {targetStatus?.requiresCustomer && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customers.find(c => c._id === selectedCustomer)?.profile?.firstName?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {customers.find(c => c._id === selectedCustomer)?.profile?.firstName} {customers.find(c => c._id === selectedCustomer)?.profile?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customers.find(c => c._id === selectedCustomer)?.email}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer('')} className="h-8 w-8 p-0">
                        <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search customer by name or email..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {customerSearch.length > 0 && (
                        loadingCustomers ? (
                          <div className="text-sm text-muted-foreground text-center py-2">Loading customers...</div>
                        ) : (
                          <div className="border rounded-md max-h-[200px] overflow-y-auto bg-white shadow-sm mt-1">
                            {filteredCustomers.length === 0 ? (
                              <div className="p-4 text-sm text-muted-foreground text-center">
                                No customers found
                              </div>
                            ) : (
                              <div className="divide-y">
                                {filteredCustomers.map((customer) => (
                                  <div
                                    key={customer._id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between group"
                                    onClick={() => setSelectedCustomer(customer._id)}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">
                                        {customer.profile?.firstName} {customer.profile?.lastName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {customer.email}
                                      </span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 text-xs">
                                      Select
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    This property will be added to the selected customer's portfolio
                  </p>
                </div>
              )}

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
              disabled={updating || (targetStatus?.requiresCustomer && !selectedCustomer)}
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
