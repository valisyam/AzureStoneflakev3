import { useState, useMemo, useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SalesOrder, RFQ } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Download, 
  Package, 
  Eye, 
  Filter, 
  Search,
  RefreshCw,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Truck,
  Settings,
  RotateCcw,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import OrderDetailsModal from "@/components/customer/order-details-modal";
import OrderTrackingModal from "@/components/customer/order-tracking-modal";
import { apiRequest } from "@/lib/queryClient";

type OrderData = SalesOrder & { rfq: RFQ };

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Modal states
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderData | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OrderData | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isOrderTrackingModalOpen, setIsOrderTrackingModalOpen] = useState(false);
  
  // Reorder states
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [showReorderConfirm, setShowReorderConfirm] = useState(false);
  const [orderToReorder, setOrderToReorder] = useState<OrderData | null>(null);

  // Column resizing
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    orderNumber: 120,
    customerPO: 120,
    projectName: 200,
    material: 120,
    quantity: 100,
    orderDate: 120,
    status: 120,
    actions: 140
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);

  const { data: allOrders, isLoading } = useQuery<OrderData[]>({
    queryKey: ["/api/orders"],
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setReorderingOrderId(orderId);
      const response = await apiRequest('POST', `/api/orders/${orderId}/reorder`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setReorderingOrderId(null);
      setShowReorderConfirm(false);
      setOrderToReorder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Reorder Request Submitted",
        description: `Your reorder request for "${data.rfq.projectName}" has been submitted. You'll see it in your active orders once admin approves and requotes.`,
      });
    },
    onError: (error) => {
      setReorderingOrderId(null);
      setShowReorderConfirm(false);
      setOrderToReorder(null);
      toast({
        title: "Reorder Failed",
        description: error.message || "Failed to create reorder request",
        variant: "destructive",
      });
    },
  });

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    
    let filtered = allOrders.filter(order => {
      // Tab filter
      if (activeTab === "active") {
        return order.orderStatus !== 'delivered' && !order.isArchived;
      } else {
        return order.orderStatus === 'delivered' || order.isArchived;
      }
    });
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerPurchaseOrderNumber?.toLowerCase().includes(search) ||
        order.rfq.projectName.toLowerCase().includes(search) ||
        order.material.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.orderDate || 0).getTime() - new Date(b.orderDate || 0).getTime();
        case "date-desc":
          return new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime();
        case "status":
          return (a.orderStatus || "").localeCompare(b.orderStatus || "");
        case "project":
          return a.rfq.projectName.localeCompare(b.rfq.projectName);
        case "amount":
          return parseFloat(b.amount || "0") - parseFloat(a.amount || "0");
        default:
          return 0;
      }
    });
  }, [allOrders, activeTab, statusFilter, searchTerm, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "material_procurement":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "manufacturing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "finishing":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "quality_check":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "packing":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "shipped":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Confirmed";
      case "material_procurement":
        return "Material Procurement";
      case "manufacturing":
        return "Manufacturing";
      case "finishing":
        return "Finishing";
      case "quality_check":
        return "Quality Check";
      case "packing":
        return "Packing";
      case "shipped":
        return "Shipped";
      case "delivered":
        return "Delivered";
      default:
        return status?.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') || status;
    }
  };

  const handleRowToggle = (orderId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  const handleViewDetails = (order: OrderData) => {
    setSelectedOrderForDetails(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleViewTracking = (order: OrderData) => {
    setSelectedOrderForTracking(order);
    setIsOrderTrackingModalOpen(true);
  };

  const handleReorder = (order: OrderData) => {
    setOrderToReorder(order);
    setShowReorderConfirm(true);
  };

  const handleDownloadZip = async (order: OrderData) => {
    try {
      toast({
        title: "Preparing Download",
        description: "Generating zip file with order documents...",
      });

      const response = await fetch(`/api/orders/${order.id}/files/download-all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download zip file');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `order-${order.orderNumber}-documents.zip`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Order documents downloaded successfully.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download order documents. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmReorder = () => {
    if (orderToReorder) {
      reorderMutation.mutate(orderToReorder.id);
    }
  };

  const cancelReorder = () => {
    setShowReorderConfirm(false);
    setOrderToReorder(null);
  };

  // Column resizing handlers
  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(column);
    const startX = e.clientX;
    const startWidth = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (e.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const saveView = () => {
    localStorage.setItem('orders-column-widths', JSON.stringify(columnWidths));
    toast({
      title: "View Saved",
      description: "Your column widths have been saved and will be remembered.",
    });
  };

  const resetColumns = () => {
    const defaultWidths = {
      orderNumber: 120,
      customerPO: 120,
      projectName: 200,
      material: 120,
      quantity: 100,
      orderDate: 120,
      status: 120,
      actions: 140
    };
    setColumnWidths(defaultWidths);
    localStorage.removeItem('orders-column-widths');
    toast({
      title: "Columns Reset",
      description: "Column widths have been reset to default.",
    });
  };

  // Load saved column widths
  useEffect(() => {
    const saved = localStorage.getItem('orders-column-widths');
    if (saved) {
      setColumnWidths(JSON.parse(saved));
    }
  }, []);

  const activeOrdersCount = allOrders?.filter(order => order.orderStatus !== 'delivered' && !order.isArchived).length || 0;
  const archivedOrdersCount = allOrders?.filter(order => order.orderStatus === 'delivered' || order.isArchived).length || 0;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <Link href="/" className="text-teal-primary hover:text-teal-700 text-sm font-medium">
            ← Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">My Orders</h2>
          <p className="text-gray-600 mt-2">Track your manufacturing orders and view order history with detailed status updates.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{activeOrdersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{archivedOrdersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-teal-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{(allOrders?.length || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Active Orders ({activeOrdersCount})
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Order History ({archivedOrdersCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {/* Filters and Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search orders, PO numbers, projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Order Confirmed</SelectItem>
                    <SelectItem value="material_procurement">Material Procurement</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="packing">Packing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    {activeTab === "archived" && <SelectItem value="delivered">Delivered</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="project">Project Name</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={saveView}>
                  <Settings className="h-4 w-4 mr-2" />
                  Save View
                </Button>
                <Button variant="outline" size="sm" onClick={resetColumns}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Columns
                </Button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: columnWidths.orderNumber }} className="relative border-r">
                      Order Number
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('orderNumber', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.customerPO }} className="relative border-r">
                      Customer PO
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('customerPO', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.projectName }} className="relative border-r">
                      Project Name
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('projectName', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.material }} className="relative border-r">
                      Material
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('material', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.quantity }} className="relative border-r">
                      Quantity
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('quantity', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.orderDate }} className="relative border-r">
                      Order Date
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('orderDate', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.status }} className="relative border-r">
                      Status
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300"
                        onMouseDown={(e) => handleMouseDown('status', e)}
                      />
                    </TableHead>
                    <TableHead style={{ width: columnWidths.actions }}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {searchTerm || statusFilter !== "all" 
                          ? "No orders match your filters" 
                          : `No ${activeTab} orders found`
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-b">
                        <TableCell className="font-medium border-r">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="border-r">
                          {order.customerPurchaseOrderNumber || (
                            <span className="text-gray-400 italic">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell className="border-r">
                          {order.rfq.projectName}
                        </TableCell>
                        <TableCell className="border-r">
                          {order.material}
                        </TableCell>
                        <TableCell className="border-r">
                          {order.quantity}
                        </TableCell>
                        <TableCell className="border-r">
                          {order.orderDate ? format(new Date(order.orderDate), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="border-r">
                          <Badge className={cn("border", getStatusColor(order.orderStatus || ""))}>
                            {getStatusDisplay(order.orderStatus || "")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                              className="hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTracking(order)}
                              className="hover:bg-green-50"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Tracking
                            </Button>
                            {order.invoiceUrl && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Handle both relative and absolute URLs
                                    const invoiceUrl = order.invoiceUrl!.startsWith('http') 
                                      ? order.invoiceUrl! 
                                      : `${window.location.origin}${order.invoiceUrl}`;
                                    
                                    // Create a temporary link element to trigger download/view
                                    const link = document.createElement('a');
                                    link.href = invoiceUrl;
                                    link.target = '_blank';
                                    link.rel = 'noopener noreferrer';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="hover:bg-purple-50"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Invoice
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadZip(order)}
                                  className="hover:bg-teal-50"
                                >
                                  <Archive className="h-4 w-4 mr-1" />
                                  Download Zip
                                </Button>
                              </>
                            )}
                            {activeTab === "archived" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReorder(order)}
                                disabled={reorderingOrderId === order.id}
                                className="hover:bg-orange-50"
                              >
                                {reorderingOrderId === order.id ? (
                                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                )}
                                Reorder
                              </Button>
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
      </main>

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          order={selectedOrderForDetails as any}
          open={isOrderDetailsModalOpen}
          onOpenChange={(open) => {
            setIsOrderDetailsModalOpen(open);
            if (!open) setSelectedOrderForDetails(null);
          }}
        />
      )}

      {/* Order Tracking Modal */}
      {selectedOrderForTracking && (
        <OrderTrackingModal
          order={selectedOrderForTracking as any}
          isOpen={isOrderTrackingModalOpen}
          onClose={() => {
            setIsOrderTrackingModalOpen(false);
            setSelectedOrderForTracking(null);
          }}
        />
      )}

      {/* Reorder Confirmation Modal */}
      <Dialog open={showReorderConfirm} onOpenChange={setShowReorderConfirm}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-gray-50 border border-gray-200">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Create Reorder Request
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {orderToReorder && (
                <>
                  Are you sure you want to create a reorder request for{' '}
                  <span className="font-medium text-gray-900">"{orderToReorder.rfq.projectName}"</span>?
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      This will submit a new RFQ to the admin for review and requoting. 
                      You'll see it in your active orders once approved.
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={cancelReorder}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReorder}
              disabled={reorderMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {reorderMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Create Reorder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}