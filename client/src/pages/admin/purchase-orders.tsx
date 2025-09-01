import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Calendar, DollarSign, Package, User, Building, Search, ArrowUpDown, Archive, Eye, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useState, useMemo } from 'react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  supplierVendorNumber: string;
  projectName: string;
  material: string | null;
  materialGrade: string | null;
  finishing: string | null;
  tolerance: string | null;
  quantity: number | null;
  totalAmount: string;
  deliveryDate: string | null;
  status: string;
  notes: string | null;
  poFileUrl: string | null;
  supplierInvoiceUrl: string | null;
  invoiceUploadedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerCompany: string;
  customerNumber: string;
  projectName: string;
  material: string;
  materialGrade: string | null;
  finishing: string | null;
  tolerance: string;
  quantity: number;
  amount: string;
  orderStatus: string;
  paymentStatus: string;
  customerPurchaseOrderNumber: string | null;
  estimatedCompletion: string | null;
  archivedAt: string | null;
  orderDate: string;
}

export default function AdminPurchaseOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('active');
  const [orderType, setOrderType] = useState('admin-to-supplier'); // New state for order type
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Admin-to-Supplier Purchase Orders
  const { data: purchaseOrders = [], isLoading: isLoadingPOs } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/admin/purchase-orders'],
  });

  // Customer-to-Admin Sales Orders  
  const { data: salesOrders = [], isLoading: isLoadingSales } = useQuery<any[]>({
    queryKey: ['/api/admin/sales-orders'],
  });

  const isLoading = isLoadingPOs || isLoadingSales;

  // Get current orders based on selected type
  const currentOrders = useMemo(() => {
    return orderType === 'admin-to-supplier' ? purchaseOrders : salesOrders;
  }, [orderType, purchaseOrders, salesOrders]);

  // Separate active and archived orders
  const activeOrders = useMemo(() => {
    return currentOrders.filter(order => !order.archivedAt);
  }, [currentOrders]);

  const archivedOrders = useMemo(() => {
    return currentOrders.filter(order => order.archivedAt);
  }, [currentOrders]);

  // Filter and sort function for both tabs - handles both purchase orders and sales orders
  const getFilteredAndSortedOrders = (orders: any[]) => {
    let filtered = orders;

    // Filter by search term (order number or customer/supplier name)
    if (searchTerm.trim()) {
      filtered = filtered.filter(order => {
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        
        if (orderType === 'admin-to-supplier') {
          // Purchase orders - search by supplier
          const supplierName = order.supplierName?.toLowerCase() || '';
          const supplierCompany = order.supplierCompany?.toLowerCase() || '';
          return orderNumber.includes(searchTerm.toLowerCase()) ||
                 supplierName.includes(searchTerm.toLowerCase()) ||
                 supplierCompany.includes(searchTerm.toLowerCase());
        } else {
          // Sales orders - search by customer
          const customerName = order.customerName?.toLowerCase() || '';
          const customerCompany = order.customerCompany?.toLowerCase() || '';
          return orderNumber.includes(searchTerm.toLowerCase()) ||
                 customerName.includes(searchTerm.toLowerCase()) ||
                 customerCompany.includes(searchTerm.toLowerCase());
        }
      });
    }

    // Filter by status (only for active tab)
    if (activeTab === 'active' && statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        const status = orderType === 'admin-to-supplier' ? order.status : order.orderStatus;
        return status === statusFilter;
      });
    }

    // Sort orders
    return filtered.sort((a, b) => {
      const getDate = (order: any) => {
        return orderType === 'admin-to-supplier' ? order.createdAt : order.orderDate;
      };
      
      const getAmount = (order: any) => {
        return orderType === 'admin-to-supplier' ? order.totalAmount : order.amount;
      };

      const getName = (order: any) => {
        return orderType === 'admin-to-supplier' ? order.supplierName : order.customerName;
      };

      const getStatus = (order: any) => {
        return orderType === 'admin-to-supplier' ? order.status : order.orderStatus;
      };

      switch (sortBy) {
        case 'date_asc':
          return new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime();
        case 'date_desc':
          return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
        case 'po_number_asc':
          return a.orderNumber.localeCompare(b.orderNumber);
        case 'po_number_desc':
          return b.orderNumber.localeCompare(a.orderNumber);
        case 'supplier_asc':
          return getName(a).localeCompare(getName(b));
        case 'supplier_desc':
          return getName(b).localeCompare(getName(a));
        case 'amount_asc':
          return parseFloat(getAmount(a)) - parseFloat(getAmount(b));
        case 'amount_desc':
          return parseFloat(getAmount(b)) - parseFloat(getAmount(a));
        case 'status_asc':
          return getStatus(a).localeCompare(getStatus(b));
        case 'status_desc':
          return getStatus(b).localeCompare(getStatus(a));
        default:
          return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
      }
    });
  };

  const filteredActiveOrders = getFilteredAndSortedOrders(activeOrders);
  const filteredArchivedOrders = getFilteredAndSortedOrders(archivedOrders);

  const archivePOMutation = useMutation({
    mutationFn: async (poId: string) => {
      return apiRequest('PATCH', `/api/admin/purchase-orders/${poId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/purchase-orders'] });
      toast({
        title: "Purchase Order Archived",
        description: "The purchase order has been successfully archived.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Archive Failed",
        description: error.message || "Failed to archive purchase order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadPO = (poId: string, orderNumber: string) => {
    window.open(`/api/purchase-orders/${poId}/file`, '_blank');
  };

  const handleDownloadInvoice = async (poId: string, orderNumber: string) => {
    try {
      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch(`/api/admin/purchase-orders/${poId}/invoice`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Invoice_${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const handleArchivePO = (poId: string) => {
    archivePOMutation.mutate(poId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-600">
              {orderType === 'admin-to-supplier' 
                ? 'View and manage purchase orders sent to suppliers.' 
                : 'View and manage customer sales orders.'}
            </p>
          </div>
          
          {/* Order Type Selector */}
          <div className="flex items-center space-x-4">
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-to-supplier">Admin → Supplier POs</SelectItem>
                <SelectItem value="customer-to-admin">Customer → Admin Orders</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {orderType === 'admin-to-supplier' ? 'Total POs' : 'Total Orders'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{currentOrders.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {orderType === 'admin-to-supplier' ? 'Accepted' : 'Completed'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {orderType === 'admin-to-supplier' 
                      ? currentOrders.filter(po => po.status === 'accepted').length
                      : currentOrders.filter(order => order.orderStatus === 'delivered').length
                    }
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {orderType === 'admin-to-supplier'
                      ? currentOrders.filter(po => po.status === 'pending').length
                      : currentOrders.filter(order => order.orderStatus === 'pending').length
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${orderType === 'admin-to-supplier'
                      ? currentOrders.reduce((sum, po) => sum + parseFloat(po.totalAmount || '0'), 0).toFixed(2)
                      : currentOrders.reduce((sum, order) => sum + parseFloat(order.amount || '0'), 0).toFixed(2)
                    }
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search by PO Number or Supplier */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                <SelectItem value="po_number_asc">PO Number (A-Z)</SelectItem>
                <SelectItem value="po_number_desc">PO Number (Z-A)</SelectItem>
                <SelectItem value="supplier_asc">Supplier (A-Z)</SelectItem>
                <SelectItem value="supplier_desc">Supplier (Z-A)</SelectItem>
                <SelectItem value="amount_desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount_asc">Amount (Low to High)</SelectItem>
                <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                <SelectItem value="status_desc">Status (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {/* Results Count */}
            <div className="flex items-center justify-center md:justify-end text-sm text-gray-600">
              Showing {activeTab === 'active' ? filteredActiveOrders.length : filteredArchivedOrders.length} of {purchaseOrders.length} orders
            </div>
          </div>
        </Card>

        {/* Tabs for Active and Archived Orders */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active POs ({filteredActiveOrders.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived POs ({filteredArchivedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {filteredActiveOrders.length > 0 ? (
              filteredActiveOrders.map((po) => (
                <Card key={po.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">
                        {po.orderNumber}
                      </CardTitle>
                      <Badge className={getStatusColor(po.status)}>
                        {getStatusText(po.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Project Details */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h3 className="font-medium text-blue-900 mb-2">Project Information</h3>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium text-blue-800">Project:</span> {po.projectName}</p>
                        {po.material && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{po.material}</span>
                            </div>
                            {po.quantity && (
                              <div>
                                <span className="font-medium">Quantity:</span> {po.quantity}
                              </div>
                            )}
                            {po.materialGrade && (
                              <div>
                                <span className="font-medium">Grade:</span> {po.materialGrade}
                              </div>
                            )}
                            {po.finishing && (
                              <div>
                                <span className="font-medium">Finishing:</span> {po.finishing}
                              </div>
                            )}
                            {po.tolerance && (
                              <div>
                                <span className="font-medium">Tolerance:</span> {po.tolerance}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Supplier Details */}
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <h3 className="font-medium text-green-900 mb-2">Supplier Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <User className="h-4 w-4" />
                          <span className="font-medium">Contact:</span>
                          <span>{po.supplierName}</span>
                        </div>
                        {po.supplierCompany && (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <Building className="h-4 w-4" />
                            <span className="font-medium">Company:</span>
                            <span>{po.supplierCompany}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-green-600 mt-2">
                          <div>
                            <span className="font-medium">Vendor #:</span> {po.supplierVendorNumber}
                          </div>
                          <div>
                            <span className="font-medium">Supplier ID:</span> {po.supplierId.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">${parseFloat(po.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'No delivery date'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Created:</span>
                        <span className="text-xs">{new Date(po.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPO(po)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Purchase Order Details - {po.orderNumber}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Project Name</label>
                                <p className="text-sm text-gray-900">{po.projectName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <div className="mt-1">
                                  <Badge className={getStatusColor(po.status)}>
                                    {getStatusText(po.status)}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Total Amount</label>
                                <p className="text-sm text-gray-900">${parseFloat(po.totalAmount).toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Delivery Date</label>
                                <p className="text-sm text-gray-900">
                                  {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'Not set'}
                                </p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Supplier</label>
                                <p className="text-sm text-gray-900">{po.supplierName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Company</label>
                                <p className="text-sm text-gray-900">{po.supplierCompany || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Vendor Number</label>
                                <p className="text-sm text-gray-900">{po.supplierVendorNumber}</p>
                              </div>
                            </div>

                            {po.notes && (
                              <>
                                <Separator />
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Notes</label>
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{po.notes}</p>
                                </div>
                              </>
                            )}

                            {po.supplierInvoiceUrl && (
                              <>
                                <Separator />
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Supplier Invoice</label>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span className="text-sm text-green-600">
                                        Invoice uploaded on {new Date(po.invoiceUploadedAt!).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleDownloadInvoice(po.id, po.orderNumber)}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      View Invoice
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {po.poFileUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadPO(po.id, po.orderNumber)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download PO
                        </Button>
                      )}

                      {po.status === 'delivered' && !po.archivedAt && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleArchivePO(po.id)}
                          disabled={archivePOMutation.isPending}
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          {archivePOMutation.isPending ? 'Archiving...' : 'Archive'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active purchase orders</h3>
                  <p className="text-gray-600">Active purchase orders will appear here once created.</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {filteredArchivedOrders.length > 0 ? (
              filteredArchivedOrders.map((po) => (
              <Card key={po.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {po.orderNumber}
                    </CardTitle>
                    <Badge className={getStatusColor(po.status)}>
                      {getStatusText(po.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Details */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-blue-900 mb-2">Project Information</h3>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-medium text-blue-800">Project:</span> {po.projectName}</p>
                      {po.material && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{po.material}</span>
                          </div>
                          {po.quantity && (
                            <div>
                              <span className="font-medium">Quantity:</span> {po.quantity}
                            </div>
                          )}
                          {po.materialGrade && (
                            <div>
                              <span className="font-medium">Grade:</span> {po.materialGrade}
                            </div>
                          )}
                          {po.finishing && (
                            <div>
                              <span className="font-medium">Finishing:</span> {po.finishing}
                            </div>
                          )}
                          {po.tolerance && (
                            <div>
                              <span className="font-medium">Tolerance:</span> {po.tolerance}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplier Details */}
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-green-900 mb-2">Supplier Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Contact:</span>
                        <span>{po.supplierName}</span>
                      </div>
                      {po.supplierCompany && (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Building className="h-4 w-4" />
                          <span className="font-medium">Company:</span>
                          <span>{po.supplierCompany}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-green-600 mt-2">
                        <div>
                          <span className="font-medium">Vendor #:</span> {po.supplierVendorNumber}
                        </div>
                        <div>
                          <span className="font-medium">Supplier ID:</span> {po.supplierId.slice(0, 8)}...
                        </div>
                      </div>
                      {po.supplierInvoiceUrl && (
                        <div className="flex items-center gap-2 text-sm text-green-700 pt-2 border-t border-green-200">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">Invoice Uploaded:</span>
                          <span>{po.invoiceUploadedAt ? new Date(po.invoiceUploadedAt).toLocaleDateString() : 'Yes'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">${po.totalAmount}</span>
                      </div>
                      {po.deliveryDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                          <Calendar className="h-4 w-4" />
                          <span>Delivery: {new Date(po.deliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {/* Additional order details could go here */}
                    </div>
                  </div>

                  {/* Notes */}
                  {po.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{po.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      Created: {new Date(po.createdAt).toLocaleDateString()}
                      {po.acceptedAt && (
                        <span className="ml-3 text-green-600 font-medium">
                          Accepted: {new Date(po.acceptedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {po.poFileUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPO(po.id, po.orderNumber)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download PO
                        </Button>
                      )}
                      {po.status === 'delivered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchivePO(po.id)}
                          disabled={archivePOMutation.isPending}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          {archivePOMutation.isPending ? 'Archiving...' : 'Archive'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No Matching Purchase Orders' : 'No Purchase Orders'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No purchase orders have been created yet. They will appear here when you send orders to suppliers.'
                }
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}