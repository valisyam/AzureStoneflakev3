import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Calendar, DollarSign, Package, Check, Search, ArrowUpDown, Upload, CheckCircle, Filter, Eye, Building, User, BarChart3, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import SupplierLayout from '../../components/layout/SupplierLayout';
import PurchaseOrderTrackingModal from '../../components/supplier/purchase-order-tracking-modal';
import { useState, useMemo, useRef } from 'react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  projectName: string;
  material: string | null;
  quantity: number | null;
  totalAmount: string;
  deliveryDate: string | null;
  status: string;
  notes: string | null;
  poFileUrl: string | null;
  supplierInvoiceUrl: string | null;
  invoiceUploadedAt: string | null;
  paymentCompletedAt: string | null;
  createdAt: string;
  acceptedAt: string | null;
  archivedAt: string | null;
}

export default function SupplierPurchaseOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [trackingPO, setTrackingPO] = useState<PurchaseOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  
  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/supplier/purchase-orders'],
  });

  // Accept purchase order mutation
  const acceptPurchaseOrder = useMutation({
    mutationFn: async (poId: string) => {
      return apiRequest('PATCH', `/api/purchase-orders/${poId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/purchase-orders'] });
      toast({
        title: "Success",
        description: "Purchase order accepted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept purchase order",
        variant: "destructive",
      });
    },
  });

  // Reject purchase order mutation
  const rejectPurchaseOrder = useMutation({
    mutationFn: async (poId: string) => {
      return apiRequest('PATCH', `/api/purchase-orders/${poId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/purchase-orders'] });
      toast({
        title: "Success",
        description: "Purchase order rejected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject purchase order",
        variant: "destructive",
      });
    },
  });



  // Separate active and archived orders
  const activeOrders = useMemo(() => {
    if (purchaseOrders.length > 0) {
      console.log('PRODUCTION DEBUG - All PO data:', purchaseOrders.map(po => ({
        orderNumber: po.orderNumber,
        status: po.status,
        archivedAt: po.archivedAt,
        isArchived: !!po.archivedAt,
        statusIsArchived: po.status === 'archived'
      })));
    }
    // Filter out orders that are archived by either having archivedAt timestamp OR status = 'archived'
    return purchaseOrders.filter(po => !po.archivedAt && po.status !== 'archived');
  }, [purchaseOrders]);

  const archivedOrders = useMemo(() => {
    // Include orders that have archivedAt timestamp OR status = 'archived'
    return purchaseOrders.filter(po => po.archivedAt || po.status === 'archived');
  }, [purchaseOrders]);

  // Filter and sort function for both tabs
  const getFilteredAndSortedOrders = (orders: PurchaseOrder[]) => {
    let filtered = orders;

    // Filter by search term (PO number)
    if (searchTerm.trim()) {
      filtered = filtered.filter(po => 
        po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (only for active tab)
    if (activeTab === 'active' && statusFilter !== 'all') {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    // Sort orders
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'po_number_asc':
          return a.orderNumber.localeCompare(b.orderNumber);
        case 'po_number_desc':
          return b.orderNumber.localeCompare(a.orderNumber);
        case 'amount_asc':
          return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
        case 'amount_desc':
          return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
        case 'status_asc':
          return a.status.localeCompare(b.status);
        case 'status_desc':
          return b.status.localeCompare(a.status);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  };

  const filteredActiveOrders = getFilteredAndSortedOrders(activeOrders);
  const filteredArchivedOrders = getFilteredAndSortedOrders(archivedOrders);

  const handleUploadInvoice = useMutation({
    mutationFn: async ({ poId, file }: { poId: string; file: File }) => {
      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('poId', poId);
      
      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch('/api/supplier/purchase-orders/upload-invoice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/purchase-orders'] });
      toast({
        title: "Success",
        description: "Invoice uploaded successfully",
      });
      setUploadingInvoiceId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload invoice",
        variant: "destructive",
      });
      setUploadingInvoiceId(null);
    },
  });

  const handleFileUpload = (poId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && file.type === 'application/pdf') {
          setUploadingInvoiceId(poId);
          handleUploadInvoice.mutate({ poId, file });
        } else {
          toast({
            title: "Error",
            description: "Please select a PDF file",
            variant: "destructive",
          });
        }
      };
      fileInputRef.current.click();
    }
  };

  const downloadPO = async (poId: string, orderNumber: string) => {
    try {
      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch(`/api/supplier/purchase-orders/${poId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `PO_${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Purchase order downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download purchase order",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 border-green-200' },
      declined: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' },
      in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
      delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      color: 'bg-gray-100 text-gray-800 border-gray-200' 
    };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const renderPurchaseOrderCard = (po: PurchaseOrder) => (
    <Card key={po.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {po.orderNumber}
          </CardTitle>
          {getStatusBadge(po.status)}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {po.projectName || 'Manual Purchase Order'}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{formatCurrency(po.totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{formatDate(po.deliveryDate)}</span>
          </div>
          {po.material && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{po.material}</span>
            </div>
          )}
          {po.quantity && (
            <div className="flex items-center gap-2">
              <span className="text-sm">Qty: {po.quantity}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
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
                    <p className="text-sm text-gray-900">{po.projectName || 'Manual Purchase Order'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(po.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="text-sm text-gray-900">{formatCurrency(po.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Delivery Date</label>
                    <p className="text-sm text-gray-900">{formatDate(po.deliveryDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created Date</label>
                    <p className="text-sm text-gray-900">{formatDate(po.createdAt)}</p>
                  </div>
                  {po.acceptedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Accepted Date</label>
                      <p className="text-sm text-gray-900">{formatDate(po.acceptedAt)}</p>
                    </div>
                  )}
                </div>
                
                {po.material && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Material</label>
                    <p className="text-sm text-gray-900">{po.material}</p>
                  </div>
                )}
                
                {po.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{po.notes}</p>
                  </div>
                )}

                {po.supplierInvoiceUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Invoice Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        Invoice uploaded on {formatDate(po.invoiceUploadedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {po.poFileUrl && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadPO(po.id, po.orderNumber)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download PO
            </Button>
          )}

          {/* Accept/Reject buttons for pending orders */}
          {po.status === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => acceptPurchaseOrder.mutate(po.id)}
                disabled={acceptPurchaseOrder.isPending || rejectPurchaseOrder.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid={`button-accept-po-${po.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                {acceptPurchaseOrder.isPending ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rejectPurchaseOrder.mutate(po.id)}
                disabled={acceptPurchaseOrder.isPending || rejectPurchaseOrder.isPending}
                data-testid={`button-reject-po-${po.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                {rejectPurchaseOrder.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </>
          )}

          {/* Track Order Button - Show for active orders */}
          {!po.archivedAt && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTrackingPO(po);
                setIsTrackingModalOpen(true);
              }}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Track Order
            </Button>
          )}

          {po.status === 'delivered' && !po.supplierInvoiceUrl && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleFileUpload(po.id)}
              disabled={uploadingInvoiceId === po.id}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadingInvoiceId === po.id ? 'Uploading...' : 'Upload Invoice'}
            </Button>
          )}

          {po.supplierInvoiceUrl && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Invoice Uploaded</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <SupplierLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </SupplierLayout>
    );
  }

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by PO number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                <SelectItem value="po_number_asc">PO Number (A-Z)</SelectItem>
                <SelectItem value="po_number_desc">PO Number (Z-A)</SelectItem>
                <SelectItem value="amount_desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount_asc">Amount (Low to High)</SelectItem>
                <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                <SelectItem value="status_desc">Status (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeTab === 'active' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tabs for Active and Archived Orders */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active POs ({filteredActiveOrders.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Archived POs ({filteredArchivedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {filteredActiveOrders.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No matching purchase orders' : 'No active purchase orders'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'Try adjusting your search terms or filters.' 
                      : 'Active purchase orders will appear here once created.'}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredActiveOrders.map(renderPurchaseOrderCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {filteredArchivedOrders.length === 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No matching archived orders' : 'No archived purchase orders'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'Try adjusting your search terms.' 
                      : 'Archived purchase orders will appear here.'}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredArchivedOrders.map(renderPurchaseOrderCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Hidden file input for invoice upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
        />

        {/* Purchase Order Tracking Modal */}
        {trackingPO && (
          <PurchaseOrderTrackingModal
            purchaseOrder={trackingPO}
            isOpen={isTrackingModalOpen}
            onClose={() => {
              setIsTrackingModalOpen(false);
              setTrackingPO(null);
            }}
          />
        )}
      </div>
    </SupplierLayout>
  );
}