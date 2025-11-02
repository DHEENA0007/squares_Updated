import React, { useState } from 'react';
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

interface PropertyStatusDialogProps {
  property: {
    _id: string;
    title: string;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (propertyId: string, newStatus: string, reason?: string) => Promise<void>;
}

const PropertyStatusDialog: React.FC<PropertyStatusDialogProps> = ({
  property,
  open,
  onOpenChange,
  onUpdateStatus
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'bg-green-500' },
    { value: 'active', label: 'Active', color: 'bg-green-500' },
    { value: 'sold', label: 'Sold', color: 'bg-blue-500' },
    { value: 'rented', label: 'Rented', color: 'bg-purple-500' },
    { value: 'pending', label: 'Under Review', color: 'bg-yellow-500' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-500' }
  ];

  React.useEffect(() => {
    if (property && open) {
      setSelectedStatus(property.status);
      setReason('');
    }
  }, [property, open]);

  const handleSubmit = async () => {
    if (!property || !selectedStatus) return;
    
    setUpdating(true);
    try {
      await onUpdateStatus(property._id, selectedStatus, reason.trim() || undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const currentStatusOption = statusOptions.find(opt => opt.value === property?.status);
  const selectedStatusOption = statusOptions.find(opt => opt.value === selectedStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Property Status</DialogTitle>
          <DialogDescription>
            Change the status of "{property?.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-status" className="text-right">
              Current Status
            </Label>
            <div className="col-span-3">
              {currentStatusOption && (
                <Badge className={`${currentStatusOption.color} text-white`}>
                  {currentStatusOption.label}
                </Badge>
              )}
            </div>
          </div>

          {/* New Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-status" className="text-right">
              New Status
            </Label>
            <div className="col-span-3">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason (Optional) */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right mt-2">
              Reason
            </Label>
            <div className="col-span-3">
              <Textarea
                id="reason"
                placeholder="Optional: Provide a reason for status change..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Status Change Preview */}
          {selectedStatus && selectedStatus !== property?.status && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preview</Label>
              <div className="col-span-3 flex items-center gap-2">
                {currentStatusOption && (
                  <Badge variant="outline">
                    {currentStatusOption.label}
                  </Badge>
                )}
                <span className="text-muted-foreground">→</span>
                {selectedStatusOption && (
                  <Badge className={`${selectedStatusOption.color} text-white`}>
                    {selectedStatusOption.label}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={updating || !selectedStatus || selectedStatus === property?.status}
          >
            {updating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyStatusDialog;
