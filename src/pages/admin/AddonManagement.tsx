import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Power, PowerOff, Camera, Megaphone, Laptop, Headphones, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { adminAddonService, AdminAddonService, CreateAddonRequest, UpdateAddonRequest, AddonFilters } from '@/services/adminAddonService';

const categoryIcons = {
  photography: Camera,
  marketing: Megaphone,
  technology: Laptop,
  support: Headphones,
  crm: Users,
};

const AddonManagement: React.FC = () => {
  const [addons, setAddons] = useState<AdminAddonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState<AddonFilters>({
    page: 1,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AdminAddonService | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateAddonRequest>({
    name: '',
    description: '',
    price: 0,
    currency: 'INR',
    billingType: 'monthly',
    category: 'marketing',
    icon: '',
    isActive: true,
    sortOrder: 0,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAddons();
  }, [filters]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const loadAddons = async () => {
    try {
      setLoading(true);
      const response = await adminAddonService.getAddons(filters);
      setAddons(response.addons);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load addons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAddon = async () => {
    try {
      setSubmitting(true);
      const newAddon = await adminAddonService.createAddon(formData);
      setIsCreateDialogOpen(false);
      resetForm();
      // Realtime update: Add the new addon to the state
      setAddons(prev => [newAddon, ...prev]);
      setTotal(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create addon:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAddon = async () => {
    if (!selectedAddon) return;
    
    try {
      setSubmitting(true);
      const updatedAddon = await adminAddonService.updateAddon(selectedAddon._id, formData);
      setIsEditDialogOpen(false);
      setSelectedAddon(null);
      resetForm();
      // Realtime update: Update the addon in state
      setAddons(prev => prev.map(addon => 
        addon._id === updatedAddon._id ? updatedAddon : addon
      ));
    } catch (error) {
      console.error('Failed to update addon:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddon = async () => {
    if (!selectedAddon) return;
    
    try {
      setSubmitting(true);
      await adminAddonService.deleteAddon(selectedAddon._id);
      setIsDeleteDialogOpen(false);
      const deletedId = selectedAddon._id;
      setSelectedAddon(null);
      // Realtime update: Remove the addon from state
      setAddons(prev => prev.filter(addon => addon._id !== deletedId));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to delete addon:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (addon: AdminAddonService) => {
    try {
      const updatedAddon = await adminAddonService.toggleAddonStatus(addon._id);
      // Realtime update: Update the addon status in state
      setAddons(prev => prev.map(a => 
        a._id === updatedAddon._id ? updatedAddon : a
      ));
    } catch (error) {
      console.error('Failed to toggle addon status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'INR',
      billingType: 'monthly',
      category: 'marketing',
      icon: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const openEditDialog = (addon: AdminAddonService) => {
    setSelectedAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description,
      price: addon.price,
      currency: addon.currency,
      billingType: addon.billingType,
      category: addon.category,
      icon: addon.icon || '',
      isActive: addon.isActive,
      sortOrder: addon.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (addon: AdminAddonService) => {
    setSelectedAddon(addon);
    setIsDeleteDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    return `${symbols[currency as keyof typeof symbols] || currency} ${amount.toLocaleString()}`;
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Package;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6 relative top-[60px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Addon Management</h1>
          <p className="text-muted-foreground mt-2">Manage vendor addon services and pricing</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Addon Service
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-gray-600">Total Addons</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg sm:text-xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-gray-600">Active Addons</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {addons.filter(addon => addon.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg sm:text-xl font-bold">
              {new Set(addons.map(addon => addon.category)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-gray-600">Average Price</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg sm:text-xl font-bold">
              ₹{addons.length > 0 ? Math.round(addons.reduce((sum, addon) => sum + addon.price, 0) / addons.length).toLocaleString() : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search addons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  category: value === 'all' ? undefined : value,
                  page: 1 
                }))}
              >
                <SelectTrigger className="w-full sm:w-36 h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {adminAddonService.getCategoryOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isActive: value === 'all' ? undefined : value === 'true',
                  page: 1 
                }))}
              >
                <SelectTrigger className="w-full sm:w-28 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addons Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Addon Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="min-w-[250px] py-2">Name</TableHead>
                      <TableHead className="min-w-[120px] py-2">Category</TableHead>
                      <TableHead className="min-w-[100px] py-2">Price</TableHead>
                      <TableHead className="min-w-[100px] py-2">Billing</TableHead>
                      <TableHead className="min-w-[80px] py-2">Status</TableHead>
                      <TableHead className="min-w-[80px] py-2">Sort Order</TableHead>
                      <TableHead className="text-right min-w-[80px] py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addons.map((addon) => (
                      <TableRow key={addon._id} className="h-12">
                        <TableCell className="py-2">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                              {getCategoryIcon(addon.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate text-sm">{addon.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {addon.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="capitalize whitespace-nowrap text-xs">
                            {addon.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap py-2 text-sm">
                          {formatCurrency(addon.price, addon.currency)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="secondary" className="capitalize whitespace-nowrap text-xs">
                            {addon.billingType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={addon.isActive ? 'default' : 'secondary'} className="whitespace-nowrap text-xs">
                            {addon.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-2 text-sm">{addon.sortOrder}</TableCell>
                        <TableCell className="text-right py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(addon)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(addon)}>
                                {addon.isActive ? (
                                  <>
                                    <PowerOff className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(addon)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, total)} of {total} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, page: currentPage - 1 }))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, page: currentPage + 1 }))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Addon Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Addon Service</DialogTitle>
            <DialogDescription>
              Add a new addon service that vendors can purchase to enhance their listings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter addon name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getCategoryOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter addon description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getCurrencyOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingType">Billing Type</Label>
                <Select
                  value={formData.billingType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billingType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getBillingTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (optional)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="Icon name or URL"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreateAddon} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Creating...' : 'Create Addon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Addon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Addon Service</DialogTitle>
            <DialogDescription>
              Update the addon service details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter addon name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getCategoryOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter addon description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getCurrencyOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-billingType">Billing Type</Label>
                <Select
                  value={formData.billingType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billingType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminAddonService.getBillingTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-icon">Icon (optional)</Label>
                <Input
                  id="edit-icon"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="Icon name or URL"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleEditAddon} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Updating...' : 'Update Addon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Addon Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAddon?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAddon} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddonManagement;