import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import OrderCard from "@/components/orders/order-card";
import OrderDetailsOnlyModal from "@/components/customer/order-details-only-modal";
import OrderTrackingModal from "@/components/customer/order-tracking-modal";
import type { RFQ, SalesOrder, File } from "@shared/schema";
import type { RFQ as RFQType, SalesOrder as SalesOrderType } from "@shared/schema";
import { format } from "date-fns";
import { extractDisplayId } from "@shared/utils";
import { FileText, Package, Calendar, ChevronDown, ChevronRight, Eye, Filter, ArrowUpDown, Download, MapPin, Box } from "lucide-react";
import { useState, useMemo } from "react";



export default function History() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQType | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<(SalesOrderType & { rfq: RFQType }) | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<(SalesOrderType & { rfq: RFQType }) | null>(null);
  const [rfqFiles, setRfqFiles] = useState<File[]>([]);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isOrderTrackingModalOpen, setIsOrderTrackingModalOpen] = useState(false);
  
  // Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSortBy, setOrderSortBy] = useState<string>("date-desc");
  const [rfqStatusFilter, setRfqStatusFilter] = useState<string>("all");
  const [rfqSortBy, setRfqSortBy] = useState<string>("date-desc");
  
  const { data: allRfqs, isLoading: rfqsLoading } = useQuery<RFQType[]>({
    queryKey: ["/api/rfqs"],
  });

  const { data: allOrders, isLoading: ordersLoading } = useQuery<(SalesOrderType & { rfq: RFQType })[]>({
    queryKey: ["/api/orders"],
  });

  // Filter and sort orders - Only show historical/completed orders
  const orders = useMemo(() => {
    if (!allOrders) return [];
    
    // First filter to only show historical orders (delivered or archived)
    let filtered = allOrders.filter(order => {
      return order.orderStatus === 'delivered' || order.isArchived;
    });
    
    // Apply additional status filter if specified
    if (orderStatusFilter !== "all") {
      filtered = filtered.filter(order => order.orderStatus === orderStatusFilter);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (orderSortBy) {
        case "date-asc":
          return new Date(a.orderDate || 0).getTime() - new Date(b.orderDate || 0).getTime();
        case "date-desc":
          return new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime();
        case "status":
          return (a.orderStatus || "").localeCompare(b.orderStatus || "");
        case "project":
          return a.rfq.projectName.localeCompare(b.rfq.projectName);
        default:
          return 0;
      }
    });
  }, [allOrders, orderStatusFilter, orderSortBy]);

  // Filter and sort RFQs
  const rfqs = useMemo(() => {
    if (!allRfqs) return [];
    
    let filtered = allRfqs;
    
    // Apply status filter
    if (rfqStatusFilter !== "all") {
      filtered = filtered.filter(rfq => rfq.status === rfqStatusFilter);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (rfqSortBy) {
        case "date-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "date-desc":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "project":
          return a.projectName.localeCompare(b.projectName);
        default:
          return 0;
      }
    });
  }, [allRfqs, rfqStatusFilter, rfqSortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "quoted":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-purple-100 text-purple-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "in_production":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "material_procurement":
        return "bg-orange-100 text-orange-800";
      case "manufacturing":
        return "bg-purple-100 text-purple-800";
      case "finishing":
        return "bg-indigo-100 text-indigo-800";
      case "quality_check":
        return "bg-pink-100 text-pink-800";
      case "packing":
        return "bg-yellow-100 text-yellow-800";
      case "shipped":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getOrderStatusDisplay = (status: string) => {
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
        return status.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleViewRFQ = async (rfq: RFQType) => {
    try {
      setSelectedRFQ(rfq);
      setIsRFQModalOpen(true);
      
      // Fetch RFQ files
      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch(`/api/rfqs/${rfq.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const rfqData = await response.json();
        setRfqFiles(rfqData.files || []);
      }
    } catch (error) {
      console.error('Failed to load RFQ details:', error);
    }
  };

  if (rfqsLoading || ordersLoading) {
    return (
      <CustomerLayout>
        <main className="px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Order History</h2>
            <p className="text-gray-600 mt-2">View all your completed and delivered manufacturing projects</p>
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </main>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Order History</h2>
          <p className="text-gray-600 mt-2">View all your completed and delivered manufacturing projects</p>
        </div>

        <div className="space-y-8">
          {/* Historical Orders */}
          {orders && orders.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-teal-primary" />
                  Order History
                </h3>
                <div className="flex gap-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Historical Orders</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <Select value={orderSortBy} onValueChange={setOrderSortBy}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                        <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="project">Project Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.flatMap((order) => [
                        <TableRow 
                          key={order.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          <TableCell>
                            {expandedOrder === order.id ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {order.orderNumber || extractDisplayId(order)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.rfq.projectName}
                          </TableCell>
                          <TableCell>{order.rfq.material}</TableCell>
                          <TableCell>{order.rfq.quantity}</TableCell>
                          <TableCell>
                            <Badge className={getOrderStatusColor(order.orderStatus || 'pending')}>
                              {getOrderStatusDisplay(order.orderStatus || 'pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.orderDate ? format(new Date(order.orderDate), 'MMM dd, yyyy') : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForDetails(order);
                                  setIsOrderDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForTracking(order);
                                  setIsOrderTrackingModalOpen(true);
                                }}
                                className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Tracking
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>,
                        ...(expandedOrder === order.id ? [
                          <TableRow key={`${order.id}-details`}>
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-6 py-4 bg-gray-50">
                                <OrderCard order={order} isExpanded={true} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ] : [])
                      ])}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="rounded-2xl shadow-sm border border-gray-100">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Orders</h3>
                <p className="text-gray-500 text-center">
                  No completed or delivered orders yet. Your finished projects will appear here once completed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* RFQ History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-teal-primary" />
                RFQ History
              </h3>
              <div className="flex gap-3">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={rfqStatusFilter} onValueChange={setRfqStatusFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <Select value={rfqSortBy} onValueChange={setRfqSortBy}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="project">Project Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {rfqs && rfqs.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFQ ID</TableHead>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rfqs.map((rfq) => (
                        <TableRow key={rfq.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">
                            {extractDisplayId(rfq)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {rfq.projectName}
                          </TableCell>
                          <TableCell>{rfq.material}</TableCell>
                          <TableCell>{rfq.quantity}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(rfq.status || 'pending')}>
                              {rfq.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rfq.createdAt ? format(new Date(rfq.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {rfq.notes ? (
                              <span className="text-sm text-gray-600 truncate block" title={rfq.notes}>
                                {rfq.notes}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">No notes</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewRFQ(rfq)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs Yet</h3>
                  <p className="text-gray-500 text-center">
                    You haven't submitted any RFQs yet. Start by submitting your first RFQ.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* RFQ Details Modal */}
      <Dialog open={isRFQModalOpen} onOpenChange={setIsRFQModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RFQ Details - {selectedRFQ?.projectName}</DialogTitle>
          </DialogHeader>
          
          {selectedRFQ && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">RFQ ID</label>
                  <p className="text-sm font-mono">{extractDisplayId(selectedRFQ)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={`${getStatusColor(selectedRFQ.status || 'pending')} mt-1`}>
                    {selectedRFQ.status || 'pending'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Material</label>
                  <p className="text-sm">{selectedRFQ.material}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity</label>
                  <p className="text-sm">{selectedRFQ.quantity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tolerance</label>
                  <p className="text-sm">{selectedRFQ.tolerance || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Finishing</label>
                  <p className="text-sm">{selectedRFQ.finishing || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-sm">
                    {selectedRFQ.createdAt ? format(new Date(selectedRFQ.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedRFQ.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedRFQ.notes}</p>
                  </div>
                </div>
              )}

              {/* Attached Files */}
              {rfqFiles && rfqFiles.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Attached Files</label>
                  <div className="grid grid-cols-1 gap-3">
                    {rfqFiles.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {file.fileType === 'step' ? 
                              <Box className="h-8 w-8 text-blue-600" /> : 
                              <FileText className="h-8 w-8 text-gray-400" />
                            }
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {file.fileType.toUpperCase()} • {Math.round(file.fileSize / 1024)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Status for STEP files */}
                            {file.fileType === 'step' && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Uploaded
                              </Badge>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/files/${file.id}/download`;
                                link.download = file.fileName;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <OrderDetailsOnlyModal
          order={selectedOrderForDetails}
          isOpen={isOrderDetailsModalOpen}
          onClose={() => {
            setIsOrderDetailsModalOpen(false);
            setSelectedOrderForDetails(null);
          }}
        />
      )}

      {/* Order Tracking Modal */}
      {selectedOrderForTracking && (
        <OrderTrackingModal
          order={selectedOrderForTracking}
          isOpen={isOrderTrackingModalOpen}
          onClose={() => {
            setIsOrderTrackingModalOpen(false);
            setSelectedOrderForTracking(null);
          }}
        />
      )}
    </CustomerLayout>
  );
}