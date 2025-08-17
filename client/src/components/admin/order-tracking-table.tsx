import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, User, Calendar, AlertCircle, Truck, Save, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import ShipmentTracking from "@/components/shared/shipment-tracking";
import QualityCheckManager from "@/components/admin/quality-check-manager";

type OrderStatus = 
  | "pending"
  | "material_procurement"
  | "manufacturing"
  | "finishing"
  | "quality_check"
  | "packing"
  | "shipped"
  | "delivered";

interface Order {
  id: string;
  userId: string;
  rfqId: string;
  quoteId: string;
  orderNumber?: string;
  orderStatus: OrderStatus;
  paymentStatus: 'paid' | 'unpaid';
  isArchived: boolean;
  orderDate: string;
  estimatedCompletion?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  invoiceUrl?: string;
  archivedAt?: string;
  quantity: number;
  quantityShipped?: number;
  quantityRemaining?: number;
  user: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  rfq: {
    id: string;
    projectName: string;
    material: string;
    materialGrade?: string;
    finishing?: string;
    tolerance?: string;
    quantity: number;
    specialInstructions?: string;
    files?: Array<{
      id: string;
      fileName: string;
      filePath: string;
      fileType: string;
    }>;
  };
  amount?: string;
  quote?: {
    id: string;
    quoteNumber: string;
    amount: string;
  };
}

export default function OrderTrackingTable() {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});
  const [shippingCarriers, setShippingCarriers] = useState<Record<string, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<Record<string, File | null>>({});
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({});
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState<string>('orders');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shipmentQuantities, setShipmentQuantities] = useState<Record<string, string>>({});
  const [qualityCheckFiles, setQualityCheckFiles] = useState<Record<string, File[]>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  // Initialize order statuses when orders load
  useEffect(() => {
    if (orders) {
      const initialStatuses: Record<string, string> = {};
      const initialPaymentStatuses: Record<string, string> = {};
      orders.forEach((order: Order) => {
        initialStatuses[order.id] = order.orderStatus;
        initialPaymentStatuses[order.id] = order.paymentStatus;
      });
      setOrderStatuses(initialStatuses);
      setPaymentStatuses(initialPaymentStatuses);
    }
  }, [orders]);

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      material_procurement: "bg-blue-100 text-blue-800 border-blue-300",
      manufacturing: "bg-purple-100 text-purple-800 border-purple-300",
      finishing: "bg-indigo-100 text-indigo-800 border-indigo-300",
      quality_check: "bg-orange-100 text-orange-800 border-orange-300",
      packing: "bg-cyan-100 text-cyan-800 border-cyan-300",
      shipped: "bg-green-100 text-green-800 border-green-300",
      delivered: "bg-gray-100 text-gray-800 border-gray-300"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusDisplay = (status: OrderStatus) => {
    const displays: Record<OrderStatus, string> = {
      pending: "Order Confirmed",
      material_procurement: "Material Procurement",
      manufacturing: "Manufacturing",
      finishing: "Finishing",
      quality_check: "Quality Check",
      packing: "Packing",
      shipped: "Shipped",
      delivered: "Delivered"
    };
    return displays[status] || status;
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setHasUnsavedChanges(prev => ({ ...prev, [orderId]: false }));
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber, shippingCarrier }: { orderId: string; trackingNumber: string; shippingCarrier: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/tracking`, { trackingNumber, shippingCarrier });
      if (!res.ok) throw new Error("Failed to update tracking information");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Success",
        description: "Tracking information updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update tracking information",
        variant: "destructive",
      });
    },
  });

  const uploadInvoiceMutation = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      const formData = new FormData();
      formData.append('invoice', file);
      
      // Get token using the same method as the rest of the app
      const token = localStorage.getItem('stoneflake_token');
      
      if (!token) {
        throw new Error('Please login again - your session has expired.');
      }
      
      const res = await fetch(`/api/orders/${orderId}/invoice`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${res.status}: ${errorText}` };
        }
        throw new Error(errorData.message || `Upload failed with status ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setInvoiceFiles(prev => ({ ...prev, [orderId]: null }));
      // Clear the file input
      const fileInput = document.getElementById(`invoice-${orderId}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({
        title: "Success",
        description: "Invoice uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to upload invoice",
        variant: "destructive",
      });
    },
  });

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrderStatuses(prev => ({ ...prev, [orderId]: newStatus }));
    const currentOrder = orders?.find(order => order.id === orderId);
    if (currentOrder && currentOrder.orderStatus !== newStatus) {
      setHasUnsavedChanges(prev => ({ ...prev, [orderId]: true }));
    }
  };

  const handleSaveStatus = (orderId: string) => {
    const newStatus = orderStatuses[orderId];
    if (newStatus) {
      updateStatusMutation.mutate({ orderId, status: newStatus as OrderStatus });
    }
  };

  const updateTrackingNumber = (orderId: string, trackingNumber: string) => {
    setTrackingNumbers(prev => ({ ...prev, [orderId]: trackingNumber }));
  };

  const updateShippingCarrier = (orderId: string, carrier: string) => {
    setShippingCarriers(prev => ({ ...prev, [orderId]: carrier }));
  };

  const handleTrackingUpdate = (orderId: string) => {
    const trackingNumber = trackingNumbers[orderId] || '';
    const shippingCarrier = shippingCarriers[orderId] || '';
    updateTrackingMutation.mutate({ orderId, trackingNumber, shippingCarrier });
  };

  const updateInvoiceFile = (orderId: string, file: File | null) => {
    setInvoiceFiles(prev => ({ ...prev, [orderId]: file }));
  };

  const handleInvoiceUpload = (orderId: string) => {
    const file = invoiceFiles[orderId];
    if (file) {
      uploadInvoiceMutation.mutate({ orderId, file });
    }
  };

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: string; paymentStatus: 'paid' | 'unpaid' }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/payment`, { paymentStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/archived"] });
      toast({
        title: "Success",
        description: "Payment status updated successfully. Order has been archived.",
      });
    },
    onError: (error) => {
      console.error('Payment update error:', error);
      const errorMessage = error.message || "Failed to update payment status";
      
      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Invalid token') || errorMessage.includes('Access token required')) {
        toast({
          title: "Session Expired",
          description: "Please log out and log back in to continue",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handlePaymentStatusUpdate = (orderId: string, paymentStatus: 'paid' | 'unpaid') => {
    updatePaymentMutation.mutate({ orderId, paymentStatus });
  };

  const recordShipmentMutation = useMutation({
    mutationFn: async ({ orderId, quantityShipped, trackingNumber, shippingCarrier }: { 
      orderId: string; 
      quantityShipped: number; 
      trackingNumber?: string; 
      shippingCarrier?: string; 
    }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/shipments`, { 
        quantityShipped, 
        trackingNumber, 
        shippingCarrier 
      });
      if (!res.ok) throw new Error("Failed to record shipment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Success",
        description: "Partial shipment recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to record shipment",
        variant: "destructive",
      });
    },
  });

  const uploadQualityCheckMutation = useMutation({
    mutationFn: async ({ orderId, files }: { orderId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`qualityCheck`, file);
      });
      
      const token = localStorage.getItem('stoneflake_token');
      
      if (!token) {
        throw new Error('Please login again - your session has expired.');
      }
      
      const res = await fetch(`/api/orders/${orderId}/quality-check`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${res.status}: ${errorText}` };
        }
        throw new Error(errorData.message || `Upload failed with status ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setQualityCheckFiles(prev => ({ ...prev, [orderId]: [] }));
      // Clear the file input
      const fileInput = document.getElementById(`quality-check-${orderId}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({
        title: "Success",
        description: "Quality check report uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to upload quality check report",
        variant: "destructive",
      });
    },
  });

  const handleRecordShipment = (orderId: string) => {
    const quantityStr = shipmentQuantities[orderId];
    const quantity = parseInt(quantityStr);
    
    if (!quantity || quantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity to ship",
        variant: "destructive",
      });
      return;
    }

    const trackingNumber = trackingNumbers[orderId] || '';
    const shippingCarrier = shippingCarriers[orderId] || '';
    
    recordShipmentMutation.mutate({ 
      orderId, 
      quantityShipped: quantity, 
      trackingNumber: trackingNumber || undefined, 
      shippingCarrier: shippingCarrier || undefined 
    });
    
    // Clear the shipment quantity input
    setShipmentQuantities(prev => ({ ...prev, [orderId]: '' }));
  };

  const updateQualityCheckFiles = (orderId: string, files: File[]) => {
    setQualityCheckFiles(prev => ({ ...prev, [orderId]: files }));
  };

  const handleQualityCheckUpload = (orderId: string) => {
    const files = qualityCheckFiles[orderId];
    if (files && files.length > 0) {
      uploadQualityCheckMutation.mutate({ orderId, files });
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = !searchTerm || 
      order.rfq.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.rfq.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || statusFilter === "all" || order.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8">
            <LoadingSpinner size="md" text="Loading orders..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <CardTitle>Order Tracking</CardTitle>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders by project, customer, material, order number, or tracking number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Order Confirmed</SelectItem>
                  <SelectItem value="material_procurement">Material Procurement</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="packing">Packing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-500">Orders will appear here when customers accept quotes.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Orders</h3>
            <p className="text-gray-500">No orders match your current search criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
                <div>Order ID</div>
                <div>Customer</div>
                <div>Company</div>
                <div>Material</div>
                <div>Quantity</div>
                <div>Status</div>
                <div>Tracking</div>
                <div>Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="transition-colors hover:bg-gray-50">
                  {/* Table Row */}
                  <div 
                    className="grid grid-cols-8 gap-4 items-center px-6 py-4 cursor-pointer"
                    onClick={() => toggleOrderExpansion(order.id)}
                  >
                    <div className="text-base font-mono text-gray-900">
                      {order.orderNumber || `#${order.id.slice(0, 8)}`}
                    </div>
                    <div className="text-base text-gray-900">
                      {order.user.name}
                    </div>
                    <div className="text-base text-gray-900">
                      {order.user.company || '—'}
                    </div>
                    <div className="text-base text-gray-900">
                      {order.rfq.material}
                    </div>
                    <div className="text-base text-gray-900">
                      {order.quantityShipped ? (
                        <div className="flex flex-col text-sm">
                          <span>{order.quantityShipped} shipped</span>
                          {(order.quantityRemaining && order.quantityRemaining > 0) && (
                            <span className="text-gray-500">{order.quantityRemaining} remaining</span>
                          )}
                        </div>
                      ) : (
                        <span>{order.quantity}</span>
                      )}
                    </div>
                    <div>
                      <Badge className={`${getStatusColor(order.orderStatus)} text-sm`}>
                        {getStatusDisplay(order.orderStatus)}
                      </Badge>
                    </div>
                    <div className="text-base text-gray-600">
                      {order.trackingNumber ? (
                        <span className="font-mono">{order.trackingNumber}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOrderExpansion(order.id);
                        }}
                      >
                        {expandedOrders[order.id] ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Details
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedOrders[order.id] && (
                    <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100">
                      <div className="space-y-6">
                        {/* Order Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Project Info */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <Label className="text-base font-medium text-gray-800 mb-3 block">
                              Project Information
                            </Label>
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {order.rfq.projectName}
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Order Number:</span>
                                  <p className="font-mono font-medium">{order.orderNumber || `#${order.id.slice(0, 8)}`}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Order Date:</span>
                                  <p className="font-medium">{format(new Date(order.orderDate), 'MMM dd, yyyy')}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Quote Number:</span>
                                  <p className="font-mono font-medium">{order.quote?.quoteNumber || (order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A')}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Customer:</span>
                                  <p className="font-medium">{order.user.name}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <p className="font-medium">{order.user.email}</p>
                                </div>
                                {order.user.company && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Company:</span>
                                    <p className="font-medium">{order.user.company}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Manufacturing Specs */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <Label className="text-base font-medium text-gray-800 mb-3 block">
                              Manufacturing Specifications
                            </Label>
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-500">Material:</span>
                                  <p className="font-medium">{order.rfq.material}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Quantity:</span>
                                  <p className="font-medium">
                                    {order.quantity} PCS ordered
                                    {order.quantityShipped && (
                                      <span className="text-sm text-gray-600 block">
                                        {order.quantityShipped} shipped{(order.quantityRemaining && order.quantityRemaining > 0) && `, ${order.quantityRemaining} remaining`}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Material Grade:</span>
                                  <p className="font-medium">{order.rfq.materialGrade || 'Standard'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Finishing:</span>
                                  <p className="font-medium">{order.rfq.finishing || 'As machined'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Tolerance:</span>
                                  <p className="font-medium">{order.rfq.tolerance || 'Standard'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Order Value:</span>
                                  <p className="font-medium text-green-600">${order.amount ? parseFloat(order.amount).toLocaleString() : 'N/A'}</p>
                                </div>
                              </div>
                              {order.rfq.specialInstructions && (
                                <div>
                                  <span className="text-gray-500">Special Instructions:</span>
                                  <p className="font-medium text-xs mt-1 p-2 bg-gray-50 rounded">{order.rfq.specialInstructions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RFQ Files Display */}
                        {order.rfq.files && order.rfq.files.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <Label className="text-base font-medium text-gray-800 mb-2 block">
                              Project Files
                            </Label>
                            <div className="space-y-2">
                              {order.rfq.files.map((file) => (
                                <div key={file.id} className="flex items-center space-x-2">
                                  <Package className="h-4 w-4 text-gray-500" />
                                  <a
                                    href={file.filePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-teal-600 hover:text-teal-700 underline"
                                  >
                                    {file.fileName}
                                  </a>
                                  <span className="text-sm text-gray-500">
                                    ({file.fileType.toUpperCase()})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Status Update Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-base text-gray-600">Update Status:</span>
                              <Select
                                value={orderStatuses[order.id] || order.orderStatus || 'pending'}
                                onValueChange={(value) => handleStatusChange(order.id, value)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Order Confirmed</SelectItem>
                                  <SelectItem value="material_procurement">Material Procurement</SelectItem>
                                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                  <SelectItem value="finishing">Finishing</SelectItem>
                                  <SelectItem value="quality_check">Quality Check</SelectItem>
                                  <SelectItem value="packing">Packing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleSaveStatus(order.id)}
                                disabled={!hasUnsavedChanges[order.id] || updateStatusMutation.isPending || order.orderStatus === 'delivered'}
                                className={`${
                                  order.orderStatus === 'delivered' 
                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                    : hasUnsavedChanges[order.id] 
                                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                                      : 'bg-gray-300 text-gray-500'
                                } transition-colors duration-200`}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {updateStatusMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                            
                            {hasUnsavedChanges[order.id] && (
                              <span className="text-base text-amber-600">Unsaved changes</span>
                            )}
                          </div>

                          {/* Tracking Number Section - Show when status is shipped or delivered */}
                          {(order.orderStatus === 'shipped' || order.orderStatus === 'delivered') && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <Truck className="h-5 w-5 text-green-600 mt-1" />
                                <div className="flex-1 space-y-3">
                                  <Label className="text-base font-medium text-green-800">
                                    Shipping Information
                                  </Label>
                                  
                                  {/* Carrier Selection */}
                                  <div>
                                    <Label htmlFor={`carrier-${order.id}`} className="text-sm text-green-700">
                                      Shipping Carrier
                                    </Label>
                                    <Select
                                      value={shippingCarriers[order.id] || order.shippingCarrier || 'none'}
                                      onValueChange={(value) => updateShippingCarrier(order.id, value)}
                                    >
                                      <SelectTrigger className="w-full mt-1">
                                        <SelectValue placeholder="Select carrier" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No Carrier Selected</SelectItem>
                                        <SelectItem value="FedEx">FedEx</SelectItem>
                                        <SelectItem value="UPS">UPS</SelectItem>
                                        <SelectItem value="DHL">DHL</SelectItem>
                                        <SelectItem value="Liberate Logistics">Liberate Logistics</SelectItem>
                                        <SelectItem value="USPS">USPS</SelectItem>
                                        <SelectItem value="Custom">Custom Carrier</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* Custom carrier input */}
                                    {(shippingCarriers[order.id] === 'Custom' || (order.shippingCarrier && !['FedEx', 'UPS', 'DHL', 'Liberate Logistics', 'USPS'].includes(order.shippingCarrier))) && (
                                      <Input
                                        placeholder="Enter custom carrier name"
                                        value={shippingCarriers[order.id] === 'Custom' ? '' : (shippingCarriers[order.id] || order.shippingCarrier || '')}
                                        onChange={(e) => updateShippingCarrier(order.id, e.target.value)}
                                        className="mt-2"
                                      />
                                    )}
                                  </div>

                                  {/* Tracking Number */}
                                  <div>
                                    <Label htmlFor={`tracking-${order.id}`} className="text-sm text-green-700">
                                      Tracking Number
                                    </Label>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Input
                                        id={`tracking-${order.id}`}
                                        placeholder="Enter tracking number"
                                        value={trackingNumbers[order.id] || order.trackingNumber || ''}
                                        onChange={(e) => updateTrackingNumber(order.id, e.target.value)}
                                        className="flex-1"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleTrackingUpdate(order.id)}
                                        disabled={updateTrackingMutation.isPending || !trackingNumbers[order.id]?.trim()}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {updateTrackingMutation.isPending ? 'Saving...' : 'Save'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Partial Shipment Section - Show when order has remaining quantity */}
                          {(order.quantityRemaining && order.quantityRemaining > 0) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <Package className="h-5 w-5 text-yellow-600 mt-1" />
                                <div className="flex-1 space-y-3">
                                  <Label className="text-base font-medium text-yellow-800">
                                    Record Partial Shipment
                                  </Label>
                                  <p className="text-sm text-yellow-700">
                                    Order has {order.quantityRemaining} PCS remaining to ship
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Quantity to Ship */}
                                    <div>
                                      <Label htmlFor={`ship-quantity-${order.id}`} className="text-sm text-yellow-700">
                                        Quantity to Ship
                                      </Label>
                                      <Input
                                        id={`ship-quantity-${order.id}`}
                                        type="number"
                                        min="1"
                                        max={order.quantityRemaining}
                                        placeholder="Enter quantity"
                                        value={shipmentQuantities[order.id] || ''}
                                        onChange={(e) => setShipmentQuantities(prev => ({ ...prev, [order.id]: e.target.value }))}
                                        className="mt-1"
                                      />
                                    </div>

                                    {/* Tracking Number (Optional) */}
                                    <div>
                                      <Label htmlFor={`ship-tracking-${order.id}`} className="text-sm text-yellow-700">
                                        Tracking Number (Optional)
                                      </Label>
                                      <Input
                                        id={`ship-tracking-${order.id}`}
                                        placeholder="Enter tracking number"
                                        value={trackingNumbers[order.id] || ''}
                                        onChange={(e) => updateTrackingNumber(order.id, e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>

                                    {/* Shipping Carrier (Optional) */}
                                    <div>
                                      <Label htmlFor={`ship-carrier-${order.id}`} className="text-sm text-yellow-700">
                                        Carrier (Optional)
                                      </Label>
                                      <Select
                                        value={shippingCarriers[order.id] || ''}
                                        onValueChange={(value) => updateShippingCarrier(order.id, value)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Select carrier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          <SelectItem value="FedEx">FedEx</SelectItem>
                                          <SelectItem value="UPS">UPS</SelectItem>
                                          <SelectItem value="DHL">DHL</SelectItem>
                                          <SelectItem value="Liberate Logistics">Liberate Logistics</SelectItem>
                                          <SelectItem value="USPS">USPS</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    onClick={() => handleRecordShipment(order.id)}
                                    disabled={recordShipmentMutation.isPending || !shipmentQuantities[order.id]}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                  >
                                    {recordShipmentMutation.isPending ? 'Recording...' : 'Record Shipment'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Quality Check Management */}
                          <QualityCheckManager 
                            orderId={order.id}
                            orderStatus={order.orderStatus}
                          />

                          {/* Invoice Section - Show when status is packing or later */}
                          {(order.orderStatus === 'packing' || order.orderStatus === 'shipped' || order.orderStatus === 'delivered') && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <Package className="h-5 w-5 text-blue-600 mt-1" />
                                <div className="flex-1 space-y-3">
                                  <Label className="text-base font-medium text-blue-800">
                                    Invoice Management
                                  </Label>
                                  
                                  {order.invoiceUrl ? (
                                    <div className="p-3 bg-white rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-blue-700">Invoice uploaded</span>
                                        <a
                                          href={order.invoiceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                                        >
                                          View Invoice
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <Label htmlFor={`invoice-${order.id}`} className="text-sm text-blue-700">
                                        Upload Invoice (PDF)
                                      </Label>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Input
                                          id={`invoice-${order.id}`}
                                          type="file"
                                          accept=".pdf"
                                          onChange={(e) => updateInvoiceFile(order.id, e.target.files?.[0] || null)}
                                          className="flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleInvoiceUpload(order.id)}
                                          disabled={uploadInvoiceMutation.isPending || !invoiceFiles[order.id]}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          {uploadInvoiceMutation.isPending ? 'Uploading...' : 'Upload'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Payment Status Section - Show when invoice is uploaded */}
                          {order.invoiceUrl && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-purple-600 mt-1" />
                                <div className="flex-1 space-y-3">
                                  <Label className="text-base font-medium text-purple-800">
                                    Payment Status
                                  </Label>
                                  
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-purple-700">Current Status:</span>
                                      <Badge variant="outline" className={`${
                                        order.paymentStatus === 'paid' 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      }`}>
                                        {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                      </Badge>
                                    </div>
                                    
                                    {order.paymentStatus === 'unpaid' && (
                                      <Button
                                        size="sm"
                                        onClick={() => handlePaymentStatusUpdate(order.id, 'paid')}
                                        disabled={updatePaymentMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {updatePaymentMutation.isPending ? 'Processing...' : 'Mark as Paid & Archive'}
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {order.paymentStatus === 'paid' && (
                                    <div className="text-sm text-green-700">
                                      Order has been marked as paid and archived.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Detailed Shipment Tracking - Show if order has shipments */}
                          {(order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || (order.quantityShipped && order.quantityShipped > 0)) && (
                            <ShipmentTracking 
                              orderId={order.id}
                              isAdmin={true}
                              totalQuantity={order.quantity}
                              quantityShipped={order.quantityShipped || 0}
                              quantityRemaining={order.quantityRemaining || order.quantity}
                            />
                          )}

                          {/* RFQ Files Display */}
                          {order.rfq.files && order.rfq.files.length > 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <Label className="text-base font-medium text-gray-800 mb-2 block">
                                Project Files
                              </Label>
                              <div className="space-y-2">
                                {order.rfq.files.map((file) => (
                                  <div key={file.id} className="flex items-center space-x-2">
                                    <Package className="h-4 w-4 text-gray-500" />
                                    <a
                                      href={file.filePath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-teal-600 hover:text-teal-700 underline"
                                    >
                                      {file.fileName}
                                    </a>
                                    <span className="text-sm text-gray-500">
                                      ({file.fileType.toUpperCase()})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}